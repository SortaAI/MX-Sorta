# Sorta website

Static marketing site for Sorta México.

Vercel serves `index.html` at `/`. The remaining pages use clean URLs configured
in `vercel.json`; no build command or output-directory override is required.

## Shared design

All eleven pages use `assets/site.css` for the approved brand theme and shared
header, footer, buttons, and cookie controls. `assets/site.js` handles navigation
and active-page states. Secondary page layouts live in `assets/interior.css`;
homepage product tabs and the image viewer live in `assets/homepage/homepage.js`.

The header and footer are static HTML, so changes to their content should be
applied to every page. Root-relative links also work on the resource articles.
The contact form's component wraps only the main content, keeping navigation
independent of the form renderer.
