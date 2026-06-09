import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { minDonation: true },
    })
    return res.json(user)
  }

  if (req.method === 'POST') {
    const { minDonation } = req.body as { minDonation: number }

    if (!minDonation || isNaN(minDonation) || minDonation < 1 || minDonation > 100000) {
      return res.status(400).json({ error: 'Invalid amount (1–100,000 baht)' })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { minDonation: Math.round(minDonation) },
    })
    return res.json({ ok: true, minDonation: Math.round(minDonation) })
  }

  res.status(405).end()
}
