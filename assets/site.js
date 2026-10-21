const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.navigation');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menú');
  navigation.classList.remove('is-open');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  navigation.classList.toggle('is-open', open);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true' && document.querySelector('.features-toggle')?.getAttribute('aria-expanded') !== 'true') {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.header')) closeMenu();
});


const currentPath = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
for (const link of document.querySelectorAll('.navigation a, .header-actions a, .footer a')) {
  const url = new URL(link.href, location.href);
  const path = url.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (url.origin === location.origin && path === currentPath && !url.hash) link.setAttribute('aria-current', 'page');
}

const featuresToggle = document.querySelector('.features-toggle');
const featuresMenu = document.querySelector('.features-menu');
if (featuresToggle && featuresMenu) {
  function closeFeatures(restoreFocus = false) {
    featuresToggle.setAttribute('aria-expanded', 'false');
    featuresMenu.hidden = true;
    if (restoreFocus) featuresToggle.focus();
  }
  featuresToggle.addEventListener('click', () => {
    const open = featuresToggle.getAttribute('aria-expanded') !== 'true';
    featuresToggle.setAttribute('aria-expanded', String(open));
    featuresMenu.hidden = !open;
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.features-nav')) closeFeatures();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !featuresMenu.hidden) {
      event.preventDefault();
      closeFeatures(true);
    }
  });
  document.addEventListener('focusin', event => {
    if (!event.target.closest('.features-nav')) closeFeatures();
  });
  featuresMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeFeatures()));
}

// Carry only an approved editorial source through product/pricing to contact.
// No cookies, storage, form values or extra analytics events are needed.
(() => {
  const allowed = ['ficha', 'agenda_excel', 'mensajes_whatsapp', 'walkthrough', 'comparacion', 'teleconsulta'];
  const source = new URLSearchParams(location.search).get('recurso');
  const current = location.pathname.replace(/\.html$/, '');
  if (!allowed.includes(source) || !(current.startsWith('/producto/') || current === '/precios')) return;
  document.querySelectorAll('a[href]').forEach(link => {
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    const path = url.pathname.replace(/\.html$/, '');
    if (!(path.startsWith('/producto/') || path === '/precios' || path === '/contacto')) return;
    url.searchParams.set('recurso', source);
    if (path === '/contacto' && !url.searchParams.has('interes')) url.searchParams.set('interes', current === '/precios' ? 'piloto' : 'demo');
    link.setAttribute('href', url.pathname + url.search + url.hash);
  });
})();
