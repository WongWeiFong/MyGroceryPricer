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
      'GET /api/promotions':                   'All current promotions',
      'GET /api/stores':                       'List all stores and product counts',
      'GET /api/health':                       'Health check + total product count',
    },
  })
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
    console.log(`   Try: http://localhost:${PORT}/api/health\n`)
  })
}

module.exports = { startServer }