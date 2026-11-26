-- Restrict new Supabase Auth accounts to the exact aerlingus.com domain.
create or replace function public.hook_restrict_aerkit_email_domain(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  email text := lower(coalesce(event->'user'->>'email', ''));
begin
  if split_part(email, '@', 2) = 'aerlingus.com'
     and length(split_part(email, '@', 1)) > 0
     and length(email) - length(replace(email, '@', '')) = 1 then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Use a verified @aerlingus.com email address.'
    )
  );
end;
$$;

grant execute on function public.hook_restrict_aerkit_email_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_aerkit_email_domain(jsonb) from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aerkit-private', 'aerkit-private', false, 10485760, array['application/json'])
on conflict (id) do update set public = false;

drop policy if exists "Aer Lingus members read AerKit private references" on storage.objects;
create policy "Aer Lingus members read AerKit private references"
on storage.objects for select to authenticated
using (
  bucket_id = 'aerkit-private'
  and name = 'reference-data.json'
  and split_part(lower(coalesce(auth.jwt()->>'email', '')), '@', 2) = 'aerlingus.com'
  and exists (
    select 1
    from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) as method
    where method->>'method' = 'passkey'
  )
);

-- Upload/update is deliberately unavailable to browser clients. Use a trusted
-- operator or server with a Supabase secret key for initial data import.
