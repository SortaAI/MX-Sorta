# Sorta México website

Static Spanish marketing site for Mexican clinics, deployed on Vercel at
https://mx.getsorta.io. No build command or output-directory override is needed.
`vercel.json` serves clean URLs and keeps redirects for retired preview pages.

## Structure

- Root HTML files: homepage and core marketing pages.
- `producto/`: agenda, WhatsApp and document autofill pages.
- `soluciones/`: complete reception workflow for clinic teams.
- `recursos/`: practical guides and downloadable-resource pages.
- `assets/`: production CSS/JS, brand assets, Spanish product screenshots,
  team photos and public downloads.
- `scripts/`: SEO metadata and generators for SEO/downloadable resources.
- `tests/`: static SEO/link tests and browser behavior checks.
- `docs/`: technical maintenance notes.

All 31 pages share `assets/site.css` and the consent-based analytics loader.
`assets/interior.css` handles secondary layouts; feature-specific files are
loaded only by relevant pages. `assets/site.js` handles navigation and
`assets/homepage/homepage.js` handles the homepage tabs and image viewer.
Headers and footers are static HTML; update them consistently across pages.

GA4 uses the dedicated Mexico stream **G-4J0QLJT1N0** after analytics consent.
Leadsy project `185mxUmlNNFknPdZ7` loads through that shared loader only on
`mx.getsorta.io`, after optional-tracking consent. Consent key
`sorta_cookie_consent_v2` requests a fresh choice from visitors who accepted the
previous analytics-only notice. The provider dashboard must confirm reception;
script insertion alone is not proof of a recorded visit.
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

### Resource conversion and deployment checks

- Resource demo links use `/contacto?interes=demo&recurso=...`; allowed resource tokens are `ficha`, `agenda_excel`, `mensajes_whatsapp`, `walkthrough`, `comparacion`, and `teleconsulta`. Unknown values become `directo`.
- Accepted inquiries emit `generate_lead` with `offer=demo` or `offer=free_pilot`. A successful clipboard action emits `resource_message_copy` with the static example ID. Analytics requires consent and never includes message or form contents.
- Run `python3 scripts/check-deployment.py` after deployment to check the live sitemap, canonicals, internal destinations, and downloadable files. Use `--base https://your-preview-host` for a preview deployment; canonical URLs should still point to production.
- Run `python3 -m unittest discover -s tests -p 'test_seo.py'`, `node tests/resources.cjs`, and `node tests/analytics.cjs` locally. Browser tests require Playwright (or `PLAYWRIGHT_MODULE`) and Chrome; external form submissions and analytics calls are mocked.

### Clinic tools and product scope

- Rebuild the handover workbook and administrative teleconsultation PDF with `python3 scripts/build-clinic-tools.py` (requires openpyxl and reportlab). Examples are fictional; these downloads are not clinical protocols.
- The walkthrough uses native details controls and consent-based `workflow_step_open` events with static step IDs.
- Competitor comparisons cite public vendor documentation and must be rechecked before changing claims or prices.
- WhatsApp copy distinguishes eligible Coexistence connections from migration. Coexistence remains pending real-number validation. Messages contains human handoffs, routine appointment requests appear in Agenda, and historical chats/contact lists are not imported. Phone replies are intended to mirror only into open human-handoff transcripts. Do not promise a complete mirrored inbox or universal eligibility.
