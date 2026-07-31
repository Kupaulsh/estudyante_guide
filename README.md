# Student Helper

A calendar / schedule / subjects / activities / reviewers site for PCCM and TUP, backed by Supabase. Content is shared across every visitor and device; only admins (Google accounts on an allowlist) can edit it.

## File structure
```
index.html          — page shell
css/style.css        — all styling
js/supabase-client.js — your Supabase project keys go here
js/data.js            — all reads/writes to Supabase
js/app.js             — public-facing pages (calendar, subjects, reviewers, etc.)
js/admin.js           — Google sign-in + admin CRUD panel
sql/schema.sql         — run once in Supabase to create everything
pccm-logo.png / tup-logo.png — add these yourself (see below)
```

## 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New project.
2. Wait for it to finish provisioning (~2 min).

## 2. Run the schema
1. In your project, open **SQL Editor → New query**.
2. Open `sql/schema.sql` from this repo, paste the whole thing in.
3. **Before running**, find this line near the bottom and replace the email with your real Google account email:
   ```sql
   insert into admins (email) values ('YOUR_EMAIL@gmail.com')
   ```
4. Click **Run**. You should see "Success. No rows returned."

You can add more admins later any time by running:
```sql
insert into admins (email) values ('someone-else@gmail.com');
```

## 3. Enable Google sign-in
This needs a Google OAuth client — Supabase can't create one for you, but it's a short one-time setup:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create (or pick) a project.
2. **APIs & Services → OAuth consent screen** → set it up as **External**, fill in the app name/email, save.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: copy this from Supabase — go to your Supabase project → **Authentication → Providers → Google**, it shows a callback URL like:
     `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Paste that into Google's "Authorized redirect URIs", save.
4. Copy the generated **Client ID** and **Client Secret** from Google.
5. Back in Supabase: **Authentication → Providers → Google** → paste the Client ID and Client Secret → toggle it **on** → Save.
6. Still in Supabase: **Authentication → URL Configuration** → set **Site URL** to wherever you'll host this (e.g. your GitHub Pages URL) and add it under **Redirect URLs** too.

## 4. Connect the app to your project
1. In Supabase: **Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `js/supabase-client.js` in this repo and paste them in:
   ```js
   const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```

## 5. Add your logos (optional)
Drop `pccm-logo.png` and `tup-logo.png` (or `.jpg`) in the same folder as `index.html`. If they're missing, the landing page falls back to plain letter badges — nothing breaks either way.

## 6. Host it
Push this whole folder to a GitHub repo, then:
- **Settings → Pages → Deploy from branch** → pick `main` / root.
- Your site will be live at `https://yourusername.github.io/reponame/`.
- Go back to Supabase → **Authentication → URL Configuration** and make sure that exact URL is set as the Site URL / in Redirect URLs, or Google sign-in will bounce back with an error.

## Using it
- Anyone can view the site — no login needed to browse.
- Tap **Admin** on the landing page (or the school name inside the app → "Admin for PCCM/TUP") to sign in with Google and edit content: subjects, schedule, calendar events, activities, flashcards, quiz questions, syllabus/material links, FAQs, and rules — per school.
- Only Google accounts listed in the `admins` table can actually save changes (everyone else can sign in but will see "not on the admin list").
- Files aren't uploaded to Supabase — for syllabi/materials/PDFs, upload to Google Drive, share the link, and paste that link into Admin.
