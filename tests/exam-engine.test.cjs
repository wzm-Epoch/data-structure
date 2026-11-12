const {test} = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/exam-engine.js');
// Synthetic fixtures exercise storage/interaction semantics; they are never shipped as exam questions.
const questions = [
  {id:'2026-01',year:2026,number:1,chapters:['linear'],title:'位置',stem:'条件',options:['a','b','c','d'],answer:1,type:'choice',requiresSource:false,verified:true},
  {id:'2025-02',year:2025,number:2,chapters:['tree','algorithm'],title:'看图',stem:'配图请查来源',options:[],answer:2,type:'choice',requiresSource:true,verified:false},
  {id:'2017-41',year:2017,number:41,chapters:['string','algorithm'],title:'KMP',stem:'设计',options:[],answer:null,type:'written',requiresSource:false,verified:true},
  {id:'2024-42',year:2024,number:42,chapters:['graph'],title:'综合图题',stem:'原题',options:[],answer:null,type:'written',requiresSource:true,verified:false}
];
const fresh=()=>E.readState(null,questions).state;
test('真题存档：无存档不误报，损坏或无效结构安全恢复，丢弃未知身份与非法选项',()=>{
  assert.equal(E.readState(null,questions).damaged,false);
  for(const raw of ['{','null','5','[]','{"version":1,"records":[]}']) assert.equal(E.readState(raw,questions).damaged,true);
  const state=E.readState('{"version":1,"records":{"unknown":{"selected":0},"__proto__":{"polluted":true},"2026-01":{"selected":99,"submitted":true},"2017-41":{"draft":5,"assessment":"mastered"}}}',questions).state;
  assert.equal(Object.keys(state.records).length,2);
  assert.equal(E.getRecord(state,questions[0]).selected,null);
  assert.equal(E.getRecord(state,questions[0]).submitted,false);
  assert.equal(E.getRecord(state,questions[2]).assessment,null);
  assert.equal({}.polluted,undefined);
});
test('需原题选择题必须确认完整题面，来源匹配与核验题答对分开计数',()=>{
  let s=E.updateRecord(fresh(),questions[1],{selected:2,submitted:true});
  assert.equal(E.getRecord(s,questions[1]).submitted,false);
  s=E.updateRecord(s,questions[1],{sourceSeen:true,submitted:true});
  s=E.updateRecord(s,questions[0],{selected:1,submitted:true});
  assert.equal(E.outcome(questions[1],s.records['2025-02']),'source-match');
  assert.equal(E.summarize(questions,s).correct,1);
  assert.equal(E.summarize(questions,s).sourceMatches,1);
  s=E.updateRecord(s,questions[1],{sourceSeen:false});
  assert.equal(E.getRecord(s,questions[1]).submitted,false);
});
test('真题筛选：多章标签、年份、题型与关键词交集正确，空结果正常',()=>{
  const s=fresh();
  assert.deepEqual(E.filterQuestions(questions,{chapter:'algorithm'},s).map(q=>q.id),['2025-02','2017-41']);
  assert.deepEqual(E.filterQuestions(questions,{chapter:'algorithm',year:'2017',type:'written',query:'kmp'},s).map(q=>q.id),['2017-41']);
  assert.equal(E.filterQuestions(questions,{chapter:'sort'},s).length,0);
  assert.equal(E.filterQuestions(questions,{year:'2023',query:'位置'},s).length,0);
  assert.equal(E.filterQuestions(questions,{chapter:'__proto__',year:'bad'},s).length,4);
});
test('综合题草稿与自评分开，未揭示或未看完整来源不能伪造掌握记录',()=>{
  let s=E.updateRecord(fresh(),questions[2],{draft:'我的思路',assessment:'mastered'});
  assert.equal(E.outcome(questions[2],E.getRecord(s,questions[2])),'draft');
  s=E.updateRecord(s,questions[2],{revealed:true,assessment:'mastered'});
  assert.equal(E.summarize(questions,s).writtenMastered,1);
  assert.equal(E.summarize(questions,s).correct,0);
  s=E.updateRecord(s,questions[2],{revealed:false});
  assert.equal(E.getRecord(s,questions[2]).assessment,'mastered');
  s=E.updateRecord(s,questions[3],{revealed:true,assessment:'mastered'});
  assert.equal(E.getRecord(s,questions[3]).assessment,null);
  s=E.updateRecord(s,questions[3],{sourceSeen:true,assessment:'review'});
  assert.equal(E.getRecord(s,questions[3]).assessment,'review');
  s=E.updateRecord(s,questions[2],{draft:'x'.repeat(13000)});
  assert.equal(E.getRecord(s,questions[2]).draft.length,12000);
});
test('筛选与单题重做不丢失其他题作答，原状态不被修改',()=>{
  const initial=fresh(); let s=E.updateRecord(initial,questions[0],{selected:0,submitted:true});
  s=E.updateRecord(s,questions[2],{draft:'保留草稿'});
  assert.equal(Object.keys(initial.records).length,0);
  assert.deepEqual(E.filterQuestions(questions,{status:'review'},s).map(q=>q.id),['2026-01']);
  assert(E.filterQuestions(questions,{status:'unanswered'},s).some(q=>q.id==='2017-41'));
  const reset=E.resetRecord(s,'2026-01');
  assert.equal(E.getRecord(reset,questions[2]).draft,'保留草稿');
  assert.equal(E.getRecord(reset,questions[0]).submitted,false);
  assert.equal(E.getRecord(s,questions[0]).submitted,true);
  const roundtrip=E.readState(JSON.stringify(s),questions).state;
  assert.equal(E.getRecord(roundtrip,questions[2]).draft,'保留草稿');
});
test('来源链接拒绝脚本和无效地址；缺参考答案的选择只记作答不宣称正确',()=>{
  assert.equal(E.safeSource('javascript:alert(1)'),'');
  assert.equal(E.safeSource('data:text/html,x'),'');
  assert.equal(E.safeSource('/relative'),'');
  assert.equal(E.safeSource('https://example.com/question/1'),'https://example.com/question/1');
  const q={...questions[0],answer:null};
  assert.equal(E.outcome(q,{selected:0,submitted:true}),'recorded');
});
