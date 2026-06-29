// ============================================================
// index.js — main entry point
// Starts both the Express API server and the daily scraper
// scheduler at the same time.
//
// Usage:
//   node index.js              → starts API + scheduler
//   npm run scrape             → run scraper once manually
// ============================================================
require('dotenv').config()

const { startServer }    = require('./api/server')
const { startScheduler, runNow } = require('./lib/scheduler')

// If called with --scrape flag, just run once and exit
if (process.argv.includes('--scrape')) {
  console.log('🔧 Manual scrape mode — running once then exiting')
  runNow().then(() => process.exit(0)).catch(e => {
    console.error(e)
    process.exit(1)
  })
} else {
  // Normal mode: start API server + daily scheduler
  startServer()
  startScheduler()

  // Also run scraper immediately on first start so data
  // is populated right away (instead of waiting until 3am)
  console.log('⚡ Running initial scrape on startup...')
  runNow().catch(e => console.error('Initial scrape error:', e.message))
}
