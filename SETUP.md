# ThaiStream Donate — Setup Guide

## สิ่งที่ต้องมี
- Node.js 18+
- Stripe account (https://dashboard.stripe.com)
- Server ที่รัน 24/7 เช่น Railway, Render, VPS (ต้องรองรับ WebSocket)

---

## 1. ติดตั้ง

```bash
cd thai-stream-donate
npm install
```

---

## 2. ตั้งค่า Environment Variables

คัดลอก `.env.example` → `.env.local`

```bash
cp .env.example .env.local
```

แก้ไขค่าใน `.env.local`:

| ตัวแปร | ที่มา |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Publishable key |
| `STRIPE_WEBHOOK_SECRET` | ดูขั้นตอนที่ 3 |
| `NEXT_PUBLIC_BASE_URL` | URL ของ server คุณ เช่น `https://mystream.railway.app` |
| `NEXT_PUBLIC_WS_URL` | เหมือนกัน แต่ใช้ `wss://` แทน `https://` |

> ⚠️ ต้องเปิดใช้ **PromptPay** ใน Stripe Dashboard → Settings → Payment methods ก่อน

---

## 3. ตั้งค่า Stripe Webhook

**Local development:**
```bash
stripe listen --forward-to localhost:3000/api/webhook
# คัดลอก whsec_... มาใส่ใน STRIPE_WEBHOOK_SECRET
```

**Production:**
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://your-domain.com/api/webhook`
3. Events: เลือก `payment_intent.succeeded`
4. คัดลอก Signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 4. รัน

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

---

## 5. สร้าง Streamer ID

เปิด `http://localhost:3000` → กรอก Streamer ID (ตัวอักษร+ตัวเลข ไม่มีช่องว่าง) → กด Enter

หรือเข้าตรงที่:
- **Dashboard:** `/dashboard/YOUR_ID`
- **Donate page (แชร์แฟนคลับ):** `/donate/YOUR_ID`
- **Overlay URL:** `/overlay/YOUR_ID`

---

## 6. ตั้งค่า Streamlabs

1. เปิด Streamlabs → Scene ที่ต้องการ
2. **Sources** → กด `+` → **Browser Source**
3. ตั้งค่า:
   - **URL:** `https://your-domain.com/overlay/YOUR_ID`
   - **Width:** `1920`
   - **Height:** `1080`
   - ✅ **Shutdown source when not visible**
   - ✅ **Refresh browser when scene becomes active**
4. กด OK — Alert จะโผล่ที่มุมล่างซ้ายของหน้าจอ

---

## Flow การทำงาน

```
แฟนคลับ → /donate/ID → กรอกเงิน → Stripe สร้าง PromptPay QR
    → แฟนคลับสแกนจ่าย → Stripe Webhook → /api/webhook
    → บันทึก donation + ส่ง WebSocket → Overlay แสดง Alert popup
```

---

## Production Deployment (Railway)

```bash
# 1. Push code ขึ้น GitHub
# 2. Railway → New Project → Deploy from GitHub
# 3. ตั้งค่า Environment Variables ใน Railway dashboard
# 4. Railway รองรับ WebSocket โดยค่าเริ่มต้น ✅
```

---

## Database (Production)

ตอนนี้ใช้ in-memory store (ข้อมูลหายเมื่อ restart)
สำหรับ production ให้แก้ `lib/store.js` ให้ใช้:
- **PostgreSQL** (แนะนำ) — ใช้ `@vercel/postgres` หรือ `pg`
- **MongoDB** — ใช้ `mongoose`
- **PlanetScale** (MySQL)
