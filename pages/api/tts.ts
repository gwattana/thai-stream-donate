import { prisma } from '../../lib/prisma'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text, streamerId } = req.body

  // ตรวจสอบว่า streamerId มีอยู่จริงในฐานข้อมูล (ป้องกันคนนอกใช้ API)
  if (!streamerId) return res.status(400).json({ error: 'Missing streamerId' })
  const streamer = await prisma.user.findUnique({
    where: { streamerId },
    select: { id: true },
  })
  if (!streamer) return res.status(401).json({ error: 'Invalid streamerId' })
  if (!text) return res.status(400).json({ error: 'Missing text' })
  if (text.length > 500) return res.status(400).json({ error: 'Text too long (max 500 chars)' })

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'th-TH',
            name: 'th-TH-Neural2-C', // เสียงภาษาไทยที่ดีที่สุด
          },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) throw new Error((data.error as any)?.message || 'TTS error')

    res.json({ audioContent: data.audioContent }) // base64 MP3
  } catch (err) {
    console.error('[TTS]', err)
    res.status(500).json({ error: (err as Error).message })
  }
}
