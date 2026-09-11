-- ============================================================
-- Storage bucket for memory photos.
-- Run AFTER schema.sql, in the Supabase SQL editor.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-photos',
  'memory-photos',
  true, -- public read via getPublicUrl(), no signed URLs needed
  5242880, -- 5 MB hard ceiling per object (compressed photos target ~500KB)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone (including anonymous guests) can upload — matches the
-- "no login for guests" requirement. Objects always land under
-- {random-folder}/{photo-id}.{ext}, see src/pages/Guest.tsx.
drop policy if exists "guests can upload memory photos" on storage.objects;
create policy "guests can upload memory photos"
  on storage.objects for insert
  with check (bucket_id = 'memory-photos');

-- Public read (defense in depth; the public bucket flag already
-- allows unauthenticated GETs via the public URL).
drop policy if exists "anyone can view memory photos" on storage.objects;
create policy "anyone can view memory photos"
  on storage.objects for select
  using (bucket_id = 'memory-photos');

-- Only admins can delete storage objects.
drop policy if exists "admins can delete memory photos" on storage.objects;
create policy "admins can delete memory photos"
  on storage.objects for delete
  using (bucket_id = 'memory-photos' and is_admin());
