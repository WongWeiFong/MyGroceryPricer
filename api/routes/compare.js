// ============================================================
// api/routes/compare.js
// GET /api/compare?q=chicken
// Groups results by similar product name, shows price from
// each store side by side, flags cheapest option.
// This is the main endpoint Inventra uses for price comparison.
// ============================================================
const express  = require('express')
const router   = express.Router()
const supabase = require('../../lib/supabase')

// Normalise product names for grouping
// e.g. "Fresh Whole Chicken 1kg" and "Whole Chicken 1KG" → similar
function normalise(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')   // remove special chars
    .replace(/\s+/g, ' ')
    .trim()
}

// Simple similarity — share enough words to be the "same" product
function isSimilar(a, b) {
  const wa = new Set(normalise(a).split(' ').filter(w => w.length > 3))
  const wb = new Set(normalise(b).split(' ').filter(w => w.length > 3))
  let shared = 0
  wa.forEach(w => { if (wb.has(w)) shared++ })
  return shared >= 2
}

router.get('/', async (req, res) => {
  const { q, limit = 50 } = req.query

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: 'Query parameter "q" is required',
      example: '/api/compare?q=chicken',
    })
  }

  try {
    const { data, error } = await supabase
      .from('store_prices')
      .select('store_name, product_name, price, original_price, image_url, product_url, scraped_at')
      .ilike('product_name', `%${q.trim()}%`)
      .order('price', { ascending: true })
      .limit(parseInt(limit))

    if (error) throw error
    if (!data || data.length === 0) {
      return res.json({ query: q.trim(), products: [] })
    }

    // Group by similar product name
    const groups = []

    for (const item of data) {
      // Find existing group this item belongs to
      const existing = groups.find(g => isSimilar(g.canonical_name, item.product_name))

      if (existing) {
        existing.store_prices.push({
          store:          item.store_name,
          price:          item.price,
          original_price: item.original_price,
          product_url:    item.product_url,
          is_promotion:   !!(item.original_price && item.original_price > item.price),
          discount_pct:   item.original_price && item.original_price > item.price
            ? Math.round((1 - item.price / item.original_price) * 100)
            : null,
        })
      } else {
        groups.push({
          canonical_name: item.product_name,
          image_url:      item.image_url,
          scraped_at:     item.scraped_at,
          store_prices: [{
            store:          item.store_name,
            price:          item.price,
            original_price: item.original_price,
            product_url:    item.product_url,
            is_promotion:   !!(item.original_price && item.original_price > item.price),
            discount_pct:   item.original_price && item.original_price > item.price
              ? Math.round((1 - item.price / item.original_price) * 100)
              : null,
          }],
        })
      }
    }

    // Sort each group's store_prices by price ascending
    // and flag the cheapest store
    const products = groups.map(g => {
      const sorted  = g.store_prices.sort((a, b) => a.price - b.price)
      const minPrice = sorted[0].price

      return {
        name:       g.canonical_name,
        image_url:  g.image_url,
        scraped_at: g.scraped_at,
        stores:     sorted.map(s => ({
          ...s,
          cheapest: s.price === minPrice,
        })),
        // Convenience fields for Inventra
        cheapest_store: sorted[0].store,
        cheapest_price: sorted[0].price,
        price_range: sorted.length > 1
          ? { min: sorted[0].price, max: sorted[sorted.length - 1].price }
          : null,
      }
    })

    res.json({
      query:    q.trim(),
      count:    products.length,
      products,
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
