# Local restricted-data workspace

This folder contains source and export files for AerKit destination and crew
contact data. Git ignores its contents. Do not copy this folder into a website
build or deploy it as static assets.

## Folder layout

- `destinations/destination-facts.json` — extracted destination profile facts
- `destinations/sources/CSM_Destination_Source_Register_Master.xlsx` — source register
- `contacts/useful-contacts.json` — extracted useful crew contacts
- `contacts/sources/Useful_Links_Forms.xlsx` — source workbook containing the contact sheet

These are local staging files only. The application must serve restricted data
from the approved Supabase-backed access path, not from these files.
