import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // ต้อง login ก่อนถึงจะใช้ TTS ได้ (ป้องกันค่าใช้จ่ายจาก Google API)
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { text } = req.body
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
