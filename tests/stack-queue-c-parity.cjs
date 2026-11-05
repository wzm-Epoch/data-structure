// Compile exactly the C functions shown by the UI, one structure at a time.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const Lab = require('../js/stack-queue-engine.js');
const directory = path.resolve(__dirname,'../work/stack-queue-c-check'); fs.mkdirSync(directory,{recursive:true});
const gcc = process.argv[2] || 'gcc'; let total = 0;
for (const kind of Object.keys(Lab.kinds)) {
  const array = ['arrayStack','circularQueue'].includes(kind), stack = kind.endsWith('Stack');
  const lessons = Object.values(Lab.catalog).filter(l => l.kind === kind), cases=[];
  for (let n=0;n <= (kind==='circularQueue'?7:8);n++) for(let front=0;front<(kind==='circularQueue'?8:1);front++) for(const l of lessons) for(const failAt of !array && l.op==='add'?[0,1]:[0]) {
    if(l.op==='init' && n) continue;
    cases.push({operation:l.key,values:Array.from({length:n},(_,i)=>i%3-1),front,failAt,value:66});
  }
  const calls = lessons.map((l,i)=> `case ${i}: returned=${l.fn}(&S${l.op==='add'?',66':['peek','remove'].includes(l.op)?',&output':''}); break;`).join('\n');
  const source = `#include <stdio.h>\n${Lab.declaration(kind)}
int attempts=0,releases=0,failure=0;
void *Alloc(size_t size) { ++attempts; if(failure) return NULL; return malloc(size); }
void Release(void *p) { ++releases; free(p); }
#define malloc Alloc
#define free Release
${lessons.map(l=>l.source.join('\n')).join('\n')}
#undef malloc
#undef free
int main(void) { int code,n,f,fail,i,a[8];
while(scanf("%d%d%d%d",&code,&n,&f,&fail)==4) {
  for(i=0;i<n;i++) if(scanf("%d",&a[i])!=1) return 2;
  Structure S; int output=999999,returned=0,count=0,consistent=1;
  ${array ? `for(i=0;i<M;i++) S.data[i]=999999;
  ${stack?'S.top=n; for(i=0;i<n;i++) S.data[i]=a[i];':'S.front=f; S.rear=(f+n)%M; for(i=0;i<n;i++) S.data[(f+i)%M]=a[i];'}` : `Node *H=malloc(sizeof *H),*tail=H; if(!H)return 3; H->next=NULL;
  for(i=0;i<n;i++) { Node *p=malloc(sizeof *p); if(!p)return 3; p->data=a[i];p->next=NULL;tail->next=p;tail=p; }
  ${stack?'S.top=H;':'S.front=H;S.rear=tail;'}`}
  attempts=0;releases=0;failure=fail;
  switch(code) { ${calls} default:return 4; }
  printf("%d %d %d %d",returned,output,attempts,releases);
  ${array ? stack ? 'for(i=0;i<S.top;i++) printf(" %d",S.data[i]);' : 'for(i=S.front;i!=S.rear;i=(i+1)%M) { if(++count>M)return 5;printf(" %d",S.data[i]); }' : `Node *p=H->next,*last=H;while(p) { if(++count>10)return 6;printf(" %d",p->data);last=p;p=p->next; } ${stack?'':'if(S.rear!=last || S.rear->next!=NULL)consistent=0;'} if(!consistent)return 7;
  p=H;while(p){Node *next=p->next;free(p);p=next;}`}
  puts("");
}return 0; }
`;
  const c=path.join(directory,kind+'.c'), exe=path.join(directory,kind+'.exe');fs.writeFileSync(c,source);
  const compiled=spawnSync(gcc,['-std=c11','-Wall','-Wextra',c,'-o',exe],{encoding:'utf8'}); assert.equal(compiled.status,0,compiled.stderr);
  const input=cases.map(x=>[lessons.findIndex(l=>l.key===x.operation),x.values.length,x.front,x.failAt,...x.values].join(' ')).join('\n')+'\n';
  const run=spawnSync(exe,[],{input,encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(run.status,0,run.stderr);
  const rows=run.stdout.trim().split(/\r?\n/);assert.equal(rows.length,cases.length);
  rows.forEach((row,i)=> {const t=Lab.generate(cases[i]),s=t.steps.at(-1),actual=row.split(' ').map(Number);assert.deepEqual(actual,[Number(s.result),s.vars['*e']??999999,s.attempts,s.frees,...Lab.inspect(s)],JSON.stringify(cases[i]));});
  total+=cases.length;console.log(kind+': '+cases.length+' cases passed');
}
console.log('C parity total: '+total);
