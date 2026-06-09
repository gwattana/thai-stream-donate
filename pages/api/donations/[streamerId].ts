import { prisma } from '../../../lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { streamerId } = req.query as { streamerId: string }

  try {
    const donations = await prisma.donation.findMany({
      where: { streamerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        donorName: true,
        message: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    })

    // Convert satangs → baht for display
    const formatted = donations.map(d => ({ ...d, amount: d.amount / 100 }))
    res.json({ donations: formatted })
  } catch (err) {
    console.error('[API] donations error:', (err as Error).message)
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลได้' })
  }
}
