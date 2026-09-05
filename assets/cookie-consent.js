/**
 * cookie-consent.js — mx.getsorta.io
 * ───────────────────────────────────
 * Gates Google Analytics + Microsoft Clarity behind a visible choice.
 * Nothing analytics-related fires until the visitor accepts, or on a
 * later visit if they already accepted before. "Solo esenciales"
 * records the decline and never loads them.
 *
 * State lives in localStorage under SORTA_CONSENT_KEY: "granted" | "denied".
 */
(function () {
  'use strict';

  var KEY = 'sorta_cookie_consent';
  var GA_ID = 'G-ZPS6GNGPXD';
  var CLARITY_ID = 'wor9i7cm6t';

  function getConsent() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* private mode, etc. */ }
  }

  function loadAnalytics() {
    if (window.__sortaAnalyticsLoaded) return;
    window.__sortaAnalyticsLoaded = true;

    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(ga);

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);

    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  function showBanner() {
    var el = document.createElement('div');
    el.id = 'sorta-cookie-banner';
    el.className = 'cookie-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Preferencias de cookies');
    el.innerHTML =
      '<p class="cookie-banner__text">Usamos cookies de analítica (Google Analytics, Microsoft Clarity) para entender cómo se usa el sitio. Puedes aceptarlas o continuar solo con las esenciales. <a href="/privacidad#cookies">Leer más</a>.</p>' +
      '<div class="cookie-banner__actions">' +
        '<button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-cookie-action="decline">Solo esenciales</button>' +
        '<button type="button" class="cookie-banner__btn cookie-banner__btn--primary" data-cookie-action="accept">Aceptar</button>' +
      '</div>';
    document.body.appendChild(el);

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cookie-action]');
      if (!btn) return;
      if (btn.getAttribute('data-cookie-action') === 'accept') {
        setConsent('granted');
        loadAnalytics();
      } else {
        setConsent('denied');
      }
      el.remove();
    });
  }

  function init() {
    var consent = getConsent();
    if (consent === 'granted') {
      loadAnalytics();
    } else if (consent !== 'denied') {
      showBanner();
    }
    // consent === 'denied': do nothing, stay quiet.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
