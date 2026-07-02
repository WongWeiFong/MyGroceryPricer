// ============================================================
// api/server.js
// Express REST API — mounts all routes
// ============================================================
require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const searchRouter  = require('./routes/search')
const compareRouter = require('./routes/compare')
const storesRouter  = require('./routes/stores')
const browseRouter  = require('./routes/browse')

const app  = express()
const PORT = process.env.PORT || 3000

// ── Middleware ───────────────────────────────────────────────
app.use(cors())
app.use(express.json())

// ── Routes ───────────────────────────────────────────────────
app.use('/api/search',  searchRouter)
app.use('/api/compare', compareRouter)
app.use('/api/browse',  browseRouter)
app.use('/api',         storesRouter)   // /api/stores, /api/promotions, /api/health

// ── Root — API docs ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name:        'MyGroceryPricer API',
    version:     '1.1.0',
    description: 'Malaysian grocery price comparison API',
    endpoints: {
      'GET /api/search?q=chicken':             'Search products across all stores',
      'GET /api/compare?q=chicken':            'Compare prices across stores side by side',
      'GET /api/browse?store=Jaya+Grocer':     'Browse all items within one store',
      'GET /api/browse?store=X&q=chicken':     'Search within a specific store',
      'GET /health':                           'Browser health page that pings /api/health',
      'GET /api/promotions':                   'All current promotions',
      'GET /api/stores':                       'List all stores and product counts',
      'GET /api/health':                       'Health check + total product count',
    },
  })
})

// ── Health page — browser-friendly status view ──────────────
app.get('/health', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MyGroceryPricer Health</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f3eb;
        --card: #ffffff;
        --text: #1f2937;
        --muted: #6b7280;
        --ring: #d1d5db;
        --good: #166534;
        --good-bg: #dcfce7;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Arial, Helvetica, sans-serif;
        background: radial-gradient(circle at top, #fff7d6 0%, var(--bg) 45%, #ede8dc 100%);
        color: var(--text);
      }
      .card {
        width: min(560px, calc(100vw - 32px));
        background: var(--card);
        border: 1px solid var(--ring);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 12px;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 40px;
        line-height: 1.05;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 999px;
        background: var(--good-bg);
        color: var(--good);
        font-weight: 700;
        margin: 12px 0 20px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: currentColor;
      }
      .meta {
        display: grid;
        gap: 10px;
        color: var(--muted);
        font-size: 15px;
      }
      .meta strong {
        color: var(--text);
      }
      code {
        background: #f3f4f6;
        padding: 2px 8px;
        border-radius: 8px;
        color: #111827;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="eyebrow">Service health</div>
      <h1>MyGroceryPricer is running</h1>
      <div class="status"><span class="dot"></span><span id="status-label">RUNNING</span></div>
      <div class="meta">
        <div>API ping: <strong id="api-status">checking...</strong></div>
        <div>Total products: <code id="product-count">n/a</code></div>
        <div>Checked at: <code id="checked-at">${new Date().toISOString()}</code></div>
        <div>JSON endpoint: <code>/api/health</code></div>
      </div>
    </main>
    <script>
      fetch('/api/health')
        .then((response) => response.json().then((data) => ({ response, data })))
        .then(({ response, data }) => {
          const statusLabel = document.getElementById('status-label')
          const apiStatus = document.getElementById('api-status')
          const productCount = document.getElementById('product-count')
          const checkedAt = document.getElementById('checked-at')

          if (!response.ok) {
            statusLabel.textContent = 'DEGRADED'
            apiStatus.textContent = data.status || 'error'
            return
          }

          apiStatus.textContent = data.status || 'ok'
          productCount.textContent = data.total_products ?? 'n/a'
          checkedAt.textContent = data.timestamp || new Date().toISOString()
        })
        .catch(() => {
          document.getElementById('status-label').textContent = 'DEGRADED'
          document.getElementById('api-status').textContent = 'error'
        })
    </script>
  </body>
</html>`)
})

// ── 404 + error handlers ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', hint: 'Visit / to see all available endpoints' })
})

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

function startServer() {
  app.listen(PORT, () => {
    console.log(`\n🚀 MyGroceryPricer API running on http://localhost:${PORT}`)
    console.log(`   Try: http://localhost:${PORT}/health\n`)
  })
}

module.exports = { startServer }