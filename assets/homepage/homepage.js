const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const productCaption = document.querySelector('.product-caption');
const originalCaption = productCaption.textContent;
function selectTab(tab) {
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  productCaption.textContent = panel.dataset.caption || originalCaption;
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(tabs[next]);
    tabs[next].focus();
  });
});

const dialog = document.querySelector('.image-dialog');
document.querySelectorAll('.screenshot-button').forEach(button => {
  button.addEventListener('click', () => {
    const source = button.querySelector('img');
    const image = dialog.querySelector('img');
    image.src = source.src;
    image.alt = source.alt;
    const illustrated = button.dataset.image === 'messages';
    dialog.querySelector('h2').textContent = illustrated ? 'Conversación ilustrativa en Sorta' : 'Captura real de Sorta';
    dialog.querySelector('p').textContent = illustrated
      ? 'Interfaz real del producto · Historial de mensajes ficticio para mostrar el flujo de recepción'
      : 'Cuenta demo · Interfaz en inglés';
    dialog.showModal();
    document.body.classList.add('dialog-open');
  });
});
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
