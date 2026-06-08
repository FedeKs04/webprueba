begin;

revoke select on public.repair_requests from authenticated;

grant select (
  id,
  user_id,
  equipment_type,
  brand_model,
  problem_description,
  status,
  assigned_technician_id,
  quote_amount,
  quote_description,
  quote_status,
  quote_decided_at,
  created_at,
  updated_at
) on public.repair_requests to authenticated;

create or replace function public.admin_list_repair_requests()
returns setof public.repair_requests
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can list all repair request fields'
      using errcode = '42501';
  end if;

  return query
  select request.*
  from public.repair_requests request
  order by request.created_at desc;
end;
$$;

revoke all on function public.admin_list_repair_requests() from public;
grant execute on function public.admin_list_repair_requests() to authenticated;

commit;
