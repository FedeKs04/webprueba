create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'client' check (role in ('client', 'technician', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repair_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  equipment_type text not null,
  brand_model text not null,
  problem_description text not null,
  status text not null default 'received'
    check (status in ('received', 'diagnosis', 'quoted', 'repairing', 'ready', 'delivered', 'cancelled')),
  technician_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  service text not null,
  rating smallint not null check (rating between 1 and 5),
  content text not null check (char_length(content) between 10 and 320),
  status text not null default 'published'
    check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repair_requests_user_id_idx on public.repair_requests(user_id);
create index if not exists repair_requests_status_idx on public.repair_requests(status);
create index if not exists reviews_user_id_idx on public.reviews(user_id);
create index if not exists reviews_status_created_at_idx on public.reviews(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists repair_requests_set_updated_at on public.repair_requests;
create trigger repair_requests_set_updated_at
before update on public.repair_requests
for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, created_at)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1), ''),
  created_at
from auth.users
on conflict (id) do nothing;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('technician', 'admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.repair_requests enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_staff());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users read own repair requests" on public.repair_requests;
create policy "Users read own repair requests"
on public.repair_requests for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users create own repair requests" on public.repair_requests;
create policy "Users create own repair requests"
on public.repair_requests for insert
to authenticated
with check (user_id = auth.uid() and status = 'received');

drop policy if exists "Users edit received repair requests" on public.repair_requests;
create policy "Users edit received repair requests"
on public.repair_requests for update
to authenticated
using (user_id = auth.uid() and status = 'received')
with check (user_id = auth.uid() and status = 'received');

drop policy if exists "Staff manage repair requests" on public.repair_requests;
create policy "Staff manage repair requests"
on public.repair_requests for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Published reviews are public" on public.reviews;
create policy "Published reviews are public"
on public.reviews for select
to anon, authenticated
using (status = 'published' or user_id = auth.uid() or public.is_staff());

drop policy if exists "Users create own reviews" on public.reviews;
create policy "Users create own reviews"
on public.reviews for insert
to authenticated
with check (user_id = auth.uid() and status = 'published');

drop policy if exists "Users edit own reviews" on public.reviews;
create policy "Users edit own reviews"
on public.reviews for update
to authenticated
using (user_id = auth.uid() or public.is_staff())
with check (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users delete own reviews" on public.reviews;
create policy "Users delete own reviews"
on public.reviews for delete
to authenticated
using (user_id = auth.uid() or public.is_staff());

grant usage on schema public to anon, authenticated;
grant select on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant select, insert on public.repair_requests to authenticated;
grant update (
  equipment_type,
  brand_model,
  problem_description,
  status,
  technician_notes
) on public.repair_requests to authenticated;
