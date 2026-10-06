# Signed-record product and marketing review — 2026-10-06

Reviewed backend `600efff` and frontend `d65ec31`, plus the pending WhatsApp safety branches merged with those revisions. This is a source review and local synthetic-product verification, not a production security certification.

## What is working

- Verified professional profile plus password confirmation required for signing; signer identity comes from that profile.
- Frozen PDF bytes, answer hashes, per-clinic linked records, application locking and PostgreSQL append-only triggers on seal/blob tables.
- Signed notes preserve the original. Authenticated verification checks the packet and its existing notes.
- Clinic-scoped access checks, individual users, deactivation and activity history.
- PDF/evidence exports, including original PDFs and instructions for checking their hashes.
- 50 isolated library tests passed, including signature rejection, tenant isolation, changed PDF/answer detection, notes, evidence and audit failure rollback. Team and template tests: 53 passed, one PostgreSQL-only skip. PostgreSQL trigger coverage must be assessed separately; SQLite captures do not demonstrate database trigger enforcement.

## Remaining gaps, in priority order

1. **Resolve old public storage links.** `docs/RELEASE_AND_ACTIVATION.md` explicitly records deferred Azure key rotation. Old SAS URLs may still work. New authenticated asset delivery does not revoke them. Coordinate the documented remediation with all storage consumers; this marketing task did not rotate keys.
2. **Define the trust boundary of verification.** `app/records/seal.py::verify_seal` verifies the current manifest, blobs and direct predecessor link, not an exhaustive recomputation of every earlier record. Hashes stored alongside the content do not independently authenticate the signer or time against a privileged rewrite. Append-only triggers are useful but are not an external trust anchor. Consider independent checkpoints/time attestations and chain-wide verification before stronger claims.
3. **Finish the paper-to-verification journey.** `stamp_pdf` prints only the first 32 hash characters; `/form-library/verify/{seal_hash}` requires 64. There is no browser verification route or QR/link in the reviewed frontend. A recipient cannot directly verify using only the printed reference. Provide a full-hash URL/QR and a readable public verification page. Do not advertise paper tracing as finished.
4. **Make audit history durable and complete.** The append-only triggers cover `record_seals` and `record_blobs`, not `audit_logs`. The UI fetches at most 60 events without pagination. Evidence ZIPs do not include an audit-history export. Add event pagination/export and protected audit retention before promising a complete immutable activity trail.
5. **Complete independent evidence checking.** `sha256sums.txt` covers original PDFs, manifest and note manifests, but not `paquete-sellado.pdf` or `seal.json`. The ZIP does not supply the complete predecessor chain or an independently trusted signature. Add checksums for all relevant artifacts and a verifier with an explicit trust model. Current copy says files can be compared with the included hashes, rather than claiming independent proof of authenticity.
6. **Make access/identity scope clearer.** Cédula verification is a manual clinic-admin attestation, not a live SEP integration. Signing checks active verified profile, not a separate doctor role. Admin/staff access is broad within a clinic. No MFA flow was found in the reviewed auth/team/frontend code. Consider MFA for signing/admins and more granular document permissions if required by clinic operations.
7. **Define document lifecycle and recovery operations.** A prior backup/restore rehearsal exists, but establish documented retention, legal holds, periodic restore drills and integrity monitoring specifically for sealed PDF blobs and notes. Do not infer these operational guarantees from the existence of a backup script.
8. **Polish document retrieval and language.** Sent documents are displayed as a button list without search/status/date filters. The signed packet still uses “Revisar y enviar” and “Envío en curso”; Settings mixes English/Spanish. Repeated “Consultado” events are noisy. Improve retrieval, closed-record labels and grouped activity for everyday clinic use.

## Marketing changes made

Replaced the constructed hero mockup and old PDF fragment with four screenshots from the actual product: sealed record, verification result, signed note and team permissions. A fifth verified-profile capture is available for later marketing use. Benefits lead the copy; technical details live in the FAQ. Corrected the public-verification privacy claim and removed absolute tamper/independent-authenticity promises. Kept clear e.firma and accredited-timestamp limitations without implying legal certification.

Public verification currently returns clinic, signer name/cédula, signed date and an integrity result to someone holding the full hash. It excludes clinical content; it does not expose the authenticated activity history. Consider whether this metadata disclosure matches clinic expectations before promoting the public lookup.
