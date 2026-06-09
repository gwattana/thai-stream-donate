import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.replace('/login')
    } else if (!session.user.streamerId) {
      router.replace('/onboarding')
    } else {
      router.replace('/dashboard')
    }
  }, [session, status])

  return <div style={{ background: '#0f0520', minHeight: '100vh' }} />
}
