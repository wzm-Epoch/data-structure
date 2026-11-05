(function(g,f){if(typeof module==='object')module.exports=f(require('./search-runtime'));else f(g.SearchRuntime);})(globalThis,function(R){const F=R.define;
F('Find','Node *','Node *p, int key','int c',`
while (p != NULL) {
p = Visit(p);
c = Cmp(key,p->key);
if (c == 0) {
return p;
}
if (c < 0) {
p = p->left;
}
else {
p = p->right;
}
}
return NULL;
`);
for(const [name,side]of [['Minimum','left'],['Maximum','right']])F(name,'Node *','Node *p','',`
if (p == NULL) {
return NULL;
}
p = Visit(p);
while (p->${side} != NULL) {
p = p->${side};
p = Visit(p);
}
return p;
`);
F('Inorder','int','Node *p','int r',`
if (p == NULL) {
return 0;
}
r = Inorder(p->left);
p = Visit(p);
out[oc] = p->key;
oc = oc+1;
r = Inorder(p->right);
return 1;
`);
for(const [name,sign]of [['Predecessor','>'],['Successor','<']])F(name,'Node *','Node *p, int key','Node *best; int c',`
best = NULL;
while (p != NULL) {
p = Visit(p);
c = Cmp(key,p->key);
if (c ${sign} 0) {
best = p;
p = p->${sign==='>'?'right':'left'};
}
else {
p = p->${sign==='>'?'left':'right'};
}
}
return best;
`);
F('Height','int','Node *p','',`
if (p == NULL) {
return 0;
}
return p->height;
`);
F('Update','int','Node *p','int l, r',`
l = Height(p->left);
r = Height(p->right);
p->height = Max(l,r)+1;
return 0;
`);
F('Balance','int','Node *p','',`
if (p == NULL) {
return 0;
}
return Height(p->left)-Height(p->right);
`);
for(const [name,side,other]of [['RotateRight','left','right'],['RotateLeft','right','left']])F(name,'Node *','Node *p','Node *q, *t; int r',`
q = p->${side};
t = q->${other};
p->${side} = t;
q->${other} = p;
r = Update(p);
r = Update(q);
rotations = rotations+1;
return q;
`);
F('Rebalance','Node *','Node *p','int b, r; Node *q',`
if (p == NULL) {
return p;
}
r = Update(p);
if (!avl) {
return p;
}
b = Balance(p);
if (b > 1) {
if (Balance(p->left) < 0) {
q = RotateLeft(p->left);
p->left = q;
}
q = RotateRight(p);
return q;
}
if (b < -1) {
if (Balance(p->right) > 0) {
q = RotateRight(p->right);
p->right = q;
}
q = RotateLeft(p);
return q;
}
return p;
`);
F('Insert','Node *','Node *p, int key','Node *q; int c',`
if (p == NULL) {
q = New();
if (q == NULL) {
return p;
}
q->key = key;
status = 1;
return q;
}
p = Visit(p);
c = Cmp(key,p->key);
if (c == 0) {
status = 2;
return p;
}
if (c < 0) {
q = Insert(p->left,key);
p->left = q;
}
else {
q = Insert(p->right,key);
p->right = q;
}
q = Rebalance(p);
return q;
`);
F('Delete','Node *','Node *p, int key','Node *q; int c, r',`
if (p == NULL) {
return p;
}
p = Visit(p);
c = Cmp(key,p->key);
if (c < 0) {
q = Delete(p->left,key);
p->left = q;
}
else {
if (c > 0) {
q = Delete(p->right,key);
p->right = q;
}
else {
status = 1;
if (p->left == NULL || p->right == NULL) {
q = p->left != NULL ? p->left : p->right;
r = Release(p);
return q;
}
q = Minimum(p->right);
p->key = q->key;
q = Delete(p->right,q->key);
p->right = q;
}
}
q = Rebalance(p);
return q;
`);
// 红黑旋转同时维护父链接，NIL父信息单独通过修复参数传递。
for(const [name,side,other]of [['RBLeft','right','left'],['RBRight','left','right']])F(name,'int','Node *p','Node *q, *t',`
q = p->${side};
t = q->${other};
p->${side} = t;
if (t != NULL) {
t->parent = p;
}
q->parent = p->parent;
if (p->parent == NULL) {
root = q;
}
else {
t = p->parent;
if (p == t->left) {
t->left = q;
}
else {
t->right = q;
}
}
q->${other} = p;
p->parent = q;
rotations = rotations+1;
return 0;
`);
F('RBInsert','int','int key','Node *p, *parent, *z, *g, *u; int c, r',`
p = root;
parent = NULL;
while (p != NULL) {
p = Visit(p);
parent = p;
c = Cmp(key,p->key);
if (c == 0) {
status = 2;
return 2;
}
if (c < 0) {
p = p->left;
}
else {
p = p->right;
}
}
z = New();
if (z == NULL) {
return 0;
}
z->key = key;
z->color = RED;
z->parent = parent;
if (parent == NULL) {
root = z;
}
else {
if (c < 0) {
parent->left = z;
}
else {
parent->right = z;
}
}
status = 1;
while (z != root && z->parent != NULL) {
parent = z->parent;
if (parent->color == BLACK) {
return RBBlackRoot();
}
g = parent->parent;
if (parent == g->left) {
u = g->right;
if (u->color == RED) {
parent->color = BLACK;
u->color = BLACK;
g->color = RED;
z = g;
}
else {
if (z == parent->right) {
z = parent;
r = RBLeft(z);
parent = z->parent;
g = parent->parent;
}
parent->color = BLACK;
g->color = RED;
r = RBRight(g);
}
}
else {
u = g->left;
if (u->color == RED) {
parent->color = BLACK;
u->color = BLACK;
g->color = RED;
z = g;
}
else {
if (z == parent->left) {
z = parent;
r = RBRight(z);
parent = z->parent;
g = parent->parent;
}
parent->color = BLACK;
g->color = RED;
r = RBLeft(g);
}
}
}
return RBBlackRoot();
`);
F('RBBlackRoot','int','','Node *p',`
p = root;
if (p != NULL) {
p->color = BLACK;
}
return 1;
`);
F('Transplant','int','Node *u, Node *v','Node *p',`
p = u->parent;
if (p == NULL) {
root = v;
}
else {
if (u == p->left) {
p->left = v;
}
else {
p->right = v;
}
}
if (v != NULL) {
v->parent = p;
}
return 0;
`);
F('RBDelete','int','int key','Node *z, *y, *x, *xp, *p; int original, r',`
z = Find(root,key);
if (z == NULL) {
return 0;
}
status = 1;
y = z;
original = y->color;
if (z->left == NULL) {
x = z->right;
xp = z->parent;
r = Transplant(z,x);
}
else {
if (z->right == NULL) {
x = z->left;
xp = z->parent;
r = Transplant(z,x);
}
else {
y = Minimum(z->right);
original = y->color;
x = y->right;
if (y->parent == z) {
xp = y;
}
else {
xp = y->parent;
r = Transplant(y,x);
y->right = z->right;
p = y->right;
p->parent = y;
}
r = Transplant(z,y);
y->left = z->left;
p = y->left;
p->parent = y;
y->color = z->color;
}
}
r = Release(z);
if (original == BLACK) {
r = RBFix(x,xp);
}
return 1;
`);
let fix=`
extraBlack = 1;
while (x != root && x->color == BLACK) {
if (xp == NULL) {
return 0;
}
if (x == xp->left) {
LEFT
}
else {
RIGHT
}
}
if (x != NULL) {
x->color = BLACK;
}
extraBlack = 0;
return 1;
`;
const branch=(left,right,rotate,back)=>`
w = xp->${right};
if (w->color == RED) {
w->color = BLACK;
xp->color = RED;
r = ${rotate}(xp);
w = xp->${right};
}
near = w->${left};
far = w->${right};
if (near->color == BLACK && far->color == BLACK) {
if (w != NULL) {
w->color = RED;
}
x = xp;
xp = x->parent;
}
else {
if (far->color == BLACK) {
near->color = BLACK;
w->color = RED;
r = ${back}(w);
w = xp->${right};
}
w->color = xp->color;
xp->color = BLACK;
far = w->${right};
far->color = BLACK;
r = ${rotate}(xp);
x = root;
xp = NULL;
}
`;
fix=fix.replace('LEFT',branch('left','right','RBLeft','RBRight')).replace('RIGHT',branch('right','left','RBRight','RBLeft'));
F('RBFix','int','Node *x, Node *xp','Node *w, *near, *far; int r',fix);
return R;});
