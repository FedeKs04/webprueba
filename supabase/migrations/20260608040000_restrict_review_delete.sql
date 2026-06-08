drop policy if exists "Users delete own reviews" on public.reviews;

create policy "Users delete own reviews"
on public.reviews for delete
to authenticated
using (user_id = auth.uid());
