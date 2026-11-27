-- AerKit access-control foundation
-- New accounts begin pending. A project administrator must verify the
-- registrant and approve the profile before restricted destination facts
-- can be read.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 150),
  staff_number text not null check (char_length(staff_number) between 1 and 50),
  access_status text not null default 'pending'
    check (access_status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

comment on table public.profiles is
  'Private AerKit account review records. Users can read only their own profile; status is administrator-managed.';
comment on column public.profiles.staff_number is
  'User-submitted identity detail for manual review. It is not an authentication secret.';
comment on column public.profiles.access_status is
  'Only approved profiles may read restricted destination facts.';

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "Users can read their own access status"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- A signup submitted through Supabase Auth includes display_name and
-- staff_number in user metadata. Snapshot them into a protected row once;
-- subsequent user metadata edits cannot change the review record.
create or replace function public.create_pending_aerkit_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  submitted_name text;
  submitted_staff_number text;
begin
  submitted_name := nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), '');
  submitted_staff_number := nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'staff_number'), '');

  if submitted_name is null or submitted_staff_number is null then
    raise exception 'AerKit registration requires a name and staff number';
  end if;

  insert into public.profiles (user_id, display_name, staff_number)
  values (new.id, submitted_name, submitted_staff_number);

  return new;
end;
$$;

revoke all on function public.create_pending_aerkit_profile() from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.create_pending_aerkit_profile() to supabase_auth_admin;

drop trigger if exists on_aerkit_auth_user_created on auth.users;
create trigger on_aerkit_auth_user_created
  after insert on auth.users
  for each row execute function public.create_pending_aerkit_profile();

create table if not exists public.restricted_destination_facts (
  id bigint generated always as identity primary key,
  destination_code text not null check (char_length(destination_code) between 3 and 8),
  category text not null check (char_length(category) between 1 and 100),
  field_name text not null check (char_length(field_name) between 1 and 150),
  field_value text not null default '',
  sort_order integer not null default 0
);

comment on table public.restricted_destination_facts is
  'Destination profile facts moved out of the public JavaScript bundle. Populate only after approved-user access is connected.';

alter table public.restricted_destination_facts enable row level security;
revoke all on table public.restricted_destination_facts from anon, authenticated;
grant select on table public.restricted_destination_facts to authenticated;

create or replace function public.aerkit_user_is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.user_id = (select auth.uid())
      and profile.access_status = 'approved'
  );
$$;

revoke all on function public.aerkit_user_is_approved() from public, anon;
grant execute on function public.aerkit_user_is_approved() to authenticated;

create policy "Approved users can read restricted destination facts"
  on public.restricted_destination_facts
  for select
  to authenticated
  using ((select public.aerkit_user_is_approved()));

-- Manual pilot review: administrators can inspect profiles in the Supabase
-- dashboard, verify identity out of band, then set access_status to
-- 'approved', 'rejected', or 'suspended'. No client-side role can update it.
