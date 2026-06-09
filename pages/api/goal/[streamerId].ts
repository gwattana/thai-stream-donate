import { prisma } from '../../../lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { streamerId } = req.query as { streamerId: string }

  const user = await prisma.user.findUnique({
    where: { streamerId },
    select: { goalName: true, goalAmount: true, goalCurrent: true },
  })

  if (!user) return res.status(404).json({ error: 'Streamer not found' })

  res.json(user)
}
