/* Native Formspree form: works without JavaScript and never sends values to analytics. */
(() => {
  const form = document.getElementById('pilot-form');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const error = document.getElementById('contact-error');
  const success = document.getElementById('contact-success');
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
      document.dispatchEvent(new Event('sorta:contact-delivered'));
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (_) {
      error.hidden = false;
    } finally {
      submitting = false;
      button.disabled = false;
      button.textContent = 'Solicitar piloto gratuito';
      form.removeAttribute('aria-busy');
    }
  });
})();
