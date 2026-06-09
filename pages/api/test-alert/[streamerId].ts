import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import type { NextApiRequest, NextApiResponse } from 'next'
import '../../../types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { streamerId } = req.query as { streamerId: string }

  // Verify the requesting user owns this streamerId
  if (session.user.streamerId !== streamerId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const donation = {
    id: 'test-' + Date.now(),
    donorName: 'ทดสอบระบบ',
    message: 'นี่คือ Test Alert',
    amount: 100,
  }

  const clients = global.overlayClients?.get(streamerId)
  if (!clients || clients.size === 0) {
    return res.status(404).json({ error: 'ไม่มี Overlay เชื่อมต่ออยู่ — เปิด Overlay URL ใน Streamlabs ก่อน' })
  }

  const payload = JSON.stringify({ type: 'donation', donation })
  clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(payload)
  })

  res.json({ ok: true, sent: clients.size })
}
