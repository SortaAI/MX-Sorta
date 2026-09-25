/** Requires Playwright. Run: node tests/analytics.cjs (or set PLAYWRIGHT_MODULE). */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const origin = 'https://mx.getsorta.io';
const errors = [];
(async () => {
  const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true});
  async function fixture(host = origin, stored) {
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    if (stored) await context.addInitScript(value => localStorage.setItem('sorta_cookie_consent',value),stored);
    const calls = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === host) {
        let file = path.join(root, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
        if (!path.extname(file)) file += '.html';
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404,body:'Not found'});
        return route.fulfill({path:file});
      }
      // Real analytics endpoints are NEVER contacted by this test.
      if (/googletagmanager\.com|clarity\.ms/.test(url.hostname)) {
        calls.push(route.request().url());
        return route.fulfill({status:200,contentType:'application/javascript',body:'/* analytics test stub */'});
      }
      if (url.hostname === 'formspree.io') return route.fulfill({status:500,body:'{}'});
      return route.fulfill({status:200,body:''});
    });
    const page = await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(() => {
      document.addEventListener('click', event => {
        if (event.target.closest('a')) event.preventDefault();
      }, true);
    });
    return {page,context,calls};
  }
  async function events(page) {return page.evaluate(()=>Array.from(window.dataLayer||[],x=>Array.from(x)).filter(x=>x[0]==='event'));}
  async function accept(page) {
    await page.getByRole('button',{name:'Aceptar',exact:true}).click();
    await page.waitForFunction(()=>window.__sortaAnalyticsLoaded);
  }

  // Consent unknown: no analytics requests, even when a CTA is clicked.
  let f = await fixture();
  await f.page.goto(origin+'/?email=private@example.com&phone=5555555555',{waitUntil:'networkidle'});
  await f.page.locator('.hero a.button').click();
  assert.equal(f.calls.length,0);
  assert.equal(await f.page.evaluate(()=>typeof window.gtag),'undefined');
  await f.page.getByRole('button',{name:'Solo esenciales',exact:true}).click();
  await f.page.reload({waitUntil:'networkidle'});
  assert.equal(f.calls.length,0);
  assert.equal(await f.page.locator('#sorta-cookie-banner').count(),0);

  // Late acceptance starts both tags once, preserves market, and redacts URL queries.
  await f.page.locator('[data-cookie-preferences]').click();
  await accept(f.page);
  await f.page.waitForFunction(()=>Array.from(window.dataLayer||[]).some(x=>x[1]==='section_view'));
  assert.equal(f.calls.filter(u=>u.includes('gtag/js?id=G-6V5Y3JP1VJ')).length,1);
  const gaConfig=await f.page.evaluate(()=>Array.from(window.dataLayer, x=>Array.from(x)).find(x=>x[0]==='config'&&x[1]==='G-6V5Y3JP1VJ'));
  assert.equal(gaConfig[2].cookie_domain,'auto');
  assert.equal(f.calls.filter(u=>u.includes('gtag/js?')).length,1);
  assert(!f.calls.some(u=>u.includes('G-ZPS6GNGPXD')||u.includes('G-4J0QLJT1N0')));
  assert.equal(await f.page.evaluate(()=>Array.from(window.dataLayer).filter(x=>x[0]==='config').length),1);
  assert.equal(await f.page.locator('head script[src="https://www.googletagmanager.com/gtag/js?id=G-6V5Y3JP1VJ"]').count(),1);
  assert.equal(f.calls.filter(u=>u.includes('clarity.ms/tag/wor9i7cm6t')).length,1);
  let e = await events(f.page);
  assert.equal(e.filter(x=>x[1]==='page_view').length,1);
  assert.equal(e.find(x=>x[1]==='page_view')[2].page_location,origin+'/');
  assert(!JSON.stringify(e).includes('private@example.com'));
  assert(!JSON.stringify(e).includes('5555555555'));
  assert(e.every(x=>x[2].site_market==='MX'&&x[2].site_locale==='es-MX'));
  await f.page.locator('.hero a.button').click();
  e = await events(f.page);
  assert.equal(e.filter(x=>x[1]==='whatsapp_click').length,1);
  assert.equal(e.find(x=>x[1]==='whatsapp_click')[2].placement,'hero');
  assert.equal(e.filter(x=>x[1]==='cta_click').length,1);
  await f.page.locator('#tab-messages').click();
  assert((await events(f.page)).some(x=>x[1]==='product_tab_view'&&x[2].tab==='messages'));
  await f.page.locator('#panel-messages .screenshot-button').click();
  assert((await events(f.page)).some(x=>x[1]==='product_screenshot_open'));
  await f.page.keyboard.press('Escape');
  const clarity = await f.page.evaluate(()=>Array.from(window.clarity.q,x=>Array.from(x)));
  assert(clarity.some(x=>x[0]==='consentv2'&&x[1].analytics_Storage==='granted'&&x[1].ad_Storage==='denied'));

  // Reaccepting cannot double-load tags or pageviews; revoking reloads without them.
  await f.page.locator('[data-cookie-preferences]').click();await accept(f.page);
  assert.equal(f.calls.length,2);
  assert.equal((await events(f.page)).filter(x=>x[1]==='page_view').length,1);
  await f.page.locator('[data-cookie-preferences]').click();
  await Promise.all([f.page.waitForNavigation({waitUntil:'networkidle'}),f.page.getByRole('button',{name:'Solo esenciales',exact:true}).click()]);
  assert.equal(f.calls.length,2);
  assert.equal(await f.page.evaluate(()=>typeof window.gtag),'undefined');
  assert.equal(await f.page.evaluate(()=>localStorage.getItem('sorta_cookie_consent')),'denied');
  await f.context.close();
  console.log('PASS consent gating, late acceptance, project IDs, deduplication, market labels, CTA/product events, sanitized URLs, revocation.');

  // Returning visitors; form attempts are tracked without values or false delivered leads.
  f = await fixture(origin,'granted');
  await f.page.goto(origin+'/contacto',{waitUntil:'networkidle'});
  assert.equal(f.calls.length,2);
  await f.page.locator('input[name=nombre]').fill('PRIVATE-NAME');
  await f.page.locator('input[name=whatsapp]').fill('5551234567');
  await f.page.locator('textarea[name=detalle]').fill('PRIVATE-FORM-TEXT');
  await f.page.locator('form button[type=submit]').click();
  e=await events(f.page);
  assert.equal(e.filter(x=>x[1]==='contact_form_start').length,1);
  assert.equal(e.filter(x=>x[1]==='contact_form_submit').length,1);
  assert.equal(e.filter(x=>x[1]==='generate_lead').length,0);
  for(const value of ['PRIVATE-NAME','5551234567','PRIVATE-FORM-TEXT'])assert(!JSON.stringify(e).includes(value));
  assert.equal(await f.page.locator('[data-clarity-mask=true]').count(),1);
  await f.page.locator('#contact-error').waitFor({state:'visible'});
  assert.equal(await f.page.locator('input[name=nombre]').inputValue(),'PRIVATE-NAME');
  let deliveries=0;
  await f.page.route('https://formspree.io/f/mvzvyrge',async route=>{
    deliveries++;
    await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
  });
  await f.page.locator('form button[type=submit]').focus();
  await f.page.keyboard.press('Enter');
  await f.page.locator('#contact-success').waitFor({state:'visible'});
  assert.equal(await f.page.locator('#contact-success').evaluate(el=>el===document.activeElement),true);
  assert.equal(await f.page.locator('form').isVisible(),false);
  assert.equal(deliveries,1);
  e=await events(f.page);
  assert.equal(e.filter(x=>x[1]==='generate_lead').length,1);
  for(const value of ['PRIVATE-NAME','5551234567','PRIVATE-FORM-TEXT'])assert(!JSON.stringify(e).includes(value));
  await f.context.close();
  console.log('PASS failed delivery, keyboard retry, confirmed lead, focus and no form values in analytics.');

  for (const width of [1440,390]) {
    f=await fixture(origin,'denied');
    await f.page.setViewportSize({width,height:1000});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    for(const slug of ['contacto','precios']) {
      await f.page.goto(origin+'/'+slug,{waitUntil:'networkidle'});
      assert(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await f.page.screenshot({path:'/private/tmp/pilot-'+slug+'-'+width+'.png',fullPage:true});
    }
    await f.page.goto(origin+'/contacto');
    await f.page.route('https://formspree.io/f/mvzvyrge',route=>route.fulfill({status:200,body:'{}'}));
    await f.page.locator('input[name=nombre]').fill('Test');
    await f.page.locator('input[name=whatsapp]').fill('5551234567');
    await f.page.locator('form button[type=submit]').click();
    await f.page.locator('#contact-success').waitFor({state:'visible'});
    assert.deepEqual(await events(f.page),[]);
    await f.context.close();
  }
  console.log('PASS desktop/mobile layout, reduced motion, successful submission without analytics consent.');

  // Local development never pollutes the production analytics projects.
  f=await fixture('http://localhost:8090','granted');
  await f.page.goto('http://localhost:8090/',{waitUntil:'networkidle'});
  await f.page.locator('.hero a.button').click();
  assert.equal(f.calls.length,0);assert.deepEqual(await events(f.page),[]);
  await f.context.close();
  console.log('PASS production hostname restriction.');

  // Engagement counts foreground time from consent, not time sitting in a hidden tab.
  f=await fixture(origin,'granted');
  await f.page.clock.install();
  await f.page.goto(origin+'/',{waitUntil:'networkidle'});
  await f.page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
  await f.page.clock.runFor(31000);
  assert.equal((await events(f.page)).filter(x=>x[1]==='engagement_time').length,0);
  await f.page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}));
  await f.page.clock.runFor(31000);
  assert.equal((await events(f.page)).filter(x=>x[1]==='engagement_time'&&x[2].seconds_on_page===30).length,1);
  await f.context.close();
  // Approved campaign values survive; arbitrary query values and fragments do not.
  f = await fixture();
  const campaign='utm_source=linkedin&utm_medium=organic_social&utm_campaign=mx_week_2&utm_content=post_2_ficha';
  await f.page.goto(origin+'/recursos/ficha-identificacion-paciente?'+campaign+'&email=private@example.com#secret');
  await f.page.locator('a[download]').first().click();
  assert.equal((await events(f.page)).length,0);
  await accept(f.page);
  e=await events(f.page);
  assert.equal(e.find(x=>x[1]==='page_view')[2].page_location,origin+'/recursos/ficha-identificacion-paciente?'+campaign);
  await f.page.locator('a[download]').first().click();
  await f.page.locator('[data-track="ficha_autofill_demo"]').click();
  e=await events(f.page);
  assert.equal(e.filter(x=>x[1]==='resource_download').length,1);
  assert.equal(e.find(x=>x[1]==='resource_download')[2].file_format,'docx');
  assert.equal(e.find(x=>x[1]==='resource_product_click')[2].placement,'after_example');
  assert(!JSON.stringify(e).includes('private@example.com'));
  await f.page.goto(origin+'/producto/formatos-medicos?utm_content=private@example.com');
  assert.equal((await events(f.page)).find(x=>x[1]==='page_view')[2].page_location,origin+'/producto/formatos-medicos');
  await f.page.locator('[data-autofill-fill]').click();
  await f.page.locator('[data-autofill-reset]').click();
  await f.page.locator('[data-autofill-fill]').click();
  e=await events(f.page);
  assert.equal(e.filter(x=>x[1]==='autofill_demo_complete').length,1);
  assert(!JSON.stringify(e).includes('María'));
  await f.context.close();
  f=await fixture(origin,'denied');
  await f.page.goto(origin+'/producto/formatos-medicos');
  await f.page.locator('[data-autofill-fill]').click();
  assert.equal((await events(f.page)).length,0);
  await f.page.locator('[data-cookie-preferences]').click();
  await accept(f.page);
  assert.equal((await events(f.page)).filter(x=>x[1]==='autofill_demo_complete').length,0);
  await f.page.locator('[data-autofill-reset]').click();
  await f.page.locator('[data-autofill-fill]').click();
  assert.equal((await events(f.page)).filter(x=>x[1]==='autofill_demo_complete').length,1);
  await f.context.close();
  console.log('PASS campaign allowlist, resource funnel, demo completion, consent and deduplication.');
  assert.deepEqual(errors,[]);
  console.log('PASS foreground engagement and browser errors. No external analytics events sent.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
