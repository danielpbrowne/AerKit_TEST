# Supabase setup (inactive)

The current AerKit_TEST app does not use Supabase Auth or Supabase Storage. Login was removed so colleagues can explore the UI without an account. The Worker currently loads only synthetic data from `public/preview-data.js`.

The Supabase project and its Auth settings, private bucket, and SQL migrations were left in place for possible future use. The real dataset remains outside `public/`; do not copy it into the Worker assets until an access method has been chosen and the data is approved for public access.

The old setup files under `supabase/migrations/` document the earlier verified-domain and OTP policies. They are not applied by the current app or deployment.
