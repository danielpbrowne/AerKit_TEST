# AerKit_TEST development access

AerKit_TEST currently has no login or authentication. The Worker serves the UI with the synthetic sample data in `public/preview-data.js`, so colleagues can try the interface without accounts or passkeys.

The real reference dataset stays in local `private-data/` and the existing private Supabase Storage bucket. It is not copied into `public/` and is not loaded by the test app. Keep real destination contacts, payroll/roster details, and operational information out of the public directory while authentication is undecided.

## Folder layout

```text
AerKit_TEST/
├── public/                    # Public Worker assets
│   ├── index.html
│   ├── app.js                  # UI, using window.CSM_DATA
│   ├── preview-data.js         # Synthetic data used by this no-login build
│   └── assets/                 # Public brand assets
├── private-data/               # Local, ignored data; outside Worker assets
│   ├── reference-data.json
│   └── source/
├── supabase/                   # Prior auth migrations retained as reference
└── wrangler.jsonc              # Publishes only ./public
```

The Worker URL is open, but currently contains only the synthetic fixture. If the full reference file is later copied into `public/`, anyone who can reach the Worker will be able to download it directly.
