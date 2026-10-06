-- ============================================================
-- Open uploads to every guest (no login needed).
-- Paste this whole file into the Supabase SQL editor and Run, once.
-- Safe to re-run. schema.sql / storage.sql already contain the same rules.
-- ============================================================

-- memories: anyone can create a (visible) memory. Hiding, editing and
-- deleting stay admin-only (unchanged).
drop policy if exists "admins can create memories" on memories;
drop policy if exists "guests can create memories" on memories;
create policy "guests can create memories"
  on memories for insert
  with check (is_hidden = false);

-- memory_photos: anyone can attach photos, but only to a memory created in
-- the last hour — so nobody can add photos to someone else's older memory.
drop policy if exists "admins can add photos to any memory" on memory_photos;
drop policy if exists "guests can add photos to any memory" on memory_photos;
drop policy if exists "guests can add photos to new memories" on memory_photos;
create policy "guests can add photos to new memories"
  on memory_photos for insert
  with check (
    is_admin()
    or exists (
      select 1 from memories m
      where m.id = memory_photos.memory_id
        and m.created_at > now() - interval '1 hour'
    )
  );

-- storage: anyone can upload into the photo bucket. The bucket itself still
-- enforces images only (jpeg/png/webp) and 5 MB max per file.
drop policy if exists "admins can upload memory photos" on storage.objects;
drop policy if exists "guests can upload memory photos" on storage.objects;
create policy "guests can upload memory photos"
  on storage.objects for insert
  with check (bucket_id = 'memory-photos');
