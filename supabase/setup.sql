-- Birthday party storage for the static site.
-- Paste this whole file into the Supabase SQL editor and run it.
-- Safe to run again: tables use IF NOT EXISTS, policies are replaced,
-- and the bucket upserts.
--
-- The anon key can only insert and select. It cannot update or delete.
-- The dashboard uses the service role, which bypasses these policies,
-- so you can still delete junk there.

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null check (status in ('yes', 'no', 'maybe')),
  guest_count int not null default 1 check (guest_count >= 1 and guest_count <= 10),
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  caption text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.rsvps enable row level security;
alter table public.photos enable row level security;

revoke all on table public.rsvps from anon;
grant select, insert on table public.rsvps to anon;

revoke all on table public.photos from anon;
grant select, insert on table public.photos to anon;

drop policy if exists rsvps_anon_select on public.rsvps;
create policy rsvps_anon_select
  on public.rsvps
  for select
  to anon
  using (true);

drop policy if exists rsvps_anon_insert on public.rsvps;
create policy rsvps_anon_insert
  on public.rsvps
  for insert
  to anon
  with check (true);

drop policy if exists photos_anon_select on public.photos;
create policy photos_anon_select
  on public.photos
  for select
  to anon
  using (true);

drop policy if exists photos_anon_insert on public.photos;
create policy photos_anon_insert
  on public.photos
  for insert
  to anon
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'party-photos',
  'party-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists party_photos_anon_select on storage.objects;
create policy party_photos_anon_select
  on storage.objects
  for select
  to anon
  using (bucket_id = 'party-photos');

drop policy if exists party_photos_anon_insert on storage.objects;
create policy party_photos_anon_insert
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'party-photos');
