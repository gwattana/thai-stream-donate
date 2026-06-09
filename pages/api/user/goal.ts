import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'
import '../../../types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const userId = session.user.id
  const streamerId = session.user.streamerId

  // GET — fetch current goal state
  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { goalName: true, goalAmount: true, goalCurrent: true },
    })
    return res.json(user)
  }

  // POST — update goal settings
  if (req.method === 'POST') {
    const { goalName, goalAmount } = req.body as { goalName: string; goalAmount: number }

    if (!goalAmount || isNaN(goalAmount) || goalAmount < 1) {
      return res.status(400).json({ error: 'Invalid goal amount' })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        goalName: goalName || null,
        goalAmount: Math.round(goalAmount),
      },
      select: { goalName: true, goalAmount: true, goalCurrent: true },
    })

    // Notify overlay of goal change
    if (streamerId) broadcastGoal(streamerId, user)

    return res.json({ ok: true, ...user })
  }

  // DELETE — reset current session total
  if (req.method === 'DELETE') {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { goalCurrent: 0 },
      select: { goalName: true, goalAmount: true, goalCurrent: true },
    })

    if (streamerId) broadcastGoal(streamerId, user)

    return res.json({ ok: true, ...user })
  }

  res.status(405).end()
}

function broadcastGoal(
  streamerId: string,
  goal: { goalName: string | null; goalAmount: number | null; goalCurrent: number }
) {
  const clients = global.overlayClients?.get(streamerId)
  if (!clients || clients.size === 0) return
  const payload = JSON.stringify({ type: 'goalUpdate', goal })
  clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(payload)
  })
}
