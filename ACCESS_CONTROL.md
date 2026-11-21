# AerKit access control

AerKit's test build now serves only the app shell from `public/`. Protected content is downloaded from the private `aerkit-private` Supabase Storage bucket after an Aer Lingus passkey sign-in. See [SUPABASE_SETUP.md](/Users/daniel/Documents/GitHub/Repositories/AerKit_TEST/SUPABASE_SETUP.md) for Supabase and Worker configuration steps.

## Folder layout

```text
AerKit_TEST/
├── public/                    # Worker asset root: app shell and brand assets only
│   ├── index.html
│   ├── auth.js                 # OTP enrolment and passkey authentication
│   ├── app.js                  # UI; receives data after authorization
│   ├── preview-data.js         # Synthetic fixture for file:// and localhost only
│   ├── supabase-config.js      # Project URL + public publishable key
│   └── assets/                 # Public logo and fonts only
├── private-data/               # Ignored locally; never deployed or committed
│   ├── reference-data.json     # Data uploaded to private Supabase Storage
│   └── source/                 # Original workbooks and source documents
├── supabase/
│   └── migrations/             # Domain hook and bucket authorization policy
└── wrangler.jsonc              # Publishes only ./public
```

The local `private-data/` directory is ignored by Git and is outside the configured Worker asset root. The Supabase bucket is private. Its SELECT policy checks an exact `@aerlingus.com` JWT email domain and the `passkey` AMR; no browser upload policy is granted. The Before User Created hook rejects new accounts outside the domain. OTP enrolment verifies the mailbox, creates the passkey, signs out the OTP session, and requires a fresh passkey authentication before references load.

The service worker and offline reference cache were removed. Authentication responses and data are not added to an offline cache. A user who already downloaded data or an older public build may retain a copy.

Opening `public/index.html` directly (`file://`) or serving it on `localhost` starts a clearly labeled local UI preview with only the synthetic fixture in `preview-data.js`. That origin check runs before Supabase setup; preview does not download private references, and its feedback form does not submit. The hosted Worker origin is not treated as a preview origin and continues to require passkey authentication. Keep the preview fixture synthetic because `public/` is published as a whole.

Older deployments and Git history may still contain the prior `reference-data.js` and source workbooks. Purge old deployment artifacts/caches where possible and assume earlier copies may persist. The test setup should not be used for personal or highly confidential records until the historical exposure and production data approvals are addressed.
