(function(g,f){if(typeof module==='object')module.exports=f(require('./search-runtime'));else f(g.SearchRuntime);})(globalThis,function(R){const F=R.define;
F('Reserve','int','','Node *p; int i, r',`
rc = 0;
rp = 0;
while (rc < reserveNeed) {
p = New();
if (p == NULL) {
i = 0;
while (i < rc) {
p = reserved[i];
reserved[i] = NULL;
r = Release(p);
i = i+1;
}
rc = 0;
return 0;
}
reserved[rc] = p;
rc = rc+1;
}
return 1;
`);
F('Take','Node *','','Node *p',`
p = reserved[rp];
reserved[rp] = NULL;
rp = rp+1;
return p;
`);
F('Cleanup','int','','Node *p; int r',`
while (rp < rc) {
p = reserved[rp];
reserved[rp] = NULL;
r = Release(p);
rp = rp+1;
}
return 0;
`);
F('MultiFind','Node *','Node *p, int key','int i, c',`
while (p != NULL) {
p = Visit(p);
i = 0;
while (i < p->count) {
c = Cmp(key,p->keys[i]);
if (c <= 0) {
return MultiDecide(p,i,c,key);
}
i = i+1;
}
if (p->leaf) {
return NULL;
}
p = p->child[i];
}
return NULL;
`);
F('MultiDecide','Node *','Node *p, int i, int c, int key','',`
if (c == 0 && (!plus || p->leaf)) {
slot = i;
return p;
}
if (p->leaf) {
return NULL;
}
if (plus && c == 0) {
i = i+1;
}
return MultiFind(p->child[i],key);
`);
F('LeafMin','int','Node *p','',`
while (!p->leaf) {
p = Visit(p);
p = p->child[0];
}
return p->keys[0];
`);
F('Refresh','int','Node *p','int i, v',`
if (!plus || p == NULL || p->leaf) {
return 0;
}
i = 0;
while (i < p->count) {
v = LeafMin(p->child[i+1]);
p->keys[i] = v;
i = i+1;
}
return 0;
`);
F('Split','int','Node *p, int index','Node *q, *s, *t; int mid, i, promoted, r',`
q = p->child[index];
s = Take();
s->leaf = q->leaf;
mid = Div(m,2);
if (plus && q->leaf) {
mid = Div(m+1,2);
s->count = q->count-mid;
i = 0;
while (i < s->count) {
s->keys[i] = q->keys[mid+i];
i = i+1;
}
q->count = mid;
promoted = s->keys[0];
s->next = q->next;
if (s->next != NULL) {
t = s->next;
t->prev = s;
}
s->prev = q;
q->next = s;
}
else {
promoted = q->keys[mid];
s->count = q->count-mid-1;
i = 0;
while (i < s->count) {
s->keys[i] = q->keys[mid+1+i];
i = i+1;
}
if (!q->leaf) {
i = 0;
while (i <= s->count) {
s->child[i] = q->child[mid+1+i];
i = i+1;
}
}
q->count = mid;
}
i = p->count;
while (i > index) {
p->keys[i] = p->keys[i-1];
p->child[i+1] = p->child[i];
i = i-1;
}
p->keys[index] = promoted;
p->child[index+1] = s;
p->count = p->count+1;
splits = splits+1;
r = Refresh(q);
r = Refresh(s);
r = Refresh(p);
return 1;
`);
F('MultiInsertRec','int','Node *p, int key','int i, c, r; Node *q',`
p = Visit(p);
i = 0;
while (i < p->count) {
c = Cmp(key,p->keys[i]);
if (c < 0 || (!plus && c == 0)) {
return MultiInsertAt(p,i,key);
}
i = i+1;
}
r = MultiInsertAt(p,i,key);
return r;
`);
F('MultiInsertAt','int','Node *p, int i, int key','int j, r; Node *q',`
if (p->leaf) {
j = p->count;
while (j > i) {
p->keys[j] = p->keys[j-1];
j = j-1;
}
p->keys[i] = key;
p->count = p->count+1;
}
else {
q = p->child[i];
r = MultiInsertRec(q,key);
if (q->count == m) {
r = Split(p,i);
}
r = Refresh(p);
}
return 1;
`);
F('MultiInsert','int','int key','Node *p, *q; int r',`
p = MultiFind(root,key);
if (p != NULL) {
status = 2;
return 2;
}
r = Reserve();
if (!r) {
return 0;
}
if (root == NULL) {
p = Take();
p->keys[0] = key;
p->count = 1;
root = p;
}
else {
p = root;
r = MultiInsertRec(p,key);
if (p->count == m) {
q = Take();
q->leaf = 0;
q->child[0] = p;
root = q;
r = Split(q,0);
}
}
status = 1;
r = Cleanup();
return 1;
`);
F('MinimumCount','int','Node *p','',`
if (plus && p->leaf) {
return Div(m,2);
}
return Div(m+1,2)-1;
`);
F('Repair','int','Node *p, int index','Node *q, *s, *t; int i, j, r, a, b',`
q = p->child[index];
if (q->count >= MinimumCount(q)) {
return 0;
}
if (index > 0) {
s = p->child[index-1];
if (s->count > MinimumCount(s)) {
i = q->count;
while (i > 0) {
q->keys[i] = q->keys[i-1];
i = i-1;
}
if (!q->leaf) {
i = q->count+1;
while (i > 0) {
q->child[i] = q->child[i-1];
i = i-1;
}
q->child[0] = s->child[s->count];
}
if (plus && q->leaf) {
q->keys[0] = s->keys[s->count-1];
}
else {
q->keys[0] = p->keys[index-1];
p->keys[index-1] = s->keys[s->count-1];
}
s->count = s->count-1;
q->count = q->count+1;
r = Refresh(s);
r = Refresh(q);
r = Refresh(p);
return 1;
}
}
if (index < p->count) {
s = p->child[index+1];
if (s->count > MinimumCount(s)) {
if (plus && q->leaf) {
q->keys[q->count] = s->keys[0];
}
else {
q->keys[q->count] = p->keys[index];
p->keys[index] = s->keys[0];
}
if (!q->leaf) {
q->child[q->count+1] = s->child[0];
}
q->count = q->count+1;
i = 0;
while (i < s->count-1) {
s->keys[i] = s->keys[i+1];
i = i+1;
}
if (!s->leaf) {
i = 0;
while (i < s->count) {
s->child[i] = s->child[i+1];
i = i+1;
}
}
s->count = s->count-1;
r = Refresh(s);
r = Refresh(q);
r = Refresh(p);
return 1;
}
}
return Merge(p,index);
`);
F('Merge','int','Node *p, int index','Node *q, *s, *t; int i, a, r',`
if (index > 0) {
index = index-1;
}
q = p->child[index];
s = p->child[index+1];
a = q->count;
if (!(plus && q->leaf)) {
q->keys[a] = p->keys[index];
a = a+1;
}
i = 0;
while (i < s->count) {
q->keys[a+i] = s->keys[i];
i = i+1;
}
if (!q->leaf) {
i = 0;
while (i <= s->count) {
q->child[a+i] = s->child[i];
i = i+1;
}
}
q->count = a+s->count;
if (plus && q->leaf) {
q->next = s->next;
if (s->next != NULL) {
t = s->next;
t->prev = q;
}
}
i = index;
while (i < p->count-1) {
p->keys[i] = p->keys[i+1];
p->child[i+1] = p->child[i+2];
i = i+1;
}
p->count = p->count-1;
r = Release(s);
merges = merges+1;
r = Refresh(q);
r = Refresh(p);
return 1;
`);
F('MultiDeleteRec','int','Node *p, int key','int i, c, r, j, v; Node *q',`
p = Visit(p);
i = 0;
while (i < p->count) {
c = Cmp(key,p->keys[i]);
if (c <= 0) {
return MultiDeleteAt(p,i,c,key);
}
i = i+1;
}
return MultiDeleteAt(p,i,1,key);
`);
F('MultiDeleteAt','int','Node *p, int i, int c, int key','int j, r, v; Node *q',`
if (p->leaf) {
if (i == p->count || c != 0) {
return 0;
}
j = i;
while (j < p->count-1) {
p->keys[j] = p->keys[j+1];
j = j+1;
}
p->count = p->count-1;
status = 1;
return 1;
}
if (!plus && c == 0) {
q = p->child[i];
while (!q->leaf) {
q = q->child[q->count];
}
v = q->keys[q->count-1];
p->keys[i] = v;
r = MultiDeleteRec(p->child[i],v);
}
else {
if (plus && c == 0) {
i = i+1;
}
r = MultiDeleteRec(p->child[i],key);
}
if (r) {
j = Repair(p,i);
j = Refresh(p);
}
return r;
`);
F('MultiDelete','int','int key','Node *p, *q; int r, j',`
if (root == NULL) {
return 0;
}
r = MultiDeleteRec(root,key);
p = root;
if (p->count == 0) {
if (p->leaf) {
root = NULL;
}
else {
q = p->child[0];
root = q;
}
j = Release(p);
}
return r;
`);
F('LocateLeaf','Node *','Node *p, int a','int i, c',`
while (p != NULL && !p->leaf) {
p = Visit(p);
i = 0;
while (i < p->count) {
c = Cmp(a,p->keys[i]);
if (c < 0) {
return LocateLeaf(p->child[i],a);
}
i = i+1;
}
p = p->child[i];
}
return p;
`);
F('Range','int','int a, int b','Node *p',`
p = LocateLeaf(root,a);
return RangeFrom(p,a,b);
`);
F('RangeFrom','int','Node *p, int a, int b','int i, c',`
if (p == NULL) {
return 0;
}
while (p != NULL) {
p = Visit(p);
i = 0;
while (i < p->count) {
c = Cmp(p->keys[i],b);
if (c > 0) {
return oc;
}
c = Cmp(p->keys[i],a);
if (c >= 0) {
out[oc] = p->keys[i];
oc = oc+1;
}
i = i+1;
}
p = p->next;
}
return oc;
`);
F('Scan','int','','Node *p',`
p = root;
while (p != NULL && !p->leaf) {
p = Visit(p);
p = p->child[0];
}
return RangeFrom(p,-2147483648,2147483647);
`);
return R;});
