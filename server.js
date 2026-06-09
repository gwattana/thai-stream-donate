// Custom Next.js server with WebSocket support for real-time overlay alerts
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { WebSocketServer } = require('ws')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Map: streamerId -> Set of WebSocket clients (overlay pages)
const overlayClients = new Map()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const { query } = parse(req.url, true)
    const streamerId = query.streamerId

    if (!streamerId) {
      ws.close()
      return
    }

    if (!overlayClients.has(streamerId)) {
      overlayClients.set(streamerId, new Set())
    }
    overlayClients.get(streamerId).add(ws)
    console.log(`[WS] Overlay connected for streamer: ${streamerId}`)

    ws.on('close', () => {
      overlayClients.get(streamerId)?.delete(ws)
      console.log(`[WS] Overlay disconnected for streamer: ${streamerId}`)
    })

    ws.on('error', (err) => {
      console.error(`[WS] Error for streamer ${streamerId}:`, err)
    })
  })

  // Expose to API routes via global
  global.overlayClients = overlayClients

  const port = process.env.PORT || 3000
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
    console.log(`> WebSocket server ready at ws://localhost:${port}/ws`)
  })
})
