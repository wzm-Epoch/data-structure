const {test} = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/exam-engine.js');
const early = require('../js/exam-data-early.js');
const late = require('../js/exam-data-late.js');
const data=[...early,...late];
test('十年真题覆盖：每年13题、唯一身份、正确年份题号与来源',()=>{
  assert.equal(data.length,130);
  assert.equal(new Set(data.map(q=>q.id)).size,130);
  for(let year=2017;year<=2026;year++) {
    const row=data.filter(q=>q.year===year);
    assert.equal(row.length,13,String(year));
    assert.deepEqual(row.map(q=>q.number).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10,11,41,42]);
  }
  for(const q of data) {
    assert.equal(q.id,`${q.year}-${String(q.number).padStart(2,'0')}`);
    assert.equal(q.source,`https://zhenti.beokayy.club/question/${q.id}`);
    assert.equal(E.safeSource(q.source),q.source);
    assert.equal(q.type,q.number<40?'choice':'written',q.id);
  }
});
test('题目资料完整性：八章覆盖、非空文本、标记一致、无缺图伪核验',()=>{
  const covered=new Set();
  for(const q of data) {
    assert(Array.isArray(q.chapters)&&q.chapters.length,q.id);
    for(const chapter of q.chapters) { assert(Object.hasOwn(E.chapters,chapter),`${q.id} ${chapter}`); covered.add(chapter); }
    assert.equal(new Set(q.chapters).size,q.chapters.length,q.id);
    for(const field of ['title','stem','explanation','sourceNote']) {
      assert.equal(typeof q[field],'string',`${q.id} ${field}`);
      assert(q[field].trim().length>0,`${q.id} ${field}`);
      assert(!q[field].includes('\ufffd'),`${q.id} ${field} invalid character`);
    }
    assert.equal(typeof q.requiresSource,'boolean',q.id);
    assert.equal(typeof q.verified,'boolean',q.id);
    assert(!(q.requiresSource&&q.verified),`${q.id} source-required cannot claim independent verification`);
    assert(Array.isArray(q.options),q.id);
    if(q.type==='choice') {
      assert(q.options.length===4||(q.requiresSource&&q.options.length===0),q.id);
      assert(q.options.every(x=>typeof x==='string'&&x.trim()),q.id);
      assert((!q.verified&&q.answer===null)||(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4),q.id);
    } else { assert.equal(q.answer,null,q.id); assert.equal(q.options.length,0,q.id); }
  }
  assert.deepEqual([...covered].sort(),Object.keys(E.chapters).sort());
});
