// ============================================================
// lib/scheduler.js
// Runs all scrapers on a daily schedule using node-cron.
// Also exports runNow() for manual one-off runs.
// ============================================================
const cron = require('node-cron')
const { scrapeJayaGrocer } = require('../scrapers/jayagrocer')
const { scrapeLotuss }     = require('../scrapers/lotuss')

async function runAll() {
  const start = Date.now()
  console.log('\n================================================')
  console.log('🚀 MyGroceryPricer — scrape started')
  console.log(`   ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} (MYT)`)
  console.log('================================================\n')

  try {
    await scrapeJayaGrocer()
  } catch (e) {
    console.error('❌ Jaya Grocer scrape failed:', e.message)
  }

  try {
    await scrapeLotuss()
  } catch (e) {
    console.error("❌ Lotus's scrape failed:", e.message)
  }

  const mins = ((Date.now() - start) / 60000).toFixed(1)
  console.log('\n================================================')
  console.log(`✅ All scrapers done in ${mins} minutes`)
  console.log('================================================\n')
}

// Run immediately (useful for first deploy or manual trigger)
async function runNow() {
  await runAll()
}

// Schedule: every day at 3:00 AM Malaysia time
// Cron format: minute hour day month weekday
function startScheduler() {
  console.log('⏰ Scheduler started — scraper runs daily at 3:00 AM MYT')
  cron.schedule('0 3 * * *', runAll, {
    timezone: 'Asia/Kuala_Lumpur',
  })
}

module.exports = { startScheduler, runNow, runAll }
