(function(g,f){if(typeof module==='object')module.exports=f(require('./search-runtime'));else f(g.SearchRuntime);})(globalThis,function(R){const F=R.define;
F('HashIndex','int','int key, int i','int h, d',`
h = Norm(key,M);
if (scheme == 0) {
return Norm(h+i,M);
}
if (scheme == 1) {
return Norm(h+i*i,M);
}
d = 1+Norm(key,M-1);
return Norm(h+i*d,M);
`);
F('HashFind','int','int key','int i, j, c',`
i = 0;
while (i < M) {
j = HashIndex(key,i);
j = Probe(j);
if (states[j] == EMPTY) {
return 0;
}
if (states[j] == FULL) {
c = Cmp(table[j],key);
if (c == 0) {
return j+1;
}
}
i = i+1;
}
return 0;
`);
F('HashInsert','int','int key','int i, j, first, c',`
i = 0;
first = -1;
while (i < M) {
j = HashIndex(key,i);
j = Probe(j);
if (states[j] == FULL) {
c = Cmp(table[j],key);
if (c == 0) {
status = 2;
return 2;
}
}
else {
if (first < 0) {
first = j;
}
if (states[j] == EMPTY) {
return HashPlace(first,key);
}
}
i = i+1;
}
if (first >= 0) {
return HashPlace(first,key);
}
status = -1;
return 0;
`);
F('HashPlace','int','int j, int key','',`
table[j] = key;
states[j] = FULL;
status = 1;
return 1;
`);
F('HashDelete','int','int key','int position',`
position = HashFind(key);
if (position == 0) {
return 0;
}
states[position-1] = DELETED;
status = 1;
return 1;
`);
F('ChainFind','Node *','int key','Node *p; int h, c',`
h = Norm(key,M);
h = Probe(h);
p = buckets[h];
while (p != NULL) {
p = Visit(p);
c = Cmp(p->key,key);
if (c == 0) {
return p;
}
p = p->next;
}
return NULL;
`);
F('ChainInsert','int','int key','Node *p, *q; int h',`
p = ChainFind(key);
if (p != NULL) {
status = 2;
return 2;
}
h = Norm(key,M);
q = New();
if (q == NULL) {
return 0;
}
q->key = key;
q->next = buckets[h];
buckets[h] = q;
status = 1;
return 1;
`);
F('ChainDelete','int','int key','Node *p, *prev; int h, c, r',`
h = Norm(key,M);
h = Probe(h);
p = buckets[h];
prev = NULL;
while (p != NULL) {
p = Visit(p);
c = Cmp(p->key,key);
if (c == 0) {
if (prev == NULL) {
buckets[h] = p->next;
}
else {
prev->next = p->next;
}
r = Release(p);
status = 1;
return 1;
}
prev = p;
p = p->next;
}
return 0;
`);
return R;});
