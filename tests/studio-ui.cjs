/* Real-browser presentation regression; uses an existing playwright-core package. */
const {chromium} = require(process.argv[2] || 'playwright-core');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pages = ['sequence','linked','stack-queue','string','tree','graph','search','sort','algorithm'];
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {channel:'chrome'})});
  const results = [];
  fs.mkdirSync(path.join(root,'work'),{recursive:true});
  try {
    for (const width of [1440, 900, 390]) {
      const context = await browser.newContext({viewport:{width,height:1000}});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      for (const name of pages) {
        await page.goto(pathToFileURL(path.join(root,name+'.html')).href);
        await page.locator('#next').click();
        const before = await page.evaluate(() => ({
          step:document.querySelector('#timeline').value,
          code:document.querySelector('#code,#code-lines').innerHTML,
          fields:[...document.querySelectorAll('main input,main select,main textarea')].map(x=>[x.id,x.value,x.checked]),
          storage:JSON.stringify(localStorage)
        }));
        await page.locator('#focus-mode').click();
        assert.equal(await page.locator('#focus-mode').getAttribute('aria-pressed'),'true');
        assert(await page.locator('.sidebar').isHidden());
        assert.deepEqual(await page.evaluate(() => ({
          step:document.querySelector('#timeline').value,
          code:document.querySelector('#code,#code-lines').innerHTML,
          fields:[...document.querySelectorAll('main input,main select,main textarea')].map(x=>[x.id,x.value,x.checked]),
          storage:JSON.stringify(localStorage)
        })),before,name+' focus preserves state');
        await page.locator('#focus-mode').click();
        const geometry = await page.evaluate(() => {
          const v=document.querySelector('.canvas-panel').getBoundingClientRect();
          const c=document.querySelector('.source-panel').getBoundingClientRect();
          return {overflow:document.documentElement.scrollWidth-innerWidth, vx:v.x,vy:v.y,cx:c.x,cy:c.y};
        });
        assert(geometry.overflow<=1,name+' horizontal overflow at '+width+': '+geometry.overflow);
        if(width>1100) assert(geometry.vx<geometry.cx,name+' canvas precedes code');
        else assert(geometry.vy<geometry.cy,name+' narrow stacked panels');
        assert.equal(await page.locator('.course-nav a').count(),9);
        assert.equal(await page.locator('.course-nav [aria-current="page"]').count(),1);
        if(width===1440 && ['sequence','graph','algorithm'].includes(name)) await page.screenshot({path:path.join(root,'work/studio-'+name+'-desktop.png'),fullPage:true});
        if(width===390 && name==='sequence') await page.screenshot({path:path.join(root,'work/studio-index-mobile.png'),fullPage:true});
        results.push({page:name,width,focusPreservesState:true,overflow:geometry.overflow});
      }
      // Follow a new sidebar link rather than checking only its markup.
      await page.setViewportSize({width:1440,height:1000});
      await page.locator('.course-nav a[href="linked.html"]').click();
      assert(page.url().endsWith('/linked.html'));
      await page.locator('#next').click();
      assert.equal(errors.length,0,errors.join('\n'));
      await context.close();
    }
    fs.writeFileSync(path.join(root,'work/studio-ui-results.json'),JSON.stringify(results,null,2));
    console.log('PASS: 27 page/viewport combinations; focus state, layouts, navigation, no page errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
