import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { nickname } = req.body

  if (!nickname || nickname.length < 3 || nickname.length > 20) {
    return res.status(400).json({ error: 'ชื่อต้องมี 3-20 ตัวอักษร' })
  }
  if (!/^[a-z0-9_]+$/.test(nickname)) {
    return res.status(400).json({ error: 'ใช้ได้เฉพาะ a-z, 0-9 และ _' })
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { streamerId: nickname },
    })
    res.json({ ok: true, streamerId: nickname })
  } catch (err) {
    if ((err as any).code === 'P2002') {
      return res.status(409).json({ error: 'ชื่อนี้ถูกใช้แล้ว' })
    }
    res.status(500).json({ error: (err as Error).message })
  }
}
