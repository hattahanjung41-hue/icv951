# ICV Akselerasi 951 — Memory Wall

A production digital guest book for **ICV AKSELERASI 951 · Recharge & Rise Together**
(Saoka Beach Resort, 12 Sept 2026). Guests scan a QR code, upload photos from their
phones, and those moments appear on a public Memory Wall and a cinematic Live Display
for the venue's TV/projector — all in real time.

Design language: sand/beige, ocean blue, tropical green and warm sun-orange, taken
from the event flyer and backdrop, translated into a clean editorial UI rather than a
literal copy of the artwork. Guest photos are always the hero.

## Routes

| Route       | Purpose                                             | Device            |
|-------------|------------------------------------------------------|-------------------|
| `/`         | Branded landing page                                  | Mobile-first       |
| `/guest`    | Upload photos → this is what the event QR code opens  | Mobile             |
| `/memories` | Public, view-only Memory Wall, newest first            | Mobile / Desktop  |
| `/live`     | Auto-looping cinematic slideshow, silent, 16:9         | TV / Projector    |
| `/admin`    | PIN-protected control panel: moderation + live control | Desktop            |

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com) (the free tier easily
   covers ~80 guests / ~1,600 photos for a one-day event).
2. Open **SQL Editor** and run, in order:
   1. `supabase/schema.sql` — tables, RLS policies, realtime.
   2. `supabase/storage.sql` — the `memory-photos` bucket + its policies.
3. In **Authentication → Users**, create one user per event operator
   (email + password) — this becomes their Admin login.
4. In **SQL Editor**, grant each of those users admin access:

   ```sql
   insert into admins (user_id)
   values ('paste-the-user-id-from-auth.users-here');
   ```

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
**Project Settings → API** in Supabase. Never put the `service_role` key
in this file or anywhere in the frontend.

```bash
npm install
npm run dev
```

## 3. Deploy

Any static host that supports a Vite/React SPA works (Vercel is the easiest):

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, and set `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project
settings (same values as your `.env`). Because all routes are client-side,
make sure the host rewrites unknown paths to `index.html` (Vercel does
this automatically for Vite projects).

## 4. Print the QR code

Point the event QR code directly at:

```
https://your-deployed-domain.com/guest
```

so guests land straight on the upload form — no extra taps.

## 5. On the day

- Open `/live` full-screen on the venue TV/projector (no sound needed —
  the venue's PA system handles audio).
- Open `/admin` on a laptop for moderation and live-display control
  (pause/resume, duration, shuffle, hide/delete).
- Share `/memories` or the root `/` link with guests who want to browse
  afterwards.

## How the pieces fit together

- **Compression** happens entirely in the guest's browser
  (`src/lib/imageCompression.ts`, `browser-image-compression`) before
  anything is uploaded — resized to ~1920px, targeting ~500KB, WEBP with
  a JPEG fallback for browsers/devices that can't encode WEBP.
- **Upload** runs through a 3-at-a-time concurrency queue
  (`src/pages/Guest.tsx`) with per-photo status and a **Retry Failed**
  action that only re-sends the photos that actually failed.
- **One submission = one memory.** A memory's cover photo is derived
  from `memory_photos.is_cover`, chosen by the guest before submitting
  (defaults to the first photo).
- **Realtime** uses Supabase's Postgres change feed on `memories` and
  `memory_photos`; the Memory Wall and Live Display both subscribe and
  refresh automatically — no manual refresh needed anywhere.
- **Live Display state machine** (`src/pages/Live.tsx`) keeps a normal
  loop order plus a separate interruption queue. New memories are
  appended to the interruption queue and shown next, without losing the
  normal loop's position or restarting from the top. If the currently
  displayed memory is hidden or deleted, the display skips ahead
  immediately. A temporary network drop keeps showing the last-loaded
  set of memories instead of going blank.
- **Admin** distinguishes **Hide** (reversible, pulls a memory off all
  public surfaces instantly) from **Delete** (permanent, also removes
  the Storage objects so nothing is orphaned).
- **RLS** allows guests to insert memories/photos and read only visible
  ones, with no login required; every mutation an admin needs (hide,
  delete, live settings) requires a Supabase Auth session whose user id
  is present in the `admins` table.

## Scale notes

Designed for ~80 guests × up to 20 photos (~1,600 photos): the Memory
Wall paginates in batches of 24, images are lazy-loaded, and the Live
Display only ever holds the current photo at full resolution.
