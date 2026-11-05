(function(g){const R=typeof module==='object'?require('./sort-runtime'):g.SortRuntime,d=R.define;
d('Runs','int','','int lo,hi,i,r',`lo = 0;
r = 0;
while (lo < n) {
hi = Min(n-1,lo+memory-1);
i = lo;
while (i <= hi) {
if ((i-lo) % block == 0) {
ReadBlock();
}
i = i + 1;
}
Insertion(lo,hi,1);
i = lo;
while (i <= hi) {
PutR(r,Lens[r],A[i]);
Lens[r] = Lens[r] + 1;
if (Lens[r] % block == 0) {
WriteBlock();
}
i = i + 1;
}
if (Lens[r] % block != 0) {
WriteBlock();
}
Mark(lo,hi,5);
r = r + 1;
lo = hi + 1;
}
nr = r;
return 0;`);
d('Head','int','int r','',`if (Pos[r] < Lens[r]) {
if (Pos[r] % block == 0) {
ReadBlock();
}
PutH(r,R[r][Pos[r]]);
}
return 0;`);
d('Winner','int','int a, int b','int c',`if (a < 0) {
return b;
}
if (b < 0) {
return a;
}
if (Pos[a] >= Lens[a]) {
return b;
}
if (Pos[b] >= Lens[b]) {
return a;
}
c = Cmp(H[a].key,H[b].key);
if (c < 0 || (c == 0 && H[a].order < H[b].order)) {
return a;
}
return b;`);
d('Match','int','int p','int a,b,w',`a = W[2*p];
b = W[2*p+1];
w = Winner(a,b);
W[p] = w;
if (w == a) {
Loser[p] = b;
}
else {
Loser[p] = a;
}
return 0;`);
d('External','int','int tree','int start,end,r,out,i,w,p,base,j,total',`if (nr == 0) {
Runs();
}
while (nr > 1) {
start = 0;
out = 0;
while (start < nr) {
end = Min(nr,start+ways);
r = start;
total = 0;
while (r < end) {
Pos[r] = 0;
Head(r);
total = total + Lens[r];
r = r + 1;
}
base = 1;
while (base < end-start) {
base = base * 2;
}
i = 0;
while (i < base) {
W[base+i] = -1;
if (start+i < end) {
W[base+i] = start+i;
}
i = i + 1;
}
p = base - 1;
while (p > 0) {
Match(p);
p = p - 1;
}
j = 0;
while (j < total) {
if (tree) {
w = W[1];
}
else {
w = -1;
r = start;
while (r < end) {
w = Winner(w,r);
r = r + 1;
}
}
PutS(out,j,H[w]);
j = j + 1;
if (j % block == 0) {
WriteBlock();
}
Pos[w] = Pos[w] + 1;
Head(w);
if (tree) {
p = Div(base+w-start,2);
while (p > 0) {
Match(p);
p = Div(p,2);
}
}
}
if (j % block != 0) {
WriteBlock();
}
NextLens[out] = j;
out = out + 1;
start = end;
}
FlipRuns();
nr = out;
rounds = rounds + 1;
Mark(0,nr-1,5);
}
i = 0;
while (i < n) {
PutA(i,R[0][i]);
i = i + 1;
}
return 0;`);
d('Replacement','int','','int i,j,live,best,r,count,c; Rec last',`i = 0;
live = Min(n,poolSize);
while (i < live) {
if (i % block == 0) {
ReadBlock();
}
PutB(i,A[i]);
Flag[i] = 1;
i = i + 1;
}
r = 0;
count = 0;
while (live > 0) {
best = -1;
j = 0;
while (j < poolSize) {
if (Flag[j] == 1) {
if (best < 0) {
best = j;
}
else {
c = Cmp(B[j].key,B[best].key);
if (c < 0 || (c == 0 && B[j].order < B[best].order)) {
best = j;
}
}
}
j = j + 1;
}
if (best < 0) {
if (count % block != 0) {
WriteBlock();
}
r = r + 1;
count = 0;
j = 0;
while (j < poolSize) {
if (Flag[j] == 2) {
Flag[j] = 1;
}
j = j + 1;
}
}
else {
last = B[best];
PutR(r,count,last);
count = count + 1;
Lens[r] = count;
if (count % block == 0) {
WriteBlock();
}
if (i < n) {
if (i % block == 0) {
ReadBlock();
}
PutB(best,A[i]);
i = i + 1;
if (Cmp(B[best].key,last.key) < 0) {
Flag[best] = 2;
}
}
else {
Flag[best] = 0;
live = live - 1;
}
}
}
if (count % block != 0) {
WriteBlock();
}
nr = r;
if (n > 0) {
nr = r + 1;
}
return 0;`);
})(globalThis);
