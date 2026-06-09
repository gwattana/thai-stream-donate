import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

export default function OnboardingPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const nickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Already has streamerId → go to dashboard
  useEffect(() => {
    if (session?.user?.streamerId) {
      router.replace('/dashboard')
    }
  }, [session])

  // Auto-fill from Google name
  useEffect(() => {
    if (session?.user?.name && !nickname) {
      const suggested = session.user.name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20)
      setNickname(suggested)
    }
  }, [session])

  async function checkAvailability(value: string) {
    if (!value || value.length < 3) { setAvailable(null); return }
    setChecking(true)
    const res = await fetch(`/api/user/check-nickname?nickname=${value}`)
    const data = await res.json()
    setAvailable(data.available)
    setChecking(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
    setNickname(val)
    setAvailable(null)
    clearTimeout(nickTimerRef.current)
    nickTimerRef.current = setTimeout(() => checkAvailability(val), 500)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname || nickname.length < 3) {
      setError('ชื่อต้องมีอย่างน้อย 3 ตัวอักษร')
      return
    }
    if (available === false) {
      setError('ชื่อนี้ถูกใช้แล้ว')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/user/set-nickname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'เกิดข้อผิดพลาด')
      setLoading(false)
      return
    }

    // Update JWT token with new streamerId
    await update({ streamerId: nickname })
    router.replace('/dashboard')
  }

  const [baseUrl, setBaseUrl] = useState('')
  useEffect(() => { setBaseUrl(window.location.origin) }, [])

  return (
    <>
      <Head>
        <title>ตั้งชื่อ — ThaiStream Donate</title>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@700;800&family=Noto+Sans+Thai:wght@400;500;700&display=swap');`}</style>
      </Head>

      <div className="page">
        <div className="card">
          <div className="step">ขั้นตอนสุดท้าย 🎉</div>
          <h1>ตั้งชื่อ Streamer ของคุณ</h1>
          <p className="desc">ชื่อนี้จะกลายเป็น URL สำหรับรับ Donation</p>

          <form onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <span className="prefix">{baseUrl}/donate/</span>
              <input
                type="text"
                value={nickname}
                onChange={handleChange}
                placeholder="yournickname"
                autoFocus
              />
              <span className="status">
                {checking && '⏳'}
                {!checking && available === true && '✅'}
                {!checking && available === false && '❌'}
              </span>
            </div>

            <div className="hint">
              ตัวอักษรภาษาอังกฤษ ตัวเลข และ _ เท่านั้น · 3-20 ตัวอักษร
            </div>

            {available === false && <p className="error">ชื่อนี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น</p>}
            {error && <p className="error">{error}</p>}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading || available === false || !nickname || nickname.length < 3}
            >
              {loading ? 'กำลังบันทึก...' : 'เริ่มต้นใช้งาน →'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a0533, #2d1b69, #1a0533);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Prompt', 'Noto Sans Thai', sans-serif; padding: 24px;
        }
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; padding: 40px; width: 100%; max-width: 480px; color: #fff;
        }
        .step {
          font-size: 13px; color: #a78bfa; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;
        }
        h1 { font-size: 24px; font-weight: 800; margin: 0 0 8px; }
        .desc { color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 28px; }
        .input-wrapper {
          display: flex; align-items: center;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px; overflow: hidden;
        }
        .prefix {
          padding: 12px 8px 12px 14px;
          color: rgba(255,255,255,0.4); font-size: 13px; white-space: nowrap;
        }
        .input-wrapper input {
          flex: 1; background: none; border: none; outline: none;
          color: #fff; font-size: 15px; font-weight: 700; font-family: monospace;
          padding: 12px 4px;
        }
        .input-wrapper input::placeholder { color: rgba(255,255,255,0.25); font-weight: 400; }
        .status { padding: 0 14px; font-size: 16px; }
        .hint { font-size: 12px; color: rgba(255,255,255,0.35); margin: 8px 0 20px; }
        .error { color: #f87171; font-size: 13px; margin: 0 0 16px; }
        .submit-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          border: none; border-radius: 12px; color: #fff;
          font-size: 16px; font-weight: 700; cursor: pointer; font-family: inherit;
          transition: opacity 0.2s;
        }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; }
      `}</style>
      <style global jsx>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>
    </>
  )
}
