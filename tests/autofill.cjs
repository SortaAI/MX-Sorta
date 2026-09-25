/** Run with Playwright installed, or set PLAYWRIGHT_MODULE. No server required. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const origin = 'https://mx.getsorta.io';
(async () => {
  const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'chrome', headless:true});
  try {
    for (const width of [1440, 900, 390]) {
      const context = await browser.newContext({viewport:{width,height:1000}, reducedMotion:'reduce'});
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        let file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        if (!path.extname(file)) file += '.html';
        const resolved = path.join(root, file);
        return fs.existsSync(resolved) ? route.fulfill({path:resolved}) : route.fulfill({status:404,body:'Not found'});
      });
      const page = await context.newPage();
      const errors=[];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin);
      assert(await page.locator('.product-section + .autofill-section + .whatsapp-section').count());
      assert.equal(await page.locator('[role="tab"]').count(),5);
      if(width===1440)await page.locator('.autofill-section').screenshot({path:'/private/tmp/autofill-home-desktop.png'});
      for(const route of ['/producto/formatos-medicos','/recursos/llenado-formatos-nom-004']) {
        await page.goto(origin+route);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.equal(await page.locator('h1').count(),1);
        const demo = page.locator('[data-autofill-demo]');
        if(await demo.count()) {
          assert.equal(await demo.locator('input,textarea,form').count(),0);
          const pending=await demo.locator('.autofill-pending').allTextContents();
          const button=demo.locator('[data-autofill-fill]');
          await button.focus();
          const requests=[];
          const listener=r=>requests.push(r.url());
          page.on('request',listener);
          await page.keyboard.press('Enter');
          assert.equal(await demo.locator('[data-autofill-value="name"]').allTextContents().then(x=>x.every(v=>v==='María López García')),true);
          assert.equal(await demo.locator('[data-autofill-value="birth"]').allTextContents().then(x=>x.every(v=>v==='04/03/1992')),true);
          assert.deepEqual(await demo.locator('.autofill-pending').allTextContents(),pending);
          assert.match(await demo.locator('[role="status"]').innerText(),/3 documentos/);
          await page.keyboard.press('Space');
          await demo.locator('[data-autofill-reset]').focus();
          await page.keyboard.press('Enter');
          assert((await demo.locator('[data-autofill-value]').allTextContents()).every(x=>x==='—'));
          assert(await button.evaluate(el=>el===document.activeElement));
          assert.deepEqual(requests,[]);
          page.off('request',listener);
          if(width===390)await demo.screenshot({path:'/private/tmp/autofill-demo-mobile.png'});
        }
      }
      assert.deepEqual(errors,[]);
      console.log(`${width}px: layout, section order, keyboard fill/reset, unchanged clinical fields, no demo requests passed`);
      await context.close();
    }
    const context=await browser.newContext({javaScriptEnabled:false});
    await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();const file=path.join(root,u.pathname.slice(1)+(path.extname(u.pathname)?'':'.html'));return fs.existsSync(file)?route.fulfill({path:file}):route.abort();});
    const page=await context.newPage();await page.goto(origin+'/producto/formatos-medicos');assert(await page.locator('noscript').isVisible());await context.close();
    console.log('No-JavaScript explanation passed');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
