# Resource SEO release — October 6, 2026

## Baseline supplied by the owner

The owner described the clicks/impressions table as approximately three months, likely the site's complete history. Column labels and exact start/end dates were not supplied; the following interpretation assumes clicks followed by impressions. No query-level rankings or average positions were supplied, so low CTR is an opportunity to test, not proof of a snippet problem.

| Landing page | Clicks | Impressions | Calculated CTR |
| --- | ---: | ---: | ---: |
| `/recursos/ficha-identificacion-paciente` | 16 | 955 | 1.68% |
| `/recursos/agenda-citas-medicas-excel` | 14 | 304 | 4.61% |
| `/recursos/mensajes-confirmar-citas-whatsapp` | 4 | 751 | 0.53% |
| `/` | 1 | 9 | 11.11% |
| `/recursos/llenado-formatos-nom-004` | 0 | 34 | 0% |
| `/recursos/automatizar-formatos-medicos-whatsapp` | 0 | 10 | 0% |
| `/nosotros` | 0 | 7 | 0% |
| `/recursos/checklist-recepcion-clinica` | 0 | 7 | 0% |
| `/recursos` | 0 | 6 | 0% |
| `/recursos/checklist-formatos-consultorio` | Not supplied | Not supplied | — |

Separate screenshot: “Generative AI features”, three-month selector, 270 impressions. Visible dates September 16–October 4; top pages WhatsApp 106, Excel 85, ficha 72. These are visibility counts, not leads; do not add them to the general table or assume distinct visitors.

Separate GA4 screenshot: September 8–October 5, 15 active users, 21 views, 16 seconds average engagement, 171 events and zero key events. Different reporting periods, definitions and consent coverage prevent a direct reconciliation against search clicks. Zero key events does not prove missing instrumentation or prove there were no inquiries.

## Implemented

- Kept established URLs and canonical targets. Retained the Excel title, whose observed CTR is strongest, while clarifying the download description.
- Ficha title/description explicitly state free Word/PDF formats and no registration. WhatsApp title explicitly offers eight medical appointment examples; snippet names the available tasks.
- Added prominent hero links to the actual download block or first copyable message. Downloads remain ungated; the examples are crawlable text.
- Added contextual demo CTAs with allowlisted source attribution. WhatsApp CTA follows the first three complete examples; ficha follows the worked example; Excel follows usage instructions.
- Linked the three resource pages to each other and directly from the homepage. Resource hub title/description now accurately name the free Word, Excel, PDF and WhatsApp resources.
- Added concise task summaries and relevant resource links to four supporting articles; corrected the checklist's description to match its actual text download.
- Updated visible revision dates, Article dateModified and sitemap lastmod only for edited articles. The three leading Article entities now describe their actual topic.
- Added a fixed `resource_id` to consented site events on seven priority resource pages. Values come from an allowlisted pathname map, never from patient/form contents or arbitrary URL query values.
- Preserved the existing `generate_lead` contract: only a confirmed form-provider acceptance counts as a lead. A download, message copy or demo click remains a separate event.

## Measurement after deployment

Use the next complete 28-day period as the first comparison window; compare equal-duration periods and, when possible, the same query/country/device groups. Keep the original approximate three-month baseline as historical context, not the denominator for a 28-day uplift claim. With this traffic volume, inspect actual inquiries and task completion alongside rates; avoid declaring a win after a few clicks.

| Question | Metric or event |
| --- | --- |
| Are the pages earning relevant visits? | Search clicks, impressions, CTR and average position by page/query |
| Are visitors using the free resource? | `resource_download`, `resource_message_copy` by `resource_id` |
| Are they exploring the product? | `resource_product_click`, `contact_click`, `cta_click` by page and placement |
| Are demo requests delivered? | `generate_lead` with `delivery_status=accepted`, `offer=demo`, `resource=ficha/agenda_excel/mensajes_whatsapp` |
| Is AI visibility becoming traffic? | Review AI-feature visibility separately, then attributable visits and leads where the reporting permits |

## Account-side work not performed

There is no connected GA4/Search Console account in this workspace. Source changes cannot configure their account settings.

1. In GA4 Admin → Events, verify `generate_lead` is marked as a key event. Check its realtime/debug delivery after an explicitly authorized real form test. Do not count every download or WhatsApp click as a delivered lead.
2. Register event-scoped custom dimensions for `resource_id`, `resource`, `offer` and `placement` if not already present. Their values are fixed non-personal labels. Avoid duplicating existing definitions.
3. In Search Console, inspect the three priority URLs after deployment and request indexing if appropriate. Verify submitted sitemap is `https://mx.getsorta.io/sitemap.xml`. Submission does not guarantee crawling or ranking.
4. Export query/page/device/country data for matching date ranges before making keyword-specific changes. No search-volume or ranking assumptions were invented for this release.

## References

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): existing SEO fundamentals apply; no special AI markup/files are required, and inclusion is not guaranteed.
- [Google: title links](https://developers.google.com/search/docs/appearance/title-link): descriptive, concise titles aligned with visible page content.
- [Google: snippets](https://developers.google.com/search/docs/appearance/snippet): page content and useful descriptions can inform snippets; the supplied description is not a guaranteed displayed snippet.
- [Google Analytics: mark events as key events](https://support.google.com/analytics/answer/13128484?hl=en): key-event configuration is an account-side action.

No paid campaign, unsolicited outreach, Search Console submission or live form/analytics test was performed. Browser tests mock external analytics and form delivery.
