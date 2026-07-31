/* =========================================================
   SUPABASE CLIENT
   Fill these in from your Supabase project:
   Dashboard → Settings → API → Project URL / anon public key
========================================================= */
const SUPABASE_URL = 'https://qdzxnaylxbckozcyjodq.supabase.co';       
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkenhuYXlseGJja296Y3lqb2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzkyMjUsImV4cCI6MjEwMTA1NTIyNX0.z9JPCQdLx7EQycPf1BzXHPN6cMUQutzvJ_L6TSvxZ-0';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
