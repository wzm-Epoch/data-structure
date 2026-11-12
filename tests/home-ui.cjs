const {chromium}=require(process.argv[2]||'playwright-core');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of [1440,900,390]){
   const ctx=await browser.newContext({viewport:{width,height:1000}}),page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(root,'index.html')).href);
   assert.equal(await page.locator('.chapter-card').count(),8);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.locator('#linear-card').click();assert(await page.locator('#linear-dialog').isVisible());
   await page.keyboard.press('Escape');assert(await page.locator('#linear-dialog').isHidden());
   await page.evaluate(()=>localStorage.setItem('zhixu-learning-v1',JSON.stringify({completed:['insert'],mastered:[0]})));
   await page.reload();assert.match(await page.locator('[data-chapter="linear"]').textContent(),/1/);
   await page.locator('#linear-card').click();await page.locator('.lab-option[href="linked.html"]').click();
   await page.locator('#next').click();await page.locator('[data-view="quiz"][role="tab"]').click();
   assert.equal(await page.locator('.chapter-exam-entry a').getAttribute('href'),'exams.html?chapter=linear');
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhixu-learning-v1'))),{completed:['insert'],mastered:[0]});
   await page.locator('.brand').click();assert(page.url().endsWith('/index.html'));
   await page.screenshot({path:path.join(root,`work/home-${width}.png`),fullPage:true,animations:'disabled'});
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.locator('.chapter-card').first().evaluate(el=>getComputedStyle(el).animationName),'none');
   assert.deepEqual(errors,[]);await ctx.close();console.log('Home UI passed',width);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
