// ============================================================
// lib/supabase.js
// Single Supabase client — uses service_role key for full
// read/write access. Never use this key in a frontend app.
// ============================================================
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

module.exports = supabase
