// ============================================================
// scrapers/lotuss.js
// Lotus's is a JavaScript SPA — we use Puppeteer (headless
// Chrome) to render it fully, then extract product data.
//
// FIRST RUN SETUP:
// Open Chrome → go to lotuss.com.my → press F12 → Network tab
// → filter by Fetch/XHR → search for any product → look for a
// request returning JSON with product arrays → copy that URL.
// If you find a clean JSON API, replace the Puppeteer approach
// below with a simple axios.get() call instead — much faster.
// ============================================================
const supabase = require('../lib/supabase')

// Search terms to scrape — add more as needed
const SEARCH_TERMS = [
  'chicken', 'beef', 'fish', 'prawn', 'egg',
  'milk', 'rice', 'cooking oil', 'sugar', 'flour',
  'shampoo', 'toothpaste', 'soap', 'detergent',
  'mineral water', 'bread', 'butter', 'cheese',
]

const STORE_NAME = "Lotus's"
const BASE_URL   = 'https://www.lotuss.com.my/en'

async function scrapeLotuss() {
  console.log("\n🏪 Starting Lotus's scrape (headless browser)...")
  console.log("   This takes longer than Jaya Grocer — ~2 min per search term\n")

  let puppeteer
  try {
    puppeteer = require('puppeteer')
  } catch {
    console.error("   ❌ Puppeteer not installed. Run: npm install puppeteer")
    return
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',  // important for Railway/cloud
    ],
  })

  let grandTotal = 0

  for (const term of SEARCH_TERMS) {
    console.log(`  🔍 Searching "${term}"...`)
    const page = await browser.newPage()

    try {
      // Set realistic browser headers to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      await page.setViewport({ width: 1280, height: 800 })

      // Navigate to search results
      await page.goto(`${BASE_URL}/search?q=${encodeURIComponent(term)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      // Wait for product cards to appear
      await page.waitForSelector('[class*="product"], [class*="item-card"], .product-card', {
        timeout: 10000,
      }).catch(() => console.log(`     No products found for "${term}"`))

      // Scroll down to trigger lazy-loaded products
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await new Promise(r => setTimeout(r, 2000))

      // Extract product data from the rendered page
      const products = await page.evaluate((storeName) => {
        const results = []

        // Lotus's uses different class names — try multiple selectors
        const cards = document.querySelectorAll(
          '[class*="ProductCard"], [class*="product-card"], [class*="ProductItem"], [class*="item-card"]'
        )

        cards.forEach(card => {
          try {
            // Try multiple possible selectors for each field
            const nameEl  = card.querySelector('[class*="name"], [class*="title"], h3, h4')
            const priceEl = card.querySelector('[class*="price"]:not([class*="original"]):not([class*="was"])')
            const origEl  = card.querySelector('[class*="original"], [class*="was"], [class*="strike"]')
            const imgEl   = card.querySelector('img')
            const linkEl  = card.querySelector('a')

            const name  = nameEl?.textContent?.trim()
            const price = parseFloat(priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0')

            if (!name || !price) return

            results.push({
              store_name:     storeName,
              product_name:   name,
              description:    null,
              price:          price,
              original_price: origEl
                ? parseFloat(origEl.textContent.replace(/[^0-9.]/g, '')) || null
                : null,
              image_url:      imgEl?.src || imgEl?.getAttribute('data-src') || null,
              product_url:    linkEl?.href || null,
              barcode:        null,
              scraped_at:     new Date().toISOString(),
            })
          } catch {}
        })

        return results
      }, STORE_NAME)

      if (products.length > 0) {
        const { error } = await supabase
          .from('store_prices')
          .upsert(products, { onConflict: 'store_name,product_name' })

        if (error) {
          console.error(`     ❌ DB error: ${error.message}`)
        } else {
          grandTotal += products.length
          console.log(`     ✓ ${products.length} products saved`)
        }
      } else {
        console.log(`     ⚠ 0 products found — Lotus's may have changed their HTML structure`)
        console.log(`       → Open DevTools on lotuss.com.my and check current class names`)
      }

    } catch (err) {
      console.error(`     ❌ Error scraping "${term}": ${err.message}`)
    } finally {
      await page.close()
    }

    // Polite delay between searches
    await new Promise(r => setTimeout(r, 3000))
  }

  await browser.close()
  console.log(`\n✅ Lotus's done — ${grandTotal} products total`)
}

module.exports = { scrapeLotuss }
