// ============================================================
// scrapers/jayagrocer.js
// Jaya Grocer runs on Shopify — every Shopify store exposes
// a free public /products.json endpoint. No browser needed.
// ============================================================
const axios    = require('axios')
const supabase = require('../lib/supabase')

// Each Jaya Grocer branch is a separate Shopify store.
// Add more branch URLs here as needed.
const BRANCHES = [
  { name: 'Jaya Grocer',  url: 'https://jgut.jayagrocer.com' },
  { name: 'Jaya Grocer kl',  url: 'https://klec.jayagrocer.com' },
  // { name: 'Jaya Grocer (Petaling Jaya)',  url: 'https://jgut.jayagrocer.com' },
  // { name: 'Jaya Grocer (KL East Mall)',  url: 'https://klec.jayagrocer.com' },
]

// Strip HTML tags from product descriptions
function stripHtml(html) {
  if (!html) return null
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)
}

// Scrape one branch — pages through all products 250 at a time
async function scrapeBranch(branch) {
  console.log(`\n  📦 Scraping ${branch.name}...`)
  let page  = 1
  let total = 0

  while (true) {
    let products
    try {
      const res = await axios.get(
        `${branch.url}/products.json?limit=250&page=${page}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyGroceryPricer/1.0)' },
          timeout: 15000,
        }
      )
      products = res.data.products
    } catch (err) {
      console.error(`  ❌ Page ${page} failed: ${err.message}`)
      break
    }

    // Empty page means we've reached the end
    if (!products || products.length === 0) break

    // Each product may have multiple variants (sizes/weights)
    // e.g. "Fresh Chicken" → "500g" variant + "1kg" variant
    const rows = []
    for (const p of products) {
      for (const v of p.variants) {
        const variantLabel = v.title !== 'Default Title' ? ` (${v.title})` : ''
        rows.push({
          store_name:     branch.name,
          product_name:   `${p.title}${variantLabel}`,
          description:    stripHtml(p.body_html),
          price:          parseFloat(v.price),
          original_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
          image_url:      p.images[0]?.src ?? null,
          product_url:    `${branch.url}/products/${p.handle}`,
          barcode:        v.barcode || null,
          scraped_at:     new Date().toISOString(),
        })
      }
    }

    // Upsert — insert new rows, update existing ones if price changed
    const { error } = await supabase
      .from('store_prices')
      .upsert(rows, { onConflict: 'store_name,product_name' })

    if (error) {
      console.error(`  ❌ DB upsert error: ${error.message}`)
    } else {
      total += rows.length
      console.log(`     Page ${page}: ${rows.length} products saved (total: ${total})`)
    }

    page++

    // Polite delay — avoid hammering the server
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`  ✅ ${branch.name} complete — ${total} products`)
  return total
}

// Main export — scrapes all branches sequentially
async function scrapeJayaGrocer() {
  console.log('🛒 Starting Jaya Grocer scrape...')
  let grandTotal = 0
  for (const branch of BRANCHES) {
    grandTotal += await scrapeBranch(branch)
  }
  console.log(`\n✅ Jaya Grocer done — ${grandTotal} products total`)
}

module.exports = { scrapeJayaGrocer }
