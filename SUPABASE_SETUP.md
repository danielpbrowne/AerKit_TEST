# AerKit test authentication setup

## Values and test boundary

- App origin: `https://aerkit-test.daniel-browne.workers.dev`
- Supabase project: `https://qdzjsdygnwkfbjsccpfo.supabase.co`
- Allowed email domain: exact `@aerlingus.com`
- First enrolment: verified one-time email sign-in link, immediately followed by passkey creation and a fresh passkey sign-in
- Returning access: passkey sign-in only

The current Supabase passkey API is experimental. This build expects its access token AMR to include `method: "passkey"`; storage RLS also checks this claim, so an email-link-only session cannot download the private references. Confirm this claim in a successful test sign-in before relying on the gate for real sensitive data.

## Supabase project changes already applied

- Ran the SQL migration: exact-domain signup hook function, private `aerkit-private` bucket, and RLS policy requiring `@aerlingus.com` plus the passkey AMR.
- Enabled the Before User Created Auth hook with `public.hook_restrict_aerkit_email_domain`.
- Enabled passkeys with RP display name `AerKit`, RP ID `aerkit-test.daniel-browne.workers.dev`, and that HTTPS origin.
- Set Site URL and redirect allowlist to the Worker origin.
- Uploaded `reference-data.json` into the private bucket.

## Configure the Supabase project

1. In **Project Settings → API Keys**, copy the project's **publishable key** (or legacy anon key) into `publishableKey` in `public/supabase-config.js`. The key is intended for browser use; never put a secret/service-role key in the public file.
2. In **SQL Editor**, run `supabase/migrations/202611210001_aerkit_private_access.sql` if applying this setup to a fresh project. It creates a private Storage bucket, a read policy limited to a verified Aer Lingus email and passkey AMR, and a function that rejects new accounts outside the exact domain.
3. In **Authentication → Hooks**, enable **Before User Created** with Postgres function `public.hook_restrict_aerkit_email_domain` if the hook is not already active.
4. In **Authentication → Passkeys**, enable passkey authentication and set:
   - Display name: `AerKit`
   - Relying party ID: `aerkit-test.daniel-browne.workers.dev`
   - Allowed origin: `https://aerkit-test.daniel-browne.workers.dev`
5. In **Authentication → URL Configuration**, set the Site URL to the app origin and add that same origin to the redirect allow list. Keep email confirmation enabled. The current default Supabase template sends a one-time sign-in link, which the app handles for enrollment. A numeric code requires an editable email template using `{{ .Token }}`; Supabase currently requires custom SMTP for editing templates.
6. In **Storage → aerkit-private**, upload local `private-data/reference-data.json` as `reference-data.json` if applying this setup to a fresh project. Keep the bucket private. The migration grants no browser upload/update/delete permissions.
7. Deploy the Worker using Wrangler and [wrangler.jsonc](/Users/daniel/Documents/GitHub/Repositories/AerKit_TEST/wrangler.jsonc). It publishes only `public/`; local `private-data/`, migrations, and source workbooks are outside the Worker asset root.

For a direct deploy with the existing Wrangler login, run `npx wrangler deploy`. If the Worker is deployed by another workflow, make sure that workflow uses the configured `public/` asset directory; do not publish the repository root.

## Protected data and old copies

The original workbook files, protocol PDF, and converted reference payload are now in ignored local `private-data/`, outside the deployed `public/` folder. `reference-data.js` is no longer shipped. The app fetches the JSON from a private Supabase Storage bucket after a valid passkey session and does not cache protected responses offline.

The previous static deployments and Git history may still contain the old files. A new deployment does not delete Git history or copies already downloaded by browsers. Remove old public deployment artifacts and purge any caches where possible; assume any prior public copies may persist. Do not use the test project for personal or highly confidential information until the old exposure is addressed and the passkey AMR/RLS behavior is verified.

## First test flow

1. Publish the updated `public/` app to the Worker. Visit its origin, click **First-time passkey enrolment**, request an email link at an `@aerlingus.com` address, follow the link, create a passkey, and then sign in with that passkey.
2. Confirm the app loads and inspect the Supabase Storage request: an authenticated passkey session should receive the JSON; a signed-out request and an email-link-only token should be denied.
3. Sign out, then confirm **Continue with passkey** works on the same browser/device. Registration and sign-in use Supabase's experimental WebAuthn API.

If you share the publishable key, I can insert it into the public configuration. Do not share a secret/service-role key or database password.
