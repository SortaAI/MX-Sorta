/** Mexico adaptation of LandingPage-Sorta/js/analytics.js. Never reads form values. */
(function () {
  'use strict';
  var started = false;
  var formStarted = false;
  var observer;
  var timer;
  var visibleSeconds = 0;
  var lastTick = 0;
  var milestones = new Set();
  var seen = new Set();
  function allowed() { return window.SortaConsent && window.SortaConsent.hasAnalyticsConsent(); }
  function track(name, params) {
    if (!allowed() || !window.__sortaAnalyticsLoaded) return;
    var values = Object.assign({
      site_market: 'MX', site_locale: 'es-MX',
      page_type: document.body.dataset.pageType || 'page',
      page_path: location.pathname.replace(/\.html$/, '')
    }, params || {});
    if (typeof window.gtag === 'function') window.gtag('event', name, values);
    if (typeof window.clarity === 'function') window.clarity('event', name);
  }
  function placement(el) {
    if (el.closest('.header')) return 'header';
    if (el.closest('.footer')) return 'footer';
    if (el.closest('.hero')) return 'hero';
    if (el.closest('.closing, .cta-panel')) return 'closing';
    if (el.closest('.article-body')) return 'article';
    return 'content';
  }

  document.addEventListener('click', function (event) {
    if (!allowed()) return;
    var el = event.target.closest('a, button');
    if (!el) return;
    var where = placement(el);
    if (el.dataset.track) track('cta_click', { event_label: el.dataset.track, placement: where });
    if (el.matches('[role="tab"]')) track('product_tab_view', { tab: el.id.replace('tab-', '') });
    if (el.matches('.screenshot-button')) track('product_screenshot_open', { screen: el.dataset.image });
    if (!el.matches('a[href]')) return;
    var url;
    try { url = new URL(el.href, location.href); } catch (_) { return; }
    if (url.hostname === 'wa.me') track('whatsapp_click', { placement: where });
    else if (url.protocol === 'mailto:') track('email_click', { placement: where });
    else if (url.origin === location.origin && url.pathname === '/contacto') track('contact_click', { placement: where });
    else if (url.origin === location.origin && url.pathname.startsWith('/recursos/')) track('resource_click', { resource_path: url.pathname, placement: where });
    if (el.hasAttribute('download')) track('resource_download', { resource_path: url.pathname });
    if (/^https?:$/.test(url.protocol) && url.hostname !== location.hostname) track('outbound_click', { destination_host: url.hostname, placement: where });
  });
  document.addEventListener('focusin', function (event) {
    if (!allowed() || formStarted || !event.target.closest('.contact-card form')) return;
    formStarted = true;
    track('contact_form_start', { form_id: 'clinic_contact' });
  });
  document.addEventListener('submit', function (event) {
    if (!event.target.matches('.contact-card form') || !event.target.checkValidity()) return;
    // An attempt is not a delivered inquiry. Do not emit generate_lead here.
    track('contact_form_submit', { form_id: 'clinic_contact', delivery_status: 'unverified' });
  }, true);
  document.addEventListener('toggle', function (event) {
    if (event.target.matches('.faq-list details') && event.target.open) {
      var items = Array.from(event.target.parentElement.querySelectorAll('details'));
      track('faq_open', { question_number: items.indexOf(event.target) + 1 });
    }
  }, true);

  function start() {
    if (started || !allowed() || !window.__sortaAnalyticsLoaded) return;
    started = true;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || !allowed()) return;
          var section = entry.target.closest('section');
          var key = section.dataset.analyticsSection;
          if (seen.has(key)) return;
          seen.add(key);
          track('section_view', { section: key });
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      document.querySelectorAll('main section').forEach(function (section, index) {
        section.dataset.analyticsSection = section.id || section.getAttribute('aria-labelledby') || 'section_' + (index + 1);
        // Observe a heading so long sections can qualify on a small phone screen.
        observer.observe(section.querySelector('h1, h2') || section);
      });
    }
    lastTick = performance.now();
    timer = setInterval(function () {
      var now = performance.now();
      var delta = Math.min((now - lastTick) / 1000, 2);
      lastTick = now;
      if (document.hidden || !allowed()) return;
      visibleSeconds += delta;
      [30, 60, 120].forEach(function (seconds) {
        if (visibleSeconds < seconds || milestones.has(seconds)) return;
        milestones.add(seconds);
        track('engagement_time', { seconds_on_page: seconds });
      });
      if (milestones.size === 3) clearInterval(timer);
    }, 1000);
  }
  document.addEventListener('visibilitychange', function () { lastTick = performance.now(); });
  document.addEventListener('sorta:analytics-ready', start);
  document.addEventListener('sorta:consent-change', function (event) {
    if (!event.detail.granted) {
      if (observer) observer.disconnect();
      clearInterval(timer);
      started = false;
    }
  });
  start();
})();
