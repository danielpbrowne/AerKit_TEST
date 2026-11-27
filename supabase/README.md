# Supabase access setup

The browser client uses the project's publishable key from `supabase-config.js`.
That key is expected to be visible in the page; database row-level security is
the access boundary. Never put a Supabase secret or service-role key in this
repository or in browser code.

## Before enabling accounts

1. In the Supabase SQL Editor, apply the migrations in order from
   `migrations/`.
2. In Authentication settings, enable email sign-in. For code-only email,
   replace the verification-link button in the Magic Link email template with
   the `{{ .Token }}` variable. The app accepts the code in its verification
   form. Link callback handling remains enabled as a fallback.
3. Configure the app's deployed URL in Supabase Authentication URL settings.
   For local testing, serve this folder from `localhost`; do not use a `file:`
   URL for the email flow.
4. Register a test account. New profiles start as `pending`. Verify the person
   out of band, then set their `profiles.access_status` to `approved` in the
   Supabase dashboard. The browser cannot change this status.
5. Confirm a pending account sees no restricted records, and an approved
   account can read only the records allowed by the database policies.

The access screen and calculators work without a session. Restricted records
are fetched only for approved sessions. Contact data should be imported into
`restricted_useful_contacts` only after this gate is confirmed in the Supabase
project.
