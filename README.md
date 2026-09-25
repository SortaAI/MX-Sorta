# Sorta México website

Static Spanish marketing site for Mexican clinics, deployed on Vercel at
https://mx.getsorta.io. No build command or output-directory override is needed.
`vercel.json` serves clean URLs and keeps redirects for retired preview pages.

## Structure

- Root HTML files: homepage and core marketing pages.
- `producto/`: agenda, WhatsApp and document autofill pages.
- `recursos/`: practical guides and downloadable-resource pages.
- `assets/`: production CSS/JS, brand assets, Spanish product screenshots,
  team photos and public downloads.
- `scripts/`: SEO metadata and generators for SEO/downloadable resources.
- `tests/`: static SEO/link tests and browser behavior checks.
- `docs/`: technical maintenance notes.

All 22 pages share `assets/site.css` and the consent-based analytics loader.
`assets/interior.css` handles secondary layouts; feature-specific files are
loaded only by relevant pages. `assets/site.js` handles navigation and
`assets/homepage/homepage.js` handles the homepage tabs and image viewer.
Headers and footers are static HTML; update them consistently across pages.

GA4 uses the dedicated Mexico stream **G-4J0QLJT1N0** after analytics consent.
The contact flow uses Formspree and counts leads only on successful delivery.

## Checks

    python3 -m unittest discover -s tests -p 'test_*.py'
    node tests/analytics.cjs
    node tests/resources.cjs
    node tests/autofill.cjs

Browser checks require Playwright and Chrome. If Playwright is installed outside
this repo, set `PLAYWRIGHT_MODULE` to its absolute module path. Analytics and
contact test traffic is mocked; tests do not send real leads or analytics events.

## Marketing materials

Local marketing deliverables are now in `~/Desktop/Sorta Marketing/`:
`pitch/v10` is current; `pitch/v9` is the previous version. Social graphics,
editable sources, growth plans and their fonts/assets live there too. They are
not deployed with this website. The Desktop folder has its own editing guide.

Keep local tool settings, generated previews and dependency folders out of Git.
