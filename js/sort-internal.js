(function(g){const R=typeof module==='object'?require('./sort-runtime'):g.SortRuntime,d=R.define;
d('Swap','int','int i, int j','Rec t',`if (i != j) {
t = A[i];
PutA(i,A[j]);
PutA(j,t);
swaps = swaps + 1;
}
return 0;`);
d('Insertion','int','int lo, int hi, int gap','int i,j; Rec t',`i = lo + gap;
while (i <= hi) {
t = A[i];
j = i - gap;
while (j >= lo && Cmp(A[j].key,t.key) > 0) {
PutA(j+gap,A[j]);
j = j - gap;
}
PutA(j+gap,t);
Mark(lo,i,0);
i = i + 1;
}
return 0;`);
d('BinaryInsertion','int','','int i,j,low,high,mid; Rec t',`i = 1;
while (i < n) {
t = A[i];
low = 0;
high = i;
while (low < high) {
mid = low + Div(high-low,2);
if (Cmp(t.key,A[mid].key) < 0) {
high = mid;
}
else {
low = mid + 1;
}
}
j = i;
while (j > low) {
PutA(j,A[j-1]);
j = j - 1;
}
PutA(low,t);
Mark(0,i,0);
i = i + 1;
}
return 0;`);
d('Shell','int','','int z,gap,start',`z = 0;
while (z < ng) {
gap = gaps[z];
start = 0;
while (start < gap && start < n) {
Insertion(start,n-1,gap);
start = start + 1;
}
z = z + 1;
}
return 0;`);
d('Bubble','int','int early','int end,j,changedFlag',`end = n - 1;
while (end > 0) {
changedFlag = 0;
j = 0;
while (j < end) {
if (Cmp(A[j].key,A[j+1].key) > 0) {
Swap(j,j+1);
changedFlag = 1;
}
j = j + 1;
}
Mark(end,n-1,0);
if (early && changedFlag == 0) {
return 0;
}
end = end - 1;
}
return 0;`);
d('Partition','int','int lo, int hi','int i,j; Rec pivot',`pivot = A[hi];
i = lo;
j = lo;
while (j < hi) {
if (Cmp(A[j].key,pivot.key) < 0) {
Swap(i,j);
i = i + 1;
}
j = j + 1;
}
Swap(i,hi);
Mark(i,i,1);
return i;`);
d('Quick','int','int lo, int hi','int p',`if (lo < hi) {
p = Partition(lo,hi);
Quick(lo,p-1);
Quick(p+1,hi);
}
return 0;`);
d('Quick3','int','int lo, int hi','int lt,i,gt,c; Rec pivot',`if (lo < hi) {
pivot = A[lo];
lt = lo;
i = lo;
gt = hi;
while (i <= gt) {
c = Cmp(A[i].key,pivot.key);
if (c < 0) {
Swap(lt,i);
lt = lt + 1;
i = i + 1;
}
else {
if (c > 0) {
Swap(i,gt);
gt = gt - 1;
}
else {
i = i + 1;
}
}
}
Mark(lt,gt,1);
Quick3(lo,lt-1);
Quick3(gt+1,hi);
}
return 0;`);
d('Selection','int','','int i,j,best',`i = 0;
while (i < n-1) {
best = i;
j = i + 1;
while (j < n) {
if (Cmp(A[j].key,A[best].key) < 0) {
best = j;
}
j = j + 1;
}
Swap(i,best);
Mark(0,i,0);
i = i + 1;
}
return 0;`);
d('Sink','int','int root, int size','int child',`child = 2*root + 1;
while (child < size) {
if (child+1 < size && Cmp(A[child].key,A[child+1].key) < 0) {
child = child + 1;
}
if (Cmp(A[root].key,A[child].key) >= 0) {
return 0;
}
Swap(root,child);
root = child;
child = 2*root + 1;
}
return 0;`);
d('Heap','int','','int root,size',`size = n;
root = Div(n,2) - 1;
while (root >= 0) {
Sink(root,size);
root = root - 1;
}
Mark(0,size-1,2);
while (size > 1) {
Swap(0,size-1);
size = size - 1;
Sink(0,size);
Mark(0,size-1,2);
}
return 0;`);
d('Merge','int','int lo, int mid, int hi','int i,j,k',`i = lo;
j = mid + 1;
k = lo;
while (i <= mid && j <= hi) {
if (Cmp(A[i].key,A[j].key) <= 0) {
PutB(k,A[i]);
i = i + 1;
}
else {
PutB(k,A[j]);
j = j + 1;
}
k = k + 1;
}
while (i <= mid) {
PutB(k,A[i]);
i = i + 1;
k = k + 1;
}
while (j <= hi) {
PutB(k,A[j]);
j = j + 1;
k = k + 1;
}
k = lo;
while (k <= hi) {
PutA(k,B[k]);
k = k + 1;
}
Mark(lo,hi,3);
return 0;`);
d('MergeTop','int','int lo, int hi','int mid',`if (lo < hi) {
mid = lo + Div(hi-lo,2);
MergeTop(lo,mid);
MergeTop(mid+1,hi);
Merge(lo,mid,hi);
}
return 0;`);
d('MergeBottom','int','','int width,lo,mid,hi',`width = 1;
while (width < n) {
lo = 0;
while (lo+width < n) {
mid = lo + width - 1;
hi = Min(n-1,lo+2*width-1);
Merge(lo,mid,hi);
lo = lo + 2*width;
}
width = width * 2;
}
return 0;`);
d('Bounds','int','','int i',`phase = 0;
if (n > 0) {
minValue = A[0].key;
maxValue = A[0].key;
i = 1;
while (i < n) {
if (Cmp(A[i].key,minValue)*dir < 0) {
minValue = A[i].key;
}
if (Cmp(A[i].key,maxValue)*dir > 0) {
maxValue = A[i].key;
}
i = i + 1;
}
}
range = maxValue - minValue + 1;
phase = 1;
return 0;`);
d('Counting','int','','int i,k,pos',`Bounds();
i = 0;
while (i < n) {
k = A[i].key - minValue;
C[k] = C[k] + 1;
i = i + 1;
}
i = 1;
while (i < range) {
C[i] = C[i] + C[i-1];
i = i + 1;
}
i = n - 1;
while (i >= 0) {
k = A[i].key - minValue;
if (dir == 1) {
C[k] = C[k] - 1;
pos = C[k];
}
else {
pos = n - C[k];
C[k] = C[k] - 1;
}
PutB(pos,A[i]);
i = i - 1;
}
i = 0;
while (i < n) {
PutA(i,B[i]);
i = i + 1;
}
return 0;`);
// Stable descending counting needs forward traversal for reversed bucket offsets.
R.functions.Counting.text=R.functions.Counting.text.replace('i = n - 1;\nwhile (i >= 0) {','i = n - 1;\nif (dir == -1) {\ni = 0;\n}\nwhile (i >= 0 && i < n) {').replace('i = i - 1;\n}\ni = 0;','i = i - dir;\n}\ni = 0;');
d('Radix','int','','int i,k; int64_t mapped,divisor,span',`Bounds();
span = maxValue - minValue;
divisor = 1;
while (span >= divisor) {
i = 0;
while (i < 10) {
C[i] = 0;
i = i + 1;
}
i = 0;
while (i < n) {
if (dir == 1) {
mapped = A[i].key - minValue;
}
else {
mapped = maxValue - A[i].key;
}
k = Div(mapped,divisor) % 10;
C[k] = C[k] + 1;
i = i + 1;
}
i = 1;
while (i < 10) {
C[i] = C[i] + C[i-1];
i = i + 1;
}
i = n - 1;
while (i >= 0) {
if (dir == 1) {
mapped = A[i].key - minValue;
}
else {
mapped = maxValue - A[i].key;
}
k = Div(mapped,divisor) % 10;
C[k] = C[k] - 1;
PutB(C[k],A[i]);
i = i - 1;
}
i = 0;
while (i < n) {
PutA(i,B[i]);
i = i + 1;
}
Mark(0,n-1,4);
divisor = divisor * 10;
}
return 0;`);
d('Bucket','int','','int i,b,k,j,out; int64_t mapped',`Bounds();
i = 0;
while (i < n) {
if (dir == 1) {
mapped = A[i].key - minValue;
}
else {
mapped = maxValue - A[i].key;
}
b = Div(mapped*bucketCount,range);
PutR(b,Lens[b],A[i]);
Lens[b] = Lens[b] + 1;
i = i + 1;
}
out = 0;
b = 0;
while (b < bucketCount) {
k = out;
j = 0;
while (j < Lens[b]) {
PutA(out,R[b][j]);
out = out + 1;
j = j + 1;
}
Insertion(k,out-1,1);
b = b + 1;
}
return 0;`);
for(const name of ['Quick','Quick3','MergeTop']){let f=R.functions[name];f.text='EnterDepth();\n'+f.text.replace('return 0;','LeaveDepth();\nreturn 0;');}
})(globalThis);
