/* Native Formspree form: works without JavaScript and never sends values to analytics. */
(() => {
  const form = document.getElementById('pilot-form');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const error = document.getElementById('contact-error');
  const success = document.getElementById('contact-success');
  const params = new URLSearchParams(location.search);
  const topics = ['ficha', 'agenda_excel', 'mensajes_whatsapp', 'walkthrough', 'comparacion', 'teleconsulta'];
  const interest = form.elements.interes;
  if (['demo', 'piloto'].includes(params.get('interes'))) interest.value = params.get('interes');
  const source = topics.includes(params.get('recurso')) ? params.get('recurso') : 'directo';
  form.elements.recurso_origen.value = source;
  let submitting = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    submitting = true;
    button.disabled = true;
    button.textContent = 'Enviando…';
    form.setAttribute('aria-busy', 'true');
    error.hidden = true;
    try {
      const response = await fetch(form.action, {
        method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Submission failed');
      document.dispatchEvent(new CustomEvent('sorta:contact-delivered', {detail: {offer: interest.value === 'piloto' ? 'free_pilot' : 'demo', resource: source}}));
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (_) {
      error.hidden = false;
    } finally {
      submitting = false;
      button.disabled = false;
      button.textContent = 'Enviar solicitud';
      form.removeAttribute('aria-busy');
    }
  });
})();
