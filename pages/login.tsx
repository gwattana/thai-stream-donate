import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Head from 'next/head'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      // If no nickname set yet → onboarding, otherwise → dashboard
      if (!session.user.streamerId) {
        router.replace('/onboarding')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [session, status])

  return (
    <>
      <Head>
        <title>Login — ThaiStream Donate</title>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@700;800&family=Noto+Sans+Thai:wght@400;500;700&display=swap');`}</style>
      </Head>

      <div className="page">
        <div className="card">
          <div className="logo">🎮 ThaiStream<span>Donate</span></div>
          <p className="subtitle">แพลตฟอร์ม Donation สำหรับสตรีมเมอร์ไทย</p>

          <button className="google-btn" onClick={() => signIn('google', { callbackUrl: '/onboarding' })}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>

          <p className="note">สำหรับสตรีมเมอร์เท่านั้น — แฟนคลับไม่ต้องล็อกอิน</p>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a0533, #2d1b69, #1a0533);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Prompt', 'Noto Sans Thai', sans-serif;
        }
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 48px 40px;
          text-align: center;
          width: 100%; max-width: 380px;
          color: #fff;
        }
        .logo {
          font-size: 24px; font-weight: 800; margin-bottom: 8px;
        }
        .logo span { color: #c4b5fd; }
        .subtitle {
          color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 36px;
        }
        .google-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          padding: 14px 20px;
          background: #fff; border: none; border-radius: 12px;
          color: #1f2937; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: opacity 0.2s;
        }
        .google-btn:hover { opacity: 0.92; }
        .note {
          margin-top: 20px; font-size: 12px;
          color: rgba(255,255,255,0.35);
        }
      `}</style>
      <style global jsx>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>
    </>
  )
}
