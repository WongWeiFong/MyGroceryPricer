# MyGroceryPricer

A self-hosted Malaysian grocery price scraper and REST API. Scrapes product prices from Jaya Grocer and Lotus's daily, stores them in Supabase, and exposes a clean API for any app to consume.

## Stores covered
| Store | Method | Status |
|-------|--------|--------|
| Jaya Grocer | Shopify JSON API | ✅ Working |
| Lotus's | Puppeteer (headless Chrome) | ✅ Working |
| More stores | Add in /scrapers/ | 🔜 Planned |

## Project structure
```
MyGroceryPricer/
├── scrapers/
│   ├── jayagrocer.js     ← Shopify JSON API scraper
│   └── lotuss.js         ← Puppeteer headless browser scraper
├── api/
│   ├── server.js         ← Express API server
│   └── routes/
│       ├── search.js     ← GET /api/search
│       ├── compare.js    ← GET /api/compare
│       └── stores.js     ← GET /api/stores, /promotions, /health
├── lib/
│   ├── supabase.js       ← Supabase client
│   └── scheduler.js      ← node-cron daily runner
└── index.js              ← entry point
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create .env file
```bash
cp .env.example .env
```
Fill in your Supabase URL and service role key.

### 3. Run the Supabase SQL
Run this in your Supabase SQL Editor to create the prices table:
```sql
create table store_prices (
  id uuid default gen_random_uuid() primary key,
  store_name text not null,
  product_name text not null,
  description text,
  price numeric not null,
  original_price numeric,
  image_url text,
  product_url text,
  barcode text,
  scraped_at timestamptz default now(),
  unique(store_name, product_name)
);

alter table store_prices enable row level security;
create policy "Public read" on store_prices for select using (true);
```

### 4. Start the server
```bash
npm start
```
This starts the API on port 3000 AND runs the scraper immediately, then daily at 3am MYT.

### 5. Run scraper manually (without starting API)
```bash
npm run scrape
```

## API Endpoints

### Search products
```
GET /api/search?q=chicken
GET /api/search?q=chicken&store=Jaya+Grocer
GET /api/search?q=chicken&limit=30
```

### Compare prices across stores
```
GET /api/compare?q=chicken
```
Returns products grouped by name with prices from each store and cheapest flagged.

### Promotions
```
GET /api/promotions
GET /api/promotions?store=Lotus
```

### Stores list
```
GET /api/stores
```

### Health check
```
GET /api/health
```

## Using this API in Inventra (or any other app)

```typescript
// mobile/lib/api/prices.ts
const PRICE_API = 'https://YOUR_RAILWAY_URL'

export async function comparePrices(query: string) {
  const res = await fetch(`${PRICE_API}/api/compare?q=${encodeURIComponent(query)}`)
  return res.json()
}

export async function getPromotions() {
  const res = await fetch(`${PRICE_API}/api/promotions`)
  return res.json()
}
```

## Deployment (Railway)

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select this repo
4. Add environment variables: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
5. Set start command: `node index.js`
6. Deploy — scraper runs daily automatically

## Adding a new store

1. Create `scrapers/newstore.js` following the pattern in `jayagrocer.js`
2. Import and call it in `lib/scheduler.js`
3. That's it — the API automatically includes the new store's data
