# Site maintenance

## Content and SEO

Keep existing clean URLs when editing resources. Update modification dates only
for changed content, in the page's structured data, `scripts/seo-pages.json` and
`sitemap.xml`. Run the SEO tests for metadata, internal links and asset references.

The ficha preview is rendered from the first page of
`assets/downloads/ficha-identificacion-paciente.pdf`. When regenerating that PDF,
refresh `ficha-identificacion-paciente-preview.png` using PyMuPDF at 1.25× scale
and update the image dimensions in the article if needed.

## Analytics

`assets/cookie-consent.js` owns the sole GA4 loader (G-4J0QLJT1N0) and the existing
Clarity project. Only production and consented visits load analytics. Do not add
inline gtag snippets to individual pages. `assets/analytics.js` never reads form
values; successful Formspree acceptance triggers `generate_lead`.

The approved week-2 UTM values are allowlisted in the consent loader. New campaigns
require explicit additions and tests; arbitrary URL query values remain stripped.
Use hostname mx.getsorta.io in the dedicated Mexico property. Account-level key
events and actual production ingestion require verification in GA4 after deploy.

## Release

Run all tests listed in README before committing. Deploy using the repository's
existing Vercel workflow. Record the actual deployment date and social-post dates
in the marketing folder's growth/week-2 scorecard. Neither a local commit nor
passing mocked tests proves that production is deployed or collecting data.

## Asset cleanup

Before removing assets, check references in HTML (including data-image/srcset),
CSS, JS and generators. Fonts/images used only by marketing exports belong in
the separate Desktop marketing library. Preserve required dependencies when
moving editable marketing sources.
