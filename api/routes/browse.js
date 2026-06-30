// ============================================================
// api/routes/browse.js
// GET /api/browse?store=Jaya+Grocer            — all items in store
// GET /api/browse?store=Jaya+Grocer&q=chicken  — search within store
// GET /api/browse?store=Jaya+Grocer&page=2     — pagination
// Used by Inventra's "browse store" screen
// ============================================================
const express  = require('express')
const router   = express.Router()
const supabase = require('../../lib/supabase')

const PAGE_SIZE = 30

router.get('/', async (req, res) => {
  const { store, q, page = 1 } = req.query

  if (!store) {
    return res.status(400).json({
      error: 'Query parameter "store" is required',
      example: '/api/browse?store=Jaya Grocer',
    })
  }

  const from = (parseInt(page) - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  try {
    let query = supabase
      .from('store_prices')
      .select('store_name, product_name, description, price, original_price, image_url, product_url', { count: 'exact' })
      .ilike('store_name', `%${store}%`)
      .order('product_name')
      .range(from, to)

    if (q) {
      query = query.ilike('product_name', `%${q}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    const results = data.map(item => ({
      ...item,
      is_promotion: !!(item.original_price && item.original_price > item.price),
      discount_pct: item.original_price && item.original_price > item.price
        ? Math.round((1 - item.price / item.original_price) * 100)
        : null,
    }))

    res.json({
      store,
      page:        parseInt(page),
      page_size:   PAGE_SIZE,
      total_count: count,
      has_more:    to + 1 < count,
      results,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router