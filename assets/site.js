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
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
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
