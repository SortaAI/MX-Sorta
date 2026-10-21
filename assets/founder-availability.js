/* Update only from confirmed clinic places, never leads, demo tenants or visits.
   This is a manually maintained count, not an app activity feed. */
(() => {
  const availability = { capacity: 10, confirmed: 0, verifiedOn: '2026-10-21' };
  const { capacity, confirmed, verifiedOn } = availability;
  if (!Number.isInteger(capacity) || !Number.isInteger(confirmed) || capacity <= 0 || confirmed < 0 || confirmed > capacity) return;
  const remaining = capacity - confirmed;
  document.querySelectorAll('[data-founder-availability]').forEach(card => {
    card.querySelector('[data-founder-count]').textContent = remaining
      ? `${remaining} de ${capacity} lugares disponibles`
      : 'Los lugares de esta convocatoria están completos';
    const meter = document.createElement('progress');
    meter.max = capacity;
    meter.value = confirmed;
    meter.setAttribute('aria-label', `${confirmed} de ${capacity} lugares confirmados`);
    card.querySelector('[data-founder-meter]').replaceChildren(meter);
    card.querySelector('[data-founder-detail]').textContent = `${confirmed} ${confirmed === 1 ? 'clínica confirmada' : 'clínicas confirmadas'} · Actualizado el ${verifiedOn.split('-').reverse().join('/')}`;
    if (!remaining) {
      const link = card.querySelector('a');
      link.textContent = 'Consultar próxima convocatoria →';
      link.href = '/contacto';
    }
  });
})();
