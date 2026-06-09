import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Head from 'next/head'
import type { Donation } from '../../types'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')
  const [testMsg, setTestMsg] = useState('')

  const streamerId = session?.user?.streamerId
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const donateUrl = `${baseUrl}/donate/${streamerId}`
  const overlayUrl = `${baseUrl}/overlay/${streamerId}`

  // Redirect to onboarding if no nickname yet
  useEffect(() => {
    if (status === 'authenticated' && !streamerId) {
      router.replace('/onboarding')
    }
  }, [status, streamerId])

  useEffect(() => {
    if (!streamerId) return
    fetchDonations()
    const interval = setInterval(fetchDonations, 15000)
    return () => clearInterval(interval)
  }, [streamerId])

  async function fetchDonations() {
    try {
      const res = await fetch(`/api/donations/${streamerId}`)
      const data = await res.json()
      setDonations(data.donations || [])
    } finally {
      setLoading(false)
    }
  }

  async function sendTestAlert() {
    const res = await fetch(`/api/test-alert/${streamerId}`, { method: 'POST' })
    const data = await res.json()
    setTestMsg(res.ok ? '✅ ส่ง Alert แล้ว!' : `❌ ${data.error}`)
    setTimeout(() => setTestMsg(''), 3000)
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0)

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (status === 'loading' || !streamerId) {
    return <div style={{ background: '#0f0520', minHeight: '100vh' }} />
  }

  return (
    <>
      <Head>
        <title>Dashboard — {streamerId}</title>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&display=swap');`}</style>
      </Head>

      <div className="page">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo">🎮 ThaiStream</div>
          <nav>
            <a className="nav-item active">📊 ภาพรวม</a>
          </nav>
          <div className="sidebar-bottom">
            <div className="user-info">
              {session.user.image && (
                <img src={session.user.image} className="avatar" alt="avatar" />
              )}
              <div>
                <div className="user-name">{session.user.name}</div>
                <div className="user-id">@{streamerId}</div>
              </div>
            </div>
            <button className="signout-btn" onClick={() => signOut({ callbackUrl: '/login' })}>
              ออกจากระบบ
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <h1 className="page-title">Dashboard</h1>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">ยอดรวมทั้งหมด</div>
              <div className="stat-value purple">฿{totalAmount.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">จำนวน Donation</div>
              <div className="stat-value">{donations.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">ล่าสุด</div>
              <div className="stat-value green">
                {donations[0] ? `฿${donations[0].amount.toLocaleString()}` : '—'}
              </div>
            </div>
          </div>

          {/* URLs */}
          <section className="section">
            <h2 className="section-title">🔗 ลิงก์ของคุณ</h2>

            <div className="url-card">
              <div className="url-label">💜 ลิงก์รับ Donation (แชร์ให้แฟนคลับ)</div>
              <div className="url-row">
                <code className="url-text">{donateUrl}</code>
                <button className="copy-btn" onClick={() => copy(donateUrl, 'donate')}>
                  {copied === 'donate' ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
                </button>
              </div>
            </div>

            <div className="url-card">
              <div className="url-label">🖥 Overlay URL (Streamlabs → Browser Source)</div>
              <div className="url-row">
                <code className="url-text">{overlayUrl}</code>
                <button className="copy-btn overlay" onClick={() => copy(overlayUrl, 'overlay')}>
                  {copied === 'overlay' ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
                </button>
              </div>
              <p className="url-hint">
                Streamlabs → Sources → Add → Browser Source → วาง URL → Width: 1920, Height: 1080
              </p>
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="test-btn" onClick={sendTestAlert}>🎉 ทดสอบ Alert</button>
                {testMsg && <span style={{ fontSize: '13px', color: '#86efac' }}>{testMsg}</span>}
              </div>
            </div>
          </section>

          {/* Donation list */}
          <section className="section">
            <h2 className="section-title">💜 ประวัติ Donation</h2>

            {loading ? (
              <div className="empty">กำลังโหลด...</div>
            ) : donations.length === 0 ? (
              <div className="empty">ยังไม่มี Donation 🥺 — แชร์ลิงก์ด้านบนให้แฟนคลับเลย!</div>
            ) : (
              <div className="donation-list">
                {donations.map((d) => (
                  <div key={d.id} className="donation-row">
                    <div className="donation-avatar">{d.donorName[0]?.toUpperCase() || '?'}</div>
                    <div className="donation-info">
                      <div className="donation-name">{d.donorName}</div>
                      {d.message && <div className="donation-message">"{d.message}"</div>}
                      <div className="donation-time">{formatDate(d.createdAt)}</div>
                    </div>
                    <div>
                      <div className="donation-amount">฿{d.amount.toLocaleString()}</div>
                      <div className={`donation-status ${d.status}`}>{d.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      <style jsx>{`
        .page { display: flex; min-height: 100vh; background: #0f0520; color: #fff; font-family: 'Noto Sans Thai', sans-serif; }
        .sidebar { width: 220px; background: rgba(255,255,255,0.03); border-right: 1px solid rgba(255,255,255,0.07); padding: 24px 16px; display: flex; flex-direction: column; flex-shrink: 0; }
        .logo { font-size: 18px; font-weight: 800; padding: 8px; margin-bottom: 16px; }
        .nav-item { display: block; padding: 10px 12px; border-radius: 10px; font-size: 14px; cursor: pointer; color: rgba(255,255,255,0.6); }
        .nav-item.active { background: rgba(139,92,246,0.2); color: #c4b5fd; }
        .sidebar-bottom { margin-top: auto; }
        .user-info { display: flex; align-items: center; gap: 10px; padding: 12px 8px; margin-bottom: 8px; }
        .avatar { width: 36px; height: 36px; border-radius: 50%; }
        .user-name { font-size: 13px; font-weight: 700; }
        .user-id { font-size: 11px; color: rgba(255,255,255,0.4); }
        .signout-btn { width: 100%; padding: 8px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; color: #fca5a5; font-size: 13px; cursor: pointer; font-family: inherit; }
        .signout-btn:hover { background: rgba(239,68,68,0.25); }
        .main { flex: 1; padding: 32px; overflow-y: auto; }
        .page-title { font-size: 26px; font-weight: 800; margin: 0 0 24px; }
        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; }
        .stat-label { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-value { font-size: 28px; font-weight: 800; }
        .stat-value.purple { color: #c4b5fd; }
        .stat-value.green { color: #86efac; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 16px; font-weight: 700; margin: 0 0 16px; }
        .url-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px 20px; margin-bottom: 12px; }
        .url-label { font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 10px; }
        .url-row { display: flex; align-items: center; gap: 12px; }
        .url-text { flex: 1; font-size: 13px; color: #a78bfa; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); border-radius: 8px; padding: 8px 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; }
        .copy-btn { padding: 8px 16px; background: rgba(139,92,246,0.3); border: 1px solid #8b5cf6; border-radius: 8px; color: #c4b5fd; font-size: 13px; cursor: pointer; white-space: nowrap; font-family: inherit; flex-shrink: 0; }
        .copy-btn.overlay { background: rgba(236,72,153,0.2); border-color: #ec4899; color: #f9a8d4; }
        .test-btn { padding: 8px 16px; background: rgba(16,185,129,0.2); border: 1px solid #10b981; border-radius: 8px; color: #86efac; font-size: 13px; cursor: pointer; font-family: inherit; }
        .test-btn:hover { background: rgba(16,185,129,0.35); }
        .url-hint { font-size: 12px; color: rgba(255,255,255,0.4); margin: 10px 0 0; line-height: 1.5; }
        .donation-list { display: flex; flex-direction: column; gap: 10px; }
        .donation-row { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; }
        .donation-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #8b5cf6, #ec4899); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; flex-shrink: 0; }
        .donation-info { flex: 1; }
        .donation-name { font-weight: 700; font-size: 15px; }
        .donation-message { font-size: 13px; color: rgba(255,255,255,0.6); font-style: italic; margin-top: 2px; }
        .donation-time { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 4px; }
        .donation-amount { font-size: 20px; font-weight: 800; color: #86efac; text-align: right; }
        .donation-status { font-size: 11px; text-align: right; margin-top: 2px; }
        .donation-status.succeeded { color: #34d399; }
        .donation-status.pending { color: #fbbf24; }
        .empty { text-align: center; color: rgba(255,255,255,0.4); padding: 40px; background: rgba(255,255,255,0.03); border-radius: 14px; border: 1px dashed rgba(255,255,255,0.1); }
      `}</style>
      <style global jsx>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>
    </>
  )
}
