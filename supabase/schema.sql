-- ============================================================
-- ICV AKSELERASI 951 — Memory Wall
-- Run this in the Supabase SQL editor (Project → SQL Editor).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  guest_name text,
  message text,
  cover_photo_id uuid, -- informational only; UI derives cover from memory_photos.is_cover
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_name_length check (guest_name is null or char_length(guest_name) <= 80),
  constraint message_length check (message is null or char_length(message) <= 400)
);

create index if not exists idx_memories_visible_created
  on memories (is_hidden, created_at desc);

create table if not exists memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories (id) on delete cascade,
  storage_path text not null,
  width int,
  height int,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  constraint max_20_photos_enforced_at_app_layer check (true)
);

create index if not exists idx_memory_photos_memory_id
  on memory_photos (memory_id, sort_order);

-- One row, singleton table controlling the /live route.
create table if not exists live_settings (
  id int primary key default 1,
  display_duration_seconds int not null default 8,
  shuffle boolean not null default false,
  auto_loop boolean not null default true,
  interruption_enabled boolean not null default true,
  is_paused boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);

insert into live_settings (id) values (1)
  on conflict (id) do nothing;

-- Admins allow-list. Add rows here (or via Supabase Auth admin UI +
-- this table) for each event operator's auth.users id.
create table if not exists admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Helper: is the current request from a signed-in admin?
-- SECURITY DEFINER so it can read `admins` regardless of caller RLS.
-- ------------------------------------------------------------

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from admins where user_id = auth.uid()
  );
$$;

-- Keep updated_at fresh.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_memories_updated_at on memories;
create trigger trg_memories_updated_at
  before update on memories
  for each row execute function set_updated_at();

drop trigger if exists trg_live_settings_updated_at on live_settings;
create trigger trg_live_settings_updated_at
  before update on live_settings
  for each row execute function set_updated_at();

-- Server-side backstop for the 20-photos-per-memory rule
-- (the guest UI already enforces this; this just guards the API directly).
create or replace function enforce_max_20_photos()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from memory_photos where memory_id = new.memory_id) >= 20 then
    raise exception 'A memory cannot have more than 20 photos';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_max_20_photos on memory_photos;
create trigger trg_enforce_max_20_photos
  before insert on memory_photos
  for each row execute function enforce_max_20_photos();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table memories enable row level security;
alter table memory_photos enable row level security;
alter table live_settings enable row level security;
alter table admins enable row level security;

-- memories -----------------------------------------------------

drop policy if exists "public can read visible memories" on memories;
create policy "public can read visible memories"
  on memories for select
  using (is_hidden = false or is_admin());

drop policy if exists "guests can create memories" on memories;
create policy "guests can create memories"
  on memories for insert
  with check (is_hidden = false);

drop policy if exists "admins can update memories" on memories;
create policy "admins can update memories"
  on memories for update
  using (is_admin())
  with check (true);

drop policy if exists "admins can delete memories" on memories;
create policy "admins can delete memories"
  on memories for delete
  using (is_admin());

-- memory_photos --------------------------------------------------

drop policy if exists "public can read photos of visible memories" on memory_photos;
create policy "public can read photos of visible memories"
  on memory_photos for select
  using (
    is_admin()
    or exists (
      select 1 from memories m
      where m.id = memory_photos.memory_id and m.is_hidden = false
    )
  );

drop policy if exists "guests can add photos to any memory" on memory_photos;
create policy "guests can add photos to any memory"
  on memory_photos for insert
  with check (true);

drop policy if exists "admins can delete photos" on memory_photos;
create policy "admins can delete photos"
  on memory_photos for delete
  using (is_admin());

drop policy if exists "admins can update photos" on memory_photos;
create policy "admins can update photos"
  on memory_photos for update
  using (is_admin());

-- live_settings ----------------------------------------------------

drop policy if exists "anyone can read live settings" on live_settings;
create policy "anyone can read live settings"
  on live_settings for select
  using (true);

drop policy if exists "admins can update live settings" on live_settings;
create policy "admins can update live settings"
  on live_settings for update
  using (is_admin())
  with check (true);

-- admins -------------------------------------------------------------

drop policy if exists "admins can read the admin list" on admins;
create policy "admins can read the admin list"
  on admins for select
  using (is_admin());

-- ------------------------------------------------------------
-- Realtime: make sure these tables broadcast changes.
-- ------------------------------------------------------------
alter publication supabase_realtime add table memories;
alter publication supabase_realtime add table memory_photos;
alter publication supabase_realtime add table live_settings;
