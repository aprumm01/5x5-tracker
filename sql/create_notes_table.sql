-- Creates public.notes, required by the Notes composer (app.js openNoteSheet /
-- Backend.fetchNotes / Backend.addNote). Mirrors the RLS pattern already
-- used on public.workouts (user_id = auth.uid()).
-- Run in Supabase dashboard -> SQL Editor -> New query.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  tags text[] not null default '{}',
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);

create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id);

create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);
