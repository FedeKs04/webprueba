begin;

create or replace function public.is_admin()
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
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Users delete own reviews" on public.reviews;
drop policy if exists "Users or admins delete reviews" on public.reviews;

create policy "Users or admins delete reviews"
on public.reviews for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create or replace function public.admin_delete_repair_request(
  p_repair_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete repair requests'
      using errcode = '42501';
  end if;

  delete from public.repair_requests
  where id = p_repair_id
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Repair request not found'
      using errcode = 'P0002';
  end if;

  return deleted_id;
end;
$$;

revoke all on function public.admin_delete_repair_request(uuid) from public;
grant execute on function public.admin_delete_repair_request(uuid) to authenticated;

commit;
