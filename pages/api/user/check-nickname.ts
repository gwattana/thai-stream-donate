import { prisma } from '../../../lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { nickname } = req.query as { nickname?: string }
  if (!nickname) return res.json({ available: false })

  try {
    const existing = await prisma.user.findUnique({
      where: { streamerId: nickname },
      select: { id: true },
    })
    res.json({ available: !existing })
  } catch (err) {
    res.status(500).json({ available: false })
  }
}
