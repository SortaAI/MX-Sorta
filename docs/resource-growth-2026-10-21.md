# Resource conversion update — 21 October 2026

## Changes

The ficha, Excel agenda and WhatsApp message resources now offer a relevant
product example before asking for a conversation. Free downloads remain ungated.
The Excel resource explicitly addresses clinic staff, rather than patients trying
to book or check a medical appointment. Existing URLs, titles and canonicals stay
unchanged. The closing CTA explains the founder-clinic offer through pricing.

Approved `recurso` labels now survive navigation through product pages and pricing
to contact. This uses links only, without cookies or local storage. The existing
consented interaction events include `source_resource`, restricted to six static
values or `none`. Page-view URLs remain sanitized. Successful Formspree acceptance
is still the sole trigger for `generate_lead`; WhatsApp clicks are contact intent.

## GA4 account setup still required

No GA4 administrator connection was available during implementation.

1. In the Mexico property, confirm the stream and hostname are mx.getsorta.io.
2. In Admin, mark the existing `generate_lead` event as a key event. Do not mark
   downloads or WhatsApp clicks as confirmed leads.
3. Register event-scoped custom dimensions for `source_resource`, `resource_id`,
   `placement`, `resource` and `offer` only if they do not already exist.
4. Check consented activity in Realtime/DebugView after deployment. The new source
   label belongs to custom interaction events, not the loader's page_view event.
5. Compare resource_product_click, autofill_demo_complete, contact_click,
   whatsapp_click and generate_lead by resource. A successful inquiry is not yet a
   qualified clinic or sale. Qualify it separately when following up.

Never send patient information or contact-form values to analytics. Local tests
mock submissions and providers; they do not prove production ingestion. Custom
source propagation is intentionally limited to a visitor's tagged navigation;
returning later through an untagged link does not recreate that attribution.

## Weekly review

Use the same date window, and separate Mexico-filtered Search Console web-search
results, generative-AI impressions and consented GA4 data. Do not add their totals.
The supplied data show 589 impressions / 3 clicks for the broad ficha query and
26 / 3 for the PDF query, but average position was not supplied. This is insufficient
to diagnose title performance or identify visitors as clinic decision makers.

Record weekly:

| Measure | Source |
| --- | --- |
| Mexico search impressions, clicks, CTR and average position by page/query | Search Console web search |
| Sessions landing on each resource | GA4 landing-page report |
| Downloads and product-example clicks | Existing resource events |
| Completed autofill demonstrations | autofill_demo_complete |
| WhatsApp contact intent | whatsapp_click |
| Accepted inquiries, then qualified clinic conversations | generate_lead, followed by manual qualification |

Record deployment date separately from the comparison window. Review at 7 days
for broken paths and at 28 days for search trends. No extra keyword-variant pages,
ranking guarantees or unverified customer claims were added.
