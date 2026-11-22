# AerKit test authentication setup

## Values and test boundary

- App origin: `https://aerkit-test.daniel-browne.workers.dev`
- Supabase project: `https://qdzjsdygnwkfbjsccpfo.supabase.co`
- Allowed email domain: exact `@aerlingus.com`
- Sign-in: verified six-digit email OTP
- Returning access: persisted Supabase session refreshes automatically until sign-out or session expiry

The app and Storage policy allow authenticated users only when their email is verified and ends in the exact `@aerlingus.com` domain. The domain signup hook remains enabled as a separate safeguard.

## Supabase project changes already applied

- Ran the initial SQL migration: exact-domain signup hook function, private `aerkit-private` bucket, and the original passkey-gated RLS policy.
- Enabled the Before User Created Auth hook with `public.hook_restrict_aerkit_email_domain`.
- Set Site URL and redirect allowlist to the Worker origin.
- Uploaded `reference-data.json` into the private bucket.

The follow-up migration `supabase/migrations/202611220001_aerkit_otp_access.sql` replaces the passkey-gated policy with one that verifies the authenticated user's confirmed email and exact domain. It has been applied to the test project; run it after the initial migration on a fresh project.

## Configure the Supabase project

1. In **Project Settings → API Keys**, copy the project's **publishable key** (or legacy anon key) into `publishableKey` in `public/supabase-config.js`. The key is intended for browser use; never put a secret/service-role key in the public file.
2. In **SQL Editor**, run `supabase/migrations/202611210001_aerkit_private_access.sql` followed by `supabase/migrations/202611220001_aerkit_otp_access.sql` if applying this setup to a fresh project. They create the private Storage bucket, verified-domain read policy, and function that rejects new accounts outside the exact domain.
3. In **Authentication → Hooks**, enable **Before User Created** with Postgres function `public.hook_restrict_aerkit_email_domain` if the hook is not already active.
4. In **Authentication → URL Configuration**, set the Site URL to the app origin and add that same origin to the redirect allow list. Keep email confirmation enabled.
5. In **Authentication → Email Templates → Magic Link or OTP**, change the message to display `{{ .Token }}` as the one-time code. This project currently locks template editing while using its built-in email service. The dashboard offers custom SMTP, a Send Email hook, or upgrading the plan to edit templates with Supabase email. The built-in email service is also limited to project team recipients; to send codes to colleagues, use an approved SMTP provider or email hook.
6. In **Storage → aerkit-private**, upload local `private-data/reference-data.json` as `reference-data.json` if applying this setup to a fresh project. Keep the bucket private. The migration grants no browser upload/update/delete permissions.
7. Deploy the Worker using Wrangler and [wrangler.jsonc](/Users/daniel/Documents/GitHub/Repositories/AerKit_TEST/wrangler.jsonc). It publishes only `public/`; local `private-data/`, migrations, and source workbooks are outside the Worker asset root.

For a direct deploy with the existing Wrangler login, run `npx wrangler deploy`. If the Worker is deployed by another workflow, make sure that workflow uses the configured `public/` asset directory; do not publish the repository root.

## Protected data and old copies

The original workbook files, protocol PDF, and converted reference payload are now in ignored local `private-data/`, outside the deployed `public/` folder. `reference-data.js` is no longer shipped. The app fetches the JSON from a private Supabase Storage bucket after a verified Aer Lingus email OTP session and does not cache protected responses offline.

The previous static deployments and Git history may still contain the old files. A new deployment does not delete Git history or copies already downloaded by browsers. Remove old public deployment artifacts and purge any caches where possible; assume any prior public copies may persist. Do not use the test project for personal or highly confidential information until the old exposure is addressed and the OTP/RLS behavior is verified.

## First test flow

1. Configure an editable OTP email template and an email delivery method that can send to the intended colleagues. Apply the OTP policy migration (already applied in the test project).
2. Publish the updated `public/` app to the Worker. Enter a verified `@aerlingus.com` address, retrieve the emailed code, and verify it in the app.
3. Confirm the app loads private references. Confirm a signed-out request and an unverified or non-Aer Lingus account are denied. Sign out and confirm code sign-in works again.

If you share the publishable key, I can insert it into the public configuration. Do not share a secret/service-role key or database password.
