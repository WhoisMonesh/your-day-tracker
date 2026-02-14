# YourDayTracker

YourDayTracker is a cross‑platform desktop app to track your day—tasks, focus time, and exports—built with React, Vite, and Electron. Installers are available for Windows, macOS, and Linux.

## Screenshot

![YourDayTracker screenshot](./public/placeholder.svg)

## Features

- Task management with priorities, statuses, due dates, and subtasks
- Multiple views: Dashboard, My Day, Calendar, and List
- Categories with colors and icons, plus category settings
- Reminders (including custom minutes) and repeating tasks (daily/weekly/monthly/custom)
- Powerful command palette and keyboard‑friendly UI
- Data storage in a local database (SQLite/OPFS/IndexedDB abstraction)
- Export tasks to Excel, PDF, CSV, JSON, and ICS; import ICS
- Local database backup/restore and encrypted backups
- Works offline; PWA service worker included for better caching
- Cross‑platform installers built via CI (Windows, macOS, Linux)

## Downloads

- Latest releases: https://github.com/WhoisMonesh/your-day-tracker/releases/latest  
- Included artifacts:
  - Windows: NSIS installer (.exe)
  - macOS: DMG and ZIP (unsigned for local install)
  - Linux: AppImage and deb
  - Linux (Docker builder): additional artifacts produced via electronuserland/builder

## Quick Start (Dev)

```bash
npm ci
npm run dev
```

- App runs in the browser at Vite dev server.
- For desktop dev with live reload:

```bash
npm run dev:desktop
```

## Build From Source

Build web assets:

```bash
npm run build
```

Package desktop app for your current OS:

```bash
npx electron-builder
```

Per‑platform packaging:

```bash
# Windows
npx electron-builder --win

# macOS
npx electron-builder --mac

# Linux
npx electron-builder --linux
```

## Linux Build via Docker

You can build Linux artifacts using the electron-builder Docker image (useful on non‑Linux hosts):

```bash
docker run --rm \
  -e CSC_IDENTITY_AUTO_DISCOVERY=false \
  -v "$PWD":/project \
  -w /project \
  electronuserland/builder:latest \
  /bin/bash -lc "npm ci && npx electron-builder --linux --publish never"
```

Artifacts are written to `release/`.

## CI and Releases

The repository includes a cross‑platform build workflow that:
- Builds installers for Windows, macOS, and Linux.
- Builds Linux artifacts in Docker.
- Creates a GitHub Release and attaches all artifacts with a short description.

See: `.github/workflows/desktop-build.yml`

## Requirements

- Node.js 20
- npm

## Notes

- CI artifacts are unsigned by default. For distribution, consider code‑signing (Windows) and notarization/signing (macOS).
