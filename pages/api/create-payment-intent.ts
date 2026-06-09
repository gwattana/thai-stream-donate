import Stripe from 'stripe'
import { prisma } from '../../lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { amount, donorName, message, streamerId } = req.body as {
    amount: string
    donorName: string
    message: string
    streamerId: string
  }

  if (!streamerId) return res.status(400).json({ error: 'Missing streamerId' })
  if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  // Verify streamer exists
  const streamer = await prisma.user.findUnique({
    where: { streamerId },
    select: { id: true, minDonation: true },
  })
  if (!streamer) return res.status(404).json({ error: 'ไม่พบ Streamer' })

  const userId = streamer.id
  const minDonation = streamer.minDonation ?? 20

  if (Number(amount) < minDonation) {
    return res.status(400).json({ error: `จำนวนเงินขั้นต่ำคือ ฿${minDonation}` })
  }

  try {
    const amountSatangs = Math.round(Number(amount) * 100)

    // 1. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountSatangs,
      currency: 'thb',
      payment_method_types: ['promptpay'],
      metadata: {
        donorName: donorName || 'ไม่ระบุชื่อ',
        message: message || '',
        streamerId,
      },
    })

    // 2. Save pending donation to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.donation.create({
      data: {
        userId,
        streamerId,
        stripePaymentId: paymentIntent.id,
        donorName: donorName || 'ไม่ระบุชื่อ',
        message: message || '',
        amount: amountSatangs,
        status: 'pending',
      } as any,
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[Stripe] create-payment-intent error:', err)
    res.status(500).json({ error: (err as Error).message })
  }
}
