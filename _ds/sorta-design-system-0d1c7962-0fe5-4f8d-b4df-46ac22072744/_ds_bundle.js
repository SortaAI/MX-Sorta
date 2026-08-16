/* @ds-bundle: {"format":3,"namespace":"SortaDesignSystem_0d1c79","components":[],"sourceHashes":{"deck-stage.js":"ad1c016a6256","design-canvas.jsx":"3b0e985041dd","design_handoff_marketing_redesign/medonix-mocks.jsx":"e115057ce0ab","design_handoff_marketing_redesign/medonix-page-1.jsx":"27f43c64bf57","design_handoff_marketing_redesign/medonix-page-2.jsx":"5fd27f60ece3","landing-a-mocks.jsx":"d91eb0916180","landing-a.jsx":"c7caed2e7f12","landing-b-mocks.jsx":"0e71819cf5b1","landing-b.jsx":"c42c157c2cb0","landing-c.jsx":"8b1aec8c654d","landing-shared.jsx":"8cb50c18a181","medonix-mocks.jsx":"e115057ce0ab","medonix-page-1.jsx":"27f43c64bf57","medonix-page-2.jsx":"5fd27f60ece3","ui_kits/webapp/Dashboard.jsx":"f5d08a5bab6e","ui_kits/webapp/Login.jsx":"06627560c04e","ui_kits/webapp/Workspace.jsx":"33896da7a58d","ui_kits/webapp/shared.jsx":"e0b6bb22befc"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SortaDesignSystem_0d1c79 = window.SortaDesignSystem_0d1c79 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// deck-stage.js
try { (() => {
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→, PgUp/PgDn, Space, Home/End, number keys.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on idle.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const pad2 = n => String(n).padStart(2, '0');
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
    }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    /* Tap zones for mobile — back/forward thirds like Stories.
       Transparent, no visible UI, don't block the overlay. */
    .tapzones {
      position: fixed;
      inset: 0;
      display: flex;
      z-index: 2147482000;
      pointer-events: none;
    }
    .tapzone {
      flex: 1;
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    }
    /* Only activate tap zones on coarse pointers (touch devices). */
    @media (hover: hover) and (pointer: fine) {
      .tapzones { display: none; }
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that connectedCallback injects
       into <head> (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      ::slotted(*:last-child) {
        break-after: auto;
        page-break-after: auto;
      }
      .overlay, .tapzones { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTapBack = this._onTapBack.bind(this);
      this._onTapForward = this._onTapForward.bind(this);
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      // Initial collection + layout happens via slotchange, which fires on mount.
    }
    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        this._fit();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Tap zones (mobile): left third = back, right third = forward.
      const tapzones = document.createElement('div');
      tapzones.className = 'tapzones export-hidden';
      tapzones.setAttribute('aria-hidden', 'true');
      tapzones.setAttribute('data-noncommentable', '');
      const tzBack = document.createElement('div');
      tzBack.className = 'tapzone tapzone--back';
      const tzMid = document.createElement('div');
      tzMid.className = 'tapzone tapzone--mid';
      tzMid.style.pointerEvents = 'none';
      const tzFwd = document.createElement('div');
      tzFwd.className = 'tapzone tapzone--fwd';
      tzBack.addEventListener('click', this._onTapBack);
      tzFwd.addEventListener('click', this._onTapForward);
      tapzones.append(tzBack, tzMid, tzFwd);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-noncommentable', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._go(this._index - 1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._go(this._index + 1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));
      this._root.append(style, stage, tapzones, overlay);
      this._canvas = canvas;
      this._slot = slot;
      this._overlay = overlay;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. Inject/update a single <head> style tag so the print
     *  sheet matches the design size and Save-as-PDF yields one slide per
     *  page with no margins. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
      }
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }';
    }
    _onSlotChange() {
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        // Determine a label for comment flow: prefer explicit data-label,
        // then an existing data-screen-label, then first heading, else "Slide".
        let label = slide.getAttribute('data-label');
        if (!label) {
          const existing = slide.getAttribute('data-screen-label');
          if (existing) {
            // Strip any leading number the author may have included.
            label = existing.replace(/^\s*\d+\s*/, '').trim() || existing;
          }
        }
        if (!label) {
          const h = slide.querySelector('h1, h2, h3, [data-title]');
          if (h) label = (h.textContent || '').trim().slice(0, 40);
        }
        if (!label) label = 'Slide';
        slide.setAttribute('data-screen-label', `${pad2(n)} ${label}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._totalEl) this._totalEl.textContent = String(this._slides.length || 1);
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
    }
    _loadNotes() {
      const tag = document.getElementById('speaker-notes');
      if (!tag) {
        this._notes = [];
        return;
      }
      try {
        const parsed = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(parsed)) this._notes = parsed;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
        this._notes = [];
      }
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      if (this._countEl) this._countEl.textContent = String(curr + 1);
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay() {
      if (!this._overlay) return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _fit() {
      if (!this._canvas) return;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        return;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle.
      this._flashOverlay();
    }
    _onTapBack(e) {
      e.preventDefault();
      this._go(this._index - 1, 'tap');
    }
    _onTapForward(e) {
      e.preventDefault();
      this._go(this._index + 1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing.
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._go(this._index + 1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._go(this._index - 1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._go(this._index + 1, 'api');
    }
    prev() {
      this._go(this._index - 1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "deck-stage.js", error: String((e && e.message) || e) }); }

// design-canvas.jsx
try { (() => {
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), deletable, labels/titles are
// inline-editable, and any artboard can be opened in a fullscreen focus
// overlay (←/→/Esc). State persists to a .design-canvas.state.json sidecar
// via the host bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = ['.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}', '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}', '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}', '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}', '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}',
  // isolation:isolate contains artboard content's z-indexes so a
  // z-indexed child (sticky navbar etc.) can't paint over .dc-header or
  // the .dc-menu popover that drops into the top of the card.
  '.dc-card{isolation:isolate;transition:box-shadow .15s,transform .15s}', '.dc-card *{scrollbar-width:none}', '.dc-card *::-webkit-scrollbar{display:none}',
  // Per-artboard header: grip + label on the left, delete/expand on the
  // right. Single flex row; when the artboard's on-screen width is too
  // narrow for both the label yields (ellipsis, then hidden entirely below
  // ~4ch via the container query) and the buttons stay on the row.
  '.dc-header{position:absolute;bottom:100%;left:-4px;margin-bottom:calc(4px * var(--dc-inv-zoom,1));z-index:2;', '  display:flex;align-items:center;container-type:inline-size}', '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px;flex:1 1 auto;min-width:0}', '.dc-grip{flex:0 0 auto;cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s,opacity .12s}', '.dc-grip:hover{background:rgba(0,0,0,.08)}', '.dc-grip:active{cursor:grabbing}', '.dc-labeltext{flex:1 1 auto;min-width:0;cursor:pointer;border-radius:4px;padding:3px 6px;', '  display:flex;align-items:center;transition:background .12s;overflow:hidden}',
  // Below ~4ch of label room: hide the label entirely, and drop the grip to
  // hover-only (same reveal rule as .dc-btns) so a narrow header is clean
  // until the card is moused.
  '@container (max-width: 110px){', '  .dc-labeltext{display:none}', '  .dc-grip{opacity:0}', '  [data-dc-slot]:hover .dc-grip{opacity:1}', '}', '.dc-labeltext:hover{background:rgba(0,0,0,.05)}', '.dc-labeltext .dc-editable{overflow:hidden;text-overflow:ellipsis;max-width:100%}', '.dc-labeltext .dc-editable:focus{overflow:visible;text-overflow:clip}', '.dc-btns{flex:0 0 auto;margin-left:auto;display:flex;gap:2px;opacity:0;transition:opacity .12s}', '[data-dc-slot]:hover .dc-btns,.dc-btns:has(.dc-menu){opacity:1}', '.dc-expand,.dc-kebab{width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;', '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center;', '  font:inherit;transition:background .12s,color .12s}', '.dc-expand:hover,.dc-kebab:hover{background:rgba(0,0,0,.06);color:#2a251f}',
  // Slot hosting an open menu floats above later siblings (which otherwise
  // paint on top — same z-index:auto, later DOM order) so the popup isn't
  // clipped by the next card.
  '[data-dc-slot]:has(.dc-menu){z-index:10}', '.dc-menu{position:absolute;top:100%;right:0;margin-top:4px;background:#fff;border-radius:8px;', '  box-shadow:0 8px 28px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.05);padding:4px;min-width:160px;z-index:10}', '.dc-menu button{display:block;width:100%;padding:7px 10px;border:0;background:transparent;', '  border-radius:5px;font-family:inherit;font-size:13px;font-weight:500;line-height:1.2;', '  color:#29261b;cursor:pointer;text-align:left;transition:background .12s;white-space:nowrap}', '.dc-menu button:hover{background:rgba(0,0,0,.05)}', '.dc-menu hr{border:0;border-top:1px solid rgba(0,0,0,.08);margin:4px 2px}', '.dc-menu .dc-danger{color:#c96442}', '.dc-menu .dc-danger:hover{background:rgba(201,100,66,.1)}',
  // Chrome (titles / labels / buttons) counter-scales against the viewport
  // zoom so it stays a constant on-screen size. --dc-inv-zoom is set by
  // DCViewport on every transform update and inherits to all descendants —
  // any overlay inside the world (e.g. a TweaksPanel on an artboard) can use
  // it the same way.
  //
  // The header uses transform:scale (out-of-flow, so layout impact doesn't
  // matter) with its world-space width set to card-width / inv-zoom so that
  // after counter-scaling its on-screen width exactly matches the card's —
  // that's what lets the container query + text-overflow behave against the
  // card's visible edge at every zoom level.
  //
  // The section head uses CSS zoom instead of transform so its layout box
  // grows with the counter-scale, pushing the card row down — otherwise the
  // constant-screen-size title would overflow into the (shrinking) world-
  // space gap and overlap the artboard headers at low zoom.
  '.dc-header{width:calc((100% + 4px) / var(--dc-inv-zoom,1));', '  transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom left}', '.dc-sectionhead{zoom:var(--dc-inv-zoom,1)}'].join('\n');
  document.head.appendChild(s);
}
const DCCtx = React.createContext(null);

// Recursively unwrap React.Fragment so <>…</> grouping doesn't hide
// DCSection/DCArtboard children from the type-based walks below.
function dcFlatten(children) {
  const out = [];
  React.Children.forEach(children, c => {
    if (c && c.type === React.Fragment) out.push(...dcFlatten(c.props.children));else out.push(c);
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, hidden
// artboards, focused artboard). Order/titles/labels/hidden persist to a
// .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';
function DesignCanvas({
  children,
  minScale,
  maxScale,
  style
}) {
  const [state, setState] = React.useState({
    sections: {},
    focus: null
  });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);
  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE).then(r => r.ok ? r.json() : null).then(saved => {
      if (off || !saved || !saved.sections) return;
      skipNextWrite.current = true;
      setState(s => ({
        ...s,
        sections: saved.sections
      }));
    }).catch(() => {}).finally(() => {
      didRead.current = true;
      if (!off) setReady(true);
    });
    const t = setTimeout(() => {
      if (!off) setReady(true);
    }, 150);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, []);
  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({
        sections: state.sections
      })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Fragments are flattened; wrapping in other
  // elements still opts out of focus/reorder.
  const registry = {}; // slotId -> { sectionId, artboard }
  const sectionMeta = {}; // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  dcFlatten(children).forEach(sec => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const abs = [];
    dcFlatten(sec.props.children).forEach(ab => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (aid) abs.push([aid, ab]);
    });
    // hidden is scoped to one source revision — when the agent regenerates
    // (artboard-ID set changes), prior deletes don't apply to new content.
    const srcKey = abs.map(([k]) => k).join('\x1f');
    const hidden = persisted.srcKey === srcKey ? persisted.hidden || [] : [];
    const srcIds = [];
    abs.forEach(([aid, ab]) => {
      if (hidden.includes(aid)) return;
      registry[`${sid}/${aid}`] = {
        sectionId: sid,
        artboard: ab
      };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter(k => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter(k => !kept.includes(k))]
    };
  });
  const api = React.useMemo(() => ({
    state,
    section: id => state.sections[id] || {},
    patchSection: (id, p) => setState(s => ({
      ...s,
      sections: {
        ...s.sections,
        [id]: {
          ...s.sections[id],
          ...(typeof p === 'function' ? p(s.sections[id] || {}) : p)
        }
      }
    })),
    setFocus: slotId => setState(s => ({
      ...s,
      focus: slotId
    }))
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') api.setFocus(null);
    };
    const onPd = e => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);
  return /*#__PURE__*/React.createElement(DCCtx.Provider, {
    value: api
  }, /*#__PURE__*/React.createElement(DCViewport, {
    minScale: minScale,
    maxScale: maxScale,
    style: style
  }, ready && children), state.focus && registry[state.focus] && /*#__PURE__*/React.createElement(DCFocusOverlay, {
    entry: registry[state.focus],
    sectionMeta: sectionMeta,
    sectionOrder: sectionOrder
  }));
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({
  children,
  minScale = 0.1,
  maxScale = 8,
  style = {}
}) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({
    x: 0,
    y: 0,
    scale: 1
  });
  // Persist viewport across reloads so the user lands back where they were
  // after an agent edit or browser refresh. The sandbox origin is already
  // per-project; pathname keeps multiple canvas files in one project apart.
  const tfKey = 'dc-viewport:' + location.pathname;
  const saveT = React.useRef(0);
  const lastPostedScale = React.useRef();
  const apply = React.useCallback(() => {
    const {
      x,
      y,
      scale
    } = tf.current;
    const el = worldRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    // Exposed for zoom-invariant chrome (labels, buttons, TweaksPanel).
    el.style.setProperty('--dc-inv-zoom', String(1 / scale));
    // Keep the host toolbar's % readout in sync with the canvas scale. Pan
    // ticks leave scale unchanged — skip the cross-frame post for those.
    if (lastPostedScale.current !== scale) {
      lastPostedScale.current = scale;
      window.parent.postMessage({
        type: '__dc_zoom',
        scale
      }, '*');
    }
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    }, 200);
  }, [tfKey]);
  React.useLayoutEffect(() => {
    const flush = () => {
      clearTimeout(saveT.current);
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    };
    try {
      const s = JSON.parse(localStorage.getItem(tfKey) || 'null');
      if (s && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.scale)) {
        tf.current = {
          x: s.x,
          y: s.y,
          scale: Math.min(maxScale, Math.max(minScale, s.scale))
        };
        apply();
      }
    } catch {}
    // Flush on pagehide and unmount so a reload within the 200ms debounce
    // window doesn't drop the last pan/zoom.
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left,
        py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // --dc-inv-zoom consumers (.dc-sectionhead's CSS zoom, each section's
      // marginBottom) reflow on every scale change, vertically shifting the
      // world layout — so a world point mathematically pinned under the cursor
      // drifts as you zoom (content creeps up on zoom-in, down on zoom-out).
      // Anchor the DOM element under the cursor instead: record its screen Y,
      // apply the transform + --dc-inv-zoom, then cancel whatever vertical
      // drift the reflow introduced so it stays put on screen.
      let marker = null,
        markerY0 = 0;
      if (k !== 1) {
        const hit = document.elementFromPoint(cx, cy);
        marker = hit && hit.closest ? hit.closest('[data-dc-slot],[data-dc-section]') : null;
        if (marker) markerY0 = marker.getBoundingClientRect().top;
      }
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
      if (marker) {
        // A pure zoom around (cx, cy) maps screen Y → cy + (Y - cy) * k. Any
        // departure after the --dc-inv-zoom reflow is the layout drift.
        const drift = marker.getBoundingClientRect().top - (cy + (markerY0 - cy) * k);
        if (Math.abs(drift) > 0.1) {
          t.y -= drift;
          apply();
        }
      }
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = e => e.deltaMode !== 0 || e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
    const onWheel = e => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if ((e.ctrlKey || e.metaKey) && !isMouseWheel(e)) {
        // trackpad pinch, or ctrl/cmd + smooth-scroll mouse. Notched
        // wheels fall through to the fixed-step branch below.
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = e => {
      e.preventDefault();
      isGesturing = true;
      gsBase = tf.current.scale;
    };
    const onGestureChange = e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gsBase * e.scale / tf.current.scale);
    };
    const onGestureEnd = e => {
      e.preventDefault();
      isGesturing = false;
    };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = e => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || e.button === 0 && onBg)) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        lx: e.clientX,
        ly: e.clientY
      };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };

    // Host-driven zoom (toolbar % menu). Zooms around viewport centre so the
    // visible midpoint stays fixed — matching the host's iframe-zoom feel.
    const onHostMsg = e => {
      const d = e.data;
      if (d && d.type === '__dc_set_zoom' && typeof d.scale === 'number') {
        const r = vp.getBoundingClientRect();
        zoomAt(r.left + r.width / 2, r.top + r.height / 2, d.scale / tf.current.scale);
      } else if (d && d.type === '__dc_probe') {
        // Host's [readyGen] reset asks whether a canvas is present; it
        // fires on the iframe's native 'load', which for canvases with
        // images/fonts is after our mount-time announce, so re-announce.
        // Clear the pan-tick guard so apply() re-posts the current scale
        // even if it's unchanged — the host just reset dcScale to 1.
        window.parent.postMessage({
          type: '__dc_present'
        }, '*');
        lastPostedScale.current = undefined;
        apply();
      }
    };
    window.addEventListener('message', onHostMsg);
    // Announce canvas mode so the host toolbar proxies its % control here
    // instead of scaling the iframe element (which would just shrink the
    // viewport window of an infinite canvas). The apply() that follows emits
    // the initial __dc_zoom so the toolbar % is correct before first pinch.
    // lastPostedScale reset mirrors the __dc_probe handler: the layout
    // effect's restore-path apply() may already have posted the restored
    // scale (before __dc_present), so clear the guard to re-post it in order.
    window.parent.postMessage({
      type: '__dc_present'
    }, '*');
    lastPostedScale.current = undefined;
    apply();
    vp.addEventListener('wheel', onWheel, {
      passive: false
    });
    vp.addEventListener('gesturestart', onGestureStart, {
      passive: false
    });
    vp.addEventListener('gesturechange', onGestureChange, {
      passive: false
    });
    vp.addEventListener('gestureend', onGestureEnd, {
      passive: false
    });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('message', onHostMsg);
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);
  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return /*#__PURE__*/React.createElement("div", {
    ref: vpRef,
    className: "design-canvas",
    style: {
      height: '100vh',
      width: '100vw',
      background: DC.bg,
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: DC.font,
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: worldRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: '0 0',
      willChange: 'transform',
      width: 'max-content',
      minWidth: '100%',
      minHeight: '100%',
      padding: '60px 0 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -6000,
      backgroundImage: gridSvg,
      backgroundSize: '120px 120px',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), children));
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({
  id,
  title,
  subtitle,
  children,
  gap = 48
}) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(dcFlatten(children));
  const artboards = all.filter(c => c && c.type === DCArtboard);
  const rest = all.filter(c => !(c && c.type === DCArtboard));
  const sec = ctx && sid && ctx.section(sid) || {};
  // Must match DesignCanvas's srcKey computation exactly (it filters falsy
  // IDs), or onDelete persists a srcKey that DesignCanvas never recognizes.
  const allIds = artboards.map(a => a.props.id ?? a.props.label).filter(Boolean);
  const srcKey = allIds.join('\x1f');
  const hidden = sec.srcKey === srcKey ? sec.hidden || [] : [];
  const srcOrder = allIds.filter(k => !hidden.includes(k));
  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter(k => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter(k => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);
  const byId = Object.fromEntries(artboards.map(a => [a.props.id ?? a.props.label, a]));

  // marginBottom counter-scales so the on-screen gap between sections stays
  // constant — otherwise at low zoom the (world-space) gap collapses while
  // the screen-constant sectionhead below it doesn't, and the title reads as
  // belonging to the section above. paddingBottom below is just enough for
  // the 24px artboard-header (abs-positioned above each card) plus ~8px, so
  // the title sits tight against its own row at every zoom.
  return /*#__PURE__*/React.createElement("div", {
    "data-dc-section": sid,
    style: {
      marginBottom: 'calc(80px * var(--dc-inv-zoom, 1))',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 60px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-sectionhead",
    style: {
      paddingBottom: 36
    }
  }, /*#__PURE__*/React.createElement(DCEditable, {
    tag: "div",
    value: sec.title ?? title,
    onChange: v => ctx && sid && ctx.patchSection(sid, {
      title: v
    }),
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: DC.title,
      letterSpacing: -0.4,
      marginBottom: 6,
      display: 'inline-block'
    }
  }), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: DC.subtitle
    }
  }, subtitle))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap,
      padding: '0 60px',
      alignItems: 'flex-start',
      width: 'max-content'
    }
  }, order.map(k => /*#__PURE__*/React.createElement(DCArtboardFrame, {
    key: k,
    sectionId: sid,
    artboard: byId[k],
    order: order,
    label: (sec.labels || {})[k] ?? byId[k].props.label,
    onRename: v => ctx && ctx.patchSection(sid, x => ({
      labels: {
        ...x.labels,
        [k]: v
      }
    })),
    onReorder: next => ctx && ctx.patchSection(sid, {
      order: next
    }),
    onDelete: () => ctx && ctx.patchSection(sid, x => ({
      hidden: [...(x.srcKey === srcKey ? x.hidden || [] : []), k],
      srcKey
    })),
    onFocus: () => ctx && ctx.setFocus(`${sid}/${k}`)
  }))), rest);
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() {
  return null;
}

// Per-artboard export (kind: 'png' | 'html'). Both paths share the same
// self-contained clone: computed styles baked in, @font-face / <img> /
// inline-style background-image urls inlined as data URIs. PNG wraps the
// clone in foreignObject→canvas at 3× the artboard's natural width×height
// (same pipeline the host uses for page captures); HTML wraps it in a
// minimal standalone document. Both are independent of viewport zoom.
async function dcExport(node, w, h, name, kind) {
  try {
    await document.fonts.ready;
  } catch {}
  const toDataURL = url => fetch(url).then(r => r.blob()).then(b => new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => res(url);
    fr.readAsDataURL(b);
  })).catch(() => url);

  // Collect @font-face rules. ss.cssRules throws SecurityError on
  // cross-origin sheets (e.g. fonts.googleapis.com) — in that case fetch
  // the CSS text directly (those endpoints send ACAO:*) and regex-extract
  // the blocks. @import and @media/@supports are walked so nested
  // @font-face rules aren't missed.
  const fontRules = [],
    pending = [],
    seen = new Set();
  const scrapeCss = href => {
    if (seen.has(href)) return;
    seen.add(href);
    pending.push(fetch(href).then(r => r.text()).then(css => {
      for (const m of css.match(/@font-face\s*{[^}]*}/g) || []) fontRules.push({
        css: m,
        base: href
      });
      for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)/g)) scrapeCss(new URL(m[1], href).href);
    }).catch(() => {}));
  };
  const walk = (rules, base) => {
    for (const r of rules) {
      if (r.type === CSSRule.FONT_FACE_RULE) fontRules.push({
        css: r.cssText,
        base
      });else if (r.type === CSSRule.IMPORT_RULE && r.styleSheet) {
        const ibase = r.styleSheet.href || base;
        try {
          walk(r.styleSheet.cssRules, ibase);
        } catch {
          scrapeCss(ibase);
        }
      } else if (r.cssRules) walk(r.cssRules, base);
    }
  };
  for (const ss of document.styleSheets) {
    const base = ss.href || location.href;
    try {
      walk(ss.cssRules, base);
    } catch {
      if (ss.href) scrapeCss(ss.href);
    }
  }
  while (pending.length) await pending.shift();
  const fontCss = (await Promise.all(fontRules.map(async rule => {
    let out = rule.css,
      m;
    const re = /url\((['"]?)([^'")]+)\1\)/g;
    while (m = re.exec(rule.css)) {
      if (m[2].indexOf('data:') === 0) continue;
      let abs;
      try {
        abs = new URL(m[2], rule.base).href;
      } catch {
        continue;
      }
      out = out.split(m[0]).join('url("' + (await toDataURL(abs)) + '")');
    }
    return out;
  }))).join('\n');
  const cloneStyled = src => {
    if (src.nodeType === 8 || src.nodeType === 1 && src.tagName === 'SCRIPT') return document.createTextNode('');
    const dst = src.cloneNode(false);
    if (src.nodeType === 1) {
      const cs = getComputedStyle(src);
      let txt = '';
      for (let i = 0; i < cs.length; i++) txt += cs[i] + ':' + cs.getPropertyValue(cs[i]) + ';';
      dst.setAttribute('style', txt + 'animation:none;transition:none;');
      if (src.tagName === 'CANVAS') try {
        const im = document.createElement('img');
        im.src = src.toDataURL();
        im.setAttribute('style', txt);
        return im;
      } catch {}
    }
    for (let c = src.firstChild; c; c = c.nextSibling) dst.appendChild(cloneStyled(c));
    return dst;
  };
  const clone = cloneStyled(node);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // Drop the card's own shadow/radius so the export is a flush w×h rect;
  // the artboard's own background (if any) is already in the computed style.
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  const jobs = [];
  clone.querySelectorAll('img').forEach(el => {
    const s = el.getAttribute('src');
    if (s && s.indexOf('data:') !== 0) jobs.push(toDataURL(el.src).then(d => el.setAttribute('src', d)));
  });
  [clone, ...clone.querySelectorAll('*')].forEach(el => {
    const bg = el.style.backgroundImage;
    if (!bg) return;
    let m;
    const re = /url\(["']?([^"')]+)["']?\)/g;
    while (m = re.exec(bg)) {
      const tok = m[0],
        url = m[1];
      if (url.indexOf('data:') === 0) continue;
      jobs.push(toDataURL(url).then(d => {
        el.style.backgroundImage = el.style.backgroundImage.split(tok).join('url("' + d + '")');
      }));
    }
  });
  await Promise.all(jobs);
  const xml = new XMLSerializer().serializeToString(clone);
  const save = (blob, ext) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.' + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  if (kind === 'html') {
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + name + '</title>' + (fontCss ? '<style>' + fontCss + '</style>' : '') + '</head><body style="margin:0">' + xml + '</body></html>';
    return save(new Blob([html], {
      type: 'text/html'
    }), 'html');
  }

  // PNG: the SVG's own width/height must be the output resolution — an
  // <img>-loaded SVG rasterizes at its intrinsic size, so sizing it at 1×
  // and ctx.scale()-ing up would just upscale a 1× bitmap. viewBox maps the
  // w×h foreignObject onto the px·w × px·h SVG canvas so the browser renders
  // the HTML at full resolution.
  const px = 3;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * px + '" height="' + h * px + '" viewBox="0 0 ' + w + ' ' + h + '"><foreignObject width="' + w + '" height="' + h + '">' + (fontCss ? '<style><![CDATA[' + fontCss + ']]></style>' : '') + xml + '</foreignObject></svg>';
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('svg load failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const cv = document.createElement('canvas');
  cv.width = w * px;
  cv.height = h * px;
  cv.getContext('2d').drawImage(img, 0, 0);
  cv.toBlob(blob => save(blob, 'png'), 'image/png');
}
function DCArtboardFrame({
  sectionId,
  artboard,
  label,
  order,
  onRename,
  onReorder,
  onFocus,
  onDelete
}) {
  const {
    id: rawId,
    label: rawLabel,
    width = 260,
    height = 480,
    children,
    style = {}
  } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);
  const cardRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  // ⋯ menu: close on any outside pointerdown. Two-click delete lives inside
  // the menu — first click arms the row, second commits; closing disarms.
  React.useEffect(() => {
    if (!menuOpen) {
      setConfirming(false);
      return;
    }
    const off = e => {
      if (!menuRef.current || !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [menuOpen]);
  const doExport = kind => {
    setMenuOpen(false);
    if (!cardRef.current) return;
    const name = String(label || id || 'artboard').replace(/[^\w\s.-]+/g, '_');
    dcExport(cardRef.current, width, height, name, kind).catch(e => console.error('[design-canvas] export failed:', e));
  };

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = e => {
    e.preventDefault();
    e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map(el => ({
      el,
      id: el.dataset.dcSlot,
      x: el.getBoundingClientRect().left
    }));
    const slotXs = homes.map(h => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');
    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0,
        best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter(k => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) {
          h.el.style.transition = 'none';
          h.el.style.transform = '';
        }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-dc-slot": id,
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-header",
    "data-omelette-chrome": "",
    style: {
      color: DC.label
    },
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-labelrow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-grip",
    onPointerDown: onGripDown,
    title: "Drag to reorder"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "9",
    height: "13",
    viewBox: "0 0 9 13",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "11",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "11",
    r: "1.1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-labeltext",
    onClick: onFocus,
    title: "Click to focus"
  }, /*#__PURE__*/React.createElement(DCEditable, {
    value: label,
    onChange: onRename,
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: DC.label,
      lineHeight: 1
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-btns"
  }, /*#__PURE__*/React.createElement("div", {
    ref: menuRef,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "dc-kebab",
    title: "More",
    onClick: () => setMenuOpen(o => !o)
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2.5",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9.5",
    cy: "6",
    r: "1.1"
  }))), menuOpen && /*#__PURE__*/React.createElement("div", {
    className: "dc-menu",
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('png')
  }, "Download PNG"), /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('html')
  }, "Download HTML"), /*#__PURE__*/React.createElement("hr", null), /*#__PURE__*/React.createElement("button", {
    className: "dc-danger",
    onClick: () => {
      if (confirming) {
        setMenuOpen(false);
        onDelete();
      } else setConfirming(true);
    }
  }, confirming ? 'Click again to delete' : 'Delete'))), /*#__PURE__*/React.createElement("button", {
    className: "dc-expand",
    onClick: onFocus,
    title: "Focus"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"
  }))))), /*#__PURE__*/React.createElement("div", {
    ref: cardRef,
    className: "dc-card",
    style: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
      overflow: 'hidden',
      width,
      height,
      background: '#fff',
      ...style
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb',
      fontSize: 13,
      fontFamily: DC.font
    }
  }, id)));
}

// Inline rename — commits on blur or Enter.
function DCEditable({
  value,
  onChange,
  style,
  tag = 'span',
  onClick
}) {
  const T = tag;
  return /*#__PURE__*/React.createElement(T, {
    className: "dc-editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: onClick,
    onPointerDown: e => e.stopPropagation(),
    onBlur: e => onChange && onChange(e.currentTarget.textContent),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: style
  }, value);
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({
  entry,
  sectionMeta,
  sectionOrder
}) {
  const ctx = React.useContext(DCCtx);
  const {
    sectionId,
    artboard
  } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);
  const go = d => {
    const n = peers[(idx + d + peers.length) % peers.length];
    if (n) ctx.setFocus(`${sectionId}/${n}`);
  };
  const goSection = d => {
    // Sections whose artboards are all deleted have slotIds:[] — step past
    // them to the next non-empty section so ↑/↓ doesn't dead-end.
    const n = sectionOrder.length;
    for (let i = 1; i < n; i++) {
      const ns = sectionOrder[((secIdx + d * i) % n + n) % n];
      const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
      if (first) {
        ctx.setFocus(`${ns}/${first}`);
        return;
      }
    }
  };
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goSection(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goSection(1);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });
  const {
    width = 260,
    height = 480,
    children
  } = artboard.props;
  const [vp, setVp] = React.useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  React.useEffect(() => {
    const r = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));
  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({
    dir,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClick();
    },
    style: {
      position: 'absolute',
      top: '50%',
      [dir]: 28,
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.18)',
    onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'
  })));

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: () => ctx.setFocus(null),
    onWheel: e => e.preventDefault(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(24,20,16,.6)',
      backdropFilter: 'blur(14px)',
      fontFamily: DC.font,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px 20px 0',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDd(o => !o),
    style: {
      border: 'none',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: -0.3
    }
  }, meta.title), /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 11 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    style: {
      opacity: .7
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4l3.5 3.5L9 4"
  }))), meta.subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      opacity: .6,
      fontWeight: 400,
      marginTop: 2
    }
  }, meta.subtitle)), ddOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: '#2a251f',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      padding: 4,
      minWidth: 200,
      zIndex: 10
    }
  }, sectionOrder.filter(sid => sectionMeta[sid].slotIds.length).map(sid => /*#__PURE__*/React.createElement("button", {
    key: sid,
    onClick: () => {
      setDd(false);
      const f = sectionMeta[sid].slotIds[0];
      if (f) ctx.setFocus(`${sid}/${f}`);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: 5,
      fontSize: 14,
      fontWeight: sid === sectionId ? 600 : 400,
      fontFamily: 'inherit'
    }
  }, sectionMeta[sid].title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ctx.setFocus(null),
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.12)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    style: {
      border: 'none',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      width: 32,
      height: 32,
      borderRadius: 16,
      fontSize: 20,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'background .12s'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      bottom: 56,
      left: 100,
      right: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: width * scale,
      height: height * scale,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,.4)'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb'
    }
  }, aid))), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      opacity: .85,
      textAlign: 'center'
    }
  }, (sec.labels || {})[aid] ?? artboard.props.label, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .5,
      marginLeft: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, idx + 1, " / ", peers.length))), /*#__PURE__*/React.createElement(Arrow, {
    dir: "left",
    onClick: () => go(-1)
  }), /*#__PURE__*/React.createElement(Arrow, {
    dir: "right",
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8
    }
  }, peers.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => ctx.setFocus(`${sectionId}/${p}`),
    style: {
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      width: 6,
      height: 6,
      borderRadius: 3,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.3)'
    }
  })))), document.body);
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({
  children,
  top,
  left,
  right,
  bottom,
  rotate = -2,
  width = 180
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width,
      background: DC.postitBg,
      padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14,
      lineHeight: 1.4,
      color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  DesignCanvas,
  DCSection,
  DCArtboard,
  DCPostIt
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "design-canvas.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marketing_redesign/medonix-mocks.jsx
try { (() => {
// Sorta product mockups for the Medonix-style landing page.
// Stylized UI screenshots used in hero, steps, benefits, etc.

// ----------------- HERO MOCKS -----------------

// Main hero workspace card (right side, large)
const HeroWorkspace = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    boxShadow: '0 30px 80px -20px rgba(0,0,84,0.20), 0 12px 24px -8px rgba(0,0,84,0.08)',
    width: '100%'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '14px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 5
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#e2e8f0'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#e2e8f0'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#e2e8f0'
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 500
  }
}, "app.getsorta.io \xB7 Workspace")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '4px 10px',
    background: '#ccf9f6',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 600,
    color: '#065f46',
    display: 'flex',
    alignItems: 'center',
    gap: 5
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 6,
    height: 6,
    background: '#02e3d3',
    borderRadius: '50%'
  }
}), "Live"), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2740fc, #02e3d3)'
  }
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    minHeight: 360
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fafbfc',
    borderRight: '1px solid #e2e8f0',
    padding: '16px 12px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '0 8px 10px'
  }
}, "Patients"), [{
  n: 'Maria Hernandez',
  s: 'Active · 42/42',
  a: true
}, {
  n: 'James O\u2019Connor',
  s: '12 forms ready'
}, {
  n: 'Aaliyah Patel',
  s: 'Awaiting signature'
}, {
  n: 'Daniel Schmidt',
  s: 'New · started 9:42'
}, {
  n: 'Sofia Reyes',
  s: 'Synced · 8:01'
}].map(p => /*#__PURE__*/React.createElement("div", {
  key: p.n,
  style: {
    padding: '10px 10px',
    borderRadius: 8,
    marginBottom: 4,
    background: p.a ? '#d1e4ff' : 'transparent',
    border: p.a ? '1px solid rgba(39,64,252,0.2)' : '1px solid transparent'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    color: '#000054'
  }
}, p.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  }
}, p.s)))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '20px 24px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }
}, "Active patient"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 18,
    fontWeight: 700,
    color: '#000054',
    marginTop: 4
  }
}, "Maria Hernandez"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  }
}, "DOB 04/12/82 \xB7 Mesa Family Medicine \xB7 9:14 AM")), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '7px 14px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit'
  }
}, "Export packet \u2192")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 14
  }
}, [{
  l: 'Legal name',
  v: 'Maria Hernandez'
}, {
  l: 'Date of birth',
  v: '04 / 12 / 1982'
}, {
  l: 'Phone',
  v: '(915) 555-0142'
}, {
  l: 'Insurance',
  v: 'BCBS Texas'
}, {
  l: 'Member ID',
  v: 'BCB-9384-21X'
}, {
  l: 'Primary care MD',
  v: 'Dr. L. Castaneda'
}].map(f => /*#__PURE__*/React.createElement("div", {
  key: f.l,
  style: {
    padding: '8px 10px',
    border: '1px solid #02e3d3',
    background: 'rgba(2,227,211,0.04)',
    borderRadius: 6
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 9,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }
}, f.l), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#000054',
    fontWeight: 500,
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 2
  }
}, f.v, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#02e3d3'
  }
}, "\u2713"))))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 12,
    background: '#fafbfc',
    borderRadius: 10,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 600,
    color: '#000054'
  }
}, "Filling intake packet"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#02e3d3',
    fontWeight: 700
  }
}, "16 of 18 pages")), /*#__PURE__*/React.createElement("div", {
  style: {
    height: 6,
    background: '#e2e8f0',
    borderRadius: 9999,
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: '89%',
    height: '100%',
    background: 'linear-gradient(90deg, #2740fc, #02e3d3)',
    borderRadius: 9999
  }
}))))));

// Floating mini card (calendar-style notification)
const HeroFloater = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 16,
    padding: '14px 16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 40px -10px rgba(0,0,84,0.18)',
    width: 240
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#ccf9f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18
  }
}, "\u2713"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 700,
    color: '#000054'
  }
}, "Packet ready"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  }
}, "18 pages \xB7 0 errors \xB7 47s"))), /*#__PURE__*/React.createElement("div", {
  style: {
    borderTop: '1px solid #f1f5f9',
    marginTop: 12,
    paddingTop: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex'
  }
}, ['#2740fc', '#02e3d3', '#99bdff'].map((c, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: c,
    border: '2px solid #fff',
    marginLeft: i === 0 ? 0 : -6
  }
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b'
  }
}, "3 staff synced")));

// Small stat floater
const HeroStatChip = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#000054',
    borderRadius: 14,
    padding: '14px 18px',
    boxShadow: '0 20px 40px -10px rgba(0,0,84,0.30)',
    color: '#fff',
    width: 200
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6
  }
}, "Time saved \xB7 this week"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1
  }
}, "33", /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 16,
    opacity: 0.6
  }
}, "hrs")), /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 120 24",
  style: {
    width: '100%',
    height: 20,
    marginTop: 8
  }
}, /*#__PURE__*/React.createElement("polyline", {
  points: "0,18 15,14 30,16 45,8 60,10 75,4 90,6 105,2 120,3",
  stroke: "#02e3d3",
  strokeWidth: "1.5",
  fill: "none"
}), /*#__PURE__*/React.createElement("polyline", {
  points: "0,18 15,14 30,16 45,8 60,10 75,4 90,6 105,2 120,3 120,24 0,24",
  fill: "rgba(2,227,211,0.2)"
})));

// ----------------- STEP MOCKS -----------------

const StepMockUpload = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px -20px rgba(0,0,84,0.15)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '36px 24px',
    textAlign: 'center',
    borderRadius: 14,
    border: '2px dashed #99bdff',
    background: 'linear-gradient(135deg, rgba(209,228,255,0.4), rgba(204,249,246,0.4))',
    marginBottom: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: '#2740fc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    margin: '0 auto 12px'
  }
}, "\u2191"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 16,
    fontWeight: 700,
    color: '#000054'
  }
}, "Drop your PDF intake forms"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  }
}, "Drag and drop or click to browse")), [{
  n: 'New_Patient_Intake.pdf',
  s: '18 pages · 42 fields mapped',
  p: 100
}, {
  n: 'HIPAA_Consent.pdf',
  s: '4 pages · 12 fields mapped',
  p: 100
}, {
  n: 'Insurance_Auth.pdf',
  s: 'Mapping fields…',
  p: 64
}].map(t => /*#__PURE__*/React.createElement("div", {
  key: t.n,
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#fafbfc',
    borderRadius: 10,
    marginBottom: 6,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#d1e4ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12
  }
}, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    color: '#000054'
  }
}, t.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  }
}, t.s), /*#__PURE__*/React.createElement("div", {
  style: {
    height: 3,
    background: '#e2e8f0',
    borderRadius: 9999,
    marginTop: 6,
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: `${t.p}%`,
    height: '100%',
    background: t.p === 100 ? '#02e3d3' : '#2740fc',
    borderRadius: 9999
  }
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: t.p === 100 ? '#02e3d3' : '#2740fc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700
  }
}, t.p === 100 ? '✓' : '⟳'))));
const StepMockEntry = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px -20px rgba(0,0,84,0.15)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }
}, "New patient \xB7 60-second intake"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 18,
    fontWeight: 700,
    color: '#000054',
    marginTop: 4
  }
}, "Daniel Schmidt")), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '4px 10px',
    background: '#ccf9f6',
    color: '#065f46',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 700
  }
}, "Auto-syncing 42 fields")), [{
  l: 'Legal name',
  v: 'Daniel Schmidt',
  done: true
}, {
  l: 'Date of birth',
  v: '02 / 14 / 1978',
  done: true
}, {
  l: 'Phone',
  v: '(915) 555-0188',
  done: true
}, {
  l: 'Insurance carrier',
  v: 'Aetna PPO',
  active: true
}, {
  l: 'Member ID',
  v: '',
  placeholder: 'Type or scan card'
}].map((f, i) => /*#__PURE__*/React.createElement("div", {
  key: f.l,
  style: {
    marginBottom: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4
  }
}, f.l), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '10px 12px',
    border: `1px solid ${f.active ? '#2740fc' : '#e2e8f0'}`,
    borderRadius: 8,
    background: '#fff',
    fontSize: 13,
    color: f.v ? '#000054' : '#94a3b8',
    fontWeight: 500,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: f.active ? '0 0 0 3px rgba(39,64,252,0.15)' : 'none'
  }
}, /*#__PURE__*/React.createElement("span", null, f.v || f.placeholder), f.done && /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#02e3d3',
    fontWeight: 700
  }
}, "\u2713"), f.active && /*#__PURE__*/React.createElement("span", {
  style: {
    width: 1.5,
    height: 14,
    background: '#2740fc'
  }
})))), /*#__PURE__*/React.createElement("button", {
  style: {
    width: '100%',
    padding: 12,
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    marginTop: 6,
    boxShadow: '0 2px 8px rgba(39,64,252,0.3)'
  }
}, "Continue \u2014 auto-fill 18 pages \u2192"));
const StepMockExport = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 20,
    padding: 20,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px -20px rgba(0,0,84,0.15)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: '#000054'
  }
}, "Intake_Packet_Hernandez.pdf"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 600,
    color: '#02e3d3'
  }
}, "Page 3 of 18 \u25BE")), /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fafbfc',
    borderRadius: 10,
    padding: 16,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: '#000054',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: '0.05em'
  }
}, "PATIENT MEDICAL HISTORY"), [{
  l: 'Patient Name',
  v: 'Maria Hernandez'
}, {
  l: 'Date of Birth',
  v: '04/12/1982'
}, {
  l: 'Address',
  v: '4827 Mesa View Dr, El Paso, TX 79912'
}, {
  l: 'Allergies',
  v: 'Penicillin (mild)'
}, {
  l: 'Current Meds',
  v: 'Lisinopril 10mg, Metformin 500mg'
}, {
  l: 'Emergency Contact',
  v: 'Carlos Hernandez (spouse)'
}].map(r => /*#__PURE__*/React.createElement("div", {
  key: r.l,
  style: {
    marginBottom: 8,
    fontSize: 9
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#94a3b8'
  }
}, r.l, ": "), /*#__PURE__*/React.createElement("span", {
  style: {
    background: 'rgba(2,227,211,0.18)',
    padding: '1px 6px',
    borderRadius: 3,
    color: '#065f46',
    fontWeight: 600
  }
}, r.v))), /*#__PURE__*/React.createElement("div", {
  style: {
    borderTop: '1px solid #e2e8f0',
    margin: '12px 0',
    paddingTop: 10,
    fontSize: 8,
    color: '#94a3b8'
  }
}, "Signed by patient \xB7 04/30/2026 9:21 AM \xB7 Verified \u2713")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 14,
    display: 'flex',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    flex: 1,
    padding: 10,
    background: '#000054',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit'
  }
}, "Download \u2193"), /*#__PURE__*/React.createElement("button", {
  style: {
    flex: 1,
    padding: 10,
    background: '#fff',
    color: '#000054',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit'
  }
}, "Send to EHR")));

// ----------------- BENEFIT MOCKS -----------------

const BenefitMockStaff = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 16,
    padding: 18,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 12
  }
}, "This morning \xB7 7 patients"), [{
  n: 'Maria H.',
  s: '9:00',
  d: 'Done',
  c: '#02e3d3'
}, {
  n: 'James O.',
  s: '9:15',
  d: 'Done',
  c: '#02e3d3'
}, {
  n: 'Aaliyah P.',
  s: '9:30',
  d: 'Done',
  c: '#02e3d3'
}, {
  n: 'Daniel S.',
  s: '9:45',
  d: 'In progress',
  c: '#2740fc'
}, {
  n: 'Sofia R.',
  s: '10:00',
  d: 'Queued',
  c: '#94a3b8'
}].map((r, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: i === 4 ? 'none' : '1px solid #f1f5f9'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #99bdff, #2740fc)'
  }
}), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    color: '#000054'
  }
}, r.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b'
  }
}, r.s, " AM"))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '3px 8px',
    background: r.c === '#94a3b8' ? '#f1f5f9' : r.c === '#02e3d3' ? '#ccf9f6' : '#d1e4ff',
    color: r.c === '#94a3b8' ? '#64748b' : r.c === '#02e3d3' ? '#065f46' : '#2740fc',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 600
  }
}, r.d))));
const BenefitMockOwner = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 16,
    padding: 18,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }
}, "April \xB7 YTD"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 600,
    color: '#02e3d3'
  }
}, "\u2191 28%")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 28,
    fontWeight: 800,
    color: '#000054',
    letterSpacing: '-0.03em'
  }
}, "$8,432"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 14
  }
}, "saved \xB7 staff hours reclaimed"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    height: 70
  }
}, [40, 55, 48, 62, 70, 65, 80].map((h, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    flex: 1,
    height: `${h}%`,
    background: i === 6 ? '#02e3d3' : 'linear-gradient(180deg, #2740fc, #99bdff)',
    borderRadius: 4
  }
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 6
  }
}, /*#__PURE__*/React.createElement("span", null, "Mon"), /*#__PURE__*/React.createElement("span", null, "Tue"), /*#__PURE__*/React.createElement("span", null, "Wed"), /*#__PURE__*/React.createElement("span", null, "Thu"), /*#__PURE__*/React.createElement("span", null, "Fri"), /*#__PURE__*/React.createElement("span", null, "Sat"), /*#__PURE__*/React.createElement("span", null, "Sun")));
const BenefitMockPatient = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 16,
    padding: 18,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 14
  }
}, "Pre-visit packet \xB7 ready"), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 16,
    background: 'linear-gradient(135deg, #d1e4ff, #ccf9f6)',
    borderRadius: 12,
    marginBottom: 12,
    textAlign: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#02e3d3',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 800,
    margin: '0 auto 10px'
  }
}, "\u2713"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    fontWeight: 700,
    color: '#000054'
  }
}, "All set, Maria"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2
  }
}, "Walk in at 9 AM \xB7 no clipboard")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: '#fafbfc',
    borderRadius: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 18
  }
}, "\uD83D\uDD8B\uFE0F"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 600,
    color: '#000054'
  }
}, "Sign on the tablet"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b'
  }
}, "Once. Replicates across 18 pages."))));
window.MedonixMocks = {
  HeroWorkspace,
  HeroFloater,
  HeroStatChip,
  StepMockUpload,
  StepMockEntry,
  StepMockExport,
  BenefitMockStaff,
  BenefitMockOwner,
  BenefitMockPatient
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marketing_redesign/medonix-mocks.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marketing_redesign/medonix-page-1.jsx
try { (() => {
// Sorta landing page — Medonix Webflow template style, in Sorta colors + Poppins.

const {
  useState
} = React;
const M = window.MedonixMocks;

// ---------- Logo (Sorta) ----------
const SortaMark = ({
  size = 32
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 64 64",
  fill: "none",
  style: {
    display: 'block'
  }
}, /*#__PURE__*/React.createElement("path", {
  d: "M14 18 C14 12, 20 8, 28 8 L46 8 C52 8, 56 12, 56 18 L56 22 L40 22 L40 18 L24 18 Z",
  fill: "#66bdff"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8 32 C8 26, 14 22, 22 22 L46 22 C50 22, 54 24, 54 28 L54 36 L38 36 L38 32 L22 32 L22 36 L14 36 Z",
  fill: "#2886f9"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8 46 C8 40, 14 36, 22 36 L42 36 C48 36, 54 40, 54 46 L54 50 C54 56, 48 60, 40 60 L22 60 C16 60, 8 56, 8 50 Z M22 46 L40 46 L40 50 L22 50 Z",
  fill: "#2740fc"
}), /*#__PURE__*/React.createElement("path", {
  d: "M30 30 L36 26 L36 34 Z",
  fill: "#ffffff"
}));
const SortaWordmark = ({
  color = '#000054',
  size = 22
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement(SortaMark, {
  size: 28
}), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: size,
    fontWeight: 700,
    color,
    letterSpacing: '-0.02em'
  }
}, "Sorta"));

// ---------- Nav ----------
const TopNav = () => /*#__PURE__*/React.createElement("nav", {
  style: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(253,253,253,0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e2e8f0',
    padding: '18px 56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
}, /*#__PURE__*/React.createElement(SortaWordmark, null), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 40,
    alignItems: 'center'
  }
}, [{
  l: 'Home',
  a: true
}, {
  l: 'Features'
}, {
  l: 'How it works'
}, {
  l: 'Pricing'
}, {
  l: 'About'
}, {
  l: 'Blog'
}].map(i => /*#__PURE__*/React.createElement("a", {
  key: i.l,
  href: "#",
  style: {
    fontSize: 14,
    fontWeight: 500,
    color: i.a ? '#000054' : '#64748b',
    textDecoration: 'none',
    position: 'relative'
  }
}, i.l, i.a && /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    bottom: -22,
    left: 0,
    right: 0,
    height: 2,
    background: '#2740fc',
    borderRadius: 2
  }
})))), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '12px 22px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 9999,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 2px 8px rgba(39,64,252,0.30)'
  }
}, "Get a demo", /*#__PURE__*/React.createElement("span", {
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#fff',
    color: '#2740fc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800
  }
}, "\u2192")));

// ---------- Hero ----------
const Hero = () => /*#__PURE__*/React.createElement("section", {
  style: {
    position: 'relative',
    padding: '64px 56px 96px',
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    backgroundImage: 'linear-gradient(rgba(0,0,84,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,84,0.04) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '10%',
    left: '-10%',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(2,227,211,0.25), transparent 70%)',
    zIndex: 0
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '20%',
    right: '-8%',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(39,64,252,0.18), transparent 70%)',
    zIndex: 0
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    marginBottom: 32
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 18px 6px 6px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 9999,
    boxShadow: '0 2px 8px rgba(0,0,84,0.06)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex'
  }
}, ['linear-gradient(135deg, #2740fc, #02e3d3)', 'linear-gradient(135deg, #99bdff, #2740fc)', 'linear-gradient(135deg, #66bdff, #02e3d3)'].map((bg, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: bg,
    border: '2px solid #fff',
    marginLeft: i === 0 ? 0 : -10,
    boxShadow: '0 1px 3px rgba(0,0,84,0.1)'
  }
}))), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 13,
    fontWeight: 600,
    color: '#000054'
  }
}, "Joined 240+ clinics"))), /*#__PURE__*/React.createElement("h1", {
  style: {
    textAlign: 'center',
    fontSize: 88,
    fontWeight: 700,
    letterSpacing: '-0.04em',
    lineHeight: 1.02,
    color: '#000054',
    margin: '0 auto 24px',
    maxWidth: 1000
  }
}, "Smarter Paperwork,", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300
  }
}, "One "), /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#2740fc'
  }
}, "Dashboard")), /*#__PURE__*/React.createElement("p", {
  style: {
    textAlign: 'center',
    fontSize: 19,
    color: '#475569',
    lineHeight: 1.55,
    maxWidth: 620,
    margin: '0 auto 36px'
  }
}, "Sorta sits on top of your existing EHR. Staff enters patient info once \u2014 all 18 pages of your intake packet fill themselves. No migration. No new hardware."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 72
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(39,64,252,0.30)',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, "Start free trial", /*#__PURE__*/React.createElement("span", {
  style: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#fff',
    color: '#2740fc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800
  }
}, "\u2192")), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: '#fff',
    color: '#000054',
    border: '1px solid #e2e8f0',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#000054',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    paddingLeft: 2
  }
}, "\u25B6"), "Watch demo")), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    maxWidth: 1080,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement(M.HeroWorkspace, null), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '-30px',
    left: '-100px',
    zIndex: 2
  }
}, /*#__PURE__*/React.createElement(M.HeroFloater, null)), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    bottom: '-50px',
    right: '-80px',
    zIndex: 2
  }
}, /*#__PURE__*/React.createElement(M.HeroStatChip, null)), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '40%',
    right: '-160px',
    transform: 'rotate(-4deg)',
    zIndex: 2
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    padding: '20px 28px',
    background: '#fff',
    borderRadius: 36,
    boxShadow: '0 12px 32px rgba(0,0,84,0.10)',
    maxWidth: 220,
    fontSize: 13,
    fontWeight: 600,
    color: '#000054',
    textAlign: 'center',
    lineHeight: 1.4
  }
}, "Trusted by clinics from El Paso to Buffalo.", /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    bottom: -10,
    left: 30,
    width: 0,
    height: 0,
    borderLeft: '12px solid transparent',
    borderRight: '12px solid transparent',
    borderTop: '14px solid #fff'
  }
}))))));

// ---------- Marquee ----------
const Marquee = () => /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 0 64px',
    background: '#fff',
    borderTop: '1px solid #f1f5f9',
    borderBottom: '1px solid #f1f5f9'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748b',
    fontWeight: 500,
    marginBottom: 32
  }
}, "Trusted by independent outpatient clinics nationwide"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 64,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: 1280,
    margin: '0 auto',
    padding: '0 56px',
    opacity: 0.5
  }
}, ['Mesa Family Medicine', 'Sunshine Pediatrics', 'Borderland Behavioral', 'Rio Grande PT', 'NE Allergy', 'Valley Vision', 'Coronado Care', 'Brookline Clinic'].map(c => /*#__PURE__*/React.createElement("div", {
  key: c,
  style: {
    fontSize: 16,
    fontWeight: 700,
    color: '#000054',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap'
  }
}, c))));

// ---------- Features ----------
const FeatureCard = ({
  kicker,
  title,
  body,
  mock,
  gradient
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 2px 16px rgba(0,0,84,0.04)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    height: 240,
    background: gradient,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  }
}, mock), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '28px 28px 32px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 10
  }
}, kicker), /*#__PURE__*/React.createElement("h3", {
  style: {
    fontSize: 24,
    fontWeight: 700,
    color: '#000054',
    letterSpacing: '-0.02em',
    margin: '0 0 12px',
    lineHeight: 1.2
  }
}, title), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 1.6,
    margin: 0
  }
}, body)));
const Features = () => /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '120px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'center',
    marginBottom: 64
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: '#2740fc',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 14
  }
}, "Features"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 56,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
    color: '#000054',
    margin: '0 auto 16px',
    maxWidth: 820
  }
}, "Everything You Need", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300
  }
}, "to Run Smarter")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    color: '#475569',
    maxWidth: 540,
    margin: '0 auto'
  }
}, "From intake to insurance auth, your paperwork stack \u2014 automated. One source of truth, every form filled.")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: 20
  }
}, /*#__PURE__*/React.createElement(FeatureCard, {
  kicker: "One-time data entry",
  title: "42 fields, synced everywhere",
  body: "Front desk types patient info once. Sorta fans those fields out across every form in your packet \u2014 name on page 1 lands on every page where it lives.",
  gradient: "linear-gradient(135deg, #d1e4ff 0%, #ccf9f6 100%)",
  mock: /*#__PURE__*/React.createElement("div", {
    style: {
      transform: 'scale(0.85)',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement(M.BenefitMockOwner, null))
}), /*#__PURE__*/React.createElement(FeatureCard, {
  kicker: "Any PDF, mapped",
  title: "Keep your existing forms",
  body: "Upload your current PDF intake packets. Sorta reads every field, maps it semantically, and human-reviews before go-live.",
  gradient: "linear-gradient(135deg, #ccf9f6 0%, #d1e4ff 100%)",
  mock: /*#__PURE__*/React.createElement("div", {
    style: {
      transform: 'scale(0.7)',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement(M.StepMockUpload, null))
}), /*#__PURE__*/React.createElement(FeatureCard, {
  kicker: "EHR integration",
  title: "Works on top of what you have",
  body: "Sorta is a layer, not a replacement. We export to Epic, eCW, Athena, NextGen \u2014 or any EHR that takes a PDF or fax.",
  gradient: "linear-gradient(135deg, #fff7ed 0%, #ffe8d1 100%)",
  mock: /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
      padding: 16
    }
  }, ['Epic', 'eCW', 'Athena', 'NextGen', 'Kareo', 'DrChrono'].map(p => /*#__PURE__*/React.createElement("div", {
    key: p,
    style: {
      padding: '12px 8px',
      background: '#fff',
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 700,
      color: '#000054',
      textAlign: 'center',
      boxShadow: '0 2px 6px rgba(0,0,84,0.04)'
    }
  }, p)))
}), /*#__PURE__*/React.createElement(FeatureCard, {
  kicker: "Compliance built-in",
  title: "HIPAA from day one",
  body: "Encrypted at rest and in transit. Signed BAA with every clinic. PHI region-locked to the US. SOC 2 Type II in progress.",
  gradient: "linear-gradient(135deg, #000054 0%, #2740fc 100%)",
  mock: /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#fff',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginBottom: 12
    }
  }, ['HIPAA', 'BAA', 'SOC 2', 'AES-256'].map(b => /*#__PURE__*/React.createElement("div", {
    key: b,
    style: {
      padding: '6px 14px',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600
    }
  }, b))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 800,
      letterSpacing: '-0.03em',
      color: '#02e3d3'
    }
  }, "\uD83D\uDD12"))
})));

// ---------- Big stat (odometer-style) ----------
const Odometer = () => {
  // Static rolling-style digits
  const digits = '33,000'.split('');
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 56px',
      background: '#000054',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr 1.3fr',
      gap: 80,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#02e3d3',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 16
    }
  }, "Who we are"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#fff',
      margin: '0 0 24px'
    }
  }, "Innovating for a", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 300
    }
  }, "Smarter Clinic")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: 'rgba(255,255,255,0.7)',
      lineHeight: 1.6,
      marginBottom: 32,
      maxWidth: 480
    }
  }, "Sorta was started in El Paso by a former PCT who watched the front desk re-type the same patient info eighteen different ways. We're building the paperwork layer he wished existed."), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '13px 26px',
      background: 'transparent',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: 9999,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, "About us", /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#fff',
      color: '#000054',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800
    }
  }, "\u2192"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 4,
      marginBottom: 24
    }
  }, digits.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 140,
      fontWeight: 800,
      letterSpacing: '-0.05em',
      lineHeight: 1,
      color: '#fff',
      position: 'relative',
      ...(d === ',' ? {
        color: '#02e3d3'
      } : {})
    }
  }, d)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 80,
      fontWeight: 800,
      color: '#02e3d3',
      lineHeight: 1,
      alignSelf: 'flex-start',
      marginTop: 12
    }
  }, "+")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 500,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: 32
    }
  }, "Hours of front desk work reclaimed by Sorta \xB7 this year"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,0.1)'
    }
  }, [{
    n: '240+',
    l: 'Clinics live'
  }, {
    n: '4.8M',
    l: 'Pages auto-filled'
  }, {
    n: '99.7%',
    l: 'Field accuracy'
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 800,
      color: '#02e3d3',
      letterSpacing: '-0.02em'
    }
  }, s.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 4
    }
  }, s.l)))))));
};

// ---------- 3-step tab section ----------
const Steps = () => {
  const [active, setActive] = useState(0);
  const steps = [{
    num: '01',
    t: 'Quick Setup',
    d: 'Send us your existing PDF intake packet. We map every field. Human-reviewed. Live in 48 hours.',
    mock: /*#__PURE__*/React.createElement(M.StepMockUpload, null)
  }, {
    num: '02',
    t: 'One-Time Data Entry',
    d: 'Sixty seconds at the front desk. Name, DOB, insurance. Sorta fans those 42 fields across every form in your packet.',
    mock: /*#__PURE__*/React.createElement(M.StepMockEntry, null)
  }, {
    num: '03',
    t: 'Auto-Fill & Export',
    d: 'Pixel-identical filled PDF in seconds. Print, e-sign, or push directly into your EHR. Patient walks in — packet\u2019s ready.',
    mock: /*#__PURE__*/React.createElement(M.StepMockExport, null)
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Simple steps"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 720
    }
  }, "Get Started in Minutes"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 540,
      margin: '0 auto'
    }
  }, "From contract to first filled packet \u2014 three easy steps and you're running.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 48,
      flexWrap: 'wrap'
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setActive(i),
    style: {
      padding: '14px 24px',
      borderRadius: 9999,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid',
      ...(active === i ? {
        background: '#000054',
        color: '#fff',
        borderColor: '#000054',
        boxShadow: '0 4px 12px rgba(0,0,84,0.20)'
      } : {
        background: '#fff',
        color: '#000054',
        borderColor: '#e2e8f0'
      }),
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: active === i ? '#02e3d3' : '#f1f5f9',
      color: active === i ? '#000054' : '#64748b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800
    }
  }, i + 1), s.t))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.3fr',
      gap: 64,
      alignItems: 'center',
      background: 'linear-gradient(135deg, #fafbfc, #ffffff)',
      borderRadius: 24,
      padding: 48,
      border: '1px solid #e2e8f0'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 800,
      color: '#d1e4ff',
      letterSpacing: '-0.04em',
      lineHeight: 1,
      marginBottom: 16
    }
  }, "Step ", active + 1), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 40,
      fontWeight: 700,
      color: '#000054',
      letterSpacing: '-0.025em',
      lineHeight: 1.1,
      margin: '0 0 20px'
    }
  }, steps[active].t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      lineHeight: 1.6,
      margin: '0 0 28px'
    }
  }, steps[active].d), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActive(Math.max(0, active - 1)),
    disabled: active === 0,
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: '1px solid #e2e8f0',
      background: '#fff',
      cursor: active === 0 ? 'not-allowed' : 'pointer',
      fontSize: 16,
      color: active === 0 ? '#cbd5e1' : '#000054',
      fontFamily: 'inherit',
      fontWeight: 700
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActive(Math.min(2, active + 1)),
    disabled: active === 2,
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: 'none',
      background: active === 2 ? '#e2e8f0' : '#2740fc',
      color: '#fff',
      cursor: active === 2 ? 'not-allowed' : 'pointer',
      fontSize: 16,
      fontFamily: 'inherit',
      fontWeight: 700,
      boxShadow: active === 2 ? 'none' : '0 2px 8px rgba(39,64,252,0.30)'
    }
  }, "\u2192"))), /*#__PURE__*/React.createElement("div", null, steps[active].mock)));
};

// ---------- Benefits ----------
const Benefits = () => {
  const groups = [{
    tag: 'For Front Desk',
    t: 'Patients in. Packets done.',
    d: 'No more 45-minute morning prep. Walk in at 8, start seeing patients at 8.',
    bullets: [{
      t: 'Type once, fill 18 pages.',
      d: 'One source of truth across your entire paperwork stack.'
    }, {
      t: 'No more re-typing names.',
      d: 'Insurance lookup pre-fills carrier ID from a photo of the card.'
    }],
    mock: /*#__PURE__*/React.createElement(M.BenefitMockStaff, null)
  }, {
    tag: 'For Clinic Owners',
    t: 'The cheapest hire you\u2019ll ever make.',
    d: 'Less than one shift of temp coverage. Replaces hours of admin every day.',
    bullets: [{
      t: '$300/month flat.',
      d: 'No per-user, no per-form, no contracts. Cancel anytime.'
    }, {
      t: '33 hours/week back.',
      d: 'Reclaim your front desk\u2019s morning. Or send them home on time.'
    }],
    mock: /*#__PURE__*/React.createElement(M.BenefitMockOwner, null)
  }, {
    tag: 'For Patients',
    t: 'No clipboard. No re-typing.',
    d: 'Walk in, sign once, go back. The packet was already done.',
    bullets: [{
      t: 'Sign once on a tablet.',
      d: 'Signature replicates across every form in the packet — automatically.'
    }, {
      t: 'Transparent records.',
      d: 'Patients can review what was submitted before signing.'
    }],
    mock: /*#__PURE__*/React.createElement(M.BenefitMockPatient, null)
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 64
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Benefits"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 800
    }
  }, "Empowering Every User"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 580,
      margin: '0 auto'
    }
  }, "Tailored for the three people whose day Sorta changes most.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20
    }
  }, groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
    key: gi,
    style: {
      background: gi === 1 ? '#000054' : '#fff',
      color: gi === 1 ? '#fff' : '#000054',
      border: gi === 1 ? 'none' : '1px solid #e2e8f0',
      borderRadius: 24,
      padding: 32,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: gi === 1 ? '#02e3d3' : '#2740fc',
      marginBottom: 14
    }
  }, g.tag), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
      margin: '0 0 12px'
    }
  }, g.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.6,
      margin: '0 0 24px',
      opacity: gi === 1 ? 0.7 : 1,
      color: gi === 1 ? 'rgba(255,255,255,0.7)' : '#475569'
    }
  }, g.d), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24,
      filter: gi === 1 ? 'invert(0)' : 'none'
    }
  }, g.mock), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginTop: 'auto'
    }
  }, g.bullets.map((b, bi) => /*#__PURE__*/React.createElement("div", {
    key: bi,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: gi === 1 ? '#02e3d3' : '#ccf9f6',
      color: gi === 1 ? '#000054' : '#02e3d3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 800,
      flexShrink: 0,
      marginTop: 1
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      marginBottom: 2
    }
  }, b.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.5,
      opacity: gi === 1 ? 0.7 : 1,
      color: gi === 1 ? 'rgba(255,255,255,0.7)' : '#64748b'
    }
  }, b.d)))))))));
};
window.MedonixPage1 = {
  TopNav,
  Hero,
  Marquee,
  Features,
  Odometer,
  Steps,
  Benefits
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marketing_redesign/medonix-page-1.jsx", error: String((e && e.message) || e) }); }

// design_handoff_marketing_redesign/medonix-page-2.jsx
try { (() => {
// Part 2 of Medonix-style page: Testimonials, Pricing, FAQ, Blog, CTA, Footer.

const {
  useState: useState2
} = React;
const M2 = window.MedonixMocks;

// ---------- Testimonials (Bento) ----------
const Testimonials = () => {
  const items = [{
    kind: 'quote',
    q: 'Our front desk used to come in 45 minutes early to prep packets. Now they show up at 8 and we start seeing patients at 8.',
    a: 'Dr. Linda Castaneda',
    r: 'Owner · Mesa Family Medicine · El Paso, TX',
    avatar: 'linear-gradient(135deg, #2740fc, #02e3d3)',
    big: true
  }, {
    kind: 'quote',
    q: 'We canceled two staff temp contracts the week after we turned Sorta on. The math feels like cheating.',
    a: 'Dr. Anand Krishnamurthy',
    r: 'Owner · Sunshine Pediatrics',
    avatar: 'linear-gradient(135deg, #66bdff, #2886f9)'
  }, {
    kind: 'video',
    label: 'Watch the 2-min walkthrough — how Mesa Family Medicine onboarded in 48 hours',
    poster: 'linear-gradient(135deg, #d1e4ff, #ccf9f6)'
  }, {
    kind: 'quote',
    q: 'Setup was 48 hours. Day one we sent home our temp coverage. It pays for itself in a week.',
    a: 'Talia Mwangi',
    r: 'Office Manager · Borderland Behavioral'
  }, {
    kind: 'quote',
    q: 'Our patients comment on it. Walking in with the paperwork already done — that\u2019s the experience.',
    a: 'Roberto Vasquez',
    r: 'Front Desk · Coronado Care',
    avatar: 'linear-gradient(135deg, #99bdff, #66bdff)'
  }, {
    kind: 'stat',
    big: '$8.4k',
    sub: 'monthly savings · 30 days in',
    sub2: 'avg across 240+ clinics on Sorta',
    dark: true
  }, {
    kind: 'quote',
    q: '99% of my HIPAA-consent issues vanished. The form is filled correctly every time.',
    a: 'Dr. Jin Park',
    r: 'Owner · Brookline Clinic, MA',
    avatar: 'linear-gradient(135deg, #02e3d3, #2740fc)'
  }, {
    kind: 'quote',
    q: 'I run a 3-provider primary care office. Sorta is the closest thing to free labor I\u2019ve ever bought.',
    a: 'Dr. Adaeze Okonkwo',
    r: 'Owner · NE Allergy & Asthma'
  }, {
    kind: 'quote',
    q: 'My staff came back from training and said \u201cwe never want to go back.\u201d That was day one.',
    a: 'Cynthia Yamamoto',
    r: 'Practice Admin · Valley Vision',
    avatar: 'linear-gradient(135deg, #2740fc, #99bdff)'
  }];
  const renderItem = (it, i) => {
    if (it.kind === 'video') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          background: it.poster,
          borderRadius: 20,
          padding: 28,
          position: 'relative',
          overflow: 'hidden',
          minHeight: 220,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,84,0.15)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 0,
          height: 0,
          borderLeft: '14px solid #2740fc',
          borderTop: '9px solid transparent',
          borderBottom: '9px solid transparent',
          marginLeft: 4
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: '#000054',
          background: 'rgba(255,255,255,0.85)',
          padding: '4px 10px',
          borderRadius: 9999
        }
      }, "2:14")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 16,
          fontWeight: 600,
          color: '#000054',
          lineHeight: 1.35,
          maxWidth: 280
        }
      }, it.label));
    }
    if (it.kind === 'stat') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          background: '#000054',
          color: '#fff',
          borderRadius: 20,
          padding: 28,
          minHeight: 220,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: '#02e3d3',
          lineHeight: 1
        }
      }, it.big), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 500,
          marginTop: 12
        }
      }, it.sub), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          marginTop: 4
        }
      }, it.sub2));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 28,
        minHeight: it.big ? 280 : 220,
        gridColumn: it.big ? 'span 2' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: it.big ? 22 : 15,
        fontWeight: it.big ? 500 : 400,
        color: '#000054',
        lineHeight: 1.45,
        margin: 0,
        letterSpacing: it.big ? '-0.015em' : 0
      }
    }, "\"", it.q, "\""), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginTop: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: it.avatar || 'linear-gradient(135deg, #cbd5e1, #94a3b8)'
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: '#000054'
      }
    }, it.a), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#64748b'
      }
    }, it.r))));
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Showcase"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 820
    }
  }, "Trusted by Owners,", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 300
    }
  }, "Loved by Front Desks")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 540,
      margin: '0 auto'
    }
  }, "Real stories from the clinics running Sorta in production today.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      gridColumn: it.big ? 'span 2' : 'auto'
    }
  }, renderItem(it, i)))));
};

// ---------- Pricing ----------
const Pricing = () => {
  const [yearly, setYearly] = useState2(false);
  const plans = [{
    name: 'Independent',
    desc: 'For solo or 2-provider clinics getting started with paperwork automation.',
    monthly: 300,
    yearly: 250,
    cta: 'Start free trial',
    featured: false,
    features: ['Up to 3 staff accounts', 'Unlimited patient records', 'Up to 20 form templates', 'EHR & fax integrations', 'Email support']
  }, {
    name: 'Practice',
    desc: 'For busy 3-5 provider clinics that need advanced workflows.',
    monthly: 600,
    yearly: 500,
    cta: 'Start free trial',
    featured: true,
    features: ['Unlimited staff accounts', 'Unlimited form templates', 'Insurance lookup automation', 'Advanced analytics & reporting', 'Priority phone + Slack support', 'White-glove onboarding']
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Pricing"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 820
    }
  }, "Simple & Transparent"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 540,
      margin: '0 auto 32px'
    }
  }, "No per-form fees. No contracts. Pick your plan, cancel anytime."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      padding: 4,
      background: '#f1f5f9',
      borderRadius: 9999,
      border: '1px solid #e2e8f0'
    }
  }, ['Monthly', 'Yearly'].map((l, i) => /*#__PURE__*/React.createElement("button", {
    key: l,
    onClick: () => setYearly(i === 1),
    style: {
      padding: '8px 20px',
      borderRadius: 9999,
      background: i === 1 === yearly ? '#fff' : 'transparent',
      color: i === 1 === yearly ? '#000054' : '#64748b',
      border: 'none',
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: i === 1 === yearly ? '0 1px 3px rgba(0,0,84,0.10)' : 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, l, i === 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 9999,
      background: '#ccf9f6',
      color: '#065f46',
      fontWeight: 700
    }
  }, "\u221217%"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
      maxWidth: 960,
      margin: '0 auto'
    }
  }, plans.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: p.featured ? '#000054' : '#fff',
      color: p.featured ? '#fff' : '#000054',
      border: p.featured ? 'none' : '1px solid #e2e8f0',
      borderRadius: 24,
      padding: 36,
      position: 'relative',
      ...(p.featured ? {
        boxShadow: '0 20px 50px -20px rgba(0,0,84,0.30)'
      } : {})
    }
  }, p.featured && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 20,
      right: 20,
      padding: '4px 12px',
      background: '#02e3d3',
      color: '#000054',
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 9999,
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, "Most popular"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background: p.featured ? 'rgba(255,255,255,0.1)' : '#d1e4ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20
    }
  }, "\uD83D\uDCE6"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: '-0.01em'
    }
  }, p.name)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.6,
      margin: '0 0 24px',
      opacity: p.featured ? 0.7 : 1,
      color: p.featured ? 'rgba(255,255,255,0.7)' : '#475569'
    }
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 56,
      fontWeight: 800,
      letterSpacing: '-0.03em',
      lineHeight: 1
    }
  }, "$", yearly ? p.yearly : p.monthly), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 500,
      opacity: 0.6
    }
  }, "/month", yearly ? ', billed yearly' : '')), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '14px',
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      marginBottom: 24,
      background: p.featured ? '#02e3d3' : '#2740fc',
      color: p.featured ? '#000054' : '#fff',
      border: 'none',
      boxShadow: p.featured ? 'none' : '0 2px 8px rgba(39,64,252,0.30)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    }
  }, p.cta, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: p.featured ? '#000054' : '#fff',
      color: p.featured ? '#02e3d3' : '#2740fc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800
    }
  }, "\u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      opacity: 0.6,
      marginBottom: 12
    }
  }, "Includes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, p.features.map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: p.featured ? '#02e3d3' : '#ccf9f6',
      color: p.featured ? '#000054' : '#02e3d3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800,
      flexShrink: 0,
      marginTop: 2
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: 1.5
    }
  }, f))))))));
};

// ---------- FAQ ----------
const FAQ = () => {
  const [open, setOpen] = useState2(0);
  const items = [{
    q: 'How secure is my patient data?',
    a: 'Sorta is HIPAA-compliant from day one. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We sign a BAA with every clinic. PHI is region-locked to the US, and we maintain a full audit trail with 7-year retention. SOC 2 Type II is in progress.'
  }, {
    q: 'Will this work with my existing EHR?',
    a: 'Almost certainly yes. Sorta is a layer that sits on top of your EHR — we don\u2019t replace it. If your EHR can accept a PDF upload, or your fax line takes a packet, Sorta works. We have direct integrations with Epic, eClinicalWorks, Athena, NextGen, Practice Fusion, Kareo, DrChrono, Greenway, Allscripts, AdvancedMD, and CharmHealth.'
  }, {
    q: 'How long does setup take?',
    a: 'About 48 hours from when you send us your intake packet. We map every field, a human reviews the mapping, and your account goes live. White-glove onboarding is included on every plan.'
  }, {
    q: 'Is there a limit to the number of patients or forms I can have?',
    a: 'No. Both plans include unlimited patient records. The Independent plan caps form templates at 20 (more than enough for most clinics); Practice is unlimited. There are no per-user fees, no per-form fees, and no per-fill fees.'
  }, {
    q: 'Do you offer support if I have technical issues?',
    a: 'Yes. Email support is included on every plan. The Practice plan adds priority phone and Slack support — typically same-day, usually within an hour during business hours.'
  }, {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts. Month-to-month. Cancel any time and your data exports cleanly. You\u2019ll never get stuck.'
  }, {
    q: 'Can I integrate this with my existing system?',
    a: 'Yes. We expose a REST API for clinics that want to push data programmatically. Most clinics don\u2019t need it — the standard PDF export and EHR integration covers 95% of workflows.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1080,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "FAQ"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 720
    }
  }, "Your Questions, Answered"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 540,
      margin: '0 auto'
    }
  }, "Quick answers to help you get started with confidence.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'all 0.2s'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(open === i ? -1 : i),
    style: {
      width: '100%',
      padding: '22px 28px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'inherit',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      color: '#000054'
    }
  }, it.q), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: open === i ? '#2740fc' : '#f1f5f9',
      color: open === i ? '#fff' : '#64748b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 700,
      flexShrink: 0,
      marginLeft: 16,
      transition: 'all 0.2s'
    }
  }, open === i ? '−' : '+')), open === i && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 28px 24px',
      fontSize: 15,
      color: '#475569',
      lineHeight: 1.65
    }
  }, it.a)))));
};

// ---------- Blog ----------
const Blog = () => {
  const posts = [{
    t: '5 Ways to Cut Front-Desk Burnout in Independent Clinics',
    d: 'May 12, 2026',
    cat: 'Operations',
    tone: 'cool'
  }, {
    t: 'The Hidden Cost of Re-Typing Patient Data (and How to Stop)',
    d: 'May 4, 2026',
    cat: 'Strategy',
    tone: 'mint'
  }, {
    t: 'HIPAA Compliance for Solo Practices: A Plain-English Guide',
    d: 'April 28, 2026',
    cat: 'Compliance',
    tone: 'warm'
  }];
  const tones = {
    cool: 'linear-gradient(135deg, #d1e4ff, #ccf9f6)',
    mint: 'linear-gradient(135deg, #ccf9f6, #d1e4ff)',
    warm: 'linear-gradient(135deg, #fff7ed, #ffe8d1)'
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Blog"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 48,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: 0
    }
  }, "Insights from the front desk")), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '12px 22px',
      background: '#fff',
      color: '#000054',
      border: '1px solid #e2e8f0',
      borderRadius: 9999,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, "Browse all", /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#2740fc',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800
    }
  }, "\u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20
    }
  }, posts.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.t,
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 20,
      overflow: 'hidden',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 200,
      background: tones[p.tone],
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 12px',
      background: '#fff',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc'
    }
  }, p.cat)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 19,
      fontWeight: 700,
      color: '#000054',
      letterSpacing: '-0.01em',
      lineHeight: 1.25,
      margin: '0 0 14px'
    }
  }, p.t), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64748b'
    }
  }, p.d), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#2740fc',
      fontSize: 16,
      fontWeight: 800
    }
  }, "\u2192")))))));
};

// ---------- CTA Banner ----------
const CTABanner = () => /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '0 56px 100px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'linear-gradient(135deg, #000054 0%, #2740fc 100%)',
    borderRadius: 32,
    padding: '72px 64px',
    position: 'relative',
    overflow: 'hidden',
    color: '#fff'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '-100px',
    right: '-100px',
    width: 360,
    height: 360,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(2,227,211,0.4), transparent 70%)'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    bottom: '-80px',
    left: '-60px',
    width: 280,
    height: 280,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(102,189,255,0.3), transparent 70%)'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: 64,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: '#02e3d3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  }
}, /*#__PURE__*/React.createElement(SortaMark, {
  size: 32
})), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 56,
    fontWeight: 700,
    letterSpacing: '-0.035em',
    lineHeight: 1.02,
    color: '#fff',
    margin: '0 0 20px'
  }
}, "Cut Paperwork.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300,
    color: '#02e3d3'
  }
}, "Keep Your Clinic.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.6,
    margin: '0 0 36px',
    maxWidth: 460
  }
}, "Join 240+ independent clinics running Sorta on their actual intake packets. See it work on yours in a 15-minute demo."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: '#fff',
    color: '#000054',
    border: 'none',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, "Get Started Now", /*#__PURE__*/React.createElement("span", {
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#2740fc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800
  }
}, "\u2192")), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Book a demo"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(12px)',
    borderRadius: 20,
    padding: 28
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 10
  }
}, "Newsletter"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6
  }
}, "Stay updated"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 20
  }
}, "Monthly clinic operations tips, straight to your inbox."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("input", {
  placeholder: "your@clinic.com",
  style: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none'
  }
}), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '12px 18px',
    background: '#02e3d3',
    color: '#000054',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Subscribe")))))));

// ---------- Footer ----------
const SiteFooter = () => /*#__PURE__*/React.createElement("footer", {
  style: {
    padding: '72px 56px 36px',
    background: '#fff',
    borderTop: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    gap: 48,
    marginBottom: 56
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SortaWordmark, null), /*#__PURE__*/React.createElement("p", {
  style: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 1.6,
    maxWidth: 320
  }
}, "The paperwork automation layer for independent outpatient clinics. Bootstrapped from El Paso, TX."), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 24,
    fontSize: 13,
    color: '#475569'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
  style: {
    color: '#000054'
  }
}, "hi@getsorta.io")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 4
  }
}, "El Paso, TX \xB7 USA"))), [{
  h: 'Main pages',
  items: ['Home', 'About', 'Features', 'Pricing', 'Blog']
}, {
  h: 'Product',
  items: ['How it works', 'Templates', 'Security', 'Changelog']
}, {
  h: 'Inner pages',
  items: ['Single post', 'Single plan', 'Contact', 'Careers']
}, {
  h: 'Utility',
  items: ['Style guide', 'License', '404', 'Password']
}].map(g => /*#__PURE__*/React.createElement("div", {
  key: g.h
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8',
    marginBottom: 16
  }
}, g.h), g.items.map(i => /*#__PURE__*/React.createElement("a", {
  key: i,
  href: "#",
  style: {
    display: 'block',
    fontSize: 14,
    color: '#000054',
    textDecoration: 'none',
    marginBottom: 10,
    fontWeight: 400
  }
}, i))))), /*#__PURE__*/React.createElement("div", {
  style: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    color: '#64748b'
  }
}, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Sorta, Inc. All rights reserved."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 24
  }
}, /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#64748b',
    textDecoration: 'none'
  }
}, "Privacy"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#64748b',
    textDecoration: 'none'
  }
}, "Terms"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#64748b',
    textDecoration: 'none'
  }
}, "Security"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#64748b',
    textDecoration: 'none'
  }
}, "HIPAA")))));
window.MedonixPage2 = {
  Testimonials,
  Pricing,
  FAQ,
  Blog,
  CTABanner,
  SiteFooter
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_marketing_redesign/medonix-page-2.jsx", error: String((e && e.message) || e) }); }

// landing-a-mocks.jsx
try { (() => {
// Direction A — "Clinical Calm"
// Spacious, navy + teal, light backgrounds, fresh CSS UI mockups.
// Closest to flax.ai's vibe.

// Sorta workspace product mock (CSS-only, marketing-styled).
const ProductHeroMock = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 30px 60px -20px rgba(0,0,84,0.18), 0 12px 24px -8px rgba(0,0,84,0.08)',
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 18px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#ff5f57'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#febc2e'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#28c840'
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    fontWeight: 500,
    marginLeft: -50
  }
}, "app.getsorta.io / workspace")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr 260px',
    height: 460
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    borderRight: '1px solid #e2e8f0',
    padding: 18,
    background: '#fafbfc'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#94a3b8',
    marginBottom: 14
  }
}, "Patients"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    marginBottom: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: '#94a3b8'
  }
}, "\uD83D\uDD0D"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: '#94a3b8'
  }
}, "Search\u2026")), [{
  n: 'Maria Hernandez',
  d: 'DOB 04/12/82',
  a: true
}, {
  n: 'James O\u2019Connor',
  d: 'DOB 11/30/65'
}, {
  n: 'Aaliyah Patel',
  d: 'DOB 07/22/91'
}, {
  n: 'Daniel Schmidt',
  d: 'DOB 02/14/78'
}, {
  n: 'Sofia Reyes',
  d: 'DOB 09/03/88'
}].map(p => /*#__PURE__*/React.createElement("div", {
  key: p.n,
  style: {
    padding: '10px 12px',
    borderRadius: 10,
    marginBottom: 4,
    background: p.a ? '#d1e4ff' : 'transparent',
    border: p.a ? '1px solid rgba(39,64,252,0.25)' : '1px solid transparent'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    fontWeight: 600,
    color: '#000054'
  }
}, p.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  }
}, p.d)))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '20px 24px',
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#02e3d3'
  }
}, "Active patient"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 18,
    fontWeight: 700,
    color: '#000054',
    marginTop: 2
  }
}, "Maria Hernandez")), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '4px 10px',
    background: '#ccf9f6',
    color: '#065f46',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600
  }
}, "\u2713 42 / 42 fields synced")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  }
}, [{
  l: 'Legal name',
  v: 'Maria Hernandez',
  f: true
}, {
  l: 'Date of birth',
  v: '04 / 12 / 1982',
  f: true
}, {
  l: 'Address line 1',
  v: '4827 Mesa View Dr',
  f: true
}, {
  l: 'City',
  v: 'El Paso',
  f: true
}, {
  l: 'State',
  v: 'TX',
  f: true
}, {
  l: 'ZIP',
  v: '79912',
  f: true
}, {
  l: 'Phone',
  v: '(915) 555-0142',
  f: true
}, {
  l: 'Email',
  v: 'maria.h@example.com',
  f: true
}, {
  l: 'Insurance provider',
  v: 'Blue Cross BS Texas',
  f: true
}, {
  l: 'Member ID',
  v: 'BCB-9384-21X',
  f: true
}].map(fd => /*#__PURE__*/React.createElement("div", {
  key: fd.l
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4
  }
}, fd.l), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #02e3d3',
    background: 'rgba(2,227,211,0.04)',
    color: '#000054',
    fontWeight: 500,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
}, fd.v, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#02e3d3',
    fontWeight: 700
  }
}, "\u2713")))))), /*#__PURE__*/React.createElement("div", {
  style: {
    borderLeft: '1px solid #e2e8f0',
    padding: 18,
    background: '#fafbfc'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#94a3b8',
    marginBottom: 14
  }
}, "Auto-filling"), [{
  n: 'Patient Intake',
  p: 18,
  s: 'done'
}, {
  n: 'HIPAA Consent',
  p: 4,
  s: 'done'
}, {
  n: 'Insurance Auth',
  p: 6,
  s: 'done'
}, {
  n: 'PHQ-9 Screening',
  p: 2,
  s: 'sync'
}, {
  n: 'Lab Order — CBC',
  p: 1,
  s: 'queued'
}].map(f => /*#__PURE__*/React.createElement("div", {
  key: f.n,
  style: {
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    color: '#000054'
  }
}, f.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 600,
    color: f.s === 'done' ? '#02e3d3' : f.s === 'sync' ? '#2740fc' : '#94a3b8'
  }
}, f.s === 'done' ? '✓' : f.s === 'sync' ? '⟳' : '○')), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  }
}, f.p, " ", f.p === 1 ? 'page' : 'pages'))), /*#__PURE__*/React.createElement("button", {
  style: {
    marginTop: 16,
    width: '100%',
    padding: '10px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Export PDF packet \u2192"))));

// Inline UI mock for feature row 1 — template upload
const FeatureMockUpload = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 12px 32px -12px rgba(0,0,84,0.10)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8',
    marginBottom: 16
  }
}, "Template Library"), /*#__PURE__*/React.createElement("div", {
  style: {
    border: '2px dashed #99bdff',
    borderRadius: 12,
    padding: '24px 16px',
    background: 'rgba(209,228,255,0.25)',
    textAlign: 'center',
    marginBottom: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 28,
    marginBottom: 6
  }
}, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    fontWeight: 600,
    color: '#000054'
  }
}, "Drop your PDF intake forms here"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4
  }
}, "or click to browse \xB7 We map every field automatically")), [{
  n: 'New_Patient_Intake_2025.pdf',
  s: '18 pages · 42 fields mapped',
  d: '✓'
}, {
  n: 'HIPAA_Consent.pdf',
  s: '4 pages · 12 fields mapped',
  d: '✓'
}, {
  n: 'Insurance_Authorization.pdf',
  s: '6 pages · 24 fields mapped',
  d: '⟳'
}].map(t => /*#__PURE__*/React.createElement("div", {
  key: t.n,
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    marginBottom: 8,
    background: '#fafbfc'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#d1e4ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14
  }
}, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    fontWeight: 600,
    color: '#000054'
  }
}, t.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  }
}, t.s)), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: t.d === '✓' ? '#02e3d3' : '#2740fc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700
  }
}, t.d))));

// Inline UI mock for feature row 2 — one-time data entry
const FeatureMockEntry = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 12px 32px -12px rgba(0,0,84,0.10)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#02e3d3',
    marginBottom: 4
  }
}, "New patient"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 18,
    fontWeight: 700,
    color: '#000054',
    marginBottom: 18
  }
}, "Quick intake \u2014 60 seconds"), [{
  l: 'Legal name',
  v: 'Daniel Schmidt'
}, {
  l: 'Date of birth',
  v: '02 / 14 / 1978'
}, {
  l: 'Phone',
  v: '(915) 555-0188'
}, {
  l: 'Insurance carrier',
  v: 'Aetna PPO'
}].map((f, i) => /*#__PURE__*/React.createElement("div", {
  key: f.l,
  style: {
    marginBottom: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4
  }
}, f.l), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '10px 12px',
    border: `1px solid ${i === 3 ? '#2740fc' : '#e2e8f0'}`,
    borderRadius: 8,
    fontSize: 14,
    color: '#000054',
    fontWeight: 500,
    background: '#fff',
    boxShadow: i === 3 ? '0 0 0 3px rgba(39,64,252,0.15)' : 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
}, f.v, i === 3 && /*#__PURE__*/React.createElement("span", {
  style: {
    width: 2,
    height: 16,
    background: '#2740fc'
  }
})))), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 18,
    padding: '12px 14px',
    background: '#ccf9f6',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#02e3d3',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700
  }
}, "\u2713"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    color: '#065f46'
  }
}, "42 fields will sync"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#065f46',
    opacity: 0.7
  }
}, "Across 18 pages of intake paperwork"))));

// Inline UI mock for feature row 3 — auto-filled PDF preview
const FeatureMockExport = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 12px 32px -12px rgba(0,0,84,0.10)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8'
  }
}, "Intake_Packet.pdf"), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '4px 10px',
    background: '#ccf9f6',
    color: '#065f46',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 600
  }
}, "Page 3 of 18")), /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fafbfc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 18,
    fontSize: 10,
    color: '#64748b'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 700,
    color: '#000054',
    textAlign: 'center',
    marginBottom: 12
  }
}, "PATIENT MEDICAL HISTORY"), /*#__PURE__*/React.createElement("div", {
  style: {
    marginBottom: 8
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#94a3b8'
  }
}, "Patient Name: "), /*#__PURE__*/React.createElement("span", {
  style: {
    background: '#ccf9f6',
    padding: '2px 6px',
    fontWeight: 600,
    color: '#065f46'
  }
}, "Maria Hernandez")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginBottom: 8
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#94a3b8'
  }
}, "Date of Birth: "), /*#__PURE__*/React.createElement("span", {
  style: {
    background: '#ccf9f6',
    padding: '2px 6px',
    fontWeight: 600,
    color: '#065f46'
  }
}, "04/12/1982"), /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#94a3b8',
    marginLeft: 12
  }
}, "MRN: "), /*#__PURE__*/React.createElement("span", {
  style: {
    background: '#ccf9f6',
    padding: '2px 6px',
    fontWeight: 600,
    color: '#065f46'
  }
}, "SRT-8821")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginBottom: 8
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#94a3b8'
  }
}, "Address: "), /*#__PURE__*/React.createElement("span", {
  style: {
    background: '#ccf9f6',
    padding: '2px 6px',
    fontWeight: 600,
    color: '#065f46'
  }
}, "4827 Mesa View Dr, El Paso, TX 79912")), /*#__PURE__*/React.createElement("div", {
  style: {
    borderTop: '1px solid #e2e8f0',
    margin: '12px 0',
    paddingTop: 10,
    fontSize: 10,
    fontWeight: 700,
    color: '#000054'
  }
}, "ALLERGIES & MEDICATIONS"), /*#__PURE__*/React.createElement("div", {
  style: {
    marginBottom: 6
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#94a3b8'
  }
}, "Known allergies: "), /*#__PURE__*/React.createElement("span", {
  style: {
    background: '#ccf9f6',
    padding: '2px 6px',
    fontWeight: 600,
    color: '#065f46'
  }
}, "Penicillin (mild)")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginBottom: 6
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#94a3b8'
  }
}, "Current meds: "), /*#__PURE__*/React.createElement("span", {
  style: {
    background: '#ccf9f6',
    padding: '2px 6px',
    fontWeight: 600,
    color: '#065f46'
  }
}, "Lisinopril 10mg, Metformin 500mg")), /*#__PURE__*/React.createElement("div", {
  style: {
    borderTop: '1px solid #e2e8f0',
    margin: '12px 0',
    paddingTop: 10,
    fontSize: 10,
    fontWeight: 700,
    color: '#000054'
  }
}, "EMERGENCY CONTACT"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#94a3b8'
  }
}, "Name: "), /*#__PURE__*/React.createElement("span", {
  style: {
    background: '#ccf9f6',
    padding: '2px 6px',
    fontWeight: 600,
    color: '#065f46'
  }
}, "Carlos Hernandez (spouse)"))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTop: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#64748b'
  }
}, "All 18 pages filled \xB7 0 errors"), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '8px 14px',
    background: '#000054',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit'
  }
}, "Download packet \u2193")));
window.LandingA_Mocks = {
  ProductHeroMock,
  FeatureMockUpload,
  FeatureMockEntry,
  FeatureMockExport
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing-a-mocks.jsx", error: String((e && e.message) || e) }); }

// landing-a.jsx
try { (() => {
// Direction A — "Clinical Calm"
// Spacious, navy + teal, light backgrounds, fresh CSS UI mockups.
// Closest to flax.ai's vibe.

const {
  ProductHeroMock,
  FeatureMockUpload,
  FeatureMockEntry,
  FeatureMockExport
} = window.LandingA_Mocks;
const LandingA = () => /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "'Poppins', sans-serif",
    background: '#fdfdfd',
    color: '#000054'
  }
}, /*#__PURE__*/React.createElement(Nav, {
  cta: "Book a demo"
}), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '96px 56px 80px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.15fr',
    gap: 64,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    background: '#ccf9f6',
    color: '#065f46',
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 24
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 6,
    height: 6,
    background: '#02e3d3',
    borderRadius: '50%'
  }
}), "Built for independent outpatient clinics"), /*#__PURE__*/React.createElement("h1", {
  style: {
    fontSize: 72,
    fontWeight: 300,
    lineHeight: 1.02,
    letterSpacing: '-0.035em',
    color: '#000054',
    margin: 0,
    marginBottom: 28
  }
}, "Cut paperwork.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 700
  }
}, "Keep your clinic.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 19,
    lineHeight: 1.55,
    color: '#475569',
    maxWidth: 480,
    marginBottom: 36,
    fontWeight: 400
  }
}, "Sorta sits on top of your existing EHR. Front desk enters patient info once \u2014 all 18 pages of your intake packet fill themselves. No migration. No new hardware."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12,
    marginBottom: 32
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(39,64,252,0.30)'
  }
}, "Book a demo \u2192"), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: 'transparent',
    color: '#000054',
    border: '1px solid #e2e8f0',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Try free for 14 days")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#64748b'
  }
}, /*#__PURE__*/React.createElement("strong", {
  style: {
    color: '#000054'
  }
}, "$300/month flat."), " No contracts. No per-user fees.")), /*#__PURE__*/React.createElement(ProductHeroMock, null))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '24px 56px 64px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 28
  }
}, "Trusted by independent clinics from El Paso to Buffalo"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 32,
    alignItems: 'center',
    opacity: 0.55
  }
}, ['Mesa Family Medicine', 'Sunshine Pediatrics', 'Borderland Behavioral', 'Rio Grande PT', 'Northeast Allergy', 'Valley Vision'].map(c => /*#__PURE__*/React.createElement("div", {
  key: c,
  style: {
    fontSize: 14,
    fontWeight: 700,
    color: '#000054',
    letterSpacing: '-0.01em',
    textAlign: 'center',
    fontStyle: c.includes('Behavioral') ? 'italic' : 'normal'
  }
}, c)))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 56px 100px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'center',
    marginBottom: 56
  }
}, /*#__PURE__*/React.createElement(Kicker, null, "The math is brutal"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 48,
    fontWeight: 300,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: '14px auto 0',
    maxWidth: 720,
    color: '#000054'
  }
}, "Every clinic is hemorrhaging time", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 700
  }
}, "on the same 18 pages."))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 24
  }
}, [{
  num: '33',
  unit: 'hrs/wk',
  label: 'Front desk time spent re-typing the same patient info into different forms',
  color: '#2740fc'
}, {
  num: '18',
  unit: 'pages',
  label: 'Average intake packet at an independent outpatient clinic. Sorta auto-fills them all.',
  color: '#000054'
}, {
  num: '$300',
  unit: '/month flat',
  label: 'No per-user fees. No per-form fees. No contracts. Cancel any time.',
  color: '#02e3d3'
}].map((s, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: '40px 32px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 2px 16px rgba(0,0,84,0.06)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    background: s.color
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8',
    marginBottom: 24
  }
}, "0", i + 1), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 88,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: s.color,
    lineHeight: 1
  }
}, s.num), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 18,
    fontWeight: 500,
    color: '#64748b'
  }
}, s.unit)), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 1.55,
    margin: 0
  }
}, s.label))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '100px 56px',
    maxWidth: 1280,
    margin: '0 auto',
    borderTop: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 80,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, null, "01 \xB7 Upload"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 44,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: '14px 0 24px',
    color: '#000054'
  }
}, "Keep the forms", /*#__PURE__*/React.createElement("br", null), "you already use."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    lineHeight: 1.6,
    color: '#475569',
    marginBottom: 28
  }
}, "Upload your existing PDF intake packets, consent forms, screening tools \u2014 anything. Sorta reads them, maps every field to its semantic meaning, and learns your clinic's exact paperwork in one pass."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  }
}, ['No re-creating forms from scratch — your existing PDFs work as-is', 'Field mapping is reviewed by a human before going live', 'Works for HIPAA consent, insurance auth, intake, PHQ-9, ROS, anything'].map(t => /*#__PURE__*/React.createElement("div", {
  key: t,
  style: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#ccf9f6',
    color: '#02e3d3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 2
  }
}, "\u2713"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 1.5
  }
}, t))))), /*#__PURE__*/React.createElement(FeatureMockUpload, null))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '100px 56px',
    maxWidth: 1280,
    margin: '0 auto',
    borderTop: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 80,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement(FeatureMockEntry, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, null, "02 \xB7 Enter once"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 44,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: '14px 0 24px',
    color: '#000054'
  }
}, "Staff types in", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300
  }
}, "patient info \u2014 once.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    lineHeight: 1.6,
    color: '#475569',
    marginBottom: 28
  }
}, "Sixty seconds at the front desk. Name, DOB, insurance, demographics. Sorta fans those fields out to every form in your packet \u2014 name on page 1 lands on every page where \"Patient Name\" lives."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  }
}, ['One source of truth — edit anywhere, syncs everywhere', 'Insurance lookup pre-fills carrier ID and group from the card', 'Patient signs once on a tablet — signature replicates across all forms'].map(t => /*#__PURE__*/React.createElement("div", {
  key: t,
  style: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#ccf9f6',
    color: '#02e3d3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 2
  }
}, "\u2713"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 1.5
  }
}, t))))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '100px 56px',
    maxWidth: 1280,
    margin: '0 auto',
    borderTop: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 80,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, null, "03 \xB7 Export"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 44,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: '14px 0 24px',
    color: '#000054'
  }
}, "18 pages out.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300
  }
}, "Zero re-typing.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    lineHeight: 1.6,
    color: '#475569',
    marginBottom: 28
  }
}, "Sorta exports a clean, fully-filled PDF packet \u2014 pixel-identical to your originals, ready to print, e-sign, or upload into your EHR. Your patient walks in and your front desk hands them a stack that's already done."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  }
}, ['Pixel-identical to your originals — nothing to re-approve with your compliance officer', 'E-signature ready, or print the packet for in-clinic signing', 'Drops into any EHR or DMS via export, upload, or fax integration'].map(t => /*#__PURE__*/React.createElement("div", {
  key: t,
  style: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#ccf9f6',
    color: '#02e3d3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 2
  }
}, "\u2713"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 1.5
  }
}, t))))), /*#__PURE__*/React.createElement(FeatureMockExport, null))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '120px 56px',
    background: 'linear-gradient(135deg, #d1e4ff 0%, #e8fbf8 55%, #ccf9f6 100%)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 980,
    margin: '0 auto',
    textAlign: 'center'
  }
}, /*#__PURE__*/React.createElement(Kicker, {
  color: "#000054"
}, "A note from Mesa Family Medicine"), /*#__PURE__*/React.createElement("blockquote", {
  style: {
    fontSize: 38,
    fontWeight: 300,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
    color: '#000054',
    margin: '32px 0',
    maxWidth: 880,
    marginLeft: 'auto',
    marginRight: 'auto'
  }
}, "\"Our front desk used to come in 45 minutes early just to prep packets.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 700
  }
}, "Now they show up at 8, and we start seeing patients at 8."), "\""), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2886f9, #2740fc)'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'left'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 16,
    fontWeight: 700,
    color: '#000054'
  }
}, "Dr. Linda Castaneda"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#475569'
  }
}, "Owner \xB7 Mesa Family Medicine \xB7 El Paso, TX"))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '100px 56px',
    maxWidth: 1280,
    margin: '0 auto',
    textAlign: 'center'
  }
}, /*#__PURE__*/React.createElement(Kicker, null, "Integrates seamlessly with"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: '14px auto 24px',
    maxWidth: 720,
    color: '#000054'
  }
}, "Your EHR. ", /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300
  }
}, "Whatever it is.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    color: '#475569',
    maxWidth: 580,
    margin: '0 auto 56px'
  }
}, "Sorta is a layer, not a replacement. Keep your EHR, your scheduling, your billing \u2014 Sorta sits on top and feeds them filled forms."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 16,
    marginBottom: 16
  }
}, ['Epic', 'eClinical Works', 'Athena', 'NextGen', 'Practice Fusion', 'Kareo'].map(p => /*#__PURE__*/React.createElement("div", {
  key: p,
  style: {
    padding: '28px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    background: '#fff',
    fontSize: 15,
    fontWeight: 700,
    color: '#000054',
    textAlign: 'center'
  }
}, p))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 16
  }
}, ['DrChrono', 'Greenway', 'Allscripts', 'AdvancedMD', 'CharmHealth', '+ any PDF'].map(p => /*#__PURE__*/React.createElement("div", {
  key: p,
  style: {
    padding: '28px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    background: '#fff',
    fontSize: 15,
    fontWeight: 700,
    color: p.startsWith('+') ? '#2740fc' : '#000054',
    textAlign: 'center'
  }
}, p)))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 56px 120px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#000054',
    borderRadius: 24,
    padding: '64px 56px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 64,
    alignItems: 'center',
    color: '#fff'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, {
  color: "#02e3d3"
}, "Compliance & security"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.15,
    margin: '14px 0 20px',
    color: '#fff'
  }
}, "HIPAA from day one."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 16,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 28
  }
}, "Encrypted at rest and in transit. Signed BAAs with every clinic. SOC 2 Type II audit in progress. PHI never leaves your region."), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#02e3d3',
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none'
  }
}, "Read our security overview \u2192")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  }
}, [{
  l: 'HIPAA',
  s: 'Compliant'
}, {
  l: 'BAA',
  s: 'Signed with all clinics'
}, {
  l: 'SOC 2',
  s: 'Type II in progress'
}, {
  l: 'Encryption',
  s: 'AES-256 at rest, TLS 1.3'
}, {
  l: 'Data residency',
  s: 'US-only, region-locked'
}, {
  l: 'Access logs',
  s: 'Full audit trail, 7-year retention'
}].map(b => /*#__PURE__*/React.createElement("div", {
  key: b.l,
  style: {
    padding: 18,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6
  }
}, b.l), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)'
  }
}, b.s)))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '0 56px 120px',
    maxWidth: 1280,
    margin: '0 auto',
    textAlign: 'center'
  }
}, /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 64,
    fontWeight: 300,
    letterSpacing: '-0.035em',
    lineHeight: 1.05,
    color: '#000054',
    margin: '0 auto 32px',
    maxWidth: 880
  }
}, "Get your front desk", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 700
  }
}, "their mornings back.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 18,
    color: '#475569',
    maxWidth: 560,
    margin: '0 auto 36px'
  }
}, "See Sorta running on your actual intake packet in a 15-minute demo. No slides. Just paperwork \u2014 vanishing."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center'
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '16px 32px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 9999,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(39,64,252,0.30)'
  }
}, "Book a demo \u2192"), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '16px 32px',
    background: 'transparent',
    color: '#000054',
    border: '1px solid #e2e8f0',
    borderRadius: 9999,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Try free for 14 days"))), /*#__PURE__*/React.createElement(Footer, null));
window.LandingA = LandingA;
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing-a.jsx", error: String((e && e.message) || e) }); }

// landing-b-mocks.jsx
try { (() => {
// Direction B — "Bold Confidence"
// Blue-dominant, denser layouts, bento grids, abstract data-flow illustrations.

// Abstract illustration: form pages collapsing into a single source of truth
const AbstractFormFlow = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 600 480",
  style: {
    width: '100%',
    height: '100%',
    display: 'block'
  }
}, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
  id: "g1",
  x1: "0",
  y1: "0",
  x2: "1",
  y2: "1"
}, /*#__PURE__*/React.createElement("stop", {
  offset: "0",
  stopColor: "#2740fc"
}), /*#__PURE__*/React.createElement("stop", {
  offset: "1",
  stopColor: "#000054"
})), /*#__PURE__*/React.createElement("linearGradient", {
  id: "g2",
  x1: "0",
  y1: "0",
  x2: "0",
  y2: "1"
}, /*#__PURE__*/React.createElement("stop", {
  offset: "0",
  stopColor: "#ffffff",
  stopOpacity: "0.95"
}), /*#__PURE__*/React.createElement("stop", {
  offset: "1",
  stopColor: "#d1e4ff"
}))), /*#__PURE__*/React.createElement("g", {
  opacity: "0.4"
}, Array.from({
  length: 12
}).map((_, i) => /*#__PURE__*/React.createElement("line", {
  key: 'v' + i,
  x1: i * 50,
  y1: "0",
  x2: i * 50,
  y2: "480",
  stroke: "#99bdff",
  strokeWidth: "0.5"
})), Array.from({
  length: 10
}).map((_, i) => /*#__PURE__*/React.createElement("line", {
  key: 'h' + i,
  x1: "0",
  y1: i * 50,
  x2: "600",
  y2: i * 50,
  stroke: "#99bdff",
  strokeWidth: "0.5"
}))), [0, 1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("g", {
  key: i,
  transform: `translate(${40 + i * 8}, ${60 + i * 16}) rotate(${-12 + i * 2.4})`
}, /*#__PURE__*/React.createElement("rect", {
  width: "160",
  height: "210",
  rx: "4",
  fill: "url(#g2)",
  stroke: "#99bdff",
  strokeWidth: "1"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "18",
  width: "80",
  height: "6",
  rx: "2",
  fill: "#000054"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "34",
  width: "120",
  height: "3",
  rx: "1",
  fill: "#cbd5e1"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "42",
  width: "110",
  height: "3",
  rx: "1",
  fill: "#cbd5e1"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "60",
  width: "60",
  height: "3",
  rx: "1",
  fill: "#94a3b8"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "70",
  width: "130",
  height: "10",
  rx: "2",
  fill: "#f1f5f9"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "92",
  width: "60",
  height: "3",
  rx: "1",
  fill: "#94a3b8"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "102",
  width: "130",
  height: "10",
  rx: "2",
  fill: "#f1f5f9"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "124",
  width: "60",
  height: "3",
  rx: "1",
  fill: "#94a3b8"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "134",
  width: "130",
  height: "10",
  rx: "2",
  fill: "#f1f5f9"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "160",
  width: "40",
  height: "3",
  rx: "1",
  fill: "#94a3b8"
}), /*#__PURE__*/React.createElement("rect", {
  x: "14",
  y: "170",
  width: "130",
  height: "20",
  rx: "2",
  fill: "#f1f5f9"
}))), [0, 1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("path", {
  key: 'arrow' + i,
  d: `M 240 ${60 + i * 35} Q 320 ${100 + i * 20}, 420 220`,
  stroke: "#2740fc",
  strokeWidth: "1.5",
  fill: "none",
  strokeDasharray: "3 3",
  opacity: 0.6 - i * 0.05
})), /*#__PURE__*/React.createElement("g", {
  transform: "translate(360, 160)"
}, /*#__PURE__*/React.createElement("circle", {
  cx: "60",
  cy: "60",
  r: "80",
  fill: "url(#g1)",
  opacity: "0.1"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "60",
  cy: "60",
  r: "60",
  fill: "url(#g1)"
}), /*#__PURE__*/React.createElement("text", {
  x: "60",
  y: "58",
  textAnchor: "middle",
  fill: "#fff",
  fontSize: "14",
  fontWeight: "700",
  fontFamily: "Poppins, sans-serif"
}, "Sorta"), /*#__PURE__*/React.createElement("text", {
  x: "60",
  y: "74",
  textAnchor: "middle",
  fill: "#02e3d3",
  fontSize: "9",
  fontWeight: "700",
  fontFamily: "Poppins, sans-serif",
  letterSpacing: "1.5"
}, "ENGINE"), /*#__PURE__*/React.createElement("circle", {
  cx: "60",
  cy: "60",
  r: "60",
  fill: "none",
  stroke: "#2740fc",
  strokeWidth: "1",
  opacity: "0.4"
}, /*#__PURE__*/React.createElement("animate", {
  attributeName: "r",
  from: "60",
  to: "100",
  dur: "2s",
  repeatCount: "indefinite"
}), /*#__PURE__*/React.createElement("animate", {
  attributeName: "opacity",
  from: "0.4",
  to: "0",
  dur: "2s",
  repeatCount: "indefinite"
}))), /*#__PURE__*/React.createElement("g", {
  transform: "translate(480, 100)"
}, /*#__PURE__*/React.createElement("rect", {
  width: "90",
  height: "260",
  rx: "6",
  fill: "#000054"
}), /*#__PURE__*/React.createElement("rect", {
  x: "10",
  y: "14",
  width: "50",
  height: "4",
  rx: "1",
  fill: "#02e3d3"
}), /*#__PURE__*/React.createElement("rect", {
  x: "10",
  y: "30",
  width: "70",
  height: "2",
  rx: "1",
  fill: "rgba(255,255,255,0.2)"
}), /*#__PURE__*/React.createElement("rect", {
  x: "10",
  y: "36",
  width: "70",
  height: "2",
  rx: "1",
  fill: "rgba(255,255,255,0.2)"
}), Array.from({
  length: 18
}).map((_, i) => /*#__PURE__*/React.createElement("g", {
  key: i
}, /*#__PURE__*/React.createElement("rect", {
  x: "10",
  y: 50 + i * 11,
  width: "70",
  height: "8",
  rx: "1",
  fill: "rgba(2,227,211,0.15)"
}), /*#__PURE__*/React.createElement("text", {
  x: "14",
  y: 56 + i * 11,
  fill: "#02e3d3",
  fontSize: "5",
  fontFamily: "Poppins, sans-serif",
  fontWeight: "600"
}, "p", (i + 1).toString().padStart(2, '0'), " \u2713")))));

// Abstract: time being saved (clock + receding columns)
const AbstractTimeReclaim = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 500 320",
  style: {
    width: '100%',
    height: '100%',
    display: 'block'
  }
}, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
  id: "tg",
  x1: "0",
  y1: "0",
  x2: "0",
  y2: "1"
}, /*#__PURE__*/React.createElement("stop", {
  offset: "0",
  stopColor: "#2740fc"
}), /*#__PURE__*/React.createElement("stop", {
  offset: "1",
  stopColor: "#02e3d3"
}))), /*#__PURE__*/React.createElement("g", {
  transform: "translate(60, 50)"
}, /*#__PURE__*/React.createElement("text", {
  x: "0",
  y: "-12",
  fill: "#94a3b8",
  fontSize: "10",
  fontWeight: "700",
  letterSpacing: "1.5",
  fontFamily: "Poppins, sans-serif"
}, "BEFORE SORTA"), [170, 180, 165, 175, 168, 172, 0].map((h, i) => /*#__PURE__*/React.createElement("rect", {
  key: i,
  x: i * 22,
  y: 200 - h,
  width: "14",
  height: h,
  rx: "2",
  fill: i === 6 ? '#02e3d3' : 'rgba(0,0,84,0.15)'
})), /*#__PURE__*/React.createElement("text", {
  x: "80",
  y: "220",
  fill: "#94a3b8",
  fontSize: "9",
  textAnchor: "middle",
  fontFamily: "Poppins, sans-serif"
}, "Mon \xB7 Tue \xB7 Wed \xB7 Thu \xB7 Fri")), /*#__PURE__*/React.createElement("g", {
  transform: "translate(290, 50)"
}, /*#__PURE__*/React.createElement("text", {
  x: "0",
  y: "-12",
  fill: "#02e3d3",
  fontSize: "10",
  fontWeight: "700",
  letterSpacing: "1.5",
  fontFamily: "Poppins, sans-serif"
}, "WITH SORTA"), [24, 22, 26, 23, 25, 24, 0].map((h, i) => /*#__PURE__*/React.createElement("rect", {
  key: i,
  x: i * 22,
  y: 200 - h,
  width: "14",
  height: h,
  rx: "2",
  fill: i === 6 ? '#02e3d3' : 'url(#tg)'
})), /*#__PURE__*/React.createElement("text", {
  x: "80",
  y: "220",
  fill: "#94a3b8",
  fontSize: "9",
  textAnchor: "middle",
  fontFamily: "Poppins, sans-serif"
}, "Mon \xB7 Tue \xB7 Wed \xB7 Thu \xB7 Fri")), /*#__PURE__*/React.createElement("text", {
  x: "250",
  y: "290",
  textAnchor: "middle",
  fill: "#000054",
  fontSize: "14",
  fontWeight: "700",
  fontFamily: "Poppins, sans-serif"
}, "= 33 hours back \xB7 every week"));

// Abstract: layer diagram
const AbstractLayerStack = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 500 400",
  style: {
    width: '100%',
    height: '100%',
    display: 'block'
  }
}, /*#__PURE__*/React.createElement("g", {
  transform: "translate(80, 280)"
}, /*#__PURE__*/React.createElement("rect", {
  width: "340",
  height: "80",
  rx: "12",
  fill: "#000054"
}), /*#__PURE__*/React.createElement("text", {
  x: "20",
  y: "32",
  fill: "#02e3d3",
  fontSize: "9",
  fontWeight: "700",
  letterSpacing: "1.5",
  fontFamily: "Poppins, sans-serif"
}, "LAYER 01"), /*#__PURE__*/React.createElement("text", {
  x: "20",
  y: "56",
  fill: "#fff",
  fontSize: "18",
  fontWeight: "700",
  fontFamily: "Poppins, sans-serif"
}, "Your existing EHR"), /*#__PURE__*/React.createElement("text", {
  x: "20",
  y: "72",
  fill: "rgba(255,255,255,0.6)",
  fontSize: "10",
  fontFamily: "Poppins, sans-serif"
}, "Epic \xB7 eCW \xB7 Athena \xB7 NextGen \xB7 Practice Fusion \xB7 whatever")), /*#__PURE__*/React.createElement("g", {
  transform: "translate(100, 180)"
}, /*#__PURE__*/React.createElement("rect", {
  width: "300",
  height: "80",
  rx: "12",
  fill: "#fff",
  stroke: "#cbd5e1",
  strokeWidth: "1.5"
}), /*#__PURE__*/React.createElement("text", {
  x: "20",
  y: "32",
  fill: "#94a3b8",
  fontSize: "9",
  fontWeight: "700",
  letterSpacing: "1.5",
  fontFamily: "Poppins, sans-serif"
}, "LAYER 02"), /*#__PURE__*/React.createElement("text", {
  x: "20",
  y: "56",
  fill: "#000054",
  fontSize: "18",
  fontWeight: "700",
  fontFamily: "Poppins, sans-serif"
}, "Your paperwork stack"), /*#__PURE__*/React.createElement("text", {
  x: "20",
  y: "72",
  fill: "#64748b",
  fontSize: "10",
  fontFamily: "Poppins, sans-serif"
}, "Intake \xB7 consent \xB7 screeners \xB7 auth \xB7 ROS \xB7 referrals")), /*#__PURE__*/React.createElement("g", {
  transform: "translate(120, 60)"
}, /*#__PURE__*/React.createElement("rect", {
  width: "260",
  height: "100",
  rx: "12",
  fill: "#2740fc"
}), /*#__PURE__*/React.createElement("rect", {
  width: "260",
  height: "100",
  rx: "12",
  fill: "url(#blueGrad)",
  opacity: "0.4"
}), /*#__PURE__*/React.createElement("text", {
  x: "20",
  y: "32",
  fill: "#02e3d3",
  fontSize: "9",
  fontWeight: "700",
  letterSpacing: "1.5",
  fontFamily: "Poppins, sans-serif"
}, "LAYER 03 \xB7 AUTOMATION"), /*#__PURE__*/React.createElement("text", {
  x: "20",
  y: "62",
  fill: "#fff",
  fontSize: "22",
  fontWeight: "700",
  fontFamily: "Poppins, sans-serif"
}, "Sorta sits on top."), /*#__PURE__*/React.createElement("text", {
  x: "20",
  y: "84",
  fill: "rgba(255,255,255,0.85)",
  fontSize: "11",
  fontFamily: "Poppins, sans-serif"
}, "No migration. No new hardware. $300/mo.")), /*#__PURE__*/React.createElement("path", {
  d: "M 250 160 L 250 180",
  stroke: "#cbd5e1",
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M 250 260 L 250 280",
  stroke: "#cbd5e1",
  strokeWidth: "2"
}), /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
  id: "blueGrad",
  x1: "0",
  y1: "0",
  x2: "1",
  y2: "1"
}, /*#__PURE__*/React.createElement("stop", {
  offset: "0",
  stopColor: "#ffffff",
  stopOpacity: "0.2"
}), /*#__PURE__*/React.createElement("stop", {
  offset: "1",
  stopColor: "#ffffff",
  stopOpacity: "0"
}))));
window.LandingB_Mocks = {
  AbstractFormFlow,
  AbstractTimeReclaim,
  AbstractLayerStack
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing-b-mocks.jsx", error: String((e && e.message) || e) }); }

// landing-b.jsx
try { (() => {
// Direction B — "Bold Confidence"
// Blue-dominant, denser bento layouts, abstract data-flow illustrations.

const {
  AbstractFormFlow,
  AbstractTimeReclaim,
  AbstractLayerStack
} = window.LandingB_Mocks;
const LandingB = () => /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "'Poppins', sans-serif",
    background: '#fdfdfd',
    color: '#000054'
  }
}, /*#__PURE__*/React.createElement(Nav, {
  cta: "Book a demo"
}), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '64px 56px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 1fr',
    gap: 48,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    background: '#000054',
    color: '#02e3d3',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 24,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 6,
    height: 6,
    background: '#02e3d3',
    borderRadius: '50%'
  }
}), "Paperwork automation \xB7 for outpatient clinics"), /*#__PURE__*/React.createElement("h1", {
  style: {
    fontSize: 96,
    fontWeight: 800,
    lineHeight: 0.95,
    letterSpacing: '-0.045em',
    color: '#000054',
    margin: 0,
    marginBottom: 24
  }
}, "Cut paperwork.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#2740fc'
  }
}, "Keep your clinic.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 18,
    lineHeight: 1.5,
    color: '#334155',
    maxWidth: 520,
    marginBottom: 32,
    fontWeight: 400
  }
}, "Sorta is the automation layer that sits on top of your EHR. Front desk enters patient info once. All 18 pages of your intake packet fill themselves."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 24
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '14px 26px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(39,64,252,0.40)'
  }
}, "Book a demo \u2192"), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '14px 26px',
    background: '#fff',
    color: '#000054',
    border: '2px solid #000054',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Try free for 14 days")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 24,
    fontSize: 13,
    color: '#64748b',
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
  style: {
    color: '#000054'
  }
}, "$300/mo"), " flat"), /*#__PURE__*/React.createElement("span", {
  style: {
    width: 4,
    height: 4,
    background: '#cbd5e1',
    borderRadius: '50%'
  }
}), /*#__PURE__*/React.createElement("span", null, "No contracts"), /*#__PURE__*/React.createElement("span", {
  style: {
    width: 4,
    height: 4,
    background: '#cbd5e1',
    borderRadius: '50%'
  }
}), /*#__PURE__*/React.createElement("span", null, "Setup in 48 hours"))), /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'linear-gradient(135deg, #d1e4ff 0%, #ccf9f6 100%)',
    borderRadius: 24,
    padding: 24,
    aspectRatio: '1 / 0.82',
    border: '1px solid #99bdff'
  }
}, /*#__PURE__*/React.createElement(AbstractFormFlow, null)))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '24px 0 64px',
    borderBottom: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '0 56px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24
  }
}, "Trusted by 240+ independent clinics across the US"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 24,
    alignItems: 'center',
    opacity: 0.6
  }
}, ['Mesa Family', 'Sunshine Peds', 'Borderland BH', 'Rio Grande PT', 'NE Allergy', 'Valley Vision', 'Coronado Care', 'Brookline Clinic'].map(c => /*#__PURE__*/React.createElement("div", {
  key: c,
  style: {
    fontSize: 13,
    fontWeight: 700,
    color: '#000054',
    textAlign: 'center',
    letterSpacing: '-0.01em'
  }
}, c))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 48
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 600
  }
}, /*#__PURE__*/React.createElement(Kicker, {
  color: "#2740fc"
}, "By the numbers"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 56,
    fontWeight: 800,
    letterSpacing: '-0.035em',
    lineHeight: 1,
    margin: '12px 0 0',
    color: '#000054'
  }
}, "The clinic math.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 16,
    color: '#475569',
    maxWidth: 360,
    margin: 0
  }
}, "What changes when paperwork stops being the slowest part of your day.")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr 1fr',
    gridTemplateRows: 'auto auto',
    gap: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    gridRow: 'span 2',
    background: '#000054',
    borderRadius: 20,
    padding: '40px 36px',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 380,
    position: 'relative',
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#02e3d3',
    marginBottom: 16
  }
}, "Hours reclaimed"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 140,
    fontWeight: 800,
    lineHeight: 0.9,
    letterSpacing: '-0.05em',
    color: '#fff'
  }
}, "33", /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#02e3d3',
    fontSize: 56
  }
}, "hrs")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4
  }
}, "per front desk \xB7 per week")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 24
  }
}, /*#__PURE__*/React.createElement(AbstractTimeReclaim, null))), /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#2740fc',
    borderRadius: 20,
    padding: '28px 28px',
    color: '#fff'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12
  }
}, "Pages auto-filled"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 96,
    fontWeight: 800,
    lineHeight: 0.9,
    letterSpacing: '-0.045em'
  }
}, "18"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    marginTop: 8,
    color: 'rgba(255,255,255,0.85)'
  }
}, "per intake packet \xB7 zero re-typing")), /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#02e3d3',
    borderRadius: 20,
    padding: '28px 28px',
    color: '#000054'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'rgba(0,0,84,0.6)',
    marginBottom: 12
  }
}, "Setup time"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 96,
    fontWeight: 800,
    lineHeight: 0.9,
    letterSpacing: '-0.045em'
  }
}, "48", /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 40
  }
}, "hrs")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    marginTop: 8,
    color: 'rgba(0,0,84,0.7)'
  }
}, "from contract to first packet")), /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: '28px 28px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8',
    marginBottom: 12
  }
}, "Monthly cost"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 80,
    fontWeight: 800,
    lineHeight: 0.9,
    letterSpacing: '-0.045em',
    color: '#000054'
  }
}, "$300"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    marginTop: 8,
    color: '#475569'
  }
}, "flat \xB7 no per-user \xB7 no per-form")), /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: '28px 28px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8',
    marginBottom: 12
  }
}, "Avg. accuracy"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 80,
    fontWeight: 800,
    lineHeight: 0.9,
    letterSpacing: '-0.045em',
    color: '#000054'
  }
}, "99.7", /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 40,
    color: '#02e3d3'
  }
}, "%")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    marginTop: 8,
    color: '#475569'
  }
}, "field-fill correctness \xB7 human-reviewed")))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 64,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, {
  color: "#2740fc"
}, "How it fits"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 56,
    fontWeight: 800,
    letterSpacing: '-0.035em',
    lineHeight: 1,
    margin: '12px 0 24px',
    color: '#000054'
  }
}, "We are ", /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#2740fc'
  }
}, "not"), " an EHR."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 18,
    lineHeight: 1.55,
    color: '#334155',
    marginBottom: 24
  }
}, "Sorta is a thin automation layer that sits between your patients and your existing software. We don't replace anything. We don't ask you to migrate. We don't sell you a new EHR."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 18,
    lineHeight: 1.55,
    color: '#334155',
    marginBottom: 32
  }
}, "We do one thing: make the paperwork that used to take 30 minutes per patient happen in 60 seconds."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  }
}, [{
  x: '✕',
  l: 'Not an EHR',
  c: '#ef4444'
}, {
  x: '✕',
  l: 'Not scheduling',
  c: '#ef4444'
}, {
  x: '✕',
  l: 'Not billing',
  c: '#ef4444'
}, {
  x: '✕',
  l: 'Not a migration',
  c: '#ef4444'
}, {
  x: '✓',
  l: 'Yes — paperwork',
  c: '#02e3d3'
}, {
  x: '✓',
  l: 'Yes — on top of yours',
  c: '#02e3d3'
}].map(p => /*#__PURE__*/React.createElement("div", {
  key: p.l,
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    background: '#fff'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: p.c,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700
  }
}, p.x), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    fontWeight: 600,
    color: '#000054'
  }
}, p.l))))), /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
    borderRadius: 20,
    padding: 32,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement(AbstractLayerStack, null)))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    marginBottom: 48
  }
}, /*#__PURE__*/React.createElement(Kicker, {
  color: "#2740fc"
}, "Three steps. Done."), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 56,
    fontWeight: 800,
    letterSpacing: '-0.035em',
    lineHeight: 1,
    margin: '12px 0 0',
    color: '#000054',
    maxWidth: 720
  }
}, "Upload. Enter. Done.")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16
  }
}, [{
  num: '01',
  t: 'Upload your forms',
  d: 'Drop your existing PDF intake packets, consent forms, screeners. We map every field. Human-reviewed before go-live.',
  chips: ['PDF', 'Word', 'Scans', 'E-sign', 'Any layout'],
  c: '#2740fc'
}, {
  num: '02',
  t: 'Front desk enters once',
  d: 'Sixty seconds at intake. Name, DOB, insurance. Sorta fans those fields out to every form in your packet.',
  chips: ['42 fields', 'Insurance lookup', 'Patient sig', 'Auto-sync'],
  c: '#000054'
}, {
  num: '03',
  t: 'Packet exports clean',
  d: 'Pixel-identical PDF, ready to print, e-sign, or upload into your EHR. Same forms your compliance officer already approved.',
  chips: ['Pixel-identical', 'E-sign', 'EHR upload', 'Fax'],
  c: '#02e3d3'
}].map((f, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    background: f.c,
    color: f.c === '#02e3d3' ? '#000054' : '#fff',
    borderRadius: 20,
    padding: 32,
    minHeight: 360,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 80,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    lineHeight: 1,
    opacity: f.c === '#02e3d3' ? 0.3 : 0.25,
    marginBottom: 24
  }
}, f.num), /*#__PURE__*/React.createElement("h3", {
  style: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    margin: '0 0 16px',
    lineHeight: 1.15
  }
}, f.t), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 15,
    lineHeight: 1.55,
    margin: 0,
    opacity: 0.85
  }
}, f.d)), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 24
  }
}, f.chips.map(c => /*#__PURE__*/React.createElement("span", {
  key: c,
  style: {
    fontSize: 11,
    fontWeight: 600,
    padding: '5px 10px',
    background: f.c === '#02e3d3' ? 'rgba(0,0,84,0.1)' : 'rgba(255,255,255,0.15)',
    borderRadius: 9999
  }
}, c))))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#000054',
    borderRadius: 24,
    padding: '64px 56px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 48,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: 32,
    right: 56,
    fontSize: 240,
    lineHeight: 0.7,
    color: 'rgba(2,227,211,0.1)',
    fontWeight: 800
  }
}, "\""), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative'
  }
}, /*#__PURE__*/React.createElement(Kicker, {
  color: "#02e3d3"
}, "Customer story"), /*#__PURE__*/React.createElement("blockquote", {
  style: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    color: '#fff',
    margin: '20px 0 32px'
  }
}, "\"We canceled ", /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#02e3d3'
  }
}, "two staff temp contracts"), " the week after we turned Sorta on. The math is so obvious it feels like cheating.\""), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 16,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #02e3d3, #2886f9)'
  }
}), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff'
  }
}, "Dr. Anand Krishnamurthy"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)'
  }
}, "Owner \xB7 Sunshine Pediatrics \xB7 Albuquerque, NM")))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  }
}, [{
  n: '$8.4k',
  l: 'monthly savings · 30 days in'
}, {
  n: '4.2 hrs',
  l: 'avg. time saved per provider · per day'
}, {
  n: '0',
  l: 'paper packets stockpiled in the back'
}, {
  n: '14 days',
  l: 'from kickoff to full rollout'
}].map(s => /*#__PURE__*/React.createElement("div", {
  key: s.l,
  style: {
    padding: 20,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 28,
    fontWeight: 800,
    color: '#02e3d3',
    letterSpacing: '-0.02em'
  }
}, s.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4
  }
}, s.l)))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: 64,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, {
  color: "#2740fc"
}, "Integrates with"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 48,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1,
    margin: '12px 0 16px',
    color: '#000054'
  }
}, "Your EHR.", /*#__PURE__*/React.createElement("br", null), "Whatever it is."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 1.5
  }
}, "Sorta is a layer, not a replacement. If you can export a PDF or send a fax, Sorta works with you.")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 12
  }
}, ['Epic', 'eCW', 'Athena', 'NextGen', 'Practice Fusion', 'Kareo', 'DrChrono', 'Greenway', 'Allscripts', 'AdvancedMD', 'CharmHealth', 'Tebra', 'Carecloud', 'Modernizing Med', '+ any PDF'].map((p, i) => /*#__PURE__*/React.createElement("div", {
  key: p,
  style: {
    padding: '20px 12px',
    border: i === 14 ? '1px solid #2740fc' : '1px solid #e2e8f0',
    borderRadius: 12,
    background: i === 14 ? '#d1e4ff' : '#fff',
    fontSize: 13,
    fontWeight: 700,
    color: i === 14 ? '#2740fc' : '#000054',
    textAlign: 'center'
  }
}, p))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 56px 120px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: 32
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'linear-gradient(135deg, #2740fc 0%, #000054 100%)',
    color: '#fff',
    borderRadius: 24,
    padding: '56px 48px',
    position: 'relative',
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement(Kicker, {
  color: "#02e3d3"
}, "Pricing"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 72,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    lineHeight: 1,
    margin: '12px 0 20px'
  }
}, "$300", /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 32,
    fontWeight: 500,
    opacity: 0.7
  }
}, "/month")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    maxWidth: 420,
    marginBottom: 32
  }
}, "Flat. No per-user fees. No per-form fees. No setup costs. No annual contracts. Month-to-month, cancel any time."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '14px 28px',
    background: '#fff',
    color: '#000054',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Book a demo \u2192"), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '14px 28px',
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Try free for 14 days"))), /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 24,
    padding: '40px 36px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8',
    marginBottom: 20
  }
}, "Everything included"), ['Unlimited patients', 'Unlimited form templates', 'Unlimited users · no per-seat fees', 'HIPAA-compliant infrastructure', 'Signed BAA', 'Same-day setup support', 'Human-reviewed form mapping', 'EHR & fax integrations'].map(f => /*#__PURE__*/React.createElement("div", {
  key: f,
  style: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#ccf9f6',
    color: '#02e3d3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700
  }
}, "\u2713"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    color: '#000054',
    fontWeight: 500
  }
}, f)))))), /*#__PURE__*/React.createElement(Footer, {
  tone: "dark"
}));
window.LandingB = LandingB;
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing-b.jsx", error: String((e && e.message) || e) }); }

// landing-c.jsx
try { (() => {
// Direction C — "Warm Welcome"
// Friendly, conversational tone. Photography-led (photo placeholders).
// Softer pastel backgrounds, more storytelling and human focus.
// Medium density.

const LandingC = () => /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "'Poppins', sans-serif",
    background: '#fefdfb',
    color: '#000054'
  }
}, /*#__PURE__*/React.createElement(Nav, {
  cta: "See it in action"
}), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 56px 64px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.1fr',
    gap: 56,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 16px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 9999,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 28,
    color: '#475569',
    boxShadow: '0 1px 3px rgba(0,0,84,0.04)'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 16
  }
}, "\uD83D\uDC4B"), /*#__PURE__*/React.createElement("span", null, "Hi, we're a small team from El Paso.")), /*#__PURE__*/React.createElement("h1", {
  style: {
    fontSize: 64,
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: '-0.03em',
    color: '#000054',
    margin: 0,
    marginBottom: 28
  }
}, "Cut paperwork.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300,
    color: '#2740fc'
  }
}, "Keep your clinic.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 19,
    lineHeight: 1.6,
    color: '#475569',
    maxWidth: 480,
    marginBottom: 36
  }
}, "We built Sorta because Emiliano spent four years as a PCT watching the front desk re-type the same patient info onto eighteen different forms. So we made the forms fill themselves. Your EHR doesn't change. The job just gets easier."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12,
    marginBottom: 28
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(39,64,252,0.30)'
  }
}, "Book a demo \u2192"), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: '#fff',
    color: '#000054',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Try free for 14 days")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    fontSize: 13,
    color: '#64748b'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex'
  }
}, ['#2740fc', '#02e3d3', '#99bdff', '#ccf9f6'].map((c, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: c,
    border: '2px solid #fff',
    marginLeft: i === 0 ? 0 : -8,
    boxShadow: '0 1px 2px rgba(0,0,84,0.1)'
  }
}))), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
  style: {
    color: '#000054'
  }
}, "240+ clinics"), " \xB7 independents like yours"))), /*#__PURE__*/React.createElement(PhotoPlaceholder, {
  label: "Front desk staff smiling at a patient \u2014 calm clinic lobby, morning light",
  h: 520,
  tone: "warm"
}))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '64px 56px',
    background: '#fff7ed'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 1080,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: 56,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement(PhotoPlaceholder, {
  label: "Emiliano at his laptop in a clinic break room",
  h: 360,
  tone: "warm"
}), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, {
  color: "#c2410c"
}, "Why we built this"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 36,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    margin: '14px 0 20px',
    color: '#000054'
  }
}, "\"I watched Maria, our front desk, come in 45 minutes early every day just to keep up.\""), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 16,
    lineHeight: 1.65,
    color: '#475569',
    marginBottom: 16
  }
}, "Sorta started in a clinic in El Paso, where our founder Emiliano was working as a Patient Care Tech while finishing his CS degree at UTEP. He kept hearing the same story \u2014 paperwork was the slowest, most expensive part of every workday."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 16,
    lineHeight: 1.65,
    color: '#475569'
  }
}, "So he built the tool he wished existed. We're bootstrapped, independent, and exclusively focused on independent clinics like ours.")))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '96px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'center',
    marginBottom: 56
  }
}, /*#__PURE__*/React.createElement(Kicker, null, "What changes"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 44,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: '14px auto 0',
    maxWidth: 720,
    color: '#000054'
  }
}, "A clinic with Sorta runs differently.")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20
  }
}, [{
  num: '33',
  unit: 'hrs/wk',
  label: 'Your front desk gets that morning prep time back. Some clinics use it to add a 15-minute morning huddle. Others just let people go home on time.',
  tone: 'mint'
}, {
  num: '18',
  unit: 'pages → 1 min',
  label: 'A complete intake packet — from patient demographics to HIPAA consent to insurance auth — filled and ready in about as long as it takes to scan an ID.',
  tone: 'cool'
}, {
  num: '$300',
  unit: '/mo flat',
  label: 'Less than what most clinics pay for one shift of temp coverage. No per-user fees. No contracts. Cancel any time.',
  tone: 'blue'
}].map((s, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    background: '#fff',
    border: '1px solid #f1f5f9',
    borderRadius: 24,
    padding: 32,
    position: 'relative',
    boxShadow: '0 2px 16px rgba(0,0,84,0.04)'
  }
}, /*#__PURE__*/React.createElement(PhotoPlaceholder, {
  label: ['Two coworkers chatting on a coffee break', 'Filled intake packet on a clipboard', 'Owner reviewing a single-page invoice'][i],
  h: 180,
  tone: s.tone
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    margin: '24px 0 12px'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 64,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: '#000054',
    lineHeight: 1
  }
}, s.num), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 15,
    fontWeight: 500,
    color: '#64748b'
  }
}, s.unit)), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 1.55,
    margin: 0
  }
}, s.label))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '64px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 64,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement(PhotoPlaceholder, {
  label: "Manila folder of intake PDFs being scanned on a desktop",
  h: 420,
  tone: "cool"
}), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, null, "Step 01"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: '14px 0 20px',
    color: '#000054'
  }
}, "Keep your forms.", /*#__PURE__*/React.createElement("br", null), "Send us your packet."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    lineHeight: 1.65,
    color: '#475569',
    marginBottom: 24
  }
}, "You don't have to rebuild a thing. Send us the intake packet your clinic already uses \u2014 even if it's a stack of scanned PDFs from 2003. We'll map every field and have it running on your account within 48 hours."), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 20,
    background: '#ccf9f6',
    borderRadius: 14,
    borderLeft: '4px solid #02e3d3',
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 22,
    lineHeight: 1
  }
}, "\uD83E\uDD1D"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    fontWeight: 700,
    color: '#065f46',
    marginBottom: 4
  }
}, "A real human reviews every form."), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#065f46',
    lineHeight: 1.55
  }
}, "Before your packet goes live, someone on our team double-checks the field mapping. No surprises on day one.")))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '64px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 64,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, null, "Step 02"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: '14px 0 20px',
    color: '#000054'
  }
}, "Your front desk types", /*#__PURE__*/React.createElement("br", null), "patient info \u2014 once."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    lineHeight: 1.65,
    color: '#475569',
    marginBottom: 24
  }
}, "Sixty seconds. Name, date of birth, insurance card, demographics. Sorta fans those fields out to every form in your packet \u2014 so \"Patient Name\" on page 1 magically appears on every page where Patient Name needs to be."), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 20,
    background: '#d1e4ff',
    borderRadius: 14,
    borderLeft: '4px solid #2740fc',
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 22,
    lineHeight: 1
  }
}, "\u2728"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    fontWeight: 700,
    color: '#000054',
    marginBottom: 4
  }
}, "It feels like cheating, and it's supposed to."), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#000054',
    lineHeight: 1.55,
    opacity: 0.75
  }
}, "One source of truth. Edit anywhere, syncs everywhere. Insurance lookup pre-fills carrier ID from a photo of the card.")))), /*#__PURE__*/React.createElement(PhotoPlaceholder, {
  label: "Front desk laptop screen showing a tidy patient form being filled",
  h: 420,
  tone: "cool"
}))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '64px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 64,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement(PhotoPlaceholder, {
  label: "Printed intake packet, neatly stapled on a clinic counter",
  h: 420,
  tone: "mint"
}), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, null, "Step 03"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 40,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: '14px 0 20px',
    color: '#000054'
  }
}, "A patient walks in.", /*#__PURE__*/React.createElement("br", null), "The packet's ready."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    lineHeight: 1.65,
    color: '#475569',
    marginBottom: 24
  }
}, "Sorta exports a complete PDF packet \u2014 same forms, same fonts, same look \u2014 pre-filled and ready to print, e-sign, or drop into your EHR. Your patient signs once on a tablet, and that signature replicates everywhere it needs to be."), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 20,
    background: '#fff7ed',
    borderRadius: 14,
    borderLeft: '4px solid #f59e0b',
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 22,
    lineHeight: 1
  }
}, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    fontWeight: 700,
    color: '#7c2d12',
    marginBottom: 4
  }
}, "Looks identical to what you use today."), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#7c2d12',
    lineHeight: 1.55,
    opacity: 0.85
  }
}, "Nothing for your compliance officer to re-approve. The output is pixel-identical to the originals you sent us.")))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '96px 56px',
    background: 'linear-gradient(135deg, #fff7ed 0%, #ffe8d1 100%)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 1080,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '0.9fr 1.4fr',
    gap: 64,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement(PhotoPlaceholder, {
  label: "Dr. Linda Castaneda at the front of her practice \u2014 Mesa Family Medicine",
  h: 460,
  tone: "warm"
}), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Kicker, {
  color: "#c2410c"
}, "A note from one of our clinics"), /*#__PURE__*/React.createElement("blockquote", {
  style: {
    fontSize: 28,
    fontWeight: 500,
    lineHeight: 1.35,
    letterSpacing: '-0.015em',
    color: '#000054',
    margin: '20px 0 32px'
  }
}, "\"Our front desk used to come in 45 minutes early just to prep packets. Now they show up at 8, and we start seeing patients at 8.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 700
  }
}, "It's the cheapest, fastest decision I've made for the clinic in years."), "\""), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 16,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 17,
    fontWeight: 700,
    color: '#000054'
  }
}, "Dr. Linda Castaneda"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    color: '#475569'
  }
}, "Owner \xB7 Mesa Family Medicine \xB7 El Paso, TX"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 2,
    marginTop: 8
  }
}, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("span", {
  key: i,
  style: {
    color: '#f59e0b',
    fontSize: 16
  }
}, "\u2605")))))))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '96px 56px',
    maxWidth: 1280,
    margin: '0 auto',
    textAlign: 'center'
  }
}, /*#__PURE__*/React.createElement(Kicker, null, "Plays well with"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: '14px auto 16px',
    maxWidth: 720,
    color: '#000054'
  }
}, "Your EHR. ", /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300
  }
}, "Whatever it happens to be.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    color: '#475569',
    maxWidth: 540,
    margin: '0 auto 48px'
  }
}, "We don't ask you to migrate. We work on top of what you already use."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14
  }
}, ['Epic', 'eClinical Works', 'Athena', 'NextGen', 'Practice Fusion', 'Kareo', 'DrChrono', 'Greenway', 'Allscripts', 'AdvancedMD', 'CharmHealth', '+ any PDF'].map((p, i) => /*#__PURE__*/React.createElement("div", {
  key: p,
  style: {
    padding: '24px 16px',
    border: '1px solid #f1f5f9',
    borderRadius: 16,
    background: '#fff',
    fontSize: 14,
    fontWeight: 600,
    color: i === 11 ? '#2740fc' : '#000054',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,84,0.04)'
  }
}, p)))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '64px 56px',
    maxWidth: 980,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'center',
    marginBottom: 48
  }
}, /*#__PURE__*/React.createElement(Kicker, null, "The honest answers"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: '14px auto 0',
    maxWidth: 720,
    color: '#000054'
  }
}, "What clinic owners actually ask us.")), [{
  q: 'Will this work with our EHR?',
  a: 'Almost certainly yes. If your EHR can accept a PDF upload or your fax line takes a packet, Sorta works. We don\u2019t require an API integration.'
}, {
  q: 'How long does setup take?',
  a: 'About 48 hours from when you send us your intake packet. We map every field, a human reviews it, and your account goes live.'
}, {
  q: 'Is patient data secure?',
  a: 'Yes. HIPAA-compliant from day one. Encrypted at rest and in transit. Signed BAA with every clinic. PHI is region-locked to the US. SOC 2 Type II in progress.'
}, {
  q: 'What happens if we want to cancel?',
  a: 'You cancel. There are no contracts. Month-to-month, $300 flat. You can export all your data on the way out.'
}].map((f, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    padding: '24px 28px',
    borderBottom: '1px solid #f1f5f9',
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: 32
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 18,
    fontWeight: 700,
    color: '#000054',
    letterSpacing: '-0.01em'
  }
}, f.q), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 1.65
  }
}, f.a)))), /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '0 56px 120px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'linear-gradient(135deg, #d1e4ff 0%, #e8fbf8 55%, #ccf9f6 100%)',
    borderRadius: 32,
    padding: '80px 64px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement(Kicker, {
  color: "#000054"
}, "Let's talk"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 52,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
    color: '#000054',
    margin: '14px auto 24px',
    maxWidth: 760
  }
}, "Want to see Sorta running on", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300
  }
}, "your actual intake packet?")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 18,
    color: '#475569',
    maxWidth: 580,
    margin: '0 auto 36px',
    lineHeight: 1.6
  }
}, "Send us your forms. We'll have a working demo back to you in two business days. No slides. No sales call. Just paperwork \u2014 vanishing."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '16px 32px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(39,64,252,0.30)'
  }
}, "Book a demo \u2192"), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '16px 32px',
    background: '#fff',
    color: '#000054',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Try free for 14 days")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: '#64748b'
  }
}, "Or just email ", /*#__PURE__*/React.createElement("strong", {
  style: {
    color: '#000054'
  }
}, "hi@getsorta.io"), " \u2014 we read everything."))), /*#__PURE__*/React.createElement(Footer, null));
window.LandingC = LandingC;
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing-c.jsx", error: String((e && e.message) || e) }); }

// landing-shared.jsx
try { (() => {
// Shared building blocks for the three landing-page directions.
// All components are exported to window so each direction file can use them.

const SortaLogo = ({
  size = 28,
  color = '#000054'
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 64 64",
  fill: "none"
}, /*#__PURE__*/React.createElement("path", {
  d: "M14 18 C14 12, 20 8, 28 8 L46 8 C52 8, 56 12, 56 18 L56 22 L40 22 L40 18 L24 18 Z",
  fill: "#66bdff"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8 32 C8 26, 14 22, 22 22 L46 22 C50 22, 54 24, 54 28 L54 36 L38 36 L38 32 L22 32 L22 36 L14 36 Z",
  fill: "#2886f9"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8 46 C8 40, 14 36, 22 36 L42 36 C48 36, 54 40, 54 46 L54 50 C54 56, 48 60, 40 60 L22 60 C16 60, 8 56, 8 50 Z M22 46 L40 46 L40 50 L22 50 Z",
  fill: "#2740fc"
}), /*#__PURE__*/React.createElement("path", {
  d: "M30 30 L36 26 L36 34 Z",
  fill: "#ffffff"
})), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 22,
    fontWeight: 700,
    color,
    letterSpacing: '-0.02em'
  }
}, "Sorta"));

// ---------- Nav ----------
const Nav = ({
  variant = 'light',
  cta = 'Book a demo'
}) => {
  const dark = variant === 'dark';
  const bg = dark ? 'rgba(0,0,84,0.85)' : 'rgba(253,253,253,0.92)';
  const textColor = dark ? '#ffffff' : '#000054';
  const linkColor = dark ? 'rgba(255,255,255,0.7)' : '#64748b';
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 10,
      padding: '18px 56px',
      background: bg,
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(SortaLogo, {
    color: textColor
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 36,
      alignItems: 'center'
    }
  }, ['Product', 'For clinics', 'Pricing', 'About'].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      color: linkColor,
      fontSize: 14,
      fontWeight: 500,
      textDecoration: 'none'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: linkColor,
      fontSize: 14,
      fontWeight: 500,
      textDecoration: 'none'
    }
  }, "Sign in"), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '10px 20px',
      borderRadius: 9999,
      background: '#2740fc',
      color: '#fff',
      border: 'none',
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(39,64,252,0.30)'
    }
  }, cta, " \u2192")));
};

// ---------- Footer ----------
const Footer = ({
  tone = 'light'
}) => {
  const dark = tone === 'dark';
  const bg = dark ? '#000054' : '#fdfdfd';
  const fg = dark ? '#ffffff' : '#000054';
  const muted = dark ? 'rgba(255,255,255,0.5)' : '#64748b';
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: bg,
      color: fg,
      padding: '72px 56px 36px',
      borderTop: dark ? 'none' : '1px solid #e2e8f0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
      gap: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SortaLogo, {
    color: fg
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 16,
      color: muted,
      fontSize: 14,
      lineHeight: 1.6,
      maxWidth: 320
    }
  }, "The paperwork automation layer for independent outpatient clinics. Bootstrapped from El Paso, TX.")), [{
    h: 'Product',
    items: ['How it works', 'Templates', 'Security', 'Roadmap']
  }, {
    h: 'For clinics',
    items: ['Primary care', 'Pediatrics', 'Behavioral health', 'Specialty']
  }, {
    h: 'Company',
    items: ['About', 'Careers', 'Press', 'Contact']
  }, {
    h: 'Resources',
    items: ['Help center', 'API docs', 'Blog', 'Status']
  }].map(g => /*#__PURE__*/React.createElement("div", {
    key: g.h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 16,
      color: muted
    }
  }, g.h), g.items.map(i => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    style: {
      display: 'block',
      color: fg,
      fontSize: 14,
      fontWeight: 400,
      textDecoration: 'none',
      marginBottom: 10,
      opacity: 0.85
    }
  }, i))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
      marginTop: 56,
      paddingTop: 24,
      display: 'flex',
      justifyContent: 'space-between',
      color: muted,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Sorta, Inc. All rights reserved."), /*#__PURE__*/React.createElement("span", null, "HIPAA-compliant \xB7 SOC 2 Type II in progress \xB7 Built in El Paso, TX")));
};

// ---------- Kicker ----------
const Kicker = ({
  children,
  color = '#02e3d3'
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color
  }
}, children);

// ---------- Photo placeholder ----------
// A labeled gradient block, for "mid-fi" mockups where real photography would go.
const PhotoPlaceholder = ({
  label,
  w = '100%',
  h = 320,
  tone = 'cool'
}) => {
  const tones = {
    cool: 'linear-gradient(135deg, #d1e4ff 0%, #e8fbf8 55%, #ccf9f6 100%)',
    blue: 'linear-gradient(135deg, #99bdff 0%, #c7e7ff 100%)',
    navy: 'linear-gradient(135deg, #000054 0%, #2740fc 100%)',
    warm: 'linear-gradient(135deg, #ffe8d1 0%, #ffd1d1 100%)',
    mint: 'linear-gradient(135deg, #ccf9f6 0%, #c7e7ff 100%)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: w,
      height: h,
      borderRadius: 16,
      background: tones[tone] || tones.cool,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.6) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(2,227,211,0.3) 0%, transparent 50%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      padding: '8px 14px',
      background: 'rgba(255,255,255,0.85)',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      color: '#000054',
      letterSpacing: '0.02em',
      backdropFilter: 'blur(4px)'
    }
  }, "\uD83D\uDCF7 ", label));
};
Object.assign(window, {
  SortaLogo,
  Nav,
  Footer,
  Kicker,
  PhotoPlaceholder
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "landing-shared.jsx", error: String((e && e.message) || e) }); }

// medonix-mocks.jsx
try { (() => {
// Sorta product mockups for the Medonix-style landing page.
// Stylized UI screenshots used in hero, steps, benefits, etc.

// ----------------- HERO MOCKS -----------------

// Main hero workspace card (right side, large)
const HeroWorkspace = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    boxShadow: '0 30px 80px -20px rgba(0,0,84,0.20), 0 12px 24px -8px rgba(0,0,84,0.08)',
    width: '100%'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '14px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fff'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 5
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#e2e8f0'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#e2e8f0'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#e2e8f0'
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 500
  }
}, "app.getsorta.io \xB7 Workspace")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '4px 10px',
    background: '#ccf9f6',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 600,
    color: '#065f46',
    display: 'flex',
    alignItems: 'center',
    gap: 5
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 6,
    height: 6,
    background: '#02e3d3',
    borderRadius: '50%'
  }
}), "Live"), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2740fc, #02e3d3)'
  }
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    minHeight: 360
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fafbfc',
    borderRight: '1px solid #e2e8f0',
    padding: '16px 12px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '0 8px 10px'
  }
}, "Patients"), [{
  n: 'Maria Hernandez',
  s: 'Active · 42/42',
  a: true
}, {
  n: 'James O\u2019Connor',
  s: '12 forms ready'
}, {
  n: 'Aaliyah Patel',
  s: 'Awaiting signature'
}, {
  n: 'Daniel Schmidt',
  s: 'New · started 9:42'
}, {
  n: 'Sofia Reyes',
  s: 'Synced · 8:01'
}].map(p => /*#__PURE__*/React.createElement("div", {
  key: p.n,
  style: {
    padding: '10px 10px',
    borderRadius: 8,
    marginBottom: 4,
    background: p.a ? '#d1e4ff' : 'transparent',
    border: p.a ? '1px solid rgba(39,64,252,0.2)' : '1px solid transparent'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    color: '#000054'
  }
}, p.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  }
}, p.s)))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '20px 24px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }
}, "Active patient"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 18,
    fontWeight: 700,
    color: '#000054',
    marginTop: 4
  }
}, "Maria Hernandez"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  }
}, "DOB 04/12/82 \xB7 Mesa Family Medicine \xB7 9:14 AM")), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '7px 14px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit'
  }
}, "Export packet \u2192")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 14
  }
}, [{
  l: 'Legal name',
  v: 'Maria Hernandez'
}, {
  l: 'Date of birth',
  v: '04 / 12 / 1982'
}, {
  l: 'Phone',
  v: '(915) 555-0142'
}, {
  l: 'Insurance',
  v: 'BCBS Texas'
}, {
  l: 'Member ID',
  v: 'BCB-9384-21X'
}, {
  l: 'Primary care MD',
  v: 'Dr. L. Castaneda'
}].map(f => /*#__PURE__*/React.createElement("div", {
  key: f.l,
  style: {
    padding: '8px 10px',
    border: '1px solid #02e3d3',
    background: 'rgba(2,227,211,0.04)',
    borderRadius: 6
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 9,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }
}, f.l), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#000054',
    fontWeight: 500,
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 2
  }
}, f.v, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#02e3d3'
  }
}, "\u2713"))))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 12,
    background: '#fafbfc',
    borderRadius: 10,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 600,
    color: '#000054'
  }
}, "Filling intake packet"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#02e3d3',
    fontWeight: 700
  }
}, "16 of 18 pages")), /*#__PURE__*/React.createElement("div", {
  style: {
    height: 6,
    background: '#e2e8f0',
    borderRadius: 9999,
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: '89%',
    height: '100%',
    background: 'linear-gradient(90deg, #2740fc, #02e3d3)',
    borderRadius: 9999
  }
}))))));

// Floating mini card (calendar-style notification)
const HeroFloater = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 16,
    padding: '14px 16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 40px -10px rgba(0,0,84,0.18)',
    width: 240
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#ccf9f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18
  }
}, "\u2713"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 700,
    color: '#000054'
  }
}, "Packet ready"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  }
}, "18 pages \xB7 0 errors \xB7 47s"))), /*#__PURE__*/React.createElement("div", {
  style: {
    borderTop: '1px solid #f1f5f9',
    marginTop: 12,
    paddingTop: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex'
  }
}, ['#2740fc', '#02e3d3', '#99bdff'].map((c, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: c,
    border: '2px solid #fff',
    marginLeft: i === 0 ? 0 : -6
  }
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b'
  }
}, "3 staff synced")));

// Small stat floater
const HeroStatChip = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#000054',
    borderRadius: 14,
    padding: '14px 18px',
    boxShadow: '0 20px 40px -10px rgba(0,0,84,0.30)',
    color: '#fff',
    width: 200
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6
  }
}, "Time saved \xB7 this week"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1
  }
}, "33", /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 16,
    opacity: 0.6
  }
}, "hrs")), /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 120 24",
  style: {
    width: '100%',
    height: 20,
    marginTop: 8
  }
}, /*#__PURE__*/React.createElement("polyline", {
  points: "0,18 15,14 30,16 45,8 60,10 75,4 90,6 105,2 120,3",
  stroke: "#02e3d3",
  strokeWidth: "1.5",
  fill: "none"
}), /*#__PURE__*/React.createElement("polyline", {
  points: "0,18 15,14 30,16 45,8 60,10 75,4 90,6 105,2 120,3 120,24 0,24",
  fill: "rgba(2,227,211,0.2)"
})));

// ----------------- STEP MOCKS -----------------

const StepMockUpload = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px -20px rgba(0,0,84,0.15)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '36px 24px',
    textAlign: 'center',
    borderRadius: 14,
    border: '2px dashed #99bdff',
    background: 'linear-gradient(135deg, rgba(209,228,255,0.4), rgba(204,249,246,0.4))',
    marginBottom: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: '#2740fc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    margin: '0 auto 12px'
  }
}, "\u2191"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 16,
    fontWeight: 700,
    color: '#000054'
  }
}, "Drop your PDF intake forms"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  }
}, "Drag and drop or click to browse")), [{
  n: 'New_Patient_Intake.pdf',
  s: '18 pages · 42 fields mapped',
  p: 100
}, {
  n: 'HIPAA_Consent.pdf',
  s: '4 pages · 12 fields mapped',
  p: 100
}, {
  n: 'Insurance_Auth.pdf',
  s: 'Mapping fields…',
  p: 64
}].map(t => /*#__PURE__*/React.createElement("div", {
  key: t.n,
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#fafbfc',
    borderRadius: 10,
    marginBottom: 6,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#d1e4ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12
  }
}, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    color: '#000054'
  }
}, t.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2
  }
}, t.s), /*#__PURE__*/React.createElement("div", {
  style: {
    height: 3,
    background: '#e2e8f0',
    borderRadius: 9999,
    marginTop: 6,
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: `${t.p}%`,
    height: '100%',
    background: t.p === 100 ? '#02e3d3' : '#2740fc',
    borderRadius: 9999
  }
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: t.p === 100 ? '#02e3d3' : '#2740fc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700
  }
}, t.p === 100 ? '✓' : '⟳'))));
const StepMockEntry = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px -20px rgba(0,0,84,0.15)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }
}, "New patient \xB7 60-second intake"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 18,
    fontWeight: 700,
    color: '#000054',
    marginTop: 4
  }
}, "Daniel Schmidt")), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '4px 10px',
    background: '#ccf9f6',
    color: '#065f46',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 700
  }
}, "Auto-syncing 42 fields")), [{
  l: 'Legal name',
  v: 'Daniel Schmidt',
  done: true
}, {
  l: 'Date of birth',
  v: '02 / 14 / 1978',
  done: true
}, {
  l: 'Phone',
  v: '(915) 555-0188',
  done: true
}, {
  l: 'Insurance carrier',
  v: 'Aetna PPO',
  active: true
}, {
  l: 'Member ID',
  v: '',
  placeholder: 'Type or scan card'
}].map((f, i) => /*#__PURE__*/React.createElement("div", {
  key: f.l,
  style: {
    marginBottom: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4
  }
}, f.l), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '10px 12px',
    border: `1px solid ${f.active ? '#2740fc' : '#e2e8f0'}`,
    borderRadius: 8,
    background: '#fff',
    fontSize: 13,
    color: f.v ? '#000054' : '#94a3b8',
    fontWeight: 500,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: f.active ? '0 0 0 3px rgba(39,64,252,0.15)' : 'none'
  }
}, /*#__PURE__*/React.createElement("span", null, f.v || f.placeholder), f.done && /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#02e3d3',
    fontWeight: 700
  }
}, "\u2713"), f.active && /*#__PURE__*/React.createElement("span", {
  style: {
    width: 1.5,
    height: 14,
    background: '#2740fc'
  }
})))), /*#__PURE__*/React.createElement("button", {
  style: {
    width: '100%',
    padding: 12,
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    marginTop: 6,
    boxShadow: '0 2px 8px rgba(39,64,252,0.3)'
  }
}, "Continue \u2014 auto-fill 18 pages \u2192"));
const StepMockExport = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 20,
    padding: 20,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px -20px rgba(0,0,84,0.15)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: '#000054'
  }
}, "Intake_Packet_Hernandez.pdf"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 600,
    color: '#02e3d3'
  }
}, "Page 3 of 18 \u25BE")), /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fafbfc',
    borderRadius: 10,
    padding: 16,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: '#000054',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: '0.05em'
  }
}, "PATIENT MEDICAL HISTORY"), [{
  l: 'Patient Name',
  v: 'Maria Hernandez'
}, {
  l: 'Date of Birth',
  v: '04/12/1982'
}, {
  l: 'Address',
  v: '4827 Mesa View Dr, El Paso, TX 79912'
}, {
  l: 'Allergies',
  v: 'Penicillin (mild)'
}, {
  l: 'Current Meds',
  v: 'Lisinopril 10mg, Metformin 500mg'
}, {
  l: 'Emergency Contact',
  v: 'Carlos Hernandez (spouse)'
}].map(r => /*#__PURE__*/React.createElement("div", {
  key: r.l,
  style: {
    marginBottom: 8,
    fontSize: 9
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#94a3b8'
  }
}, r.l, ": "), /*#__PURE__*/React.createElement("span", {
  style: {
    background: 'rgba(2,227,211,0.18)',
    padding: '1px 6px',
    borderRadius: 3,
    color: '#065f46',
    fontWeight: 600
  }
}, r.v))), /*#__PURE__*/React.createElement("div", {
  style: {
    borderTop: '1px solid #e2e8f0',
    margin: '12px 0',
    paddingTop: 10,
    fontSize: 8,
    color: '#94a3b8'
  }
}, "Signed by patient \xB7 04/30/2026 9:21 AM \xB7 Verified \u2713")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 14,
    display: 'flex',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    flex: 1,
    padding: 10,
    background: '#000054',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit'
  }
}, "Download \u2193"), /*#__PURE__*/React.createElement("button", {
  style: {
    flex: 1,
    padding: 10,
    background: '#fff',
    color: '#000054',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit'
  }
}, "Send to EHR")));

// ----------------- BENEFIT MOCKS -----------------

const BenefitMockStaff = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 16,
    padding: 18,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 12
  }
}, "This morning \xB7 7 patients"), [{
  n: 'Maria H.',
  s: '9:00',
  d: 'Done',
  c: '#02e3d3'
}, {
  n: 'James O.',
  s: '9:15',
  d: 'Done',
  c: '#02e3d3'
}, {
  n: 'Aaliyah P.',
  s: '9:30',
  d: 'Done',
  c: '#02e3d3'
}, {
  n: 'Daniel S.',
  s: '9:45',
  d: 'In progress',
  c: '#2740fc'
}, {
  n: 'Sofia R.',
  s: '10:00',
  d: 'Queued',
  c: '#94a3b8'
}].map((r, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: i === 4 ? 'none' : '1px solid #f1f5f9'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #99bdff, #2740fc)'
  }
}), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 600,
    color: '#000054'
  }
}, r.n), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b'
  }
}, r.s, " AM"))), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '3px 8px',
    background: r.c === '#94a3b8' ? '#f1f5f9' : r.c === '#02e3d3' ? '#ccf9f6' : '#d1e4ff',
    color: r.c === '#94a3b8' ? '#64748b' : r.c === '#02e3d3' ? '#065f46' : '#2740fc',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 600
  }
}, r.d))));
const BenefitMockOwner = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 16,
    padding: 18,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }
}, "April \xB7 YTD"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 600,
    color: '#02e3d3'
  }
}, "\u2191 28%")), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 28,
    fontWeight: 800,
    color: '#000054',
    letterSpacing: '-0.03em'
  }
}, "$8,432"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 14
  }
}, "saved \xB7 staff hours reclaimed"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    height: 70
  }
}, [40, 55, 48, 62, 70, 65, 80].map((h, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    flex: 1,
    height: `${h}%`,
    background: i === 6 ? '#02e3d3' : 'linear-gradient(180deg, #2740fc, #99bdff)',
    borderRadius: 4
  }
}))), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 6
  }
}, /*#__PURE__*/React.createElement("span", null, "Mon"), /*#__PURE__*/React.createElement("span", null, "Tue"), /*#__PURE__*/React.createElement("span", null, "Wed"), /*#__PURE__*/React.createElement("span", null, "Thu"), /*#__PURE__*/React.createElement("span", null, "Fri"), /*#__PURE__*/React.createElement("span", null, "Sat"), /*#__PURE__*/React.createElement("span", null, "Sun")));
const BenefitMockPatient = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    borderRadius: 16,
    padding: 18,
    border: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 14
  }
}, "Pre-visit packet \xB7 ready"), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: 16,
    background: 'linear-gradient(135deg, #d1e4ff, #ccf9f6)',
    borderRadius: 12,
    marginBottom: 12,
    textAlign: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#02e3d3',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 800,
    margin: '0 auto 10px'
  }
}, "\u2713"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 14,
    fontWeight: 700,
    color: '#000054'
  }
}, "All set, Maria"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2
  }
}, "Walk in at 9 AM \xB7 no clipboard")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: '#fafbfc',
    borderRadius: 8
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 18
  }
}, "\uD83D\uDD8B\uFE0F"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 600,
    color: '#000054'
  }
}, "Sign on the tablet"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 10,
    color: '#64748b'
  }
}, "Once. Replicates across 18 pages."))));
window.MedonixMocks = {
  HeroWorkspace,
  HeroFloater,
  HeroStatChip,
  StepMockUpload,
  StepMockEntry,
  StepMockExport,
  BenefitMockStaff,
  BenefitMockOwner,
  BenefitMockPatient
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "medonix-mocks.jsx", error: String((e && e.message) || e) }); }

// medonix-page-1.jsx
try { (() => {
// Sorta landing page — Medonix Webflow template style, in Sorta colors + Poppins.

const {
  useState
} = React;
const M = window.MedonixMocks;

// ---------- Logo (Sorta) ----------
const SortaMark = ({
  size = 32
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 64 64",
  fill: "none",
  style: {
    display: 'block'
  }
}, /*#__PURE__*/React.createElement("path", {
  d: "M14 18 C14 12, 20 8, 28 8 L46 8 C52 8, 56 12, 56 18 L56 22 L40 22 L40 18 L24 18 Z",
  fill: "#66bdff"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8 32 C8 26, 14 22, 22 22 L46 22 C50 22, 54 24, 54 28 L54 36 L38 36 L38 32 L22 32 L22 36 L14 36 Z",
  fill: "#2886f9"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8 46 C8 40, 14 36, 22 36 L42 36 C48 36, 54 40, 54 46 L54 50 C54 56, 48 60, 40 60 L22 60 C16 60, 8 56, 8 50 Z M22 46 L40 46 L40 50 L22 50 Z",
  fill: "#2740fc"
}), /*#__PURE__*/React.createElement("path", {
  d: "M30 30 L36 26 L36 34 Z",
  fill: "#ffffff"
}));
const SortaWordmark = ({
  color = '#000054',
  size = 22
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement(SortaMark, {
  size: 28
}), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: size,
    fontWeight: 700,
    color,
    letterSpacing: '-0.02em'
  }
}, "Sorta"));

// ---------- Nav ----------
const TopNav = () => /*#__PURE__*/React.createElement("nav", {
  style: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(253,253,253,0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e2e8f0',
    padding: '18px 56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
}, /*#__PURE__*/React.createElement(SortaWordmark, null), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 40,
    alignItems: 'center'
  }
}, [{
  l: 'Home',
  a: true
}, {
  l: 'Features'
}, {
  l: 'How it works'
}, {
  l: 'Pricing'
}, {
  l: 'About'
}, {
  l: 'Blog'
}].map(i => /*#__PURE__*/React.createElement("a", {
  key: i.l,
  href: "#",
  style: {
    fontSize: 14,
    fontWeight: 500,
    color: i.a ? '#000054' : '#64748b',
    textDecoration: 'none',
    position: 'relative'
  }
}, i.l, i.a && /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    bottom: -22,
    left: 0,
    right: 0,
    height: 2,
    background: '#2740fc',
    borderRadius: 2
  }
})))), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '12px 22px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 9999,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 2px 8px rgba(39,64,252,0.30)'
  }
}, "Get a demo", /*#__PURE__*/React.createElement("span", {
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#fff',
    color: '#2740fc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800
  }
}, "\u2192")));

// ---------- Hero ----------
const Hero = () => /*#__PURE__*/React.createElement("section", {
  style: {
    position: 'relative',
    padding: '64px 56px 96px',
    overflow: 'hidden'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    backgroundImage: 'linear-gradient(rgba(0,0,84,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,84,0.04) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '10%',
    left: '-10%',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(2,227,211,0.25), transparent 70%)',
    zIndex: 0
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '20%',
    right: '-8%',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(39,64,252,0.18), transparent 70%)',
    zIndex: 0
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    marginBottom: 32
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 18px 6px 6px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 9999,
    boxShadow: '0 2px 8px rgba(0,0,84,0.06)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex'
  }
}, ['linear-gradient(135deg, #2740fc, #02e3d3)', 'linear-gradient(135deg, #99bdff, #2740fc)', 'linear-gradient(135deg, #66bdff, #02e3d3)'].map((bg, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: bg,
    border: '2px solid #fff',
    marginLeft: i === 0 ? 0 : -10,
    boxShadow: '0 1px 3px rgba(0,0,84,0.1)'
  }
}))), /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 13,
    fontWeight: 600,
    color: '#000054'
  }
}, "Joined 240+ clinics"))), /*#__PURE__*/React.createElement("h1", {
  style: {
    textAlign: 'center',
    fontSize: 88,
    fontWeight: 700,
    letterSpacing: '-0.04em',
    lineHeight: 1.02,
    color: '#000054',
    margin: '0 auto 24px',
    maxWidth: 1000
  }
}, "Smarter Paperwork,", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300
  }
}, "One "), /*#__PURE__*/React.createElement("span", {
  style: {
    color: '#2740fc'
  }
}, "Dashboard")), /*#__PURE__*/React.createElement("p", {
  style: {
    textAlign: 'center',
    fontSize: 19,
    color: '#475569',
    lineHeight: 1.55,
    maxWidth: 620,
    margin: '0 auto 36px'
  }
}, "Sorta sits on top of your existing EHR. Staff enters patient info once \u2014 all 18 pages of your intake packet fill themselves. No migration. No new hardware."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 72
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: '#2740fc',
    color: '#fff',
    border: 'none',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(39,64,252,0.30)',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, "Start free trial", /*#__PURE__*/React.createElement("span", {
  style: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#fff',
    color: '#2740fc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800
  }
}, "\u2192")), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: '#fff',
    color: '#000054',
    border: '1px solid #e2e8f0',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#000054',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    paddingLeft: 2
  }
}, "\u25B6"), "Watch demo")), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    maxWidth: 1080,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement(M.HeroWorkspace, null), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '-30px',
    left: '-100px',
    zIndex: 2
  }
}, /*#__PURE__*/React.createElement(M.HeroFloater, null)), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    bottom: '-50px',
    right: '-80px',
    zIndex: 2
  }
}, /*#__PURE__*/React.createElement(M.HeroStatChip, null)), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '40%',
    right: '-160px',
    transform: 'rotate(-4deg)',
    zIndex: 2
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    padding: '20px 28px',
    background: '#fff',
    borderRadius: 36,
    boxShadow: '0 12px 32px rgba(0,0,84,0.10)',
    maxWidth: 220,
    fontSize: 13,
    fontWeight: 600,
    color: '#000054',
    textAlign: 'center',
    lineHeight: 1.4
  }
}, "Trusted by clinics from El Paso to Buffalo.", /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    bottom: -10,
    left: 30,
    width: 0,
    height: 0,
    borderLeft: '12px solid transparent',
    borderRight: '12px solid transparent',
    borderTop: '14px solid #fff'
  }
}))))));

// ---------- Marquee ----------
const Marquee = () => /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '80px 0 64px',
    background: '#fff',
    borderTop: '1px solid #f1f5f9',
    borderBottom: '1px solid #f1f5f9'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748b',
    fontWeight: 500,
    marginBottom: 32
  }
}, "Trusted by independent outpatient clinics nationwide"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 64,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: 1280,
    margin: '0 auto',
    padding: '0 56px',
    opacity: 0.5
  }
}, ['Mesa Family Medicine', 'Sunshine Pediatrics', 'Borderland Behavioral', 'Rio Grande PT', 'NE Allergy', 'Valley Vision', 'Coronado Care', 'Brookline Clinic'].map(c => /*#__PURE__*/React.createElement("div", {
  key: c,
  style: {
    fontSize: 16,
    fontWeight: 700,
    color: '#000054',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap'
  }
}, c))));

// ---------- Features ----------
const FeatureCard = ({
  kicker,
  title,
  body,
  mock,
  gradient
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 2px 16px rgba(0,0,84,0.04)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    height: 240,
    background: gradient,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  }
}, mock), /*#__PURE__*/React.createElement("div", {
  style: {
    padding: '28px 28px 32px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 10
  }
}, kicker), /*#__PURE__*/React.createElement("h3", {
  style: {
    fontSize: 24,
    fontWeight: 700,
    color: '#000054',
    letterSpacing: '-0.02em',
    margin: '0 0 12px',
    lineHeight: 1.2
  }
}, title), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 1.6,
    margin: 0
  }
}, body)));
const Features = () => /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '120px 56px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'center',
    marginBottom: 64
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: '#2740fc',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 14
  }
}, "Features"), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 56,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
    color: '#000054',
    margin: '0 auto 16px',
    maxWidth: 820
  }
}, "Everything You Need", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300
  }
}, "to Run Smarter")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    color: '#475569',
    maxWidth: 540,
    margin: '0 auto'
  }
}, "From intake to insurance auth, your paperwork stack \u2014 automated. One source of truth, every form filled.")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: 20
  }
}, /*#__PURE__*/React.createElement(FeatureCard, {
  kicker: "One-time data entry",
  title: "42 fields, synced everywhere",
  body: "Front desk types patient info once. Sorta fans those fields out across every form in your packet \u2014 name on page 1 lands on every page where it lives.",
  gradient: "linear-gradient(135deg, #d1e4ff 0%, #ccf9f6 100%)",
  mock: /*#__PURE__*/React.createElement("div", {
    style: {
      transform: 'scale(0.85)',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement(M.BenefitMockOwner, null))
}), /*#__PURE__*/React.createElement(FeatureCard, {
  kicker: "Any PDF, mapped",
  title: "Keep your existing forms",
  body: "Upload your current PDF intake packets. Sorta reads every field, maps it semantically, and human-reviews before go-live.",
  gradient: "linear-gradient(135deg, #ccf9f6 0%, #d1e4ff 100%)",
  mock: /*#__PURE__*/React.createElement("div", {
    style: {
      transform: 'scale(0.7)',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement(M.StepMockUpload, null))
}), /*#__PURE__*/React.createElement(FeatureCard, {
  kicker: "EHR integration",
  title: "Works on top of what you have",
  body: "Sorta is a layer, not a replacement. We export to Epic, eCW, Athena, NextGen \u2014 or any EHR that takes a PDF or fax.",
  gradient: "linear-gradient(135deg, #fff7ed 0%, #ffe8d1 100%)",
  mock: /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
      padding: 16
    }
  }, ['Epic', 'eCW', 'Athena', 'NextGen', 'Kareo', 'DrChrono'].map(p => /*#__PURE__*/React.createElement("div", {
    key: p,
    style: {
      padding: '12px 8px',
      background: '#fff',
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 700,
      color: '#000054',
      textAlign: 'center',
      boxShadow: '0 2px 6px rgba(0,0,84,0.04)'
    }
  }, p)))
}), /*#__PURE__*/React.createElement(FeatureCard, {
  kicker: "Compliance built-in",
  title: "HIPAA from day one",
  body: "Encrypted at rest and in transit. Signed BAA with every clinic. PHI region-locked to the US. SOC 2 Type II in progress.",
  gradient: "linear-gradient(135deg, #000054 0%, #2740fc 100%)",
  mock: /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#fff',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginBottom: 12
    }
  }, ['HIPAA', 'BAA', 'SOC 2', 'AES-256'].map(b => /*#__PURE__*/React.createElement("div", {
    key: b,
    style: {
      padding: '6px 14px',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600
    }
  }, b))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 800,
      letterSpacing: '-0.03em',
      color: '#02e3d3'
    }
  }, "\uD83D\uDD12"))
})));

// ---------- Big stat (odometer-style) ----------
const Odometer = () => {
  // Static rolling-style digits
  const digits = '33,000'.split('');
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 56px',
      background: '#000054',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr 1.3fr',
      gap: 80,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#02e3d3',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 16
    }
  }, "Who we are"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#fff',
      margin: '0 0 24px'
    }
  }, "Innovating for a", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 300
    }
  }, "Smarter Clinic")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: 'rgba(255,255,255,0.7)',
      lineHeight: 1.6,
      marginBottom: 32,
      maxWidth: 480
    }
  }, "Sorta was started in El Paso by a former PCT who watched the front desk re-type the same patient info eighteen different ways. We're building the paperwork layer he wished existed."), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '13px 26px',
      background: 'transparent',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: 9999,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, "About us", /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#fff',
      color: '#000054',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800
    }
  }, "\u2192"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 4,
      marginBottom: 24
    }
  }, digits.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 140,
      fontWeight: 800,
      letterSpacing: '-0.05em',
      lineHeight: 1,
      color: '#fff',
      position: 'relative',
      ...(d === ',' ? {
        color: '#02e3d3'
      } : {})
    }
  }, d)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 80,
      fontWeight: 800,
      color: '#02e3d3',
      lineHeight: 1,
      alignSelf: 'flex-start',
      marginTop: 12
    }
  }, "+")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 500,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: 32
    }
  }, "Hours of front desk work reclaimed by Sorta \xB7 this year"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,0.1)'
    }
  }, [{
    n: '240+',
    l: 'Clinics live'
  }, {
    n: '4.8M',
    l: 'Pages auto-filled'
  }, {
    n: '99.7%',
    l: 'Field accuracy'
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 800,
      color: '#02e3d3',
      letterSpacing: '-0.02em'
    }
  }, s.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 4
    }
  }, s.l)))))));
};

// ---------- 3-step tab section ----------
const Steps = () => {
  const [active, setActive] = useState(0);
  const steps = [{
    num: '01',
    t: 'Quick Setup',
    d: 'Send us your existing PDF intake packet. We map every field. Human-reviewed. Live in 48 hours.',
    mock: /*#__PURE__*/React.createElement(M.StepMockUpload, null)
  }, {
    num: '02',
    t: 'One-Time Data Entry',
    d: 'Sixty seconds at the front desk. Name, DOB, insurance. Sorta fans those 42 fields across every form in your packet.',
    mock: /*#__PURE__*/React.createElement(M.StepMockEntry, null)
  }, {
    num: '03',
    t: 'Auto-Fill & Export',
    d: 'Pixel-identical filled PDF in seconds. Print, e-sign, or push directly into your EHR. Patient walks in — packet\u2019s ready.',
    mock: /*#__PURE__*/React.createElement(M.StepMockExport, null)
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Simple steps"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 720
    }
  }, "Get Started in Minutes"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 540,
      margin: '0 auto'
    }
  }, "From contract to first filled packet \u2014 three easy steps and you're running.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 48,
      flexWrap: 'wrap'
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setActive(i),
    style: {
      padding: '14px 24px',
      borderRadius: 9999,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid',
      ...(active === i ? {
        background: '#000054',
        color: '#fff',
        borderColor: '#000054',
        boxShadow: '0 4px 12px rgba(0,0,84,0.20)'
      } : {
        background: '#fff',
        color: '#000054',
        borderColor: '#e2e8f0'
      }),
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: active === i ? '#02e3d3' : '#f1f5f9',
      color: active === i ? '#000054' : '#64748b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800
    }
  }, i + 1), s.t))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.3fr',
      gap: 64,
      alignItems: 'center',
      background: 'linear-gradient(135deg, #fafbfc, #ffffff)',
      borderRadius: 24,
      padding: 48,
      border: '1px solid #e2e8f0'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 800,
      color: '#d1e4ff',
      letterSpacing: '-0.04em',
      lineHeight: 1,
      marginBottom: 16
    }
  }, "Step ", active + 1), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 40,
      fontWeight: 700,
      color: '#000054',
      letterSpacing: '-0.025em',
      lineHeight: 1.1,
      margin: '0 0 20px'
    }
  }, steps[active].t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      lineHeight: 1.6,
      margin: '0 0 28px'
    }
  }, steps[active].d), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActive(Math.max(0, active - 1)),
    disabled: active === 0,
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: '1px solid #e2e8f0',
      background: '#fff',
      cursor: active === 0 ? 'not-allowed' : 'pointer',
      fontSize: 16,
      color: active === 0 ? '#cbd5e1' : '#000054',
      fontFamily: 'inherit',
      fontWeight: 700
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActive(Math.min(2, active + 1)),
    disabled: active === 2,
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      border: 'none',
      background: active === 2 ? '#e2e8f0' : '#2740fc',
      color: '#fff',
      cursor: active === 2 ? 'not-allowed' : 'pointer',
      fontSize: 16,
      fontFamily: 'inherit',
      fontWeight: 700,
      boxShadow: active === 2 ? 'none' : '0 2px 8px rgba(39,64,252,0.30)'
    }
  }, "\u2192"))), /*#__PURE__*/React.createElement("div", null, steps[active].mock)));
};

// ---------- Benefits ----------
const Benefits = () => {
  const groups = [{
    tag: 'For Front Desk',
    t: 'Patients in. Packets done.',
    d: 'No more 45-minute morning prep. Walk in at 8, start seeing patients at 8.',
    bullets: [{
      t: 'Type once, fill 18 pages.',
      d: 'One source of truth across your entire paperwork stack.'
    }, {
      t: 'No more re-typing names.',
      d: 'Insurance lookup pre-fills carrier ID from a photo of the card.'
    }],
    mock: /*#__PURE__*/React.createElement(M.BenefitMockStaff, null)
  }, {
    tag: 'For Clinic Owners',
    t: 'The cheapest hire you\u2019ll ever make.',
    d: 'Less than one shift of temp coverage. Replaces hours of admin every day.',
    bullets: [{
      t: '$300/month flat.',
      d: 'No per-user, no per-form, no contracts. Cancel anytime.'
    }, {
      t: '33 hours/week back.',
      d: 'Reclaim your front desk\u2019s morning. Or send them home on time.'
    }],
    mock: /*#__PURE__*/React.createElement(M.BenefitMockOwner, null)
  }, {
    tag: 'For Patients',
    t: 'No clipboard. No re-typing.',
    d: 'Walk in, sign once, go back. The packet was already done.',
    bullets: [{
      t: 'Sign once on a tablet.',
      d: 'Signature replicates across every form in the packet — automatically.'
    }, {
      t: 'Transparent records.',
      d: 'Patients can review what was submitted before signing.'
    }],
    mock: /*#__PURE__*/React.createElement(M.BenefitMockPatient, null)
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 64
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Benefits"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 800
    }
  }, "Empowering Every User"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 580,
      margin: '0 auto'
    }
  }, "Tailored for the three people whose day Sorta changes most.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20
    }
  }, groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
    key: gi,
    style: {
      background: gi === 1 ? '#000054' : '#fff',
      color: gi === 1 ? '#fff' : '#000054',
      border: gi === 1 ? 'none' : '1px solid #e2e8f0',
      borderRadius: 24,
      padding: 32,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: gi === 1 ? '#02e3d3' : '#2740fc',
      marginBottom: 14
    }
  }, g.tag), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
      margin: '0 0 12px'
    }
  }, g.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.6,
      margin: '0 0 24px',
      opacity: gi === 1 ? 0.7 : 1,
      color: gi === 1 ? 'rgba(255,255,255,0.7)' : '#475569'
    }
  }, g.d), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24,
      filter: gi === 1 ? 'invert(0)' : 'none'
    }
  }, g.mock), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginTop: 'auto'
    }
  }, g.bullets.map((b, bi) => /*#__PURE__*/React.createElement("div", {
    key: bi,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: gi === 1 ? '#02e3d3' : '#ccf9f6',
      color: gi === 1 ? '#000054' : '#02e3d3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 800,
      flexShrink: 0,
      marginTop: 1
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      marginBottom: 2
    }
  }, b.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.5,
      opacity: gi === 1 ? 0.7 : 1,
      color: gi === 1 ? 'rgba(255,255,255,0.7)' : '#64748b'
    }
  }, b.d)))))))));
};
window.MedonixPage1 = {
  TopNav,
  Hero,
  Marquee,
  Features,
  Odometer,
  Steps,
  Benefits
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "medonix-page-1.jsx", error: String((e && e.message) || e) }); }

// medonix-page-2.jsx
try { (() => {
// Part 2 of Medonix-style page: Testimonials, Pricing, FAQ, Blog, CTA, Footer.

const {
  useState: useState2
} = React;
const M2 = window.MedonixMocks;

// ---------- Testimonials (Bento) ----------
const Testimonials = () => {
  const items = [{
    kind: 'quote',
    q: 'Our front desk used to come in 45 minutes early to prep packets. Now they show up at 8 and we start seeing patients at 8.',
    a: 'Dr. Linda Castaneda',
    r: 'Owner · Mesa Family Medicine · El Paso, TX',
    avatar: 'linear-gradient(135deg, #2740fc, #02e3d3)',
    big: true
  }, {
    kind: 'quote',
    q: 'We canceled two staff temp contracts the week after we turned Sorta on. The math feels like cheating.',
    a: 'Dr. Anand Krishnamurthy',
    r: 'Owner · Sunshine Pediatrics',
    avatar: 'linear-gradient(135deg, #66bdff, #2886f9)'
  }, {
    kind: 'video',
    label: 'Watch the 2-min walkthrough — how Mesa Family Medicine onboarded in 48 hours',
    poster: 'linear-gradient(135deg, #d1e4ff, #ccf9f6)'
  }, {
    kind: 'quote',
    q: 'Setup was 48 hours. Day one we sent home our temp coverage. It pays for itself in a week.',
    a: 'Talia Mwangi',
    r: 'Office Manager · Borderland Behavioral'
  }, {
    kind: 'quote',
    q: 'Our patients comment on it. Walking in with the paperwork already done — that\u2019s the experience.',
    a: 'Roberto Vasquez',
    r: 'Front Desk · Coronado Care',
    avatar: 'linear-gradient(135deg, #99bdff, #66bdff)'
  }, {
    kind: 'stat',
    big: '$8.4k',
    sub: 'monthly savings · 30 days in',
    sub2: 'avg across 240+ clinics on Sorta',
    dark: true
  }, {
    kind: 'quote',
    q: '99% of my HIPAA-consent issues vanished. The form is filled correctly every time.',
    a: 'Dr. Jin Park',
    r: 'Owner · Brookline Clinic, MA',
    avatar: 'linear-gradient(135deg, #02e3d3, #2740fc)'
  }, {
    kind: 'quote',
    q: 'I run a 3-provider primary care office. Sorta is the closest thing to free labor I\u2019ve ever bought.',
    a: 'Dr. Adaeze Okonkwo',
    r: 'Owner · NE Allergy & Asthma'
  }, {
    kind: 'quote',
    q: 'My staff came back from training and said \u201cwe never want to go back.\u201d That was day one.',
    a: 'Cynthia Yamamoto',
    r: 'Practice Admin · Valley Vision',
    avatar: 'linear-gradient(135deg, #2740fc, #99bdff)'
  }];
  const renderItem = (it, i) => {
    if (it.kind === 'video') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          background: it.poster,
          borderRadius: 20,
          padding: 28,
          position: 'relative',
          overflow: 'hidden',
          minHeight: 220,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,84,0.15)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 0,
          height: 0,
          borderLeft: '14px solid #2740fc',
          borderTop: '9px solid transparent',
          borderBottom: '9px solid transparent',
          marginLeft: 4
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: '#000054',
          background: 'rgba(255,255,255,0.85)',
          padding: '4px 10px',
          borderRadius: 9999
        }
      }, "2:14")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 16,
          fontWeight: 600,
          color: '#000054',
          lineHeight: 1.35,
          maxWidth: 280
        }
      }, it.label));
    }
    if (it.kind === 'stat') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          background: '#000054',
          color: '#fff',
          borderRadius: 20,
          padding: 28,
          minHeight: 220,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: '#02e3d3',
          lineHeight: 1
        }
      }, it.big), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 500,
          marginTop: 12
        }
      }, it.sub), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          marginTop: 4
        }
      }, it.sub2));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 28,
        minHeight: it.big ? 280 : 220,
        gridColumn: it.big ? 'span 2' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: it.big ? 22 : 15,
        fontWeight: it.big ? 500 : 400,
        color: '#000054',
        lineHeight: 1.45,
        margin: 0,
        letterSpacing: it.big ? '-0.015em' : 0
      }
    }, "\"", it.q, "\""), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginTop: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: it.avatar || 'linear-gradient(135deg, #cbd5e1, #94a3b8)'
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: '#000054'
      }
    }, it.a), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#64748b'
      }
    }, it.r))));
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Showcase"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 820
    }
  }, "Trusted by Owners,", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 300
    }
  }, "Loved by Front Desks")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 540,
      margin: '0 auto'
    }
  }, "Real stories from the clinics running Sorta in production today.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      gridColumn: it.big ? 'span 2' : 'auto'
    }
  }, renderItem(it, i)))));
};

// ---------- Pricing ----------
const Pricing = () => {
  const [yearly, setYearly] = useState2(false);
  const plans = [{
    name: 'Independent',
    desc: 'For solo or 2-provider clinics getting started with paperwork automation.',
    monthly: 300,
    yearly: 250,
    cta: 'Start free trial',
    featured: false,
    features: ['Up to 3 staff accounts', 'Unlimited patient records', 'Up to 20 form templates', 'EHR & fax integrations', 'Email support']
  }, {
    name: 'Practice',
    desc: 'For busy 3-5 provider clinics that need advanced workflows.',
    monthly: 600,
    yearly: 500,
    cta: 'Start free trial',
    featured: true,
    features: ['Unlimited staff accounts', 'Unlimited form templates', 'Insurance lookup automation', 'Advanced analytics & reporting', 'Priority phone + Slack support', 'White-glove onboarding']
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Pricing"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 820
    }
  }, "Simple & Transparent"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 540,
      margin: '0 auto 32px'
    }
  }, "No per-form fees. No contracts. Pick your plan, cancel anytime."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      padding: 4,
      background: '#f1f5f9',
      borderRadius: 9999,
      border: '1px solid #e2e8f0'
    }
  }, ['Monthly', 'Yearly'].map((l, i) => /*#__PURE__*/React.createElement("button", {
    key: l,
    onClick: () => setYearly(i === 1),
    style: {
      padding: '8px 20px',
      borderRadius: 9999,
      background: i === 1 === yearly ? '#fff' : 'transparent',
      color: i === 1 === yearly ? '#000054' : '#64748b',
      border: 'none',
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: i === 1 === yearly ? '0 1px 3px rgba(0,0,84,0.10)' : 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, l, i === 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 9999,
      background: '#ccf9f6',
      color: '#065f46',
      fontWeight: 700
    }
  }, "\u221217%"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
      maxWidth: 960,
      margin: '0 auto'
    }
  }, plans.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: p.featured ? '#000054' : '#fff',
      color: p.featured ? '#fff' : '#000054',
      border: p.featured ? 'none' : '1px solid #e2e8f0',
      borderRadius: 24,
      padding: 36,
      position: 'relative',
      ...(p.featured ? {
        boxShadow: '0 20px 50px -20px rgba(0,0,84,0.30)'
      } : {})
    }
  }, p.featured && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 20,
      right: 20,
      padding: '4px 12px',
      background: '#02e3d3',
      color: '#000054',
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 9999,
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, "Most popular"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background: p.featured ? 'rgba(255,255,255,0.1)' : '#d1e4ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20
    }
  }, "\uD83D\uDCE6"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: '-0.01em'
    }
  }, p.name)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.6,
      margin: '0 0 24px',
      opacity: p.featured ? 0.7 : 1,
      color: p.featured ? 'rgba(255,255,255,0.7)' : '#475569'
    }
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 56,
      fontWeight: 800,
      letterSpacing: '-0.03em',
      lineHeight: 1
    }
  }, "$", yearly ? p.yearly : p.monthly), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 500,
      opacity: 0.6
    }
  }, "/month", yearly ? ', billed yearly' : '')), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '14px',
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      marginBottom: 24,
      background: p.featured ? '#02e3d3' : '#2740fc',
      color: p.featured ? '#000054' : '#fff',
      border: 'none',
      boxShadow: p.featured ? 'none' : '0 2px 8px rgba(39,64,252,0.30)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    }
  }, p.cta, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: p.featured ? '#000054' : '#fff',
      color: p.featured ? '#02e3d3' : '#2740fc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800
    }
  }, "\u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      opacity: 0.6,
      marginBottom: 12
    }
  }, "Includes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, p.features.map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: p.featured ? '#02e3d3' : '#ccf9f6',
      color: p.featured ? '#000054' : '#02e3d3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800,
      flexShrink: 0,
      marginTop: 2
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: 1.5
    }
  }, f))))))));
};

// ---------- FAQ ----------
const FAQ = () => {
  const [open, setOpen] = useState2(0);
  const items = [{
    q: 'How secure is my patient data?',
    a: 'Sorta is HIPAA-compliant from day one. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We sign a BAA with every clinic. PHI is region-locked to the US, and we maintain a full audit trail with 7-year retention. SOC 2 Type II is in progress.'
  }, {
    q: 'Will this work with my existing EHR?',
    a: 'Almost certainly yes. Sorta is a layer that sits on top of your EHR — we don\u2019t replace it. If your EHR can accept a PDF upload, or your fax line takes a packet, Sorta works. We have direct integrations with Epic, eClinicalWorks, Athena, NextGen, Practice Fusion, Kareo, DrChrono, Greenway, Allscripts, AdvancedMD, and CharmHealth.'
  }, {
    q: 'How long does setup take?',
    a: 'About 48 hours from when you send us your intake packet. We map every field, a human reviews the mapping, and your account goes live. White-glove onboarding is included on every plan.'
  }, {
    q: 'Is there a limit to the number of patients or forms I can have?',
    a: 'No. Both plans include unlimited patient records. The Independent plan caps form templates at 20 (more than enough for most clinics); Practice is unlimited. There are no per-user fees, no per-form fees, and no per-fill fees.'
  }, {
    q: 'Do you offer support if I have technical issues?',
    a: 'Yes. Email support is included on every plan. The Practice plan adds priority phone and Slack support — typically same-day, usually within an hour during business hours.'
  }, {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts. Month-to-month. Cancel any time and your data exports cleanly. You\u2019ll never get stuck.'
  }, {
    q: 'Can I integrate this with my existing system?',
    a: 'Yes. We expose a REST API for clinics that want to push data programmatically. Most clinics don\u2019t need it — the standard PDF export and EHR integration covers 95% of workflows.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1080,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "FAQ"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 56,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: '0 auto 16px',
      maxWidth: 720
    }
  }, "Your Questions, Answered"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: '#475569',
      maxWidth: 540,
      margin: '0 auto'
    }
  }, "Quick answers to help you get started with confidence.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'all 0.2s'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(open === i ? -1 : i),
    style: {
      width: '100%',
      padding: '22px 28px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'inherit',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      color: '#000054'
    }
  }, it.q), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: open === i ? '#2740fc' : '#f1f5f9',
      color: open === i ? '#fff' : '#64748b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 700,
      flexShrink: 0,
      marginLeft: 16,
      transition: 'all 0.2s'
    }
  }, open === i ? '−' : '+')), open === i && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 28px 24px',
      fontSize: 15,
      color: '#475569',
      lineHeight: 1.65
    }
  }, it.a)))));
};

// ---------- Blog ----------
const Blog = () => {
  const posts = [{
    t: '5 Ways to Cut Front-Desk Burnout in Independent Clinics',
    d: 'May 12, 2026',
    cat: 'Operations',
    tone: 'cool'
  }, {
    t: 'The Hidden Cost of Re-Typing Patient Data (and How to Stop)',
    d: 'May 4, 2026',
    cat: 'Strategy',
    tone: 'mint'
  }, {
    t: 'HIPAA Compliance for Solo Practices: A Plain-English Guide',
    d: 'April 28, 2026',
    cat: 'Compliance',
    tone: 'warm'
  }];
  const tones = {
    cool: 'linear-gradient(135deg, #d1e4ff, #ccf9f6)',
    mint: 'linear-gradient(135deg, #ccf9f6, #d1e4ff)',
    warm: 'linear-gradient(135deg, #fff7ed, #ffe8d1)'
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '120px 56px',
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 14
    }
  }, "Blog"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 48,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      color: '#000054',
      margin: 0
    }
  }, "Insights from the front desk")), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '12px 22px',
      background: '#fff',
      color: '#000054',
      border: '1px solid #e2e8f0',
      borderRadius: 9999,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, "Browse all", /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#2740fc',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 800
    }
  }, "\u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20
    }
  }, posts.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.t,
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 20,
      overflow: 'hidden',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 200,
      background: tones[p.tone],
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 12px',
      background: '#fff',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 700,
      color: '#2740fc'
    }
  }, p.cat)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 19,
      fontWeight: 700,
      color: '#000054',
      letterSpacing: '-0.01em',
      lineHeight: 1.25,
      margin: '0 0 14px'
    }
  }, p.t), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64748b'
    }
  }, p.d), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#2740fc',
      fontSize: 16,
      fontWeight: 800
    }
  }, "\u2192")))))));
};

// ---------- CTA Banner ----------
const CTABanner = () => /*#__PURE__*/React.createElement("section", {
  style: {
    padding: '0 56px 100px',
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'linear-gradient(135deg, #000054 0%, #2740fc 100%)',
    borderRadius: 32,
    padding: '72px 64px',
    position: 'relative',
    overflow: 'hidden',
    color: '#fff'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: '-100px',
    right: '-100px',
    width: 360,
    height: 360,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(2,227,211,0.4), transparent 70%)'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    bottom: '-80px',
    left: '-60px',
    width: 280,
    height: 280,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(102,189,255,0.3), transparent 70%)'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: 64,
    alignItems: 'center'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: '#02e3d3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  }
}, /*#__PURE__*/React.createElement(SortaMark, {
  size: 32
})), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontSize: 56,
    fontWeight: 700,
    letterSpacing: '-0.035em',
    lineHeight: 1.02,
    color: '#fff',
    margin: '0 0 20px'
  }
}, "Cut Paperwork.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 300,
    color: '#02e3d3'
  }
}, "Keep Your Clinic.")), /*#__PURE__*/React.createElement("p", {
  style: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.6,
    margin: '0 0 36px',
    maxWidth: 460
  }
}, "Join 240+ independent clinics running Sorta on their actual intake packets. See it work on yours in a 15-minute demo."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: '#fff',
    color: '#000054',
    border: 'none',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }
}, "Get Started Now", /*#__PURE__*/React.createElement("span", {
  style: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#2740fc',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800
  }
}, "\u2192")), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '15px 28px',
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Book a demo"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(12px)',
    borderRadius: 20,
    padding: 28
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 12,
    fontWeight: 700,
    color: '#02e3d3',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 10
  }
}, "Newsletter"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6
  }
}, "Stay updated"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 20
  }
}, "Monthly clinic operations tips, straight to your inbox."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("input", {
  placeholder: "your@clinic.com",
  style: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none'
  }
}), /*#__PURE__*/React.createElement("button", {
  style: {
    padding: '12px 18px',
    background: '#02e3d3',
    color: '#000054',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer'
  }
}, "Subscribe")))))));

// ---------- Footer ----------
const SiteFooter = () => /*#__PURE__*/React.createElement("footer", {
  style: {
    padding: '72px 56px 36px',
    background: '#fff',
    borderTop: '1px solid #e2e8f0'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 1280,
    margin: '0 auto'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    gap: 48,
    marginBottom: 56
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SortaWordmark, null), /*#__PURE__*/React.createElement("p", {
  style: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 1.6,
    maxWidth: 320
  }
}, "The paperwork automation layer for independent outpatient clinics. Bootstrapped from El Paso, TX."), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 24,
    fontSize: 13,
    color: '#475569'
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
  style: {
    color: '#000054'
  }
}, "hi@getsorta.io")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 4
  }
}, "El Paso, TX \xB7 USA"))), [{
  h: 'Main pages',
  items: ['Home', 'About', 'Features', 'Pricing', 'Blog']
}, {
  h: 'Product',
  items: ['How it works', 'Templates', 'Security', 'Changelog']
}, {
  h: 'Inner pages',
  items: ['Single post', 'Single plan', 'Contact', 'Careers']
}, {
  h: 'Utility',
  items: ['Style guide', 'License', '404', 'Password']
}].map(g => /*#__PURE__*/React.createElement("div", {
  key: g.h
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#94a3b8',
    marginBottom: 16
  }
}, g.h), g.items.map(i => /*#__PURE__*/React.createElement("a", {
  key: i,
  href: "#",
  style: {
    display: 'block',
    fontSize: 14,
    color: '#000054',
    textDecoration: 'none',
    marginBottom: 10,
    fontWeight: 400
  }
}, i))))), /*#__PURE__*/React.createElement("div", {
  style: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    color: '#64748b'
  }
}, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Sorta, Inc. All rights reserved."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 24
  }
}, /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#64748b',
    textDecoration: 'none'
  }
}, "Privacy"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#64748b',
    textDecoration: 'none'
  }
}, "Terms"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#64748b',
    textDecoration: 'none'
  }
}, "Security"), /*#__PURE__*/React.createElement("a", {
  href: "#",
  style: {
    color: '#64748b',
    textDecoration: 'none'
  }
}, "HIPAA")))));
window.MedonixPage2 = {
  Testimonials,
  Pricing,
  FAQ,
  Blog,
  CTABanner,
  SiteFooter
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "medonix-page-2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/webapp/Dashboard.jsx
try { (() => {
// Sorta Web App — Dashboard Page

const QUEUE = [{
  name: 'Martinez',
  phone: '(915) 555-0192',
  dot: '#f59e0b',
  status: '2 in progress',
  forms: 2
}, {
  name: 'Johnson',
  phone: '(915) 555-4471',
  dot: '#02e3d3',
  status: 'All done ✓',
  forms: 3
}, {
  name: 'Patel',
  phone: '(915) 555-2308',
  dot: '#94a3b8',
  status: 'No forms yet',
  forms: 0
}, {
  name: 'Williams',
  phone: '(915) 555-7761',
  dot: '#f59e0b',
  status: '1 in progress',
  forms: 1
}, {
  name: 'Chen',
  phone: '(915) 555-0034',
  dot: '#02e3d3',
  status: 'All done ✓',
  forms: 2
}];
const ATTENTION = [{
  type: 'tpl',
  label: 'Consent Form v2',
  meta: 'Layout not approved yet — fills blocked',
  color: '#f59e0b'
}, {
  type: 'stale',
  label: 'Patel · draft form',
  meta: 'Sitting 3 days',
  color: '#94a3b8'
}];
const SPARK_DATA = [3, 5, 2, 8, 6, 4, 9];
const SPARK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
function StatCard({
  accent,
  iconBg,
  icon,
  value,
  label,
  badge,
  badgeBg,
  badgeColor
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 2px 16px rgba(0,0,84,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      background: accent,
      borderRadius: '4px 0 0 4px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 18,
      right: 18,
      width: 32,
      height: 32,
      borderRadius: 10,
      background: iconBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 800,
      color: '#000054',
      letterSpacing: '-0.03em',
      lineHeight: 1.1,
      marginTop: 4
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#64748b',
      marginTop: 3
    }
  }, label), badge && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      marginTop: 8,
      background: badgeBg || '#d1e4ff',
      color: badgeColor || '#000054',
      borderRadius: 999,
      padding: '2px 10px',
      fontSize: 11,
      fontWeight: 600
    }
  }, badge));
}
function DashboardPage({
  onNavigate
}) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  const maxSpark = Math.max(...SPARK_DATA);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Poppins', sans-serif"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    onNavigate: onNavigate,
    currentPage: "dashboard"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1080,
      margin: '0 auto',
      padding: '0 24px 80px',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      borderRadius: 20,
      overflow: 'hidden',
      padding: '36px 44px',
      margin: '24px 0 20px',
      background: 'linear-gradient(135deg, #d1e4ff 0%, #e8fbf8 55%, #ccf9f6 100%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: 'radial-gradient(30rem at 90% 20%,rgba(2,227,211,0.35),transparent 55%),radial-gradient(22rem at 10% 80%,rgba(102,189,255,0.40),transparent 55%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 65%',
      minWidth: 260
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'rgba(255,255,255,0.80)',
      border: '1px solid rgba(39,64,252,0.18)',
      borderRadius: 999,
      padding: '5px 14px',
      fontSize: 12,
      color: '#000054',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#02e3d3',
      fontSize: 10
    }
  }, "\u25CF"), " Clinic workspace"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 28,
      fontWeight: 800,
      color: '#000054',
      letterSpacing: '-0.02em',
      margin: '0 0 6px',
      lineHeight: 1.2
    }
  }, "Good morning \u2014 Demo Clinic"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      color: '#64748b',
      margin: '0 0 18px'
    }
  }, dateStr, " \xB7 Here's where things stand."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate('workspace'),
    style: {
      padding: '12px 24px',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 600,
      background: '#2740fc',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'inherit',
      boxShadow: '0 2px 8px rgba(39,64,252,0.30)'
    }
  }, "Start a visit \u2192"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate('templates'),
    style: {
      padding: '12px 24px',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 600,
      background: 'rgba(255,255,255,0.75)',
      border: '1.5px solid rgba(39,64,252,0.25)',
      color: '#000054',
      cursor: 'pointer',
      fontFamily: 'inherit'
    }
  }, "Manage templates"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      marginLeft: 'auto'
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 160,
      height: 110,
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 16px rgba(0,0,84,0.06)',
      padding: '14px 16px',
      transform: 'rotate(4deg)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#ccf9f6',
      border: '2px solid #02e3d3'
    }
  }), [100, 85, 60].map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: 8,
      borderRadius: 4,
      marginBottom: 8,
      background: 'linear-gradient(90deg, #d1e4ff, #99bdff)',
      width: `${w}%`
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    accent: "#2740fc",
    iconBg: "#d1e4ff",
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M12 11a4 4 0 100-8 4 4 0 000 8zM4 21v-1a7 7 0 0114 0v1",
      stroke: "#000054",
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    value: "9",
    label: "Patients today",
    badge: "\u2191 3 vs yesterday"
  }), /*#__PURE__*/React.createElement(StatCard, {
    accent: "#f59e0b",
    iconBg: "rgba(245,158,11,0.12)",
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
      stroke: "#92400e",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })),
    value: "3",
    label: "In progress",
    badge: "2 still need forms",
    badgeBg: "rgba(245,158,11,0.12)",
    badgeColor: "#92400e"
  }), /*#__PURE__*/React.createElement(StatCard, {
    accent: "#02e3d3",
    iconBg: "rgba(2,227,211,0.15)",
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      stroke: "#0f766e",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })),
    value: "5",
    label: "Completed today",
    badge: "Ready to export",
    badgeBg: "#ccf9f6",
    badgeColor: "#065f46"
  }), /*#__PURE__*/React.createElement(StatCard, {
    accent: "#000054",
    iconBg: "rgba(0,0,84,0.08)",
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 4h8l3 3v13a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z",
      stroke: "#000054",
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 4v4h4",
      stroke: "#000054",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })),
    value: "6",
    label: "Templates ready",
    badge: "All confirmed \u2713",
    badgeBg: "rgba(2,227,211,0.1)",
    badgeColor: "#065f46"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: '18px 20px',
      boxShadow: '0 2px 16px rgba(0,0,84,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: '#0f172a'
    }
  }, "Today's queue"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#64748b',
      marginTop: 2
    }
  }, "Tap a patient to jump into their forms")), /*#__PURE__*/React.createElement("span", {
    style: {
      background: '#d1e4ff',
      color: '#000054',
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600
    }
  }, "9 patients")), QUEUE.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => onNavigate('workspace'),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 13px',
      borderRadius: 10,
      border: '1px solid transparent',
      background: 'transparent',
      cursor: 'pointer',
      width: '100%',
      textAlign: 'left',
      fontFamily: 'inherit',
      marginBottom: 6,
      transition: 'background 0.12s'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = '#d1e4ff';
      e.currentTarget.style.borderColor = 'rgba(39,64,252,0.18)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.borderColor = 'transparent';
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: p.dot,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: '#0f172a',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: p.dot === '#02e3d3' ? '#02e3d3' : p.dot === '#f59e0b' ? '#f59e0b' : '#94a3b8'
    }
  }, p.status)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94a3b8',
      fontSize: 15
    }
  }, "\u2192")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: '18px 20px',
      boxShadow: '0 2px 16px rgba(0,0,84,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: 12
    }
  }, "Needs attention"), ATTENTION.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 13px',
      borderRadius: 10,
      border: '1px solid #e2e8f0',
      marginBottom: 8,
      background: '#fff'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: item.color,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, item.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64748b'
    }
  }, item.meta)), /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'none',
      border: 'none',
      color: '#2740fc',
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: 'inherit',
      flexShrink: 0
    }
  }, "Review \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid #e2e8f0',
      marginTop: 16,
      paddingTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: '#334155'
    }
  }, "Patient volume"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: '#94a3b8'
    }
  }, "Last 7 days")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'flex-end',
      height: 80,
      marginTop: 12
    }
  }, SPARK_DATA.map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height: Math.max(6, v / maxSpark * 80),
      borderRadius: '6px 6px 0 0',
      background: i === 6 ? '#2740fc' : '#99bdff'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 6
    }
  }, SPARK_LABELS.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      color: i === 6 ? '#000054' : '#94a3b8',
      fontWeight: i === 6 ? 600 : 400
    }
  }, l))))))));
}
Object.assign(window, {
  DashboardPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/webapp/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/webapp/Login.jsx
try { (() => {
// Sorta Web App — Login Page

function LoginPage({
  onLogin
}) {
  const [tenant, setTenant] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  function handleLogin() {
    if (!tenant || !email || !password) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 900);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      background: '#f8fafc'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 440,
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 24,
      boxShadow: '0 2px 16px rgba(0,0,84,0.06)',
      padding: '32px 28px 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(SortaLogoFull, {
    height: 32
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 6px',
      fontSize: 24,
      fontWeight: 700,
      color: '#000054',
      textAlign: 'center'
    }
  }, "Sign in to your clinic"), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      fontSize: 14,
      color: '#64748b',
      margin: '0 0 20px'
    }
  }, "Use your Sorta tenant to access visit forms."), [{
    label: 'Tenant',
    id: 'tenant',
    ph: 'demo-clinic',
    val: tenant,
    set: setTenant,
    type: 'text'
  }, {
    label: 'Email',
    id: 'email',
    ph: 'admin@demo-clinic.com',
    val: email,
    set: setEmail,
    type: 'email'
  }, {
    label: 'Password',
    id: 'pw',
    ph: '••••••••',
    val: password,
    set: setPassword,
    type: 'password'
  }].map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: '#334155',
      margin: '12px 0 6px'
    }
  }, f.label), /*#__PURE__*/React.createElement("input", {
    type: f.type,
    placeholder: f.ph,
    value: f.val,
    onChange: e => f.set(e.target.value),
    onKeyDown: e => e.key === 'Enter' && handleLogin(),
    style: {
      width: '100%',
      padding: '12px 14px',
      fontSize: 15,
      border: '2px solid #e2e8f0',
      borderRadius: 12,
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'border-color 0.15s'
    },
    onFocus: e => e.target.style.borderColor = '#2740fc',
    onBlur: e => e.target.style.borderColor = '#e2e8f0'
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: handleLogin,
    style: {
      width: '100%',
      marginTop: 20,
      padding: '14px',
      fontSize: 15,
      fontWeight: 600,
      background: '#2740fc',
      color: '#fff',
      border: 'none',
      borderRadius: 12,
      cursor: 'pointer',
      fontFamily: 'inherit',
      boxShadow: '0 2px 8px rgba(39,64,252,0.30)',
      opacity: loading ? 0.7 : 1
    }
  }, loading ? 'Signing in…' : 'Sign in'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: '18px 0',
      color: '#94a3b8',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: '#e2e8f0'
    }
  }), "or", /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: '#e2e8f0'
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: handleLogin,
    style: {
      background: 'none',
      border: 'none',
      color: '#2740fc',
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: 'inherit',
      width: '100%',
      textAlign: 'center',
      padding: '8px 0'
    }
  }, "Use demo credentials \u2192")));
}
Object.assign(window, {
  LoginPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/webapp/Login.jsx", error: String((e && e.message) || e) }); }

// ui_kits/webapp/Workspace.jsx
try { (() => {
// Sorta Web App — Workspace Page (3-column layout)

const MOCK_PATIENTS = [{
  id: '1',
  phone: '(915) 555-0192',
  name: 'Martinez'
}, {
  id: '2',
  phone: '(915) 555-4471',
  name: 'Johnson'
}, {
  id: '3',
  phone: '(915) 555-2308',
  name: 'Patel'
}];
const MOCK_FORMS = {
  '1': [{
    id: 'f1',
    name: 'Intake Packet V3',
    status: 'draft'
  }, {
    id: 'f2',
    name: 'Consent Form',
    status: 'complete'
  }],
  '2': [{
    id: 'f3',
    name: 'Intake Packet V3',
    status: 'complete'
  }, {
    id: 'f4',
    name: 'PHQ-9 Assessment',
    status: 'complete'
  }, {
    id: 'f5',
    name: 'Insurance Verification',
    status: 'complete'
  }],
  '3': []
};
const MOCK_FIELDS = [{
  id: 'name',
  label: 'Patient Full Name',
  value: 'Maria Martinez',
  synced: true
}, {
  id: 'dob',
  label: 'Date of Birth',
  value: '03/14/1991',
  synced: true
}, {
  id: 'ins',
  label: 'Insurance Provider',
  value: 'BlueCross BlueShield',
  synced: true,
  full: true
}, {
  id: 'mid',
  label: 'Member ID',
  value: 'XYZ987654321',
  synced: true
}, {
  id: 'grp',
  label: 'Group Number',
  value: '',
  synced: false
}, {
  id: 'auth',
  label: 'Auth Code',
  value: '',
  synced: false
}];
const MOCK_SNAPSHOTS = [{
  id: 's1',
  name: 'Intake Packet V3',
  date: 'Apr 19, 2026 · 10:42 AM',
  pages: 18
}, {
  id: 's2',
  name: 'Consent Form',
  date: 'Apr 19, 2026 · 10:38 AM',
  pages: 3
}];
function PatientsSidebar({
  selected,
  onSelect,
  onAdd
}) {
  const [phone, setPhone] = React.useState('');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 16px',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#02e3d3',
      marginBottom: 3
    }
  }, "Patients"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: '#000054'
    }
  }, "Today's list")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontSize: 11,
      fontWeight: 600,
      color: '#334155',
      marginBottom: 5
    }
  }, "Phone"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Phone number",
    value: phone,
    onChange: e => setPhone(e.target.value),
    style: {
      width: '100%',
      padding: '9px 11px',
      fontSize: 13,
      border: '2px solid #e2e8f0',
      borderRadius: 10,
      outline: 'none',
      fontFamily: 'inherit',
      marginBottom: 8
    },
    onFocus: e => e.target.style.borderColor = '#2740fc',
    onBlur: e => e.target.style.borderColor = '#e2e8f0'
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onAdd(phone);
      setPhone('');
    },
    style: {
      width: '100%',
      padding: '9px 13px',
      fontSize: 13,
      fontWeight: 600,
      background: '#2740fc',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      cursor: 'pointer',
      fontFamily: 'inherit',
      boxShadow: '0 2px 8px rgba(39,64,252,0.25)'
    }
  }, "Create / Lookup")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      minHeight: 0
    }
  }, MOCK_PATIENTS.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => onSelect(p),
    style: {
      padding: '11px 13px',
      borderRadius: 10,
      border: `1px solid ${selected?.id === p.id ? 'rgba(39,64,252,0.35)' : '#e2e8f0'}`,
      background: selected?.id === p.id ? '#d1e4ff' : '#fff',
      cursor: 'pointer',
      transition: 'background 0.12s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: '#0f172a'
    }
  }, p.phone), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#64748b'
    }
  }, p.name)))));
}
function FormsPanel({
  patient,
  selectedForm,
  onSelect
}) {
  const forms = patient ? MOCK_FORMS[patient.id] || [] : [];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 16px',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#02e3d3',
      marginBottom: 3
    }
  }, "Forms"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: '#000054'
    }
  }, "Patient forms")), !patient && /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px dashed #cbd5e1',
      borderRadius: 10,
      padding: 20,
      textAlign: 'center',
      color: '#64748b',
      fontSize: 13
    }
  }, "Select a patient to view their forms."), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      minHeight: 0
    }
  }, patient && forms.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px dashed #cbd5e1',
      borderRadius: 10,
      padding: 20,
      textAlign: 'center',
      color: '#64748b',
      fontSize: 13
    }
  }, "No forms yet \u2014 create one below."), forms.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    onClick: () => onSelect(f),
    style: {
      padding: '12px 13px',
      borderRadius: 10,
      border: `1px solid ${selectedForm?.id === f.id ? 'rgba(39,64,252,0.35)' : '#e2e8f0'}`,
      background: selectedForm?.id === f.id ? '#d1e4ff' : '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: '#0f172a'
    }
  }, f.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      marginTop: 3,
      padding: '1px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.04em',
      background: f.status === 'complete' ? '#ccf9f6' : '#f1f5f9',
      color: f.status === 'complete' ? '#000054' : '#64748b'
    }
  }, f.status)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94a3b8',
      fontSize: 13
    }
  }, "\xD7")))), patient && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      paddingTop: 14,
      borderTop: '1px solid #e2e8f0'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontSize: 11,
      fontWeight: 600,
      color: '#334155',
      marginBottom: 5
    }
  }, "Template"), /*#__PURE__*/React.createElement("select", {
    style: {
      width: '100%',
      padding: '9px 11px',
      fontSize: 13,
      border: '2px solid #e2e8f0',
      borderRadius: 10,
      outline: 'none',
      fontFamily: 'inherit',
      background: '#fff',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("option", null, "Intake Packet V3"), /*#__PURE__*/React.createElement("option", null, "Consent Form"), /*#__PURE__*/React.createElement("option", null, "PHQ-9 Assessment")), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '9px 13px',
      fontSize: 13,
      fontWeight: 600,
      background: '#2740fc',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      cursor: 'pointer',
      fontFamily: 'inherit',
      boxShadow: '0 2px 8px rgba(39,64,252,0.25)'
    }
  }, "Create form")));
}
function FormEditor({
  patient,
  form
}) {
  const [fields, setFields] = React.useState(MOCK_FIELDS);
  const [saved, setSaved] = React.useState(true);
  function updateField(id, val) {
    setFields(prev => prev.map(f => f.id === id ? {
      ...f,
      value: val,
      synced: val.length > 0
    } : f));
    setSaved(false);
    setTimeout(() => setSaved(true), 1200);
  }
  if (!patient) return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontSize: 14
    }
  }, "Select a patient to begin");
  if (!form) return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontSize: 14
    }
  }, "Select a form to fill");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '24px 28px 100px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '5px 12px',
      borderRadius: 999,
      background: '#d1e4ff',
      fontSize: 12,
      color: '#000054'
    }
  }, patient.name, " \xB7 ", patient.phone), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '5px 12px',
      borderRadius: 999,
      background: '#f1f5f9',
      fontSize: 12,
      color: '#64748b'
    }
  }, form.name), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '5px 12px',
      borderRadius: 999,
      background: '#ccf9f6',
      fontSize: 12,
      color: '#065f46'
    }
  }, "42 fields synced automatically")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      color: '#000054',
      marginBottom: 20
    }
  }, form.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, fields.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    style: {
      ...(f.full ? {
        gridColumn: 'span 2'
      } : {})
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontSize: 11,
      fontWeight: 600,
      color: '#334155',
      marginBottom: 5
    }
  }, f.label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: f.value,
    onChange: e => updateField(f.id, e.target.value),
    style: {
      width: '100%',
      padding: '11px 36px 11px 13px',
      fontSize: 14,
      border: `2px solid ${f.synced && f.value ? '#02e3d3' : '#e2e8f0'}`,
      borderRadius: 10,
      outline: 'none',
      fontFamily: 'inherit',
      background: f.synced && f.value ? 'rgba(2,227,211,0.03)' : '#fff',
      color: f.value ? '#000054' : '#94a3b8',
      fontWeight: f.value ? 500 : 400
    },
    onFocus: e => {
      if (!f.value) e.target.style.borderColor = '#2740fc';
    },
    onBlur: e => {
      if (!f.value) e.target.style.borderColor = '#e2e8f0';
    }
  }), f.synced && f.value && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#02e3d3',
      fontSize: 15
    }
  }, "\u2713"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
      padding: '13px 24px',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid #e2e8f0',
      boxShadow: '0 -4px 20px rgba(0,0,84,0.06)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: saved ? '#02e3d3' : '#f59e0b'
    }
  }, saved ? '✓ All changes saved' : 'Saving…'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '11px 20px',
      fontSize: 13,
      fontWeight: 600,
      borderRadius: 10,
      border: '2px solid #2740fc',
      background: 'transparent',
      color: '#2740fc',
      cursor: 'pointer',
      fontFamily: 'inherit'
    }
  }, "Preview PDF"), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '11px 20px',
      fontSize: 13,
      fontWeight: 600,
      borderRadius: 10,
      border: 'none',
      background: '#2740fc',
      color: '#fff',
      cursor: 'pointer',
      fontFamily: 'inherit',
      boxShadow: '0 2px 8px rgba(39,64,252,0.30)'
    }
  }, "Generate Carbon Copy PDF"))));
}
function SnapshotsPanel({
  patient
}) {
  if (!patient) return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      padding: '18px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontSize: 13
    }
  }, "No patient selected");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 16px',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#02e3d3',
      marginBottom: 3
    }
  }, "Snapshots"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: '#000054',
      marginBottom: 16
    }
  }, "Saved records"), MOCK_SNAPSHOTS.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '13px 14px',
      marginBottom: 10,
      boxShadow: '0 2px 8px rgba(0,0,84,0.04)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: '#0f172a',
      marginBottom: 3
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#64748b',
      marginBottom: 8
    }
  }, s.date), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#94a3b8'
    }
  }, s.pages, " pages"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'none',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '4px 10px',
      fontSize: 11,
      fontWeight: 600,
      color: '#2740fc',
      cursor: 'pointer',
      fontFamily: 'inherit'
    }
  }, "Reprint")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 16,
      borderTop: '1px solid #e2e8f0',
      fontSize: 12,
      color: '#64748b'
    }
  }, "Snapshots are frozen at time of generation \u2014 audit-safe."));
}
function WorkspacePage({
  onNavigate
}) {
  const [selPatient, setSelPatient] = React.useState(null);
  const [selForm, setSelForm] = React.useState(null);
  function handleSelectPatient(p) {
    setSelPatient(p);
    setSelForm(null);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#f8fafc',
      fontFamily: "'Poppins', sans-serif"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    onNavigate: onNavigate,
    currentPage: "workspace"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 272,
      minWidth: 272,
      borderRight: '1px solid #e2e8f0',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(PatientsSidebar, {
    selected: selPatient,
    onSelect: handleSelectPatient,
    onAdd: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 272,
      minWidth: 272,
      borderRight: '1px solid #e2e8f0',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(FormsPanel, {
    patient: selPatient,
    selectedForm: selForm,
    onSelect: setSelForm
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      minWidth: 0,
      borderRight: '1px solid #e2e8f0',
      background: '#f8fafc'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 26px',
      borderBottom: '1px solid #e2e8f0',
      background: '#fff'
    }
  }, selPatient ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#02e3d3',
      marginBottom: 3
    }
  }, "Editing patient"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 700,
      color: '#000054'
    }
  }, selPatient.phone, /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 10,
      fontWeight: 500,
      color: '#64748b',
      fontSize: 14
    }
  }, "\xB7 ", selPatient.name))) : /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#94a3b8',
      fontSize: 14
    }
  }, "Select a patient to begin")), /*#__PURE__*/React.createElement(FormEditor, {
    patient: selPatient,
    form: selForm
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 300,
      minWidth: 300,
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(SnapshotsPanel, {
    patient: selPatient
  })))));
}
Object.assign(window, {
  WorkspacePage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/webapp/Workspace.jsx", error: String((e && e.message) || e) }); }

// ui_kits/webapp/shared.jsx
try { (() => {
// Sorta Web App — Shared tokens, logo, and utility components
// Exported to window for use by other components

const SORTA_COLORS = {
  navy: '#000054',
  blue: '#2740fc',
  ocean: '#2886f9',
  teal: '#02e3d3',
  lavender: '#d1e4ff',
  periwinkle: '#99bdff',
  ice: '#c7e7ff',
  mint: '#ccf9f6',
  white: '#ffffff',
  bg: '#f8fafc',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray700: '#334155',
  gray900: '#0f172a',
  error: '#ef4444',
  amber: '#f59e0b'
};

// Inline Sorta S-mark SVG
function SortaMark({
  size = 28
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 320 358",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M320.13 220.21c0 15.04-6.85 28.94-18.12 36.93L160.04 357.63 0 244.33l51.23-36.28 108.8 77.02 142.81-101.14c10.37 7.77 17.29 21.02 17.29 36.28Z",
    fill: "#2740fc"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M320.11 219.58c-.29-20.76-21.54-32.63-37.2-21.53l-122.88 87.01-108.8-77.02-36.95-26.21C5.25 175.3 0 164.35 0 152.69v-.55c.31-23.05 23.84-36.19 41.18-23.91l61.34 43.47 8.23 5.83h98.61l8.23-5.83 51.23-36.28 14.77 10.45c22.58 15.97 36.33 43.76 36.51 73.72Z",
    fill: "#2886f9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M320.13 99.06l-38.35 27.22-12.94 9.14-51.23 36.28-8.26 5.83h-98.56l-8.26-5.83-61.35-43.48C23.82 115.99.32 129.08 0 152.12v-4.6C0 117.34 13.77 89.28 36.51 73.22L122.83 12.03c22.73-16.05 51.68-16.05 74.41 0l84.53 59.9 38.35 27.13Z",
    fill: "#66bdff"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "110.79,177.53 160.1,123.54 209.34,177.53",
    fill: "white"
  }));
}
function SortaLogoFull({
  height = 28
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(SortaMark, {
    size: height
  }), /*#__PURE__*/React.createElement("svg", {
    height: height * 0.75,
    viewBox: "0 0 770 260",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M25 193c-7-3-12-7-16-13s-6-12-6-20h22c0 6 3 10 7 14s9 5 16 5 13-2 17-5 6-8 6-14c0-4-1-8-4-11s-5-5-9-6-9-3-15-5c-9-2-15-5-21-7s-10-6-13-11-6-11-6-19c0-8 2-14 6-20s8-10 15-13 14-4 23-4c12 0 22 3 30 9s12 15 13 26h-23c0-5-2-9-7-12s-9-5-16-5c-6 0-11 2-15 5s-6 8-6 14c0 4 1 7 4 10s5 5 9 6 9 3 15 5c8 2 15 5 21 7s10 6 13 11 6 11 6 20c0 7-2 13-5 19s-9 11-15 14-15 5-23 5-16-2-23-5ZM136 193c-8-5-14-11-18-19s-7-17-7-28 2-20 7-28 11-15 18-19 17-6 26-6 18 2 26 6 14 10 18 19 7 17 7 28-2 20-7 28-11 15-19 19-17 6-26 6-17-2-25-6Zm41-16c5-3 8-7 11-12s4-12 4-19-1-14-4-19-7-9-11-12-10-4-15-4-11 1-15 4-8 7-11 12-4 12-4 19 3 20 8 26 13 9 21 9 11-1 16-4ZM232 100c5-3 11-4 18-4v22h-5c-8 0-14 2-19 6s-6 12-6 22v54h-21V98h21v15c3-5 7-10 12-13ZM281 113v57c0 4 1 7 3 8s5 3 9 3h13v18h-16c-10 0-17-2-22-7s-8-12-8-22v-57h-12V96h12V70h21v26h25v17h-25ZM323 123c4-8 10-14 17-19s15-7 24-7c8 0 15 2 21 5s11 7 14 12V98h21v102h-21v-15c-4 5-8 9-14 12s-13 5-21 5c-9 0-17-2-24-7s-13-11-17-19-6-17-6-28 2-20 6-27Zm73 9c-3-5-7-9-11-12s-10-4-15-4-11 1-15 4-9 7-11 12-4 11-4 18 1 14 4 19 7 10 11 12 10 4 15 4 11-1 15-4 8-7 11-12 4-12 4-19-2-13-4-18Z",
    fill: "#000054"
  })));
}
function TopBar({
  onNavigate,
  currentPage
}) {
  const onTemplates = currentPage === 'templates';
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #e2e8f0',
      padding: '13px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      cursor: 'pointer'
    },
    onClick: () => onNavigate('dashboard')
  }, /*#__PURE__*/React.createElement(SortaLogoFull, {
    height: 26
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate(onTemplates ? 'dashboard' : 'templates'),
    style: {
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 500,
      borderRadius: 10,
      border: `2px solid #2740fc`,
      background: onTemplates ? '#2740fc' : 'transparent',
      color: onTemplates ? '#fff' : '#2740fc',
      cursor: 'pointer',
      fontFamily: 'inherit'
    }
  }, onTemplates ? 'Back to dashboard' : 'Manage templates'), /*#__PURE__*/React.createElement("span", {
    style: {
      border: '1px dashed #cbd5e1',
      borderRadius: 999,
      padding: '5px 12px',
      fontSize: 13,
      color: '#64748b'
    }
  }, "admin@demo-clinic.com"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'none',
      border: 'none',
      color: '#94a3b8',
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: 'inherit',
      padding: '5px 8px'
    },
    onClick: () => onNavigate('login')
  }, "Logout")));
}
Object.assign(window, {
  SortaMark,
  SortaLogoFull,
  TopBar,
  SORTA_COLORS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/webapp/shared.jsx", error: String((e && e.message) || e) }); }

})();
