# Sorta Design System

## Overview
Sorta is a **paperwork automation layer** for independent outpatient clinics. Staff enters patient data once; Sorta fills every form automatically. It works **on top of any existing EHR or legacy software** — no migration, no new hardware.

- **Founded by:** Emiliano Rodriguez (UTEP CS student + former PCT), bootstrapped from El Paso, TX
- **Target user:** Front desk staff at independent outpatient clinics (1–3 providers)
- **Core value prop:** Upload your existing PDFs once → enter patient info one time → all 18 pages of your intake packet fill themselves
- **Pricing:** $300/month flat, no contracts

### Products
1. **Web App** — The clinical workspace (React/Vite/TypeScript, Tailwind, shadcn/ui). Handles login, dashboard, workspace (patient lookup + form fill + PDF export), template management.
2. **Marketing Site** — Landing page (vanilla HTML/CSS/JS). Hosted at getsorta.io.

---

## Sources
- `FrontEnd-Connected-main/` — Web app source (local codebase, mounted via File System Access API)
- `SortaSite/` — Marketing site source (local codebase, mounted via File System Access API)
- GitHub repo: `SortaAI/LandingPage-Sorta` (marketing site mirror)
- Uploaded brand assets: `uploads/Asset 1–14@4x.png`, `uploads/logo-16.jpg`

---

## CONTENT FUNDAMENTALS

### Voice & Tone
- **Direct, confident, anti-jargon.** Sorta talks to front desk workers, not executives.
- **First person "we", second person "you".** "We fill the rest." / "Staff enters data once."
- **Empathetic but unsentimental.** Acknowledges real pain ("45-minute delay") without melodrama.
- **Plain English.** No clinical terminology. "Paperwork layer" not "clinical documentation workflow."
- **Specific and quantified:** "18 pages long", "30–60 minutes per clinic day", "42 fields synced automatically", "$300/month". Always concrete.

### Casing
- **Sentence case** for headings and UI labels. "Start a visit" not "Start A Visit".
- **Title case** only for product names: "Sorta Automation Engine", "Carbon Copy PDF".
- **ALL CAPS** for eyebrow/kicker labels only: "THE AUTOMATION ENGINE", "THE 45-MINUTE DELAY".
- Button copy: sentence case. "Cut the paperwork →", "Start automation today".

### Copywriting Patterns
- Mix light (300) + bold (700) weights in hero headings for rhythm: "Keep your forms. Staff enters **data once.**"
- Repetition as a device: "We are NOT an EHR. We are NOT a scheduling tool…"
- Arrow → used in CTAs and nav links (not emoji, not icon — literal →)
- Numbers embedded in copy for credibility: "18 pages", "42 fields"
- No exclamation points in the app UI; occasional use in marketing for energy ("All done ✓")

### Emoji
- Used **sparingly and purposefully**: ⏱️ in the hero pill badge, ✓ as a checkmark in status displays.
- Not used as decorative icons. The app uses inline SVG icons exclusively.
- Marketing site uses Phosphor Icons (icon font) for feature icons only.

---

## VISUAL FOUNDATIONS

### Colors
- **Navy `#000054`** — dominant. Headlines, body text, icon fill, dark surfaces.
- **Blue `#2740fc`** — primary CTA/electric accent. Buttons, active states, links, focus rings.
- **Ocean `#2886f9`** — hover state for blue. Slightly softer.
- **Teal `#02e3d3`** — success / synced / done. Used for ✓ checkmarks, kicker labels, active step nodes.
- **Soft palette** — lavender `#d1e4ff`, periwinkle `#99bdff`, ice `#c7e7ff`, mint `#ccf9f6` — used for hover fills, selected chips, banner background, success backgrounds.
- **App background** — `#f8fafc` (gray-50), almost white.
- No dark mode. No pure black.

### Typography
- **Single typeface: Poppins** (Google Fonts), weights 300–800.
- Hero headings: mix of 300 Light + 700 Bold in the same line (iconic pattern).
- Kickers: 11px, 700, uppercase, `letter-spacing: 0.12em`, teal or electric color.
- Stat numbers: 32px+, 800 Extrabold, tight letter-spacing.
- Body: 15px / 400, `#334155`.
- No serif. No monospace in the UI (code fields only).

### Backgrounds
- App: flat `#f8fafc` with white cards.
- Marketing: `#fdfdfd` with a **subtle dot grid** (`3% opacity navy`), creates a "techy but light" feel.
- Dashboard hero banner: gradient `#d1e4ff → #e8fbf8 → #ccf9f6` (lavender → mint) with radial color blobs.
- Dark feature section: solid `#000054` with subtle white-tinted bento cards.
- No full-bleed photography. No grain texture. No aggressive gradients.

### Cards & Surfaces
- **Default card:** white background, `1px solid #e2e8f0`, `border-radius: 16px`, `shadow-card`.
- **Hover:** border becomes periwinkle `#99bdff`, subtle lift.
- **Selected/active card:** background becomes lavender `#d1e4ff`, border becomes blue `rgba(39,64,252,0.35)`.
- **Dark cards (bento):** `linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))`, white border at 8% opacity. Hover: teal border glow.
- **Stat cards:** left 4px accent bar in the relevant color (blue/amber/teal/navy).
- Wizard card hover: border transitions to periwinkle.

### Shadows
- All shadows are **navy-tinted** (not black): `rgba(0, 0, 84, ...)`.
- Four levels: `sm`, `md`, `card`, `float`. Plus a **blue-tinted button glow**.
- No hard drop shadows. Everything soft and very subtle.

### Borders & Radius
- Default border: `1px solid #e2e8f0`.
- Focus border: `2px solid #2740fc` + `box-shadow: 0 0 0 3px rgba(39,64,252,0.15)`.
- Radius: sm=8, md=12, lg=16, xl=24, pill=9999px. Pill used for CTAs and nav buttons. Lg used for most cards.

### Animations & Transitions
- `transition: all 0.15s` (inputs, buttons). `transition: background 0.12s` (cards/rows).
- Scroll-triggered fade-in: `opacity: 0 → 1`, `translateY(20px) → 0`, `duration: 0.6s ease-out`.
- Hover on marketing bento cards: `translateY(-4px)` lift, `0.3s`.
- Active press: `transform: scale(0.98)`.
- Stat cards stagger in on load with `opacity + translateY` and delay offsets (0ms, 60ms, 120ms, 180ms).
- Pulse animation on sync indicator dot (blue glow).
- **No bounce. No spring. No dramatic easing.** Everything feels calm and professional.

### Icons
- **Web app:** Inline SVG icons only. Stroke icons, 1.6px weight, rounded line caps.
- **Marketing site:** Phosphor Icons (CDN: `@phosphor-icons/web`). Fill variant for large feature icons. Bold variant for UI icons.
- No emoji as icons. No unicode dingbats as icons.
- See ICONOGRAPHY section below.

### Hover / Press States
- **Buttons:** hover → darker bg (navy for primary, gray-100 for ghost). Press → `scale(0.98)`.
- **List rows/cards:** hover → lavender bg + periwinkle border + `shadow-md`.
- **Nav links:** hover → blue color.
- **Inputs:** focus → blue border + blue ring shadow.
- **Bento (dark):** hover → slight lift + teal border glow.

### Layout
- Max content width: `1200px`, centered.
- App: full-viewport with fixed topbar (sticky, blur backdrop). Workspace is a 3-column layout (272 / 272 / flex / 300px).
- Marketing: sections at `padding: 100px 0`. Hero at `margin-top: 140px`.
- `grid-bg` class on body: subtle navy dot grid at 3% opacity, 40×40px spacing.

### Use of Transparency & Blur
- Topbar: `background: rgba(255,255,255,0.94)` + `backdrop-filter: blur(12px)`.
- Sticky fill bar: same treatment.
- Nav (marketing): `rgba(253,253,253,0.95)` + `blur(8px)`.
- Dark bento cards: white at 5% opacity for surface.
- Banner gradient blobs: teal/blue radials at 35–40% opacity.

---

## ICONOGRAPHY

### Web App Icons
- All **inline SVG**. Stroke-based, 1.6px stroke width, `round` linecap and linejoin.
- Color: inherits from parent or explicitly set to navy/teal/amber based on semantic meaning.
- Used in stat cards (person, pencil, check circle, file), topbar navigation, form fields.
- **No external icon font in the app.** All icons hand-coded as JSX SVG.

### Marketing Site Icons
- **Phosphor Icons** (`https://unpkg.com/@phosphor-icons/web`) — loaded via CDN.
- Fill variant (`ph-fill`) for large bento feature icons.
- Bold variant (`ph-bold`) for small UI actions (arrow, check, x, scan, keyboard, etc).
- Duotone (`ph-duotone`) for step workflow visual icons (upload-simple, keyboard, file-pdf).
- Teal fill color for feature icons on dark background. Electric blue for sidebar icons.
- Font size: 2.2–2.5rem for feature icons, 1rem for inline UI icons.

### Logo / Brand Mark
- See `assets/` for all logo variants.
- The S-mark is a **stylized stacked letter-S made of layered paper/form sheets** — top layer sky blue `#66bdff`, middle layer ocean `#2886f9`, bottom layer electric `#2740fc`, white triangle cutout (representing a form tab/peak).
- Wordmark: "Sorta" in Poppins 700, navy `#000054`.
- Available: horizontal (icon + text), stacked (icon above text), icon-only.
- Color variants: navy, full-color, white-on-dark.

---

## FILE INDEX

```
README.md                  ← This file
colors_and_type.css        ← CSS variable tokens (colors, type, spacing, radius, shadows)
SKILL.md                   ← Agent skill descriptor

assets/
  sorta-logo.svg           ← Horizontal SVG logo (color icon + navy text)
  logo-icon-navy.png       ← Icon only, solid navy
  logo-stacked-navy.png    ← Icon + text stacked, navy
  logo-horizontal-navy.png ← Icon + text horizontal, navy
  logo-horizontal-color.png← Icon + text horizontal, color icon + navy text
  logo-white-text-color-icon.png ← Reversed: color icon + white text (for dark bg)
  logo-stacked-color.png   ← Stacked, color icon + navy text
  logo-icon-color-vivid.png← Icon only, full color gradient
  logo-icon-color-blue.png ← Icon only, vivid blue variant
  color-palette-reference.jpg ← Official color reference sheet

preview/                   ← Design System tab cards (~700px wide)
  colors-primary.html      ← Navy, Blue, Ocean, Sky, Teal
  colors-soft.html         ← Lavender, Periwinkle, Ice, Mint, Banner gradient
  colors-neutrals.html     ← Gray scale 50–900
  colors-semantic.html     ← Success, Warning, Error, Info
  type-scale.html          ← Display → caption specimen
  type-weights.html        ← Poppins 300–800
  type-special.html        ← Kicker, greeting, stat number, price
  spacing-scale.html       ← 4–96px token bars
  spacing-radius.html      ← sm/md/lg/xl/pill
  spacing-shadows.html     ← sm/md/card/float/button
  components-buttons.html  ← All button variants
  components-inputs.html   ← Input states (default, focus, filled, error, select)
  components-cards.html    ← Wizard card, stat card, dashboard banner
  components-pills.html    ← Status pills, context chips, patient pills, badges
  components-steptrack.html← 4-step wizard progress tracker
  components-topbar-formrow.html ← App topbar + form list rows
  brand-logos.html         ← Logo variant showcase

ui_kits/
  webapp/
    index.html             ← Click-thru prototype: Login → Dashboard → Workspace
    shared.jsx             ← Logo SVG, TopBar, color constants
    Login.jsx              ← Auth page component
    Dashboard.jsx          ← Dashboard with stats, queue, sparkline
    Workspace.jsx          ← 3-column workspace (patients, forms, editor, snapshots)
  marketing/
    index.html             ← Full landing page (self-contained HTML)
```
