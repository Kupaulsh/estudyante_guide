/* =========================================================
   SUPABASE CLIENT
   Fill these in from your Supabase project:
   Dashboard → Settings → API → Project URL / anon public key
========================================================= */
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';       // e.g. https://xxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_PUBLIC_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
