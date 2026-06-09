import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import type { GetServerSideProps } from 'next'
import type { AlertPayload } from '../../types'

interface Props {
  streamerId: string
}

// Queue-based alert system — shows one at a time, queues the rest
export default function OverlayPage({ streamerId }: Props) {
  const [currentAlert, setCurrentAlert] = useState<AlertPayload | null>(null)
  const [visible, setVisible] = useState(false)
  const queueRef = useRef<AlertPayload[]>([])
  const processingRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const spokenIds = useRef(new Set())
  const enqueuedIds = useRef(new Set())

  function enqueue(donation) {
    if (enqueuedIds.current.has(donation.id)) return
    enqueuedIds.current.add(donation.id)
    queueRef.current.push(donation)
    if (!processingRef.current) processNext()
  }

  async function speak(donation) {
    if (spokenIds.current.has(donation.id)) return
    spokenIds.current.add(donation.id)
    const text = `${donation.donorName} donated ${donation.amount} บาท ${donation.message ? donation.message : ''}`

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, streamerId }),
      })
      const data = await res.json()
      if (!data.audioContent) throw new Error('No audio')

      // เล่น MP3 จาก base64
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
      audio.play()
    } catch (err) {
      console.error('[TTS] Google TTS failed, falling back to browser TTS:', err)
      // Fallback ไปใช้ browser TTS ถ้า Google TTS ล้มเหลว
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'th-TH'
      window.speechSynthesis.speak(utterance)
    }
  }

  function processNext() {
    if (queueRef.current.length === 0) {
      processingRef.current = false
      return
    }
    processingRef.current = true
    const donation = queueRef.current.shift()
    setCurrentAlert(donation)

    // Animate in + TTS
    setTimeout(() => {
      setVisible(true)
      speak(donation)
    }, 50)

    // Show for 6 seconds, then animate out
    setTimeout(() => {
      setVisible(false)
      // Wait for exit animation, then process next
      setTimeout(() => {
        setCurrentAlert(null)
        setTimeout(processNext, 300)
      }, 600)
    }, 6000)
  }

  useEffect(() => {
    if (!streamerId) return

    const wsUrl = `${
      process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== 'undefined'
        ? window.location.origin.replace(/^http/, 'ws')
        : '')
    }/ws?streamerId=${streamerId}`

    function connect() {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => console.log('[Overlay] WebSocket connected')

      ws.onmessage = (e) => {
        try {
          const { type, donation } = JSON.parse(e.data)
          if (type === 'donation') enqueue(donation)
        } catch (err) {
          console.error('[Overlay] Parse error:', err)
        }
      }

      ws.onclose = () => {
        console.log('[Overlay] Disconnected — reconnecting in 3s...')
        setTimeout(connect, 3000)
      }

      ws.onerror = (err) => console.error('[Overlay] WS error:', err)
    }

    connect()
    return () => wsRef.current?.close()
  }, [streamerId])

  // Demo button for testing in browser
  function fireDemo() {
    enqueue({
      id: 'demo-' + Date.now(),
      donorName: 'ผู้สนับสนุน',
      amount: 100,
      message: 'Keep it up! ชอบมากเลยครับ 🎉',
    })
  }

  return (
    <>
      <Head>
        <title>Overlay — {streamerId}</title>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@700;800&family=Prompt:wght@700;800&display=swap');
        `}</style>
      </Head>

      {/* Transparent background — required for Streamlabs browser source */}
      <div className="overlay-root">
        {currentAlert && (
          <div className={`alert-wrapper ${visible ? 'show' : ''}`}>
            <div className="alert-card">
              <div className="alert-glow" />

              {/* Icon */}
              <div className="alert-icon">💜</div>

              {/* Content */}
              <div className="alert-body">
                <div className="alert-donor">{currentAlert.donorName}</div>
                <div className="alert-amount">
                  ฿{Number(currentAlert.amount).toLocaleString()}
                </div>
                {currentAlert.message && (
                  <div className="alert-message">"{currentAlert.message}"</div>
                )}
              </div>
            </div>

            {/* Animated particles */}
            <div className="particles">
              {['💜','⭐','✨','🎉','💫'].map((p, i) => (
                <span key={i} className={`particle p${i}`}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Test button — only visible when NOT added to Streamlabs */}
        <button className="demo-btn" onClick={fireDemo}>
          Test Alert
        </button>
      </div>

      <style jsx>{`
        .overlay-root {
          width: 100vw;
          height: 100vh;
          background: transparent;
          overflow: hidden;
          font-family: 'Prompt', 'Noto Sans Thai', sans-serif;
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          padding: 40px;
          box-sizing: border-box;
        }

        /* ── Alert card ── */
        .alert-wrapper {
          position: relative;
          transform: translateX(-120%) scale(0.8);
          opacity: 0;
          transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.4s ease;
          pointer-events: none;
        }
        .alert-wrapper.show {
          transform: translateX(0) scale(1);
          opacity: 1;
        }

        .alert-card {
          position: relative;
          background: linear-gradient(135deg, rgba(20,8,50,0.97) 0%, rgba(45,27,105,0.97) 100%);
          border: 2px solid transparent;
          border-radius: 20px;
          padding: 20px 24px;
          min-width: 320px;
          max-width: 460px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow:
            0 0 0 1px rgba(139,92,246,0.6),
            0 8px 40px rgba(139,92,246,0.4),
            0 0 80px rgba(139,92,246,0.15);
          overflow: hidden;
        }

        .alert-glow {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15));
          border-radius: 20px;
          pointer-events: none;
        }

        .alert-icon {
          font-size: 40px;
          flex-shrink: 0;
          animation: pulse 1.5s ease-in-out infinite;
          position: relative;
          z-index: 1;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .alert-body {
          position: relative;
          z-index: 1;
        }

        .alert-donor {
          font-size: 15px;
          color: rgba(255,255,255,0.75);
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .alert-amount {
          font-size: 36px;
          font-weight: 800;
          background: linear-gradient(90deg, #c4b5fd, #f0abfc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.1;
          margin: 2px 0;
        }

        .alert-message {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          font-style: italic;
          margin-top: 4px;
          max-width: 320px;
          line-height: 1.4;
        }

        /* ── Particles ── */
        .particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: visible;
        }
        .particle {
          position: absolute;
          font-size: 20px;
          animation: float 1.5s ease-out forwards;
          opacity: 0;
        }
        .p0 { top: 10%; left: 20%; animation-delay: 0.1s; }
        .p1 { top: 5%;  left: 50%; animation-delay: 0.3s; }
        .p2 { top: 15%; left: 75%; animation-delay: 0.5s; }
        .p3 { top: 0%;  left: 35%; animation-delay: 0.2s; }
        .p4 { top: 8%;  left: 85%; animation-delay: 0.4s; }

        @keyframes float {
          0%   { transform: translateY(0) scale(0.5); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateY(-60px) scale(1.2); opacity: 0; }
        }

        /* ── Demo button ── */
        .demo-btn {
          position: fixed;
          top: 12px;
          right: 12px;
          padding: 8px 16px;
          background: rgba(139,92,246,0.6);
          border: 1px solid #8b5cf6;
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          backdrop-filter: blur(4px);
        }
        .demo-btn:hover { background: rgba(139,92,246,0.8); }
      `}</style>

      <style global jsx>{`
        html, body {
          margin: 0; padding: 0;
          background: transparent !important;
          overflow: hidden;
        }
      `}</style>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  return { props: { streamerId: params!.streamerId as string } }
}
