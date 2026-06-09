/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Stripe webhook raw body parsing
  api: {
    bodyParser: false,
  },
}

module.exports = nextConfig
