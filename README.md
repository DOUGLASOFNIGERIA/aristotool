# Aristotool

Aristotool is a full-stack ethical hacking learning platform that combines a curated resource library, guided learning paths, account onboarding, saved progress, embedded video lessons, and authoritative external references in one focused web application.

Repository: https://github.com/DOUGLASOFNIGERIA/aristotool

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Demo Account](#demo-account)
- [Authentication and Onboarding Flow](#authentication-and-onboarding-flow)
- [API Reference](#api-reference)
- [Database](#database)
- [Content Model](#content-model)
- [Frontend Architecture](#frontend-architecture)
- [Security Notes](#security-notes)
- [Manual Verification Checklist](#manual-verification-checklist)
- [Troubleshooting](#troubleshooting)
- [Production Deployment Notes](#production-deployment-notes)
- [Roadmap](#roadmap)
- [Development History](#development-history)

## Overview

The application is built as a React single-page app backed by a small Express API and a managed Turso/libSQL database. It is designed for structured, authorized security education: every lesson, note, and lab points to a verified external source, and video lessons are played through privacy-enhanced YouTube embeds.

Current catalog:

- 29 resources: 7 videos, 13 notes, and 9 labs
- 7 guided learning paths
- 9 categories: Reconnaissance, Web Application, Network Security, Cryptography, Wireless, System Security, Digital Forensics, Bug Bounty, and Cloud Security
- 3 difficulty levels: Beginner, Intermediate, and Advanced

## Features

### Learning experience

- Material Design-inspired responsive UI with light and dark themes.
- Desktop navigation rail and mobile bottom navigation with consistent active states.
- Search, category filtering, type filtering, difficulty filtering, and sorting.
- Resource detail dialog with summary, learning outcomes, chapter or step breakdown, embedded video, and official resource link.
- Guided learning path dialog with ordered resources and completion tracking.
- Personal dashboard with continue-learning, saved items, and progress summaries.
- Dedicated Library, Videos, Notes, Labs, Learning, and About pages.

### Accounts and persistence

- Registration with validation and duplicate-email checks.
- Confirmation-code flow with resend support.
- Login and logout with database-backed sessions.
- HttpOnly session cookie; session tokens are not stored in browser localStorage.
- Three-step onboarding for interests, experience level, and learning goals.
- Per-user bookmarks, completion status, and started status persisted in Turso/libSQL.
- Seeded demo account with example progress.

### Content and media

- Verified YouTube video IDs gathered from saved search evidence rather than guessed.
- Privacy-enhanced embeds using `youtube-nocookie.com`.
- Watch links back to the original YouTube video.
- Official external resource links from sources such as OWASP, MDN, PortSwigger, Cloudflare, Nmap, Microsoft Learn, GNU, NIST, HackerOne, Bugcrowd, and AWS.
- Resource and media metadata centralized in `src/data/resources.js`.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6 |
| Styling | Custom CSS with Material Design tokens |
| Backend | Express 4 |
| Database | Turso/libSQL via `@tursodatabase/serverless` |
| Password hashing | `node:crypto` scrypt with per-user salt |
| Session storage | libSQL-backed opaque tokens in an HttpOnly cookie |
| Dev orchestration | `concurrently` |
| Runtime | Node.js 24.x |

Local development requires a Turso/libSQL database URL and auth token. No email provider or authentication vendor is required.

## Project Structure

```text
aristotool/
├── backend/
│   ├── data/
│   │   └── aristotool.db          # Generated at runtime; ignored by git
│   ├── catalog.js                 # Admin payload validation and normalization
│   ├── db.js                      # Schema, helpers, seeding, persistence
│   └── server.js                  # Express API and HTTP routes
├── dist/                          # Production build output; ignored by git
├── src/
│   ├── api.js                     # Frontend API client
│   ├── App.jsx                    # Auth routing, app state, progress wiring
│   ├── components/
│   │   ├── AuthLayout.jsx         # Shared auth/onboarding shell
│   │   ├── Icon.jsx               # Inline SVG icon registry
│   │   ├── Layout.jsx             # App shell, navigation, profile menu
│   │   ├── PathDialog.jsx         # Learning path dialog
│   │   ├── ResourceCard.jsx       # Resource card component
│   │   └── ResourceDialog.jsx     # Video, links, and resource details
│   ├── data/
│   │   └── resources.js           # Catalog, media map, categories, paths
│   ├── pages/
│   │   ├── About.jsx
│   │   ├── Admin.jsx              # Admin catalog management workspace
│   │   ├── ConfirmEmail.jsx
│   │   ├── Home.jsx
│   │   ├── Learning.jsx
│   │   ├── Library.jsx
│   │   ├── Login.jsx
│   │   ├── Onboarding.jsx
│   │   └── Register.jsx
│   ├── index.css                  # Design system and responsive styles
│   └── main.jsx                   # React entry point
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

## Prerequisites

- Node.js 24 or newer
- npm 10 or newer
- A modern browser with iframe support for YouTube playback

The backend connects to Turso/libSQL through `@tursodatabase/serverless` and requires `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

## Installation

```bash
git clone https://github.com/DOUGLASOFNIGERIA/aristotool.git
cd aristotool
npm install
```

If the default npm registry is unreachable, use the public registry explicitly:

```bash
npm install --registry=https://registry.npmjs.org
```

On Windows PowerShell, if `npm.ps1` is blocked by execution policy, invoke npm directly:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
```

### Environment variables

Set these before starting the API:

```bash
TURSO_DATABASE_URL=libsql://your-db-your-org.aws-us-east-1.turso.io
TURSO_AUTH_TOKEN=your-token
GMAIL_USER=your-address@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
FROM_EMAIL="Aristool <no-reply@aristotool.dev>"
ADMIN_EMAILS=you@example.com
```

On Windows PowerShell:

```powershell
$env:TURSO_DATABASE_URL = "libsql://your-db-your-org.aws-us-east-1.turso.io"
$env:TURSO_AUTH_TOKEN = "your-token"
$env:GMAIL_USER = "your-address@gmail.com"
$env:GMAIL_APP_PASSWORD = "your-16-character-app-password"
$env:FROM_EMAIL = "Aristool <no-reply@aristotool.dev>"
$env:ADMIN_EMAILS = "you@example.com"
```

`GMAIL_USER` and `GMAIL_APP_PASSWORD` enable one-time-code emails during registration. `FROM_EMAIL` defaults to `Aristool <no-reply@aristotool.dev>`.

## Running the Application

### Recommended: frontend and API together

```bash
npm run dev:all
```

This starts:

- API at `http://localhost:3001`
- Vite dev server at `http://localhost:5173`

The Vite config proxies `/api` to the Express server, so the browser only talks to the frontend origin during development.

### Separate terminals

Terminal 1:

```bash
npm run dev:api
```

Terminal 2:

```bash
npm run dev
```

### Production build check

```bash
npm run build
npm run preview
```

The API must still be running for authentication and progress features when serving a production build.

### API port override

```bash
PORT=4000 npm run dev:api
```

Update the Vite proxy target in `vite.config.js` if you change the API port during development.

## Demo Account

The database seeds this account automatically on first startup:

| Field | Value |
| --- | --- |
| Email | `demo@aristotool.dev` |
| Password | `Demo1234!` |

The demo account is already confirmed and onboarded, and has sample bookmarks, started resources, and completed resources. The login form prefills these credentials for convenience.

## Authentication and Onboarding Flow

1. Open the app. Unauthenticated users are shown the login page.
2. Choose **Create an account** and submit name, email, and password.
3. The API returns a confirmation token. Because no email provider is configured, the token is shown in the confirmation UI and the URL.
4. The confirmation page submits the token, consumes it, creates a session, and sets the `aristotool_session` cookie.
5. New users are routed to onboarding.
6. Onboarding saves interests, experience level, and goals, then unlocks the full app.
7. Returning users sign in and resume immediately with their saved progress.

The confirmation endpoint is idempotency-sensitive: a consumed or unknown token is rejected. Requesting a new code invalidates prior unconsumed codes for that user.

## API Reference

All routes return JSON. Cookie-based session authentication is used for protected routes.

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Health check |
| `GET` | `/api/auth/me` | No | Returns the current user or `null` |
| `POST` | `/api/auth/register` | No | Creates an unconfirmed account and emails a 6-digit code |
| `POST` | `/api/auth/verify-otp` | No | Verifies the code, confirms the account, creates a session |
| `POST` | `/api/auth/confirm` | No | Consumes a legacy confirmation link, confirms the account, creates a session |
| `POST` | `/api/auth/resend` | No | Emails a fresh 6-digit code for an unconfirmed account |
| `POST` | `/api/auth/login` | No | Authenticates and creates a session |
| `POST` | `/api/auth/logout` | No | Deletes the session and clears the cookie |
| `POST` | `/api/auth/onboarding` | Yes | Saves interests, experience, and goals |
| `GET` | `/api/catalog` | No | Returns resources and learning paths with media metadata |
| `GET` | `/api/state` | Yes | Returns the current user's progress |
| `POST` | `/api/progress` | Yes | Sets a bookmark, completed, or started value |
| `GET` | `/api/admin/catalog` | Admin | Returns the full catalog for management |
| `POST` | `/api/admin/resources` | Admin | Creates or updates one resource |
| `POST` | `/api/admin/paths` | Admin | Creates or updates one learning path |
| `POST` | `/api/admin/upload` | Admin | Upserts a JSON bundle of resources and paths |
| `DELETE` | `/api/admin/resources/:id` | Admin | Deletes a resource |
| `DELETE` | `/api/admin/paths/:id` | Admin | Deletes a learning path |

### Example: login request

```json
{
  "email": "demo@aristotool.dev",
  "password": "Demo1234!"
}
```

### Example: progress request

```json
{
  "resourceId": "v1",
  "kind": "bookmarks",
  "value": true
}
```

Supported `kind` values are `bookmarks`, `completed`, and `started`.

### Example: progress response

```json
{
  "progress": {
    "bookmarks": ["v1", "l2"],
    "completed": ["n1"],
    "started": ["v1"]
  }
}
```

## Database

The API connects to the Turso/libSQL database configured by:

```text
TURSO_DATABASE_URL=libsql://aristotool-prod-cyberhawk.aws-us-east-1.turso.io
TURSO_AUTH_TOKEN=...
GMAIL_USER=your-address@gmail.com
GMAIL_APP_PASSWORD=...
FROM_EMAIL=Aristool <no-reply@aristotool.dev>
ADMIN_EMAILS=you@example.com
```

`ADMIN_EMAILS` is optional but recommended. It accepts a comma-separated list of confirmed account emails; matching users are promoted to admins when the API starts.

Verification codes are 6 digits, stored hashed in `confirmations`, expire after `OTP_TTL_MINUTES` (default `10`), and allow `OTP_MAX_ATTEMPTS` incorrect attempts (default `5`). `ALLOW_DEV_OTP=true` returns the code in API responses and displays it in the UI for local testing only; do not enable it in production.

Vercel Production, Preview, and Development environments are configured with the same managed database. No local SQLite file is used at runtime.

### Tables

| Table | Purpose |
| --- | --- |
| `users` | User identity, password hash, confirmation/onboarding/admin flags, profile preferences |
| `confirmations` | One-time confirmation tokens with consumed state |
| `sessions` | Opaque session tokens mapped to users |
| `progress` | Per-user resource state with a unique user/resource/kind constraint |
| `catalog_resources` | JSON payloads seeded from the source catalog |
| `catalog_paths` | JSON payloads seeded from the learning path definitions |

### Resetting development data

Data is stored remotely. Use a separate Turso database for development and point `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` at it. The API recreates the schema and upserts the catalog and demo account on startup; it does not delete existing remote rows.

## Content Model

Catalog content is defined in `src/data/resources.js`.

A resource includes:

- `id`, `type`, `title`, `category`, `difficulty`
- `minutes`, `instructor`, `rating`, `learners`, `updated`
- `tags`, `summary`, `outcomes`
- `sections` for videos and notes, or `steps` for labs
- Media metadata from `getMedia(resource.id)`: `videoId`, `embedUrl`, `watchUrl`, `resourceUrl`, `resourceLabel`, and `sourceLabel`

A learning path includes:

- `id`, `title`, `description`
- `color`, `icon`, `resourceIds`

When the API starts, `seed()` upserts all resources and paths into the configured libSQL database. Editing the source catalog and restarting the API updates the database without manual SQL.

### Admin catalog management

Admins can manage the live catalog from the **Admin** workspace in the app:

- Add or update a single resource with a form.
- Create or update learning paths.
- Upload a JSON bundle containing `resources` and `paths` arrays.
- Download a template from the admin page, edit it, and upload it again.
- Delete resources and paths from the inventory list.

The admin navigation item only appears for users whose account email is listed in `ADMIN_EMAILS`. All admin endpoints require both a valid session and the admin flag.

## Frontend Architecture

- `src/main.jsx` mounts the React app.
- `src/App.jsx` owns bootstrapping, auth routing, catalog loading, progress state, dialog state, navigation, theme, and notifications.
- `src/api.js` centralizes all calls to `/api` and standardizes error handling.
- `Layout.jsx` renders the persistent app shell, search bar, navigation rail, mobile bottom navigation, theme toggle, and profile menu.
- `pages/Admin.jsx` provides the admin-only resource form, JSON upload, learning path editor, and catalog inventory.
- Auth pages are intentionally lightweight and share `AuthLayout.jsx`.
- `ResourceDialog.jsx` renders the iframe player, source attribution, watch link, and authoritative resource link.
- Progress changes update the UI optimistically and then persist through `/api/progress`.
- If the API is unavailable, the UI still loads the bundled catalog and shows a non-blocking notice.

## Security Notes

The deployed application uses managed hosting and a managed database, but it is not a complete production security program.

Currently implemented:

- Passwords are hashed with scrypt using a unique random salt.
- Password comparison uses `timingSafeEqual`.
- Session tokens are random 192-bit values stored in Turso/libSQL.
- Session cookies are `HttpOnly`, `SameSite=Lax`, scoped to `/`, and marked `Secure` when served from Vercel.
- Database credentials are stored as Vercel environment secrets, not in the repository.
- User responses never include password hashes or session tokens.
- Protected API routes validate the session on every request.
- Educational content is framed around authorized use and systems you own.

Not yet implemented:

- Email delivery and real confirmation links
- Rate limiting on login, registration, resend, and confirmation
- Password reset and email change flows
- CSRF protection if cookie behavior is expanded
- Account deletion and data export
- Audit logging and monitoring
- Content security policy and dependency vulnerability monitoring

## Manual Verification Checklist

Use this after changes to confirm the core system still works:

1. `npm run build` completes without errors.
2. `GET http://localhost:3001/api/health` returns `{"ok":true,"service":"aristotool-api"}`.
3. Login with the demo account.
4. Confirm the dashboard shows seeded progress.
5. Open a video resource and verify the iframe loads.
6. Click **Watch on YouTube** and the official resource link.
7. Bookmark and complete a resource, reload the page, and verify persistence.
8. Log out and verify protected routes require sign-in again.
9. Register a new account, confirm it, complete onboarding, and open the dashboard.
10. Check light and dark themes plus desktop and mobile navigation.

## Troubleshooting

### `npm.ps1 cannot be loaded`

PowerShell execution policy is blocking the npm shim. Use:

```powershell
& "C:\Program Files\nodejs\npm.cmd" <command>
```

### Registry timeouts or `EAI_AGAIN`

Use the public registry:

```bash
npm install --registry=https://registry.npmjs.org
```

### Port 3001 or 5173 already in use

Stop the existing process or set a different API port with `PORT`. If you change the API port, also update the proxy target in `vite.config.js`.

### Videos do not load

- Confirm the browser allows YouTube embeds.
- Confirm network access to YouTube is available.
- Check that `embedUrl` exists in `GET /api/catalog`.
- Use the **Watch on YouTube** link as a fallback.

### Progress does not persist

- Confirm the API is running.
- Confirm the browser accepted the `aristotool_session` cookie.
- Check browser devtools for `/api/state` and `/api/progress` responses.
- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` point to the intended database.

### Changes to catalog content do not appear

Restart the API. Catalog seeding happens at startup, not on every request.

## Production Deployment Notes

The current deployment uses Vercel Services with:

- `frontend`: Vite build from `dist/`
- `backend`: Express entrypoint `backend/server.js`
- `/api/(.*)` rewritten to the backend service
- all other paths rewritten to the SPA

Required Vercel environment variables for Production, Preview, and Development:

```text
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

Before changes to a deployed environment:

1. Run `npm run build`.
2. Set the two environment variables in every Vercel environment.
3. Deploy with `npx vercel deploy --prod` or connect the repository to Vercel for automatic deploys.
4. Verify `/api/health`, `/api/catalog`, demo login, `/api/state`, and SPA routes.
5. Keep database credentials out of source control and rotate them if exposed.
6. Add an email provider and replace returned confirmation tokens with real links.
7. Add rate limiting, monitoring, backups, and a secret-store rotation policy.
8. Review the educational content and external links on a release schedule.

## Roadmap

Potential next improvements:

- Email-based confirmation and password reset
- Quiz or assessment component per learning path
- Richer reporting and completion certificates
- Admin content management interface
- Search index and saved filters
- Multi-factor authentication
- Container and self-hosted deployment templates
- Automated tests for API routes and critical UI flows

## Development History

The repository history is organized into focused incremental commits:

1. React app scaffold and shared UI shell
2. Curated resource catalog and verified media links
3. SQLite-backed API with authentication and progress persistence
4. Registration, confirmation, onboarding, and API-backed app state
5. Navigation, profile menu, branding, and resource player polish
6. Comprehensive project documentation
7. Managed Turso/libSQL migration and Vercel deployment configuration
