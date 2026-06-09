import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { NextAuthOptions } from 'next-auth'
import { prisma } from './prisma'
import '../types'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string
        token.streamerId = user.streamerId ?? null
      }
      if (trigger === 'update' && session?.streamerId) {
        token.streamerId = session.streamerId as string
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.streamerId = token.streamerId ?? null
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
