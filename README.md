# ThaiStream Donate

A donation platform for Thai streamers. Viewers donate via PromptPay QR code, and streamers get real-time animated alerts with TTS in their Streamlabs overlay.

## Features

- **PromptPay donations** via Stripe — QR code generated instantly, auto-confirmed via webhook
- **Real-time overlay alerts** — animated popup with Google Cloud TTS (Thai voice)
- **Donation goal bar** — set a goal with a name, progress updates live on overlay
- **Streamer dashboard** — view donation history, copy links, send test alerts
- **Google OAuth only** — no passwords, streamers sign in with Google
- **Nickname-based URLs** — streamer sets a slug once at onboarding (`/donate/nickname`, `/overlay/nickname`)
- **Configurable minimum donation** — streamer sets their own minimum (floor: ฿10)
- **Anonymous donations** — donors don't need an account

## Tech Stack

- **Next.js 14** (Pages Router) + **TypeScript**
- **Custom Node.js server** (`server.js`) — Next.js + WebSocket on the same port
- **PostgreSQL** + **Prisma ORM**
- **NextAuth.js v4** — Google OAuth, JWT strategy, Prisma adapter
- **Stripe** — PromptPay payment method
- **Google Cloud Text-to-Speech** — Neural2-C Thai voice
- **ws** — WebSocket server for real-time overlay communication

## How It Works

```
Donor fills form → POST /api/create-payment-intent
  → Stripe PaymentIntent created (PromptPay)
  → QR code shown to donor
  → Donor scans QR in banking app
  → Stripe sends webhook → POST /api/webhook
    → Donation marked succeeded in DB
    → WebSocket broadcasts alert + goal update to overlay
    → Overlay plays TTS and shows animated popup
```

## Project Structure

```
server.js                        Custom server (Next.js + WebSocket)
lib/
  auth.ts                        NextAuth config
  prisma.ts                      Prisma client singleton
middleware.ts                    Route protection (dashboard, onboarding)
types/index.ts                   Shared types + NextAuth module augmentation
prisma/schema.prisma             Database schema
pages/
  index.tsx                      Redirect based on auth state
  login.tsx                      Google sign-in page
  onboarding.tsx                 Set streamer nickname (first time)
  dashboard/index.tsx            Streamer dashboard
  donate/[streamerId].tsx        Public donation page for viewers
  overlay/[streamerId].tsx       Streamlabs browser source (transparent)
  api/
    auth/[...nextauth].ts        NextAuth handler
    webhook.ts                   Stripe webhook handler
    create-payment-intent.ts     Create Stripe PaymentIntent
    tts.ts                       Google Cloud TTS proxy
    donations/[streamerId].ts    Fetch donation history
    goal/[streamerId].ts         Public goal state for overlay
    test-alert/[streamerId].ts   Send test alert to overlay
    user/
      set-nickname.ts            Set streamer slug
      check-nickname.ts          Check slug availability
      settings.ts                Update min donation
      goal.ts                    Set/reset donation goal
```

## Database Schema

```prisma
model User {
  streamerId    String?   @unique   // slug used in URLs
  minDonation   Int       @default(20)
  goalName      String?
  goalAmount    Int?
  goalCurrent   Int       @default(0)  // resets each session
}

model Donation {
  userId          String   // FK → User.id
  streamerId      String   // denormalized for fast lookup
  stripePaymentId String   @unique
  donorName       String
  message         String?
  amount          Int      // satangs (THB × 100)
  status          String   // pending | succeeded
}
```

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL
- Stripe account (test mode)
- Google Cloud project with TTS API enabled
- Google OAuth 2.0 credentials

### Setup

```bash
git clone https://github.com/your-username/thai-stream-donate
cd thai-stream-donate
npm install
```

Copy and fill in environment variables:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL=postgresql://user:password@localhost:5432/thaistream
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=           # openssl rand -base64 32

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

GOOGLE_TTS_API_KEY=
```

Run migrations and start:

```bash
npx prisma db push
npm run dev
```

### Stripe Webhook (local)

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Deployment (Render)

1. Push to GitHub
2. Create a **Web Service** on Render connected to your repo
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
3. Add a **PostgreSQL** service on Render — use the Internal Database URL as `DATABASE_URL`
4. Set all environment variables (`NEXTAUTH_URL` = your Render domain)
5. Run migration from your local machine:
   ```bash
   DATABASE_URL="<external-db-url>" npx prisma db push
   ```
6. Add your Render domain to Google OAuth authorized redirect URIs:
   ```
   https://your-domain.onrender.com/api/auth/callback/google
   ```
7. Create a Stripe webhook endpoint pointing to:
   ```
   https://your-domain.onrender.com/api/webhook
   ```
   Event: `payment_intent.succeeded`

## Streamlabs Setup

1. Go to **Dashboard** and copy the **Overlay URL**
2. In Streamlabs → Sources → Add → **Browser Source**
3. Paste the overlay URL, set **Width: 1920, Height: 1080**, enable **Transparent background**
4. Use **Test Alert** button in the dashboard to verify the connection

## Notes

- Stripe minimum for PromptPay is ฿10 — streamer cannot set minimum below this
- TTS is authenticated by `streamerId` (not session) so the overlay browser source can call it without login
- Donations are anonymous — donors do not need an account; a silent dummy email is passed to Stripe to satisfy its billing requirement
- The goal bar is session-based — streamer resets it manually from the dashboard
- WebSocket reconnects automatically every 3 seconds if the connection drops
