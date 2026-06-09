import Stripe from 'stripe'
import { buffer } from 'micro'
import { prisma } from '../../lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'
import '../../types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Disable Next.js body parsing — Stripe needs the raw body
export const config = { api: { bodyParser: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig as string, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', (err as Error).message)
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`)
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { donorName, streamerId } = pi.metadata

    try {
      // Update donation status in database
      const donation = await prisma.donation.update({
        where: { stripePaymentId: pi.id },
        data: { status: 'succeeded' },
      })

      console.log(`[Webhook] Donation succeeded: ${donorName} → ฿${pi.amount / 100} for ${streamerId}`)

      // Push real-time alert to overlay via WebSocket
      const alertPayload = {
        id: donation.id,
        donorName: donation.donorName,
        message: donation.message,
        amount: donation.amount / 100, // satangs → baht for display
      }

      const clients = global.overlayClients?.get(streamerId)
      if (clients && clients.size > 0) {
        const payload = JSON.stringify({ type: 'donation', donation: alertPayload })
        clients.forEach((ws) => {
          if (ws.readyState === 1 /* OPEN */) ws.send(payload)
        })
        console.log(`[Webhook] Alert sent to ${clients.size} overlay client(s)`)
      } else {
        console.log('[Webhook] No overlay clients connected — donation saved to DB only')
      }
    } catch (err) {
      // P2025 = record not found (duplicate webhook or unknown payment)
      console.error('[Webhook] DB update failed:', (err as Error).message)
    }
  }

  res.json({ received: true })
}
