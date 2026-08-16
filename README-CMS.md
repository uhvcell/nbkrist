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

Default login (change after first sign-in):

- **Username:** `admin`
- **Password:** `admin123` (or value in `cms/.env`)

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

This updates root `*-data.js` and `site-settings.js` without rebuilding all HTML.

Then commit and push:

```bash
git add team-data.js videos-data.js posters-data.js newsletter-data.js site-settings.js
git commit -m "Update site content from CMS"
git push
```

## GitHub Pages

- **Option A (current):** Deploy from repo root — use **Deploy Data to Root** or copy `site/*` to root.
- **Option B (future):** Configure GitHub Pages to publish from `/site` via Actions.

The live site must remain static files only. **Never deploy the `cms/` folder to GitHub Pages.**

## Security

- CMS binds to `127.0.0.1` by default
- Session cookies (HTTP-only)
- bcrypt password hashes in local JSON store (`cms/data/cms-store.json`)
- Old browser-only admin (`admin-panel.html`) should be removed from production builds

## Next Phases

- Template-based header/footer generation
- Page content editor (About, Activities, etc.)
- Media upload library
- Navigation manager UI
- SEO module
- GitHub Actions auto-deploy
