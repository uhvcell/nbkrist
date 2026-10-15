# UHV CELL — Local CMS

Local-first content management for the UHV CELL NBKRIST static website. The CMS runs on **localhost only** and generates GitHub Pages–compatible static files.

## Quick Start

```bash
cd cms
cp .env.example .env
npm install
npm start
```

Open **http://127.0.0.1:3333/admin/**

### First-run admin account (REQUIRED — no default password)

Real authentication is enforced. There is **no `admin123` default** anymore. On
first run, if no admin user exists the server bootstraps one **only** from
environment variables:

- `CMS_ADMIN_PASS` — **required** to create the account. If it is unset, the
  server logs a bootstrap error and creates **no** user (every `/api/*` write is
  rejected until you set it and restart).
- `CMS_ADMIN_USER` — optional, defaults to `admin`.
- `CMS_COOKIE_SECURE` — set to `true` only when serving the admin over HTTPS;
  leave unset/`false` for local HTTP dev so the session cookie still works.

```bash
# in cms/.env
CMS_ADMIN_USER=admin
CMS_ADMIN_PASS=choose-a-strong-password
```

Sign in with those credentials, then change the password from **Settings →
Change Admin Password**. Sessions expire after 12 hours; expired sessions are
rejected and cleared automatically.

## What Was Implemented (Phase 0–1)

- JSON content store in `cms/content/`
- Static site builder (`cms/builder/`)
- Local Express API + JSON session store + revision history
- Professional admin dashboard at `/admin/`
- Publish to `site/` (full static copy, admin removed)
- Deploy data files to repo root (`*-data.js`, `site-settings.js`)

## Content Files

| File | Purpose |
|------|---------|
| `cms/content/site-settings.json` | Email, phone, address, correspondent |
| `cms/content/navigation.json` | Nav structure (future template use) |
| `cms/content/collections/team.json` | Team members |
| `cms/content/collections/videos.json` | Video resources |
| `cms/content/collections/posters.json` | Slider banners |
| `cms/content/collections/newsletters.json` | Newsletter links |

## Publish Workflow

### 1. Preview (safe)

In the CMS dashboard: **Build Preview** → opens `http://127.0.0.1:3333/preview/`

Or CLI:

```bash
cd cms
npm run build:preview
```

### 2. Publish full site build

Dashboard: **Publish to site/** → writes to `site/` folder

Or CLI:

```bash
cd cms
npm run deploy:site
```

The `site/` folder contains:

- All public HTML/CSS/images (copied from repo root)
- Generated `team-data.js`, `videos-data.js`, `posters-data.js`, `newsletter-data.js`, `site-settings.js`
- **No** `admin-panel.html`, `admin.js`, or `admin-style.css`

### 3. Deploy data only (quick GitHub Pages update)

Dashboard: **Deploy Data to Root**

Or CLI:

```bash
cd cms
npm run deploy:data
```

This updates root `*-data.js`, `site-settings.js`, `navigation-data.js`, and
`page-content.js`, and injects SEO/nav/branding into the root `*.html`. (Saving
in the admin now triggers this automatically.) Commit and push the changed files
to publish via GitHub Actions.

## GitHub Pages

- **Option A (current):** Deploy from repo root — use **Deploy Data to Root** or copy `site/*` to root.
- **Option B (future):** Configure GitHub Pages to publish from `/site` via Actions.

The live site must remain static files only. **Never deploy the `cms/` folder to GitHub Pages.**

## Security

- CMS binds to `127.0.0.1` by default
- Session cookies (HTTP-only)
- bcrypt password hashes in local JSON store (`cms/data/cms-store.json`)
- Real session auth with 12h expiry; expired sessions are rejected + cleared
- No hardcoded default password (bootstrap requires `CMS_ADMIN_PASS`)
- Upload hardening: image-only mime + 5 MB cap; SVG upload disallowed
- All `/api/*` routes require a valid session
- `cms/.env` and `cms/cookies.txt` are never copied into the built site
- Old browser-only admin (`admin-panel.html`) should be removed from production builds

## Operational Notes

### Auto-publish on save (live target = repo root)

Saving content in the admin now auto-runs **Deploy Data** so edits reach the
live repo-root pages without a manual step. SEO meta, navigation, logos, and
favicon are injected into the repo-root `*.html` on deploy (the authoritative
live target); `site/` receives the same injection and is the GitHub Pages
artifact. If the auto-deploy fails, a toast tells you to retry via **Publish →
Deploy Data**.

### Header/footer are duplicated-by-copy

There is no template engine. The shared `<header>`/`<footer>` markup is copied
into all 16 root `*.html` files. If you change the header, change it in **all**
root HTML files together (only the per-page `class="active"` marker and the
trailing `.download-item` differ). The build then propagates to `site/` and
`cms/preview/`.

### Video concurrency (Internet Archive)

All videos are hosted on **Internet Archive**; the UHV CELL server never streams
video bytes. Concurrent-playback capacity, byte-range support, and rate limits
are provided by Internet Archive. The project imposes **no** concurrency limit
of its own, and we make **no** guarantee of unlimited simultaneous playback —
practical limits are Archive.org's bandwidth, rate limiting, and availability.

### WebP companions (manual/offline)

Large hero/poster JPEGs can be served faster with WebP companions referenced via
`<picture>`. Conversion is a **manual/offline** step (no headless converter is
bundled). Add `name.webp` next to `name.jpg` and wire a `<picture>` element only
where the companion actually exists.

### Service-worker cache version

`sw.js` serves data files network-first but HTML/CSS/JS cache-first. **Bump
`CACHE_NAME`** (e.g. `uhv-cache-v4` → `v5`) whenever HTML/CSS/JS structure
changes, so returning visitors are not served stale assets.

### Image uploads

Uploads accept JPEG/PNG/WebP/GIF up to 5 MB. **SVG upload is disallowed** (an
uploaded SVG is a stored-XSS vector); any pre-existing `uploads/*.svg` is served
non-rendering (as an attachment).

## GitHub Actions auto-deploy

`.github/workflows/deploy.yml` builds `cms/` and publishes `site/` to GitHub
Pages on push to `main`/`master` (or manual dispatch).

> **Branch-filter caveat:** the push trigger only fires on `main`/`master`. The
> repository's **default branch must match one of those names**, or add your
> branch to the `branches:` list in the workflow. The YAML is authored but has
> not been executed/validated locally (git is not installed in this
> environment).

## Next Phases

- Template-based header/footer generation (remove duplicate-by-copy)
- Per-breakpoint `srcset` for content images
- Automated WebP generation pipeline
