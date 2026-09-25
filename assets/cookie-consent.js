/** Dedicated Mexico GA4 stream; dedicated Mexico Clarity project. Consent required. */
(function () {
  'use strict';
  var KEY = 'sorta_cookie_consent';
  var GA_ID = 'G-4J0QLJT1N0';
  var CLARITY_ID = 'ynwi202zd9';
  var production = location.hostname === 'mx.getsorta.io';
  var consent = null;
  var returnFocus = null;
  try { consent = localStorage.getItem(KEY); } catch (_) {}

  function cleanURL(value) {
    try {
      var url = new URL(value);
      if (!/^https?:$/.test(url.protocol)) return '';
      // Only approved static campaign tokens; never forward arbitrary URL values.
      var approved = { utm_source: ['linkedin'], utm_medium: ['organic_social'], utm_campaign: ['mx_week_2'], utm_content: ['post_2_ficha', 'post_3_whatsapp', 'founder_post_2', 'founder_post_3'] };
      var safe = new URL(url.origin + url.pathname);
      Object.keys(approved).forEach(function (key) {
        var token = url.searchParams.get(key);
        if (approved[key].indexOf(token) !== -1) safe.searchParams.set(key, token);
      });
      return safe.href;
    }
    catch (_) { return ''; }
  }

  function loadAnalytics() {
    if (!production || consent !== 'granted' || window.__sortaAnalyticsLoaded) return;
    window.__sortaAnalyticsLoaded = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('set', { site_market: 'MX', site_locale: 'es-MX' });
    window.gtag('config', GA_ID, {
      send_page_view: false,
      // Share the GA cookie with getsorta.io and its subdomains.
      cookie_domain: 'auto',
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: cleanURL(location.href),
      page_referrer: cleanURL(document.referrer)
    });
    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: cleanURL(location.href),
      page_referrer: cleanURL(document.referrer),
      page_type: document.body.dataset.pageType || 'page',
      site_market: 'MX', site_locale: 'es-MX'
    });
    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(ga);

    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    window.clarity('set', 'site_market', 'MX');
    window.clarity('set', 'site_locale', 'es-MX');
    var clarity = document.createElement('script');
    clarity.async = true;
    clarity.src = 'https://www.clarity.ms/tag/' + CLARITY_ID;
    document.head.appendChild(clarity);
    document.dispatchEvent(new Event('sorta:analytics-ready'));
  }

  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (!/^(_ga($|_)|_clck$|_clsk$)/.test(name)) return;
      ['', location.hostname, '.' + location.hostname, '.getsorta.io'].forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '');
      });
    });
  }

  function choose(value) {
    consent = value;
    try { localStorage.setItem(KEY, value); } catch (_) {}
    var banner = document.getElementById('sorta-cookie-banner');
    if (banner) banner.remove();
    document.dispatchEvent(new CustomEvent('sorta:consent-change', { detail: { granted: value === 'granted' } }));
    if (value === 'granted') loadAnalytics();
    else {
      window['ga-disable-' + GA_ID] = true;
      clearAnalyticsCookies();
      if (window.__sortaAnalyticsLoaded) {
        if (typeof window.clarity === 'function') window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
        // A fresh page removes already-loaded analytics code as well as its cookies.
        location.reload();
        return;
      }
    }
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
  }

  function showBanner(focus) {
    var existing = document.getElementById('sorta-cookie-banner');
    if (existing) { if (focus) existing.querySelector('button').focus(); return; }
    if (focus) returnFocus = document.activeElement;
    var el = document.createElement('div');
    el.id = 'sorta-cookie-banner';
    el.className = 'cookie-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Preferencias de cookies');
    el.setAttribute('aria-describedby', 'sorta-cookie-description');
    el.innerHTML = '<p id="sorta-cookie-description" class="cookie-banner__text">Usamos Google Analytics y Microsoft Clarity para entender cómo se usa el sitio. Puedes aceptar las cookies de analítica o continuar solo con las esenciales. <a href="/privacidad#cookies">Leer más</a>.</p>' +
      '<div class="cookie-banner__actions"><button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-cookie-action="decline">Solo esenciales</button>' +
      '<button type="button" class="cookie-banner__btn cookie-banner__btn--primary" data-cookie-action="accept">Aceptar</button></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (event) {
      var button = event.target.closest('[data-cookie-action]');
      if (button) choose(button.dataset.cookieAction === 'accept' ? 'granted' : 'denied');
    });
    if (focus) el.querySelector('button').focus();
  }

  window.SortaConsent = {
    hasAnalyticsConsent: function () { return production && consent === 'granted'; },
    openPreferences: function () { showBanner(true); }
  };
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-cookie-preferences]')) showBanner(true);
  });
  function init() {
    if (consent === 'granted') loadAnalytics();
    else if (consent !== 'denied') showBanner(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
