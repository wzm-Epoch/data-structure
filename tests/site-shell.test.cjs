const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
function shell(raw) {
  const notices=[];
  const document={querySelectorAll:()=>[],querySelector:s=>s==='main'?{prepend:n=>notices.push(n)}:null,getElementById:()=>null,addEventListener:()=>{},createElement:()=>({setAttribute:()=>{}})};
  const context=vm.createContext({document,location:{pathname:'/index.html'},localStorage:{getItem:()=>raw}});
  vm.runInContext(fs.readFileSync(path.join(root,'js/site-shell.js'),'utf8'),context);
  return {api:context.SiteShell,notices};
}
test('共享存档读取：损坏JSON、非数组、非法身份和重复项目不会阻断页面',()=>{
  for(const raw of ['{', 'null', '5', '{"completed":5,"mastered":{}}']) {
    const {api,notices}=shell(raw), saved=api.readProgress('test',{insert:{}},2);
    assert.equal(saved.completed.length,0);assert.equal(saved.mastered.length,0);assert.equal(notices.length,1);
  }
  const {api}=shell(JSON.stringify({completed:['insert','insert','__proto__','unknown',5],mastered:[0,0,-1,2,'1',1]}));
  assert.equal(JSON.stringify(api.readProgress('test',{insert:{}},2)),JSON.stringify({completed:['insert'],mastered:[0,1]}));
});
test('首次学习不误报存档损坏；正常记录可恢复',()=>{
  const first=shell(null);first.api.readProgress('test',{insert:{}},2);assert.equal(first.notices.length,0);
  const valid=shell('{"completed":["insert"],"mastered":[1]}');valid.api.readProgress('test',{insert:{}},2);assert.equal(valid.notices.length,0);
});
test('C高亮：单引号实体不被数字高亮破坏，HTML字符始终转义',()=>{
  const {api}=shell(null);
  const html=api.highlightC("int x = '<'; // 39 &",/\b(int)\b|\b(\d+)\b/g);
  assert(html.includes('&#39;&lt;&#39;'));assert(html.includes('&amp;'));
  assert(!html.includes('&#<span'));assert(!html.includes("'<"));
});
test('九页壳层：共享脚本先加载、移动清除、页签关联、离线资源存在',()=>{
  for(const name of ['index','linked','stack-queue','string','tree','graph','search','sort','algorithm']) {
    const html=fs.readFileSync(path.join(root,name+'.html'),'utf8');
    const scripts=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(scripts[0],'js/site-shell.js',name);
    for(const src of scripts)assert(fs.existsSync(path.join(root,src)),name+': '+src);
    for(const [,href] of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g))assert(fs.existsSync(path.join(root,href)),name+': '+href);
    for(const marker of ['id="mobile-clear"','<noscript>','name="description"','name="theme-color"'])assert(html.includes(marker),name+': '+marker);
    for(const [tag] of html.matchAll(/<button\b[^>]*role="tab"[^>]*>/g)) {
      for(const attr of ['aria-controls=','aria-selected=','tabindex='])assert(tag.includes(attr),name+': '+attr);
    }
  }
});
