-- SGC CRM PayMongo bridge tables
-- Run this in Supabase SQL Editor first.

create extension if not exists pgcrypto;

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  member_id uuid null,
  membership_id uuid null,
  program_code text null,
  member_name text null,
  email text not null,
  phone text null,
  amount_centavos integer not null check (amount_centavos > 0),
  currency text not null default 'PHP',
  status text not null default 'draft' check (status in ('draft','sent','paid','failed','expired','cancelled','manually_verified')),
  description text null,
  metadata jsonb not null default '{}'::jsonb,
  paymongo_checkout_id text null,
  paymongo_checkout_url text null,
  paymongo_payment_id text null,
  payment_method text null,
  gross_amount_centavos integer null,
  fee_centavos integer null,
  net_amount_centavos integer null,
  raw_checkout_response jsonb null,
  raw_paid_event jsonb null,
  raw_failed_event jsonb null,
  last_webhook_event_id text null,
  sent_at timestamptz null,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  paymongo_event_id text not null unique,
  event_type text null,
  livemode boolean not null default false,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  processing_note text null
);

create index if not exists idx_payment_requests_member_id on public.payment_requests(member_id);
create index if not exists idx_payment_requests_membership_id on public.payment_requests(membership_id);
create index if not exists idx_payment_requests_program_code on public.payment_requests(program_code);
create index if not exists idx_payment_requests_status on public.payment_requests(status);
create index if not exists idx_payment_requests_email on public.payment_requests(email);
create index if not exists idx_payment_webhook_events_type on public.payment_webhook_events(event_type);

alter table public.payment_requests enable row level security;
alter table public.payment_webhook_events enable row level security;

-- The Vercel bridge uses the Supabase service role key, which bypasses RLS.
-- Add UI policies later when you connect these tables to authenticated CRM users.
