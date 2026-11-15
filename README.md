# Daily Spend (PWA)

Static app for GitHub Pages. No build step.

## Files
- index.html – page shell
- css/styles.css – all styling, animations, responsive rules
- js/config.js – put your Google OAuth Client ID here (optional)
- js/core.js – helpers, animations, theme switch, bottom sheet
- js/sheets.js – Google sign-in and Google Sheets sync
- js/app.js – pages, editing, loans, recurring bills, install prompt
- sw.js, manifest.webmanifest, icons/ – offline + installable app

## Google setup (once)
1. Google Cloud Console: create a project, enable Google Sheets API and Google Drive API.
2. Credentials: create an OAuth client ID (Web application).
3. Authorized JavaScript origin: https://YOUR-USERNAME.github.io
4. OAuth consent screen: add yourself as a test user.
5. Paste the Client ID into js/config.js, or enter it on the login screen.

## Deploy
Unzip, push all files to the root of a GitHub repo, then Settings > Pages > Deploy from branch (main, / root).
Open https://YOUR-USERNAME.github.io/REPO/ and use "Install app" (Settings page) or your browser's Add to Home Screen.

## Google Sheet
On first sign-in the app looks for a sheet named "DailySpend Data" in your Drive and reuses it.
If none exists it creates one with the tabs Transactions, Categories, Budgets, Loans, Bills, Settings and their column headers.
Missing tabs or new columns in an older sheet are added automatically; your data is kept.

When you change the app files, bump `V` in sw.js so phones pick up the update.
