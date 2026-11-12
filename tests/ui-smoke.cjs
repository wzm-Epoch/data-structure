/* Run with node tests/ui-smoke.cjs [path-to-playwright-core]. No package download. */
const { chromium } = require(process.argv[2] || 'playwright-core');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const pages = ['sequence','linked','stack-queue','string','tree','graph','search','sort','algorithm'];
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {channel:'chrome'})});
  const results = [];
  try {
    for (const name of pages) {
      console.log('Checking',name);
      const context = await browser.newContext({viewport:{width:360,height:800}});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(path.join(root,name+'.html')).href);
      await page.locator('#timeline').waitFor();
      assert.equal(await page.locator('.chapter-switch a').count(), 9, name+' navigation');
      assert(await page.locator('#mobile-clear').isVisible(), name+' mobile clear');
      assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(),1,name+' roving tabs');
      const before = await page.locator('#timeline').inputValue();
      await page.locator('#next').click();
      assert.notEqual(await page.locator('#timeline').inputValue(),before,name+' next');
      // A focused button must permit arrow navigation and complete snapshot rollback.
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.locator('#timeline').inputValue(),before,name+' keyboard rollback');
      await page.locator('[role="tab"]').first().focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[role="tab"][aria-selected="true"]').count(),1);
      await page.locator('[role="tab"][data-view="demo"]').click();
      const predict = page.locator('#predict-toggle,#predict');
      await predict.check();
      await page.locator('#next').click();
      const choiceHost = page.locator('#prediction-options,#choices,#prediction').filter({visible:true});
      // Retain the exact choice node and feedback across repeated Next clicks.
      await page.evaluate(() => { window.testChoice = document.querySelector('#prediction button'); });
      await page.locator('#next').click();
      assert(await page.evaluate(() => window.testChoice === document.querySelector('#prediction button')),name+' prediction guard');
      const correct=page.locator('#prediction button[data-good="true"],#prediction button[data-correct="true"]');
      if(await correct.count()) {
        await correct.first().click();
        const feedback=await page.locator('#prediction-feedback').textContent();
        await page.locator('#next').click();
        assert.equal(await page.locator('#prediction-feedback').textContent(),feedback,name+' answered prediction preserved');
        assert(await page.locator('#reveal,#prediction-reveal').isVisible());
      }
      await predict.uncheck();
      const otherKey=name==='sequence'?'zhixu-tree-v1':'zhixu-learning-v1';
      await page.evaluate(key=>localStorage.setItem(key,'keep-other-chapter'),otherKey);
      await page.locator('#mobile-clear').click();
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),otherKey),'keep-other-chapter',name+' independent progress');
      assert.deepEqual(errors,[],name+' page errors');
      results.push({page:name,mobile:true,keyboard:true,prediction:true,errors});
      await context.close();
    }
    {
      const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();
      await page.goto(pathToFileURL(path.join(root,'sequence.html')).href);
      await page.click('[data-preset="empty"]');
      await page.locator('#timeline').evaluate(el=>{el.value=el.max;el.dispatchEvent(new Event('input'));});
      assert(await page.locator('#reuse-result').isEnabled());
      await page.click('#reuse-result');assert.equal(await page.locator('#array-input').inputValue(),'66');
      const downloadPromise=page.waitForEvent('download');await page.click('#download');
      const download=await downloadPromise;assert.equal(download.suggestedFilename(),'sequence-insert.c');
      await page.click('#clear-progress');await page.click('[data-preset="full"]');
      await page.locator('#timeline').evaluate(el=>{el.value=el.max;el.dispatchEvent(new Event('input'));});
      assert(await page.locator('#reuse-result').isDisabled());
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhixu-learning-v1')).completed),[]);
      await page.click('[data-preset="default"]');await page.selectOption('#breakpoint','condition');await page.selectOption('#speed','450');
      await page.click('#play');await page.locator('#pause-message').filter({hasText:'已在关键步骤前暂停'}).waitFor();
      const before=Number(await page.locator('#timeline').inputValue());await page.click('#next');
      assert.equal(Number(await page.locator('#timeline').inputValue()),before+1);
      results.push({page:'sequence',presets:true,reuse:true,download:true,fullFailure:true,breakpoint:true});
      await context.close();
    }
    // Distinguish normal zero-valued results from actual operation failure.
    {
      const context=await browser.newContext(),page=await context.newPage();
      const finish=()=>page.locator('#timeline').evaluate(el=>{el.value=el.max;el.dispatchEvent(new Event('input'));});
      await page.goto(pathToFileURL(path.join(root,'string.html')).href);
      for(const [op,text,other,capacity,expected] of [['concat','abcd','ef',4,false],['compare','ab','ab',4,true],['length','','',4,true],['empty','a','',4,true],['kmp','abcd','',4,true]]) {
        await page.click('#clear-progress');
        await page.selectOption('#operation',op);
        await page.fill('#text',text);
        if(['concat','compare'].includes(op))await page.fill('#other',other);
        await page.fill('#capacity',String(capacity));
        if(op==='kmp')await page.fill('#pattern','z');
        await page.click('#generate');
        assert(await page.locator('#input-error').isHidden());
        await finish();
        const completed=await page.evaluate(()=>JSON.parse(localStorage.getItem('zhixu-string-v1')).completed);
        assert.equal(completed.includes(op),expected,op+' completion');
      }
      await page.goto(pathToFileURL(path.join(root,'tree.html')).href);
      await page.selectOption('#operation','buildPre');await page.fill('#failAt','1');await page.click('#generate');
      assert.equal(await page.locator('#input-error').textContent(),'');
      await finish();
      assert(!(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhixu-tree-v1')).completed)).includes('buildPre'));
      results.push({completion:'string capacity failure, equality/empty/zero length/no match; tree allocation failure',passed:true});
      await context.close();
    }
    for (const name of ['string','tree']) {
      const context = await browser.newContext();
      await context.addInitScript(({name})=>localStorage.setItem('zhixu-'+name+'-v1',JSON.stringify({completed:5,mastered:[-1,1000,'x']})),{name});
      const page = await context.newPage();
      await page.goto(pathToFileURL(path.join(root,name+'.html')).href);
      assert(await page.locator('.storage-notice').isVisible());
      await page.locator('#next').click();
      assert.equal(await page.locator('#timeline').inputValue(),'1');
      results.push({page:name,corruptStorage:true});
      await context.close();
    }
    const context = await browser.newContext({viewport:{width:1280,height:900}}), page = await context.newPage();
    await page.goto(pathToFileURL(path.join(root,'algorithm.html')).href);
    await page.selectOption('#operation','permutation');
    await page.fill('#input',JSON.stringify({values:[1,2,3,4,5],dedup:false}));
    await page.click('#generate');
    assert.equal(await page.locator('#error').textContent(),'');
    const steps = Number(await page.locator('#timeline').getAttribute('max'));
    assert(steps>1000);
    assert(await page.locator('#log button').count()<=303);
    await page.evaluate(()=>{ window.codeNode=document.querySelector('#code').firstElementChild;window.lessonNode=document.querySelector('#lesson').firstElementChild; });
    for(const fraction of [.25,.5,.75,1,0]) {
      await page.locator('#timeline').evaluate((el,f)=>{el.value=Math.floor(Number(el.max)*f);el.dispatchEvent(new Event('input'));},fraction);
      assert(await page.locator('#log button').count()<=303);
      assert(await page.evaluate(()=>window.codeNode===document.querySelector('#code').firstElementChild && window.lessonNode===document.querySelector('#lesson').firstElementChild));
      if(fraction>0 && fraction<1) assert(await page.locator('#code .active').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1;}));
    }
    results.push({page:'algorithm',longTraceSteps:steps,boundedLog:true,cachedPanels:true,highlightVisible:true});
    const synthetic=await page.evaluate(()=>{
      const host=document.createElement('div');document.body.append(host);
      const steps=Array.from({length:70000},(_,i)=>({event:'update',explanation:'步骤 '+i}));
      let target=-1;const jump=i=>{target=i;};
      const start=performance.now();SiteShell.windowLog(host,steps,35000,jump);
      const ms=performance.now()-start,count=host.querySelectorAll('button').length;
      host.lastElementChild.click();
      SiteShell.windowLog(host,steps,target,jump);
      const active=host.querySelector('.active').dataset.step;host.remove();
      return {steps:steps.length,count,ms,target,active};
    });
    assert(synthetic.count<=303);assert.equal(synthetic.target,69999);assert.equal(synthetic.active,'69999');
    results.push({syntheticLog:synthetic});
    await context.close();
    fs.writeFileSync(path.join(root,'work/audit-ui-results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
