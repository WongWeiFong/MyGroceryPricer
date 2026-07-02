// ============================================================
// api/routes/stores.js (updated)
// GET /api/stores — now includes image_url from grocery_stores table
// ============================================================
const express  = require('express')
const router   = express.Router()
const supabase = require('../../lib/supabase')

router.get('/stores', async (req, res) => {
  try {
    const { data: priceData, error: priceError } = await supabase
      .from('store_prices')
      .select('store_name, scraped_at')
      .order('store_name')
    if (priceError) throw priceError

    const { data: storeData } = await supabase
      .from('grocery_stores')
      .select('store_name, display_name, image_url, banner_color, website_url, description')

    const storeMeta = {}
    if (storeData) {
      for (const s of storeData) storeMeta[s.store_name] = s
    }

    const storeMap = {}
    for (const row of priceData) {
      if (!storeMap[row.store_name]) storeMap[row.store_name] = { count: 0, last_scraped: null }
      storeMap[row.store_name].count++
      const t = new Date(row.scraped_at)
      if (!storeMap[row.store_name].last_scraped || t > new Date(storeMap[row.store_name].last_scraped))
        storeMap[row.store_name].last_scraped = row.scraped_at
    }

    function findMeta(branchName) {
      if (storeMeta[branchName]) return storeMeta[branchName]
      const chainName = branchName.split('(')[0].trim()
      return storeMeta[chainName] || null
    }

    const stores = Object.entries(storeMap).map(([name, info]) => {
      const meta = findMeta(name)
      return {
        store_name:    name,
        display_name:  meta?.display_name || name,
        product_count: info.count,
        last_scraped:  info.last_scraped,
        image_url:     meta?.image_url || null,
        banner_color:  meta?.banner_color || '#4A42B0',
        website_url:   meta?.website_url || null,
        description:   meta?.description || null,
      }
    })

    res.json({ count: stores.length, stores })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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
    const promos = data
      .filter(p => p.original_price && p.original_price > p.price)
      .map(p => ({ ...p, discount_pct: Math.round((1 - p.price / p.original_price) * 100), savings: (p.original_price - p.price).toFixed(2) }))
      .sort((a, b) => b.discount_pct - a.discount_pct)
    res.json({ count: promos.length, promotions: promos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/health', async (req, res) => {
  try {
    const { count, error } = await supabase.from('store_prices').select('*', { count: 'exact', head: true })
    if (error) throw error
    res.json({ status: 'ok', total_products: count, timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message })
  }
})

module.exports = router