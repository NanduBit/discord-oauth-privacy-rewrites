# Discord OAuth Scope Rewrites

Remove privacy-invasive OAuth scopes when authorizing Discord apps.

This extension rewrites Discord OAuth authorize URLs in real time, removing scopes you have disabled before the app is authorized.

![Extension UI](https://github.com/user-attachments/assets/b4d0dab5-27ff-4854-ba70-577eec58cbfc)

## What This Fork Adds

- Dynamic scope controls in the popup UI.
- Restore removed scopes instantly from the "Removed By Extension" section.
- Remove currently requested scopes instantly from the "Scopes Currently Requested" section.
- Add scopes back to the active OAuth URL from a picker using the `+` control.
- Live popup updates while the page reloads (no need to close/reopen popup).

## Features

- Auto-detects Discord OAuth authorization URLs.
- Removes disabled scopes automatically before authorization.
- Per-scope preference toggle (enable/disable).
- Pause/resume rewriting with one click.
- Scope summary panel showing:
  - Original scopes from the URL
  - Scopes removed by extension
  - Scopes currently requested by the website

## How It Works

1. You open a Discord OAuth authorization URL.
2. The extension reads the `scope` query parameter.
3. Disabled scopes are removed from the URL.
4. The tab URL is updated with the filtered scope list.
5. The popup displays before/after scope state for visibility and control.

## Installation (Chrome / Chromium)

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select this project folder.

## Usage

1. Visit any Discord OAuth URL (`https://discord.com/oauth2/authorize?...`).
2. Open the extension popup.
3. In **Default Scope Preference**, choose which scopes should be blocked.
4. In **Scope Request Summary**:
   - Click `x` on **Removed By Extension** to add a removed scope back.
   - Click `x` on **Scopes Currently Requested** to remove and block that scope.
   - Use the picker + `+` button to add a specific scope from the known list.

## Important Note

For best privacy results, de-authorize existing Discord apps first, then re-authorize them with your preferred scope settings.

## Permissions

- `tabs`: detect and rewrite active Discord OAuth tab URLs.
- `storage`: save your scope preferences and UI state.
- Host permissions for `discord.com` and subdomains only.

## Privacy

This extension stores preferences locally in browser storage and only processes Discord OAuth URLs in your browser. No external telemetry is required for core functionality.

## Project Structure

- `background.js`: tab event listeners.
- `lib/rewrite-url.js`: OAuth scope rewrite logic.
- `lib/storage.js`: persisted settings/snapshot helpers.
- `popup.html`, `popup.css`, `popup.js`: popup UI and controls.


