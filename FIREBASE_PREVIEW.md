# Firebase Hosting preview

This stage prepares the static AerKit app for Firebase Hosting. It does not add
Firebase Authentication or make restricted records available. Calculators and
other public tools remain usable; destination facts and contact details stay
out of the deployed app until an access-control design is implemented.

`firebase.json` serves the repository root and excludes local private data,
spreadsheet source files, and project documentation from Hosting uploads.

## Deploy a preview

1. Create a Firebase project in the Firebase console.
2. Install the Firebase CLI if needed: `npm install -g firebase-tools`.
3. In Terminal, change to the AerKit repository folder and run:

   ```sh
   firebase login
   firebase use --add
   firebase deploy --only hosting
   ```

4. Select the Firebase project you created when prompted. The CLI will print
   the hosted preview URL when deployment finishes.

Firebase Authentication, Google sign-in, and database rules will be added in a
later step after the Hosting preview is available to review.
