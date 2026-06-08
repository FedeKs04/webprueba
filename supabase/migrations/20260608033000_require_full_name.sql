create or replace function public.has_first_and_last_name(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    array_length(regexp_split_to_array(trim(value), '\s+'), 1) >= 2,
    false
  );
$$;

alter table public.profiles
drop constraint if exists profiles_full_name_required;

alter table public.profiles
add constraint profiles_full_name_required
check (public.has_first_and_last_name(full_name))
not valid;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  submitted_name text := regexp_replace(
    trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
    '\s+',
    ' ',
    'g'
  );
begin
  if not public.has_first_and_last_name(submitted_name) then
    raise exception 'Full name must include first name and last name';
  end if;

  insert into public.profiles (id, full_name)
  values (new.id, submitted_name)
  on conflict (id) do update
  set full_name = excluded.full_name;

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
