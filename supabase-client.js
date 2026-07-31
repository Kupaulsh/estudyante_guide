/* =========================================================
   SUPABASE CLIENT
   Fill these in from your Supabase project:
   Dashboard → Settings → API → Project URL / anon public key
========================================================= */
var SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';       // e.g. https://xxxxxxxx.supabase.co
var SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_PUBLIC_KEY';

// Guarded so that if this file accidentally gets included twice on the page,
// it reuses the existing client instead of crashing with a redeclaration error.
if (typeof supabase === 'undefined' || !supabase || !supabase.auth) {
  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

