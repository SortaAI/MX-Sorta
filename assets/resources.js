for (const button of document.querySelectorAll('[data-copy-target]')) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const source = document.getElementById(button.dataset.copyTarget);
    const status = document.querySelector('.copy-status');
    try {
      await navigator.clipboard.writeText(source.textContent);
      status.textContent = 'Mensaje copiado. Sustituye los datos entre corchetes antes de enviarlo.';
      button.textContent = 'Copiado ✓';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(source);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'Seleccionamos el texto. Usa la opción Copiar de tu dispositivo.';
    }
  });
}
