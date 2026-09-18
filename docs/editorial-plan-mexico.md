# Mexico resources: editorial map

Published batch: September 17, 2026. Audience: reception teams and owners of independent Mexican clinics. Priorities are qualitative findings from the September 17 research, not measured search volumes or ranking forecasts.

## Published / updated

| Page | Primary query | Supporting queries | Search intent and deliverable | Product destination |
|---|---|---|---|---|
| /recursos/mensajes-confirmar-citas-whatsapp | mensaje para confirmar cita médica | confirmar cita por WhatsApp; mensaje para reagendar cita | Copy/adapt eight original messages immediately; distinguish requests from confirmations | /producto/whatsapp |
| /recursos/ficha-identificacion-paciente | ficha de identificación del paciente | formato registro de pacientes; ficha identificación Word PDF | Download an administrative DOCX/PDF; understand fields and see a fictional example | /producto/formatos-medicos |
| /recursos/agenda-citas-medicas-excel | agenda de citas médicas Excel | control de pacientes y citas Excel; agenda consultorio gratis | Download an actual workbook with blank rows, examples and instructions | /producto/agenda |
| /recursos/llenado-formatos-nom-004 | NOM 004 formatos médicos | checklist expediente clínico; revisión documentos consultorio | Expand existing guide, provide referenced checklist; no certification claim | /producto/formatos-medicos |

Use one canonical URL per intent. Variations belong in natural headings and useful explanations, not repeated keyword blocks. The existing WhatsApp paperwork article addresses capture/document preparation, while the new messages article addresses appointment communication. Existing digitalization content remains the destination for the broader implementation workflow.

## Next editorial opportunities (not published in this batch)

1. General history-clinical template: `historia clínica formato Word México`. Requires a clinically reviewed original template and accurate scope. Do not rename the administrative registration sheet a complete history.
2. Privacy notice guide: `aviso de privacidad consultorio médico`. Explain actual data flows and provide a review checklist; do not issue a universal legal notice. Requires qualified legal review of substantive template content.
3. Dental paperwork: `historia clínica dental formato`. Validate specialty interest through pilot conversations and Search Console before building a full cluster; arrange clinical review.
4. Strengthen the existing digitalization guide for `llenar varios PDF con los mismos datos`, using a real configured-workflow example. Avoid a competing near-duplicate page.

## Content and conversion rules

Answer the query early. Deliver the promised file without a signup wall. Use original examples and fictional patient data. Describe actual product capabilities; message templates do not establish automatic reminder functionality. Every article links to the relevant product page and gives an optional route to the free pilot. Do not describe the pilot as permanently free.

Keep Mexican terminology and date conventions. Clinical/legal claims need primary sources and a review date. Do not invent patient results, endorsements, savings, clinical review credentials or volume figures. Keep the homepage's current positioning.

## Measurement

Use Search Console filtered to Mexico for query/page impressions, clicks and CTR. Track downloads through the existing resource_download event (consent-gated). Evaluate qualified, successfully received pilot inquiries separately from contact/WhatsApp clicks and unverified form-submit attempts. Compare article landing pages and product navigation; downloads alone are not qualified leads. No changes to consent behavior in this batch.

Validate candidate search volume using Mexico-targeted keyword research and actual Search Console data before expanding the backlog. No ranking timeframe is promised.

## Research references

- https://www.hulihistoriaclinica.mx/ — document-download search pattern.
- https://pro.doctoralia.com.mx/recursos-gratuitos/descargables/plantilla/control-de-pacientes-y-citas-plantilla — spreadsheet acquisition pattern.
- https://www.smsmasivos.com.mx/blog/como-confirmar-una-cita-por-whatsapp-sms — practical message-example intent.
- https://sidof.segob.gob.mx/notas/docFuente/5272787 — NOM-004 primary text.
- https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf — current private-sector data-protection law.
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content — useful, original content guidance.

## Rebuilding downloads

Install python-docx, openpyxl and reportlab in a separate Python environment, then run `python3 scripts/build-resource-downloads.py`. The website serves the generated static files; it has no runtime dependency on these libraries. The spreadsheet uses standard Excel formulas with recalculation on open. Verify formulas and data validation when importing into another spreadsheet editor.
