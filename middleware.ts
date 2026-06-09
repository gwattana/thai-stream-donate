import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    if (token) {
      const hasNickname = !!token.streamerId

      // Logged in but no nickname → force to onboarding
      if (!hasNickname && pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }

      // Logged in with nickname, trying to access /onboarding or /login → dashboard
      if (hasNickname && (pathname === '/onboarding' || pathname === '/login')) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Return true to allow withAuth to proceed (it handles redirect to /login if no token)
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

// Apply to these routes only
export const config = {
  matcher: ['/dashboard', '/onboarding'],
}
