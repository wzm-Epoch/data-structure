(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.StringLab=api;})(globalThis,function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const catalog={};
// A small fixed statement tree: rendered as C and interpreted only for registered lessons.
const A=(x,e,n='',event=null)=>({type:'set',x,e,n,event});
const I=(e,yes,no=[],n='判断条件')=>({type:'if',e,yes,no,n});
const W=(e,body,n='循环条件')=>({type:'while',e,body,n});
const R=e=>({type:'return',e,n:'返回结果'});
function register(key,title,body,info){body=[...(key==='substring'||key==='replace'?[{type:'declare',kind:'U',n:'声明并初始化临时串 U，length=0'}]:[]),{type:'declare',kind:'locals',n:'声明并初始化局部下标 i、j、a 为 0'},...body.filter(n=>n.type!=='declare')];const rows=[`int Run(Str *S, const Str *T, const Str *P, const Str *R, int p, int k, int all, int overlap, int out[M+1], int *count, int next[M+1], int nextval[M+1], int *pre, int *match) {`];
const ce=e=>e.replace(/\b(T|P|R)\./g,'$1->');
function render(list,depth){for(const node of list){const pad='    '.repeat(depth);node.line=rows.length+1;if(node.type==='declare')rows.push(pad+(node.kind==='U'?'Str U = {0};':'int i=0, j=0, a=0;'));if(node.type==='set')rows.push(pad+ce(node.x)+' = '+ce(node.e)+';');if(node.type==='return')rows.push(pad+'return '+ce(node.e)+';');if(node.type==='while'||node.type==='if'){rows.push(pad+(node.type==='while'?'while':'if')+' ('+ce(node.e)+') {');render(node.type==='while'?node.body:node.yes,depth+1);if(node.no?.length){rows.push(pad+'} else {');render(node.no,depth+1);}rows.push(pad+'}');}}}
render(body,1);rows.push('}');catalog[key]={key,title,body,source:rows,info};}
const loopCopy=(dest,src,start,end)=>[A('i',start,'设置复制下标'),W('i < '+end,[A(dest,src,'复制一个字符'),A('i','i+1','下标前进')])];
register('assign','赋值', [I('T.length > M',[R('0')]),...loopCopy('S->data[i]','T.data[i]','0','T.length'),A('S->length','T.length','更新有效长度'),R('1')],'S ← 输入 T；T 长度不得超过 M；成功 1，失败 0。O(|T|)，辅助空间 O(1)。');
register('copy','复制', clone(catalog.assign.body),'将已有串 T 逐字符复制给 S，T 不变；参数对象互不别名。成功 1。O(|T|)，辅助 O(1)。');
register('empty','判空',[R('S->length == 0')],'返回 1 为空、0 为非空；不修改 S。O(1)。');
register('length','取长度',[R('S->length')],'返回 S.length，不查找终止符。O(1)。');
register('clear','清空',[A('S->length','0','长度置零，旧字符留在物理空间'),R('1')],'S.length ← 0；返回 1。不擦除旧内存。O(1)。');
register('compare','字典序比较',[A('i','0'),W('i < S->length && i < T.length',[A('j','Cmp(S->data[i], T.data[i], match)','比较一对 ASCII 字符'),I('j != 0',[R('j < 0 ? -1 : 1')]),A('i','i+1')]),R('S->length == T.length ? 0 : (S->length < T.length ? -1 : 1)')],'按 ASCII 比较首个不同字符；相同前缀则短串小。返回 -1/0/1。O(min(n,t))；辅助 O(1)。');
register('concat','串连接',[I('S->length + T.length > M',[R('0')],[],'容量检查'),...loopCopy('S->data[S->length+i]','T.data[i]','0','T.length'),A('S->length','S->length+T.length'),R('1')],'S ← S·T；n+t≤M，失败保持 S。返回 1/0；O(t)，辅助 O(1)。');
const valid='p < 1 || p > S->length+1 || k < 0 || k > S->length-(p-1)';
register('substring','求子串',[I(valid,[R('0')]),...loopCopy('U.data[i]','S->data[p-1+i]','0','k'),A('U.length','k'),A('*S','U','提交子串结果'),R('1')],'本演示以 S 接收子串：1≤p≤n+1，0≤k≤n-p+1；p=n+1 仅允许 k=0。返回 1/0；本 C 示例含临时串初始化及整串提交，时间 O(M+k)，辅助 O(M)。');
register('insert','指定位置插入',[I('p < 1 || p > S->length+1 || S->length+T.length > M',[R('0')]),A('i','S->length-1'),W('i >= p-1',[A('S->data[i+T.length]','S->data[i]','后向移动，避免覆盖'),A('i','i-1')]),...loopCopy('S->data[p-1+i]','T.data[i]','0','T.length'),A('S->length','S->length+T.length'),R('1')],'在 p 位置之前插入 T；1≤p≤n+1，n+t≤M。返回 1/0；O(n+t)，辅助 O(1)。');
register('delete','指定位置删除',[I(valid,[R('0')]),A('i','p-1+k'),W('i < S->length',[A('S->data[i-k]','S->data[i]','前向移动填补空缺'),A('i','i+1')]),A('S->length','S->length-k'),R('1')],'删除从 p 起 k 个字符；范围同子串。返回 1/0；O(n)，辅助 O(1)。零长度合法且结果不变。');
register('replace','子串替换',[I('P.length == 0',[R('0')]),A('i','0'),W('i < S->length',[A('j','0'),W('j < P.length && i+j < S->length && Eq(S->data[i+j], P.data[j], match)',[A('j','j+1')]),I('j == P.length',[I('U.length+R.length > M',[R('0')]),A('a','0'),W('a < R.length',[A('U.data[U.length]','R.data[a]'),A('U.length','U.length+1'),A('a','a+1')]),A('i','i+P.length','原串扫描越过整个匹配')],[I('U.length == M',[R('0')]),A('U.data[U.length]','S->data[i]'),A('U.length','U.length+1'),A('i','i+1')])]),A('*S','U','全部成功后提交，失败不改原串'),R('1')],'P 为模式，R 为替换；拒绝空 P；左到右非重叠扫描原串，新增字符不再匹配。临时输出超 M 即失败。返回 1/0；O(M+nm+输出长度)，辅助 O(M)。');
function build(opt){const nodes=[A('i','0'),A('j','-1','-1 是控制状态，禁止读 P[-1]'),A('next[0]','-1','首表项哨兵','fill'),...(opt?[A('nextval[0]','-1','优化表首项','fill')]:[]),W('i < P.length',[I('j == -1 || Eq(P.data[i], P.data[j], pre)',[A('i','i+1'),A('j','j+1'),A('next[i]','j','记录候选最长边界长度；i=m 是终端边界','fill'),...(opt?[I('i < P.length',[I('Eq(P.data[i], P.data[j], pre)',[A('nextval[i]','nextval[j]','相同字符还会失败，跳过该候选','fill')],[A('nextval[i]','j','字符不同，保留候选','fill')])],[A('nextval[i]','j','终端只存边界，不读取 P[m]','fill')])]:[])],[A('j',opt?'nextval[j]':'next[j]','构表回退，保持 i','fallback')])])];function mark(list){for(const n of list){n.phase='预处理';if(n.body)mark(n.body);if(n.yes)mark(n.yes);if(n.no)mark(n.no);}}mark(nodes);return nodes;}
for(const opt of [false,true])register(opt?'buildNextval':'buildNext',opt?'构建 nextval':'构建 next',build(opt).concat(R('1')),'匹配表下标 0..m-1；额外 m 项是完整匹配后的终端边界。构建 O(m)，辅助 O(m)；空模式仅初始化哨兵。');
const emptyMatch=I('P.length == 0',[A('i','0'),W('i <= S->length',[A('out[*count]','i+1','空模式在字符边界匹配','found'),A('*count','*count+1'),I('!all',[R('1')]),A('i','i+1')]),R('1')]);
for(const key of ['bf','kmp','kmpval']){
const opt=key==='kmpval',table=opt?'nextval':'next';
const find=[A('out[*count]','i-P.length+1','记录逻辑位置 i-m+1','found'),A('*count','*count+1'),I('!all',[R('out[0]')])];
const body=key==='bf'?[A('a','0'),W('a <= S->length-P.length',[A('i','a'),A('j','0'),W('j < P.length && Eq(S->data[i], P.data[j], match)',[A('i','i+1'),A('j','j+1')]),I('j == P.length',[...find,A('a','a+(overlap ? 1 : P.length)','找到后按策略移动起点')],[A('a','a+1','BF 失配：新起点=旧 i-j+1','mismatch')]),A('i','a','BF 主串指针回到新起点'),A('j','0','模式指针复位')])]:[...build(opt),A('i','0','匹配从主串首字符开始'),A('j','0'),W('i < S->length',[I('j == -1 || Eq(S->data[i], P.data[j], match)',[A('i','i+1'),A('j','j+1'),I('j == P.length',[...find,A('j',`overlap ? ${table}[P.length] : 0`,'完整匹配：重叠取终端边界，非重叠置零；i 不回退','fallback')])],[A('j',`${table}[j]`,'KMP 失配：仅 j 回退，i 保持；对齐起点 i-j 右移','fallback')])])];
register(key,{bf:'BF 朴素匹配',kmp:'KMP · next',kmpval:'KMP · nextval'}[key],[emptyMatch,...body,R('*count == 0 ? 0 : out[0]')],key==='bf'?'首个/全部结果均以逻辑位置输出；BF 最坏 O(nm)，辅助 O(1)（不含输出）。':'先构表再匹配；预处理 O(m)，匹配 O(n)，辅助 O(m)（不含输出）。小输入未必比较更少。');
}
function declaration(capacity=16){return `#include <stdio.h>\n#define M ${capacity}\ntypedef struct { unsigned char data[M]; int length; } Str;\n/* 有效范围 data[0..length-1]，无须终止符。Eq 只统计实际字符比较。 */\nint Eq(unsigned char a, unsigned char b, int *counter) { ++*counter; return a == b; }\nint Cmp(unsigned char a, unsigned char b, int *counter) { ++*counter; return (int)a - (int)b; }`;}
function generate({operation='kmp',text='ababcabcacbab',other='abc',pattern='abcac',replacement='X',capacity=16,position=1,length=0,all=true,overlap=true}={}){
const lesson=catalog[operation];if(!lesson)throw Error('未知操作');
if(!Number.isInteger(capacity)||capacity<1||capacity>32)throw Error('容量 M 必须为 1–32 的整数');
for(const v of [text,other,pattern,replacement]){if(typeof v!=='string'||/[^\x20-\x7e]/.test(v))throw Error('仅支持可打印 ASCII（英文、数字、空格和标点，编码 32–126）；不支持中文、换行或制表符。');if(v.length>capacity)throw Error('输入串长度超过容量 M，请增大容量；不会截断。');}
for(const v of [position,length])if(!Number.isInteger(v)||Math.abs(v)>1000000)throw Error('位置和长度必须为 -1000000 到 1000000 的整数');
const str=v=>({data:[...v].concat(Array(capacity-v.length).fill(null)),length:v.length});
const s={S:str(text),T:str(other),P:str(pattern),R:str(replacement),U:str(''),vars:{i:null,j:null,a:null,p:position,k:length,all:Number(all),overlap:Number(overlap),count:0,pre:0,match:0},next:Array(pattern.length+1).fill(null),nextval:Array(pattern.length+1).fill(null),out:Array(text.length+1).fill(null),line:null,action:'尚未执行代码',condition:null,comparison:null,access:null,changed:null,event:null,done:false,result:null,phase:'准备',reads:[]};
s.U.length=null;const steps=[clone(s)];
// Expressions originate exclusively in the registry above, never from user input.
function convert(e){return e.replace(/S->/g,'S.').replace(/\*S\b/g,'S').replace(/\*(count|pre|match)\b/g,'$1').replace(/\bM\b/g,String(capacity));}
const cache=new Map();
function env(){const v={...s,...s.vars};for(const name of ['S','T','P','R','U']){v[name]=new Proxy(s[name],{get(obj,field){if(field!=='data')return obj[field];return new Proxy(obj.data,{get(arr,key){if(/^\d+$/.test(String(key))){const i=Number(key);if(i>=s[name].length)throw Error('非法字符读取 '+name+'['+i+']');s.reads.push({name,index:i,value:arr[i]});}return arr[key];},set(arr,key,value){const i=Number(key);if(!Number.isInteger(i)||i<0||i>=capacity)throw Error('非法字符写入');arr[i]=value;return true;}});},set(obj,field,value){obj[field]=value;return true;}});}
for(const name of ['next','nextval','out'])v[name]=new Proxy(s[name],{get(arr,key){if(/^\d+$/.test(String(key))){const i=Number(key);if(i>=arr.length||arr[i]===null)throw Error('非法表项读取 '+name+'['+i+']');if(name!=='out')s.access={table:name,index:i,value:arr[i]};}return arr[key];},set(arr,key,value){const i=Number(key);if(!Number.isInteger(i)||i<0||i>=arr.length)throw Error('非法表项写入');arr[i]=value;return true;}});
return v;}
function expr(e){let f=cache.get(e);if(!f){f=Function('v',`with(v){return (${convert(e)});}`);cache.set(e,f);}const v=env();for(const fn of ['Eq','Cmp'])v[fn]=(a,b,_counter)=>{const which=/, pre\)/.test(e)?'pre':'match';s.vars[which]++;s.comparison={left:a,right:b,equal:a===b,expression:e,reads:clone(s.reads)};if(a==null||b==null)throw Error('非法字符读取');return fn==='Eq'?Number(a===b):a.charCodeAt(0)-b.charCodeAt(0);};return f(v);}
function snapshot(node,condition=null){s.line=node.line;s.action=node.n||node.x+' ← '+node.e;s.condition=condition;s.event=node.event||((s.comparison&&!s.comparison.equal)?'mismatch':null);s.phase=node.phase||(node.n==='匹配从主串首字符开始'||operation==='bf'?'匹配':s.phase);steps.push(clone(s));}
function* walk(nodes){for(const n of nodes){s.comparison=null;s.access=null;s.changed=null;s.reads=[];
if(n.type==='declare'){if(n.kind==='U')s.U.length=0;else Object.assign(s.vars,{i:0,j:0,a:0});snapshot(n);yield 0;}
else if(n.type==='set'){const target=convert(n.x);const value=target==='S'?clone(s[n.e]):expr(n.e);const v=env();if(/^[a-z]+$/.test(target)&&target!=='S')s.vars[target]=value;else if(target==='S')s.S=clone(value);else {Function('v','value',`with(v){${target}=value;}`)(v,value);}s.changed=n.x;snapshot(n);yield 0;}
else if(n.type==='return'){s.result=Number(expr(n.e));s.done=true;snapshot(n);yield 0;return true;}
else if(n.type==='if'){const c=Boolean(expr(n.e));snapshot(n,c);yield 0;if(yield* walk(c?n.yes:n.no||[]))return true;}
else {while(true){s.comparison=null;s.access=null;s.changed=null;s.reads=[];const c=Boolean(expr(n.e));snapshot(n,c);yield 0;if(!c)break;if(yield* walk(n.body))return true;}}}}
for(const _ of walk(lesson.body)){if(steps.length>150000)throw Error('演示轨迹过长，请缩短输入');}
return {lesson,capacity,steps,options:{text,other,pattern,replacement,capacity,position,length,all,overlap},result:steps.at(-1)};
}
return {catalog,generate,declaration,inspect:s=>s.S.data.slice(0,s.S.length).join('')};
});
