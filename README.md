# ✒️ note-think

Smart digital note-taking web app optimized for **Samsung S Pen** on Galaxy Note & Tab series.

## Features

| Feature | Details |
|---|---|
| ✒️ S Pen Drawing | Pressure-sensitive strokes via Pointer Events API |
| 🤚 Palm Rejection | Touch events blocked while S Pen is active |
| ⬜ Smart Eraser | S Pen side button (or toolbar button) triggers eraser |
| 🖊️ Tools | Pen, Marker (semi-transparent), Eraser |
| 🎨 Colors | 12 preset colors + custom color picker |
| ↩️ Undo / Redo | Full history stack, Ctrl+Z / Ctrl+Y shortcuts |
| ☁️ Cloud Save | Auto-saves every 3 seconds, manual Ctrl+S |
| 🔐 Auth | Email + password via Supabase Auth |
| 🛡️ Row Level Security | Users can only access their own notes (PostgreSQL RLS) |
| 📱 PWA | Installable on Samsung devices |

## Tech Stack

- **Next.js 16** (App Router, fullstack)
- **Supabase** — PostgreSQL database + Auth + Row Level Security
- **@supabase/ssr** — server-side session handling via cookies
- **Tailwind CSS** — styling
- **Canvas Pointer Events API** — S Pen input

## Getting Started

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Set up the database

In your Supabase Dashboard → **SQL Editor → New Query**, paste and run the contents of [`supabase/schema.sql`](./supabase/schema.sql).

This creates:
- `notes` table with `strokes` stored as JSONB
- Row Level Security policies (users only see their own notes)
- Auto-updated `updated_at` trigger

### 3. Install & configure

```bash
git clone <repo>
cd note-think
npm install

cp .env.local.example .env.local
# Edit .env.local with your Supabase keys
```

`.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run

```bash
npm run dev        # development
npm run build      # production build
npm start          # production server
```

Open [http://localhost:3000](http://localhost:3000)

## S Pen Tips

| Action | How |
|---|---|
| Draw | Touch screen with S Pen tip |
| Erase | Hold S Pen side button while drawing |
| Palm rejection | Rest hand freely — finger touches are auto-ignored |
| Pressure | Press harder for thicker lines |
| Undo | Ctrl+Z or toolbar button |
| Redo | Ctrl+Y or toolbar button |
| Save | Ctrl+S, or auto-saves every 3s |

## Project Structure

```
note-think/
├── app/
│   ├── page.tsx                   ← Landing page
│   ├── login/page.tsx             ← Sign in
│   ├── register/page.tsx          ← Create account
│   ├── dashboard/page.tsx         ← Notes grid
│   ├── note/[id]/page.tsx         ← Canvas editor
│   └── api/
│       ├── auth/callback/route.ts ← Supabase PKCE callback
│       └── notes/                 ← CRUD API routes
├── components/
│   ├── Canvas.tsx                 ← S Pen canvas (core)
│   ├── Toolbar.tsx                ← Drawing tools sidebar
│   └── NoteCard.tsx               ← Dashboard card
├── lib/
│   ├── supabase.ts                ← Browser client (anon key)
│   ├── supabase-server.ts         ← Server client (cookie session)
│   └── supabase-admin.ts          ← Admin client (service role)
├── supabase/
│   └── schema.sql                 ← Run this in Supabase SQL editor
└── proxy.ts                       ← Auth protection middleware
```

## Auth Flow

```
Register → Supabase Auth → (optional email confirm) → Dashboard
Login    → Supabase Auth → session cookie → Dashboard
API call → proxy.ts checks cookie session → 401 if not logged in
```
