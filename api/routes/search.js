// ============================================================
// api/routes/search.js
// GET /api/search?q=chicken
// GET /api/search?q=chicken&store=Jaya+Grocer
// GET /api/search?q=chicken&limit=20
// Returns all matching products across stores
// ============================================================
const express  = require('express')
const router   = express.Router()
const supabase = require('../../lib/supabase')

router.get('/', async (req, res) => {
  const { q, store, limit = 20 } = req.query

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: 'Query parameter "q" is required and must be at least 2 characters',
      example: '/api/search?q=chicken',
    })
  }

  try {
    let query = supabase
      .from('store_prices')
      .select('store_name, product_name, description, price, original_price, image_url, product_url, scraped_at')
      .ilike('product_name', `%${q.trim()}%`)
      .order('price', { ascending: true })
      .limit(parseInt(limit))

    // Optional store filter
    if (store) {
      query = query.ilike('store_name', `%${store}%`)
    }

    const { data, error } = await query
    if (error) throw error

    // Flag items on promotion
    const results = data.map(item => ({
      ...item,
      is_promotion: item.original_price && item.original_price > item.price,
      discount_pct: item.original_price && item.original_price > item.price
        ? Math.round((1 - item.price / item.original_price) * 100)
        : null,
    }))

    res.json({
      query:   q.trim(),
      count:   results.length,
      results,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
