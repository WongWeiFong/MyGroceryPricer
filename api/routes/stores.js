// ============================================================
// api/routes/stores.js
// GET /api/stores          — list all stores + product counts
// GET /api/promotions      — all current promotions
// GET /api/promotions?store=Jaya+Grocer — filter by store
// GET /api/health          — API health check
// ============================================================
const express  = require('express')
const router   = express.Router()
const supabase = require('../../lib/supabase')

// GET /api/stores — list all stores with stats
router.get('/stores', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('store_prices')
      .select('store_name, scraped_at')
      .order('store_name')

    if (error) throw error

    // Aggregate by store
    const storeMap = {}
    for (const row of data) {
      if (!storeMap[row.store_name]) {
        storeMap[row.store_name] = { count: 0, last_scraped: null }
      }
      storeMap[row.store_name].count++
      const t = new Date(row.scraped_at)
      if (!storeMap[row.store_name].last_scraped || t > new Date(storeMap[row.store_name].last_scraped)) {
        storeMap[row.store_name].last_scraped = row.scraped_at
      }
    }

    const stores = Object.entries(storeMap).map(([name, info]) => ({
      store_name:   name,
      product_count: info.count,
      last_scraped: info.last_scraped,
    }))

    res.json({ count: stores.length, stores })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/promotions — all items currently on promotion
router.get('/promotions', async (req, res) => {
  const { store, limit = 50 } = req.query

  try {
    let query = supabase
      .from('store_prices')
      .select('store_name, product_name, price, original_price, image_url, product_url')
      .not('original_price', 'is', null)
      .order('scraped_at', { ascending: false })
      .limit(parseInt(limit))

    if (store) query = query.ilike('store_name', `%${store}%`)

    const { data, error } = await query
    if (error) throw error

    // Only return genuine promotions (original > current price)
    const promos = data
      .filter(p => p.original_price && p.original_price > p.price)
      .map(p => ({
        ...p,
        discount_pct: Math.round((1 - p.price / p.original_price) * 100),
        savings:      (p.original_price - p.price).toFixed(2),
      }))
      .sort((a, b) => b.discount_pct - a.discount_pct) // highest discount first

    res.json({ count: promos.length, promotions: promos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/health — check API is alive and DB is connected
router.get('/health', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('store_prices')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    res.json({
      status:        'ok',
      total_products: count,
      timestamp:     new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message })
  }
})

module.exports = router
