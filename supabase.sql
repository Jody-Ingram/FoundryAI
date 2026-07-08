-- Foundry Shared AI Chat database setup
-- Run this once in Supabase: SQL Editor > New query > Run

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Shared AI Room' check (char_length(title) between 1 and 80),
  access_hash text not null check (char_length(access_hash) = 64),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id text not null check (char_length(sender_id) between 1 and 80),
  display_name text not null check (char_length(display_name) between 1 and 40),
  sender_type text not null check (sender_type in ('user', 'bot', 'system')),
  body text not null check (char_length(body) between 1 and 6000),
  reply_to uuid unique references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at desc);

create index if not exists messages_room_sender_created_idx
  on public.messages (room_id, sender_id, created_at desc);

-- The browser never talks directly to Supabase. Only the Vercel serverless
-- functions use the service-role key. RLS remains enabled with no public policies.
alter table public.rooms enable row level security;
alter table public.messages enable row level security;

revoke all on table public.rooms from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
grant all on table public.rooms to service_role;
grant all on table public.messages to service_role;
