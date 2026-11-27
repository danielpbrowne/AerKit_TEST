-- Contact details remain unavailable to signed-out and unapproved users.
create table if not exists public.restricted_useful_contacts (
  id bigint generated always as identity primary key,
  display_name text not null check (char_length(display_name) between 1 and 150),
  category text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  sort_order integer not null default 0
);

comment on table public.restricted_useful_contacts is
  'Sensitive crew and operational contact details. Only approved AerKit users may read these records.';

alter table public.restricted_useful_contacts enable row level security;
revoke all on table public.restricted_useful_contacts from anon, authenticated;
grant select on table public.restricted_useful_contacts to authenticated;

create policy "Approved users can read restricted useful contacts"
  on public.restricted_useful_contacts
  for select
  to authenticated
  using ((select public.aerkit_user_is_approved()));
