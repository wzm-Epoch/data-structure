const fs=require('fs'),path=require('path'),cp=require('child_process'),a=require('assert/strict'),E=require('../js/sort-engine');
const dir=path.resolve(__dirname,'../work/sort-c-check');fs.mkdirSync(dir,{recursive:true});const gcc=process.argv[2]||'D:/Dev-Cpp/MinGW64/bin/gcc.exe';
const keys=['comparisons','preComparisons','mainWrites','auxWrites','swaps','maxDepth','diskReads','diskWrites','rounds','ok'];let count=0;
for(let op of Object.keys(E.catalog)){
let cases=[[],[1],[2,1],[3,1,3,2],[-2147483648,2147483647,0,-2147483648],[1,0,0,0],[5,4,3,2,1],[7,7,7,7],Array.from({length:15},(_,i)=>(i*7)%13-6)];
for(let direction of [1,-1])for(let v of cases){if(op==='counting'&&v.includes(-2147483648))continue;if(op==='segments'){let half=Math.floor(v.length/2);v=[...v.slice(0,half).sort((a,b)=>a<b?-direction:a>b?direction:0),...v.slice(half).sort((a,b)=>a<b?-direction:a>b?direction:0)];}
for(let failAt of [0,...(['merge','counting','radix','loser','replacement'].includes(op)?[1]:[])]){
let t=E.generate({operation:op,values:v,dir:direction,memory:8,block:2,failAt,trace:false}),s=t.steps[0];let initial=E.generate({operation:op,values:v,dir:direction,memory:8,block:2,failAt}).steps[0];
let init=`n=${v.length};dir=${direction};memory=8;poolSize=4;block=2;ways=${op==='two'?2:3};failAt=${failAt};split=${Math.floor(v.length/2)};ng=${initial.ng};`+initial.gaps.map((g,i)=>`gaps[${i}]=${g};`).join('')+t.input.map((r,i)=>`A[${i}]=(Rec){${r.key===-2147483648?'INT32_MIN':r.key},${i},${r.order}};`).join('');
let source=E.cSource(op)+`\n#include <stdio.h>\nint main(void){${init} Run${op}();for(int i=0;i<n;i++)printf("%d:%d ",A[i].key,A[i].id);printf("\\n");printf("${keys.map(()=>'%d').join(' ')}\\n",${keys.join(',')});printf("%d\\n",nr);for(int r=0;r<nr;r++){for(int j=0;j<Lens[r];j++)printf("%d:%d ",R[r][j].key,R[r][j].id);printf("\\n");}return 0;}`;
let file=path.join(dir,'case.c'),exe=path.join(dir,'case.exe');fs.writeFileSync(file,source);let c=cp.spawnSync(gcc,['-std=c11','-Wall','-Wextra','-O0',file,'-o',exe],{encoding:'utf8'});if(c.status!==0)throw Error(c.stderr);let r=cp.spawnSync(exe,[],{encoding:'utf8'});a.equal(r.status,0,op);let lines=r.stdout.replace(/\r/g,'').split('\n');a.equal(lines[0].trim(),t.result.A.map(r=>`${r.key}:${t.input.findIndex(q=>q.id===r.id)}`).join(' '),op+'records');a.deepEqual(lines[1].trim().split(' ').map(Number),keys.map(k=>Number(t.result[k])),op+'counts '+JSON.stringify(v)+' dir'+direction);a.equal(Number(lines[2]),t.result.nr);for(let j=0;j<t.result.nr;j++)a.equal(lines[3+j].trim(),t.result.R[j].slice(0,t.result.Lens[j]).map(r=>`${r.key}:${t.input.findIndex(q=>q.id===r.id)}`).join(' '),op+'runs');count++;
}}}

for(let op of ['two','multi','loser'])for(let direction of [1,-1]){
let values=direction===1?' | -2147483648A,3B,2147483647C | 0D | 3E,2147483647F':' | 2147483647A,3B,-2147483648C | 0D | 2147483647E,3F';
let t=E.generate({operation:op,values,dir:direction,memory:8,block:2}),s=t.steps[0];
let rec=r=>`(Rec){${r.key===-2147483648?'INT32_MIN':r.key},${t.input.findIndex(q=>q.id===r.id)},${r.order}}`;
let init=`n=${s.n};nr=${s.nr};dir=${direction};memory=8;poolSize=4;block=2;ways=${s.ways};`+s.A.map((r,i)=>`A[${i}]=${rec(r)};`).join('');
for(let r=0;r<s.nr;r++)init+=`Lens[${r}]=${s.Lens[r]};`+s.R[r].slice(0,s.Lens[r]).map((v,j)=>`R[${r}][${j}]=${rec(v)};`).join('');
let source=E.cSource(op)+`\n#include <stdio.h>\nint main(void){${init}Run${op}();for(int i=0;i<n;i++)printf("%d:%d ",A[i].key,A[i].id);printf("\\n${keys.map(()=>'%d').join(' ')}\\n",${keys.join(',')});return 0;}`;
let file=path.join(dir,'provided.c'),exe=path.join(dir,'provided.exe');fs.writeFileSync(file,source);let c=cp.spawnSync(gcc,['-std=c11','-Wall','-Wextra','-O0',file,'-o',exe],{encoding:'utf8'});a.equal(c.status,0,c.stderr);let r=cp.spawnSync(exe,[],{encoding:'utf8'});a.equal(r.status,0);let lines=r.stdout.replace(/\r/g,'').split('\n');a.equal(lines[0].trim(),t.result.A.map(r=>`${r.key}:${t.input.findIndex(q=>q.id===r.id)}`).join(' '));a.deepEqual(lines[1].trim().split(' ').map(Number),keys.map(k=>Number(t.result[k])));count++;
}
console.log('排序实际C：'+count+'场景记录顺序、归并段及全部主要计数一致');
