(function(g,f){if(typeof module==='object')module.exports=f(require('./search-runtime'));else f(g.SearchRuntime);})(globalThis,function(R){
const F=R.define;
F('Sequential','int','', 'int i, c',`
i = 0;
while (i < n) {
c = Cmp(A[i], key);
if (c == 0) {
return i+1;
}
i = i+1;
}
return 0;
`);
F('Sentinel','int','', 'int i, c',`
i = 0;
while (i < n) {
T[i] = A[i];
i = i+1;
}
T[n] = key;
i = 0;
c = Cmp(T[i], key);
while (c != 0) {
i = i+1;
c = Cmp(T[i], key);
}
if (i < n) {
return i+1;
}
return 0;
`);
F('Binary','int','', 'int low, high, mid, c',`
low = 0;
high = n-1;
while (low <= high) {
mid = low+Div(high-low,2);
c = Cmp(A[mid],key);
if (c == 0) {
return mid+1;
}
if (c < 0) {
low = mid+1;
}
else {
high = mid-1;
}
}
return 0;
`);
F('BinaryRec','int','int low, int high','int mid, c, result',`
if (low > high) {
return 0;
}
mid = low+Div(high-low,2);
c = Cmp(A[mid],key);
if (c == 0) {
return mid+1;
}
if (c < 0) {
result = BinaryRec(mid+1,high);
}
else {
result = BinaryRec(low,mid-1);
}
return result;
`);
F('Bound','int','int upper','int low, high, mid, c',`
low = 0;
high = n;
while (low < high) {
mid = low+Div(high-low,2);
c = Cmp(A[mid],key);
if (c < 0 || (upper && c == 0)) {
low = mid+1;
}
else {
high = mid;
}
}
return low;
`);
for(const [name,upper,last,equal]of [['FirstEqual',0,0,1],['LastEqual',1,1,1],['FirstGE',0,0,0],['FirstGT',1,0,0]])F(name,'int','','int i, c',`
i = Bound(${upper});
${last?'i = i-1;':''}
if (i < 0 || i >= n) {
return 0;
}
${equal?`c = Cmp(A[i],key);
if (c != 0) {
return 0;
}`:''}
return i+1;
`);
F('Block','int','','int b, low, high, mid, c, i',`
phase = 1;
if (indexBinary) {
low = 0;
high = blockCount;
while (low < high) {
mid = low+Div(high-low,2);
c = Cmp(blockMax[mid],key);
if (c < 0) {
low = mid+1;
}
else {
high = mid;
}
}
b = low;
}
else {
b = 0;
while (b < blockCount) {
c = Cmp(blockMax[b],key);
if (c >= 0) {
breakFlag = 1;
return BlockScan(b);
}
b = b+1;
}
}
return BlockScan(b);
`);
F('BlockScan','int','int b','int i, c',`
phase = 2;
if (b >= blockCount) {
return 0;
}
i = blockStart[b];
while (i <= blockEnd[b]) {
c = Cmp(A[i],key);
if (c == 0) {
return i+1;
}
i = i+1;
}
return 0;
`);
return R;});
