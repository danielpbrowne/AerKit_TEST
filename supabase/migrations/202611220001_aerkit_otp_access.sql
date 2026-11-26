-- Allow verified Aer Lingus email OTP sessions to read the private reference
-- file. The exact-domain Before User Created hook remains enabled separately.
create or replace function public.aerkit_is_verified_aerlingus_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as user_record
    where user_record.id = auth.uid()
      and user_record.email_confirmed_at is not null
      and split_part(lower(coalesce(user_record.email, '')), '@', 2) = 'aerlingus.com'
  );
$$;

revoke all on function public.aerkit_is_verified_aerlingus_user() from public, anon;
grant execute on function public.aerkit_is_verified_aerlingus_user() to authenticated;

drop policy if exists "Aer Lingus members read AerKit private references" on storage.objects;
create policy "Aer Lingus members read AerKit private references"
on storage.objects for select to authenticated
using (
  bucket_id = 'aerkit-private'
  and name = 'reference-data.json'
  and public.aerkit_is_verified_aerlingus_user()
);
