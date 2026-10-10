# Product and editorial update — 9 October 2026

## Published scope

- Two original Spanish guides: `/recursos/asistente-virtual-consultorios` and `/recursos/preconsulta-digital`.
- Resource index, homepage discovery links, contextual WhatsApp/autofill links and article-to-product CTAs.
- Agenda: staff-approved sequential offers, reservation, acceptance, original-appointment preservation and clinic/template activation requirements. Removed guaranteed slot-recovery wording and assumed Meta approval time.
- Security: scope and lifecycle of library patient links, staff-only editing boundary, recipient verification and signed originals.
- Signed documents: a short workflow for consulting previous visits and adding subsequent signed notes.
- Metadata, article schema, sitemap and static analytics resource IDs. No new tracking provider, backend change or contact-form change.

## Editorial evidence and limits

Research reviewed October 9:
- https://www.nimbo-x.com/modulos/ai — current documentation assistance product.
- https://news.nimbo-x.com/s/que-hay-de-nuevo-en-nimbo/archive?sort=new — recent product updates.
- https://saludtotal.mx/es/blog/ — August/September articles on preconsultation, scheduling and security.
- https://pro.doctoralia.com.mx/productos/funcionalidades/lista-espera — commercial waitlist offering.

These demonstrate current market/editorial activity, not keyword search volume or growth. Google Trends did not return usable data. No traffic, savings, ranking or lead-count predictions. Backfill and cloud-security articles remain later candidates, not published duplicates.

The screenshots are existing Spanish marketing assets with fictional data. Captions identify them as marketing views whose presentation can vary by version; they do not claim to show the newest hosted UI.

## Product claim evidence

Backend reviewed against `8ed8fa1d072ec1adcc14d87d31f909855db08c27` (main; local source e3ac0f0):
- `app/backfill/service.py`: clinic activation, candidate windows/notice, handoff exclusion, sequential offers, deadlines and acceptance.
- `app/backfill/transport.py`, `routes.py`: platform sending gate and clinic configuration. Copy does not imply sending is enabled for every clinic.
- `app/form_library/service.py`: patient-visible packet projection, ownership validation, seven-day links, replacement and completion boundaries.
- `app/routers/form_library.py`: scoped patient endpoints, signed addenda, audit actions and export of sealed bytes.

Code inspection supports workflow descriptions; it is not new production activation or a real-patient readiness assessment. No certification, e.firma equivalence, universal AI capability or guaranteed legal compliance claims added.

## Validation

- All six existing static SEO tests pass: page registration, canonical/schema, sitemap, internal destinations and anchors.
- JavaScript syntax check passes.
- Seven changed/new pages checked at 390px and 1440px: no horizontal overflow, images load, one H1, article keyboard navigation and CTA focus work; reduced-motion preference enabled; no page JavaScript errors.
- Existing analytics regression checks run with all external services mocked.
- No real form submission, patient data access or external messages during validation.
