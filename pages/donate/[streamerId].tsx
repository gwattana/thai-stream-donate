import { useState, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import Head from 'next/head'
import type { GetServerSideProps } from 'next'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const PRESET_AMOUNTS = [20, 50, 100, 200, 500, 1000]

interface Props {
  streamerId: string
  streamerName: string
}

export default function DonatePage({ streamerId, streamerName }: Props) {
  const [donorName, setDonorName] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [step, setStep] = useState('form') // 'form' | 'qr' | 'success' | 'error'
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) < 20) {
      setErrorMsg('จำนวนเงินขั้นต่ำคือ ฿20')
      return
    }
    setErrorMsg('')
    setLoading(true)

    try {
      // 1. Create PaymentIntent on server
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, donorName, message, streamerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด')

      // 2. Confirm PromptPay payment via Stripe.js → get QR code
      const stripe = await stripePromise
      const result = await stripe.confirmPromptPayPayment(data.clientSecret, {
        payment_method: {
          billing_details: {
            email: 'donor@thaistream.app',
            name: donorName || 'ไม่ระบุชื่อ',
          },
        },
      })

      if (result.error) throw new Error(result.error.message)

      const nextAction = result.paymentIntent?.next_action as any
      const qrUrl =
        nextAction?.promptpay_display_qr_code?.image_url_svg ||
        nextAction?.promptpay_display_qr_code?.image_url_png

      setQrImageUrl(qrUrl)
      setClientSecret(data.clientSecret)
      setStep('qr')

      // 3. Poll for payment completion
      pollPaymentStatus(stripe, data.clientSecret)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  async function pollPaymentStatus(stripe, secret) {
    stopPolling()
    pollIntervalRef.current = setInterval(async () => {
      const { paymentIntent } = await stripe.retrievePaymentIntent(secret)
      if (paymentIntent.status === 'succeeded') {
        stopPolling()
        setStep('success')
      } else if (
        paymentIntent.status === 'canceled' ||
        paymentIntent.status === 'requires_payment_method'
      ) {
        stopPolling()
        setStep('error')
        setErrorMsg('การชำระเงินถูกยกเลิกหรือหมดเวลา')
      }
    }, 3000)

    // Stop polling after 10 minutes
    setTimeout(stopPolling, 10 * 60 * 1000)
  }

  return (
    <>
      <Head>
        <title>Donate to {streamerName || streamerId}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="page">
        <div className="card">
          {/* Header */}
          <div className="header">
            <div className="avatar">{(streamerName || streamerId)[0].toUpperCase()}</div>
            <h1 className="streamer-name">{streamerName || streamerId}</h1>
            <p className="subtitle">สนับสนุนสตรีมเมอร์ด้วย PromptPay</p>
          </div>

          {/* Form */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="form">
              <label>ชื่อของคุณ</label>
              <input
                type="text"
                placeholder="ไม่ระบุชื่อ"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                maxLength={50}
              />

<label>จำนวนเงิน (บาท) *</label>
              <div className="preset-grid">
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`preset-btn ${Number(amount) === a ? 'active' : ''}`}
                    onClick={() => setAmount(String(a))}
                  >
                    ฿{a.toLocaleString()}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="หรือกรอกจำนวนเงินเอง"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={20}
              />

              <label>ข้อความ (ไม่บังคับ)</label>
              <textarea
                placeholder="ฝากข้อความถึงสตรีมเมอร์..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                rows={3}
              />

              {errorMsg && <p className="error">{errorMsg}</p>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'กำลังสร้าง QR Code...' : '💜 สนับสนุน'}
              </button>
            </form>
          )}

          {/* QR Code step */}
          {step === 'qr' && (
            <div className="qr-section">
              <p className="qr-instruction">
                สแกน QR Code ด้วยแอปธนาคารของคุณ
              </p>
              <div className="qr-amount">฿{Number(amount).toLocaleString()}</div>
              {qrImageUrl ? (
                <img src={qrImageUrl} alt="PromptPay QR Code" className="qr-image" />
              ) : (
                <div className="qr-placeholder">กำลังโหลด QR Code...</div>
              )}
              <p className="qr-waiting">
                <span className="spinner" /> กำลังรอการชำระเงิน...
              </p>
              <p className="qr-note">QR Code มีอายุ 10 นาที</p>
              <button className="back-btn" onClick={() => setStep('form')}>
                ← ย้อนกลับ
              </button>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="result-section">
              <div className="result-icon success-icon">✅</div>
              <h2>ขอบคุณ!</h2>
              <p>การสนับสนุนของคุณถูกส่งเรียบร้อยแล้ว</p>
              {message && <blockquote className="message-preview">"{message}"</blockquote>}
              <button className="submit-btn" onClick={() => {
                setStep('form')
                setAmount('')
                setMessage('')
                setDonorName('')
              }}>
                สนับสนุนอีกครั้ง
              </button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="result-section">
              <div className="result-icon">❌</div>
              <h2>เกิดข้อผิดพลาด</h2>
              <p>{errorMsg}</p>
              <button className="submit-btn" onClick={() => setStep('form')}>
                ลองใหม่
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #1a0533 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Noto Sans Thai', 'Sarabun', sans-serif;
        }
        .card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 32px;
          width: 100%;
          max-width: 440px;
          color: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 28px;
        }
        .avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 700;
          margin: 0 auto 12px;
        }
        .streamer-name {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 4px;
        }
        .subtitle {
          color: rgba(255,255,255,0.6);
          font-size: 14px;
          margin: 0;
        }
        .form label {
          display: block;
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          margin: 16px 0 6px;
          font-weight: 500;
        }
        .form input,
        .form textarea {
          width: 100%;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 10px 14px;
          color: #fff;
          font-size: 15px;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .form input:focus,
        .form textarea:focus {
          outline: none;
          border-color: #8b5cf6;
        }
        .form input::placeholder,
        .form textarea::placeholder {
          color: rgba(255,255,255,0.35);
        }
        .preset-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 8px;
        }
        .preset-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          color: #fff;
          padding: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .preset-btn:hover { background: rgba(139,92,246,0.3); border-color: #8b5cf6; }
        .preset-btn.active { background: #8b5cf6; border-color: #8b5cf6; }
        .submit-btn {
          width: 100%;
          margin-top: 20px;
          padding: 14px;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s, transform 0.1s;
        }
        .submit-btn:hover { opacity: 0.9; }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error {
          color: #f87171;
          font-size: 13px;
          margin: 8px 0 0;
        }
        .qr-section {
          text-align: center;
          padding: 8px 0;
        }
        .qr-instruction {
          color: rgba(255,255,255,0.8);
          margin-bottom: 8px;
        }
        .qr-amount {
          font-size: 32px;
          font-weight: 800;
          color: #a78bfa;
          margin-bottom: 16px;
        }
        .qr-image {
          width: 240px;
          height: 240px;
          border-radius: 16px;
          background: #fff;
          padding: 12px;
          box-sizing: border-box;
        }
        .qr-placeholder {
          width: 240px;
          height: 240px;
          background: rgba(255,255,255,0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          color: rgba(255,255,255,0.5);
        }
        .qr-waiting {
          margin-top: 16px;
          color: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .qr-note {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          margin-top: 4px;
        }
        .back-btn {
          margin-top: 16px;
          background: none;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: rgba(255,255,255,0.6);
          padding: 8px 16px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
        }
        .result-section {
          text-align: center;
          padding: 20px 0;
        }
        .result-icon {
          font-size: 56px;
          margin-bottom: 12px;
        }
        .result-section h2 {
          font-size: 24px;
          margin: 0 0 8px;
        }
        .result-section p {
          color: rgba(255,255,255,0.7);
        }
        .message-preview {
          background: rgba(255,255,255,0.08);
          border-left: 3px solid #8b5cf6;
          border-radius: 4px;
          padding: 10px 14px;
          margin: 16px 0;
          font-style: italic;
          color: rgba(255,255,255,0.85);
        }
      `}</style>

      <style global jsx>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700;800&display=swap');
      `}</style>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const streamerId = params!.streamerId as string
  const { prisma } = await import('../../lib/prisma')

  const user = await prisma.user.findUnique({
    where: { streamerId },
    select: { streamerId: true, name: true },
  })

  if (!user) return { notFound: true }

  return {
    props: {
      streamerId: user.streamerId!,
      streamerName: user.name || user.streamerId!,
    },
  }
}
