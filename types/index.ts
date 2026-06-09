import type { DefaultSession } from 'next-auth'

// ── Donation ───────────────────────────────────────────────────────────────────

export interface Donation {
  id: string
  donorName: string
  message: string | null
  amount: number        // baht (already divided from satangs)
  status: 'pending' | 'succeeded'
  createdAt: string
}

export interface AlertPayload {
  id: string
  donorName: string
  message: string | null
  amount: number
}

// ── NextAuth session augmentation ─────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      streamerId?: string | null
    } & DefaultSession['user']
  }

  interface User {
    streamerId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    streamerId?: string | null
  }
}

// ── WebSocket overlay clients (set by server.js) ──────────────────────────────

interface OverlayWsClient {
  readyState: number
  send: (data: string) => void
}

declare global {
  var overlayClients: Map<string, Set<OverlayWsClient>> | undefined
}
