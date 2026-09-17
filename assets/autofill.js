// Fixed fictional example only: no inputs, persistence, requests or PDF generation.
for (const demo of document.querySelectorAll('[data-autofill-demo]')) {
  const fill = demo.querySelector('[data-autofill-fill]');
  const reset = demo.querySelector('[data-autofill-reset]');
  const status = demo.querySelector('[role="status"]');
  const values = { name: 'María López García', birth: '04/03/1992' };
  function render(filled) {
    demo.querySelectorAll('[data-autofill-value]').forEach(field => {
      field.textContent = filled ? values[field.dataset.autofillValue] : '—';
    });
    demo.classList.toggle('is-filled', filled);
    reset.hidden = !filled;
    status.textContent = filled
      ? 'Datos compartidos llenados en 3 documentos. Revisa la información y completa el contenido clínico y las firmas pendientes.'
      : 'Los campos compartidos están listos para llenar.';
  }
  fill.addEventListener('click', () => render(true));
  reset.addEventListener('click', () => {
    render(false);
    fill.focus();
  });
}
