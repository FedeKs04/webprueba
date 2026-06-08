create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), '')
  )
  on conflict (id) do update
  set full_name = case
    when public.profiles.full_name = '' then excluded.full_name
    else public.profiles.full_name
  end;

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
