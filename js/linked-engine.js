(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LinkedLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const catalog = {};
  const copy = value => JSON.parse(JSON.stringify(value));
  const integer = value => Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
  function define(key, meta, rows) {
    const lines = {}, source = rows.map((row, n) => {
      if (Array.isArray(row)) { lines[row[0]] = n + 1; return row[1]; }
      return row;
    });
    catalog[key] = { key, ...meta, source, lines };
  }
  function positional(kind, remove) {
    const circular = kind === 'circular', double = kind === 'double';
    const key = (circular ? 'c' : double ? 'd' : '') + (circular || double ? (remove ? 'Delete' : 'Insert') : (remove ? 'delete' : 'insert'));
    const type = double ? 'DNode' : 'Node';
    const fn = (circular ? 'Circular' : double ? 'Double' : 'Link') + (remove ? 'Delete' : 'Insert');
    const rows = [
      `bool ${fn}(${type} *L, int i, ${remove ? 'int *e' : 'int e'}) {`,
      ['p', `    ${type} *p = L;`], ['j', '    int j = 0;'],
      ['low', '    if (i < 1)'], ['lowFail', '        return false;'],
      ['loop', `    while (${circular ? 'p->next != L' : 'p != NULL'} && j < i - 1) {`],
      ['walk', '        p = p->next;'], ['inc', '        ++j;'], '    }',
      ['valid', `    if (${circular ? `j != i - 1${remove ? ' || p->next == L' : ''}` : `p == NULL${remove ? ' || p->next == NULL' : ''}`})`],
      ['invalid', '        return false;']
    ];
    if (remove) {
      rows.push(['q', `    ${type} *q = p->next;`], ['save', '    *e = q->data;'], ['bypass', '    p->next = q->next;']);
      if (double) rows.push(['hasNext', '    if (q->next != NULL)'], ['back', '        q->next->prior = p;']);
      rows.push(['free', '    free(q);'], ['return', '    return true;'], '}');
    } else {
      rows.push(['alloc', `    ${type} *s = malloc(sizeof *s);`], ['allocCheck', '    if (s == NULL)'], ['allocFail', '        return false;'],
        ['data', '    s->data = e;'], ['snext', '    s->next = p->next;']);
      if (double) rows.push(['sprior', '    s->prior = p;'], ['hasNext', '    if (s->next != NULL)'], ['back', '        s->next->prior = s;']);
      rows.push(['attach', '    p->next = s;'], ['return', '    return true;'], '}');
    }
    define(key, { title: remove ? '按位删除' : '按位插入', kind, fn, mode: remove ? 'delete' : 'insert', position: true, value: !remove,
      focus: remove ? '先保存后继和输出，再断开链接，最后释放节点。' : '先让新节点接住后继，再让前驱指向新节点。',
      complexity: '按位置寻找前驱最坏 O(n)，找到前驱后的链接修改 O(1)；额外空间 O(1)。' }, rows);
  }
  for (const kind of ['single', 'double', 'circular']) { positional(kind, false); positional(kind, true); }
  define('access', { title: '按位查找', kind: 'single', fn: 'GetNode', mode: 'access', position: true,
    focus: '从头节点出发，沿 next 前进 i 次；第 i 个位置不是数组下标。', complexity: '最坏时间 O(n)，额外空间 O(1)。' }, [
    'Node *GetNode(Node *L, int i) {', ['p', '    Node *p = L;'], ['j', '    int j = 0;'],
    ['low', '    if (i < 1)'], ['lowFail', '        return NULL;'],
    ['loop', '    while (p != NULL && j < i) {'], ['walk', '        p = p->next;'], ['inc', '        ++j;'], '    }',
    ['return', '    return p;'], '}'
  ]);
  define('search', { title: '按值查找', kind: 'single', fn: 'Locate', mode: 'search', value: true,
    focus: '逐个比较数据，返回第一个匹配节点的位置；找不到返回 0。', complexity: '最坏时间 O(n)，额外空间 O(1)。' }, [
    'int Locate(Node *L, int e) {', ['p', '    Node *p = L->next;'], ['j', '    int j = 1;'],
    ['loop', '    while (p != NULL && p->data != e) {'], ['walk', '        p = p->next;'], ['inc', '        ++j;'], '    }',
    ['found', '    if (p != NULL)'], ['returnFound', '        return j;'], ['returnMissing', '    return 0;'], '}'
  ]);
  for (const circular of [false, true]) define(circular ? 'cTraverse' : 'traverse', {
    title: '遍历链表', kind: circular ? 'circular' : 'single', fn: circular ? 'CircularTraverse' : 'Traverse', mode: 'traverse',
    focus: circular ? '遇到头节点 H 停止；循环链表尾节点的 next 不指向 NULL。' : '从首元节点开始，访问数据后沿 next 前进，遇到 NULL 停止。',
    complexity: '完整遍历时间 O(n)，算法额外空间 O(1)；Visit 由调用方提供。'
  }, [
    `void ${circular ? 'CircularTraverse' : 'Traverse'}(Node *L) {`, ['p', '    Node *p = L->next;'],
    ['loop', `    while (p != ${circular ? 'L' : 'NULL'}) {`], ['visit', '        Visit(p->data);'], ['walk', '        p = p->next;'], '    }', ['return', '    return;'], '}'
  ]);
  define('reverse', { title: '原地逆置', kind: 'single', fn: 'Reverse', mode: 'reverse',
    focus: '先保存后继，再翻转 next，最后将头节点接到新表头；节点数据不交换。', complexity: '时间 O(n)，额外空间 O(1)。' }, [
    'void Reverse(Node *L) {', ['pre', '    Node *pre = NULL;'], ['p', '    Node *p = L->next;'],
    ['loop', '    while (p != NULL) {'], ['q', '        Node *q = p->next;'], ['flip', '        p->next = pre;'],
    ['preMove', '        pre = p;'], ['walk', '        p = q;'], '    }', ['attach', '    L->next = pre;'], ['return', '    return;'], '}'
  ]);
  for (const head of [true, false]) {
    const rows = [`bool ${head ? 'HeadBuild' : 'TailBuild'}(Node *L, const int a[], int n) {`];
    if (!head) rows.push(['r', '    Node *r = L;']);
    rows.push(['for', '    for (int k = 0; k < n; ++k) {'], ['alloc', '        Node *s = malloc(sizeof *s);'],
      ['allocCheck', '        if (s == NULL)'], ['allocFail', '            return false;'], ['data', '        s->data = a[k];'],
      ['snext', `        s->next = ${head ? 'L->next' : 'NULL'};`], ['attach', `        ${head ? 'L' : 'r'}->next = s;`]);
    if (!head) rows.push(['tail', '        r = s;']);
    rows.push('    }', ['return', '    return true;'], '}');
    define(head ? 'headBuild' : 'tailBuild', { title: head ? '头插法建表' : '尾插法建表', kind: 'single', fn: head ? 'HeadBuild' : 'TailBuild', mode: head ? 'headBuild' : 'tailBuild',
      focus: head ? '每次插到头节点之后，最终顺序与输入顺序相反。' : '尾指针 r 记住表尾，每次直接追加，保持输入顺序。',
      complexity: '本实现建表时间 O(n)，新节点占 O(n) 存储；辅助指针占 O(1)。' }, rows);
  }
  define('badInsert', { title: '插入错序实验', kind: 'single', fn: 'WrongOrder', mode: 'badInsert', position: true, value: true, experiment: true,
    focus: '故意先执行 p->next = s，再执行 s->next = p->next：s 会指向自身，原后继链失去入口。', complexity: '这是用于观察错误结构的实验，不是可用的插入算法。' }, [
    '/* 故意写错的链接更新顺序 */', '/* 前提：p 是有效前驱，s 是已分配的新节点 */',
    ['data', 's->data = e;'], ['attach', 'p->next = s;'], ['snext', 's->next = p->next;'], ['return', '/* 停止：检测到自环，不继续遍历 */']
  ]);
  const kinds = { single: '单链表', double: '双链表', circular: '循环单链表' };
  function inspect(state) {
    const order = [], visited = new Set();
    let id = state.nodes.H.next, cycle = null, dangling = null, unknown = false;
    while (id !== null && id !== 'H') {
      if (id === '?') { unknown = true; break; }
      if (visited.has(id)) { cycle = id; break; }
      if (!state.nodes[id] || state.nodes[id].freed) { dangling = id; break; }
      visited.add(id); order.push(id); id = state.nodes[id].next;
    }
    return { order, values: order.map(id => state.nodes[id].data), cycle, dangling, unknown, endsAtHead: id === 'H' };
  }
  function generate(options) {
    const { operation = 'insert', values = [12, 25, 37, 48], position = 3, value = 66, failAt = 0 } = options;
    const lesson = catalog[operation];
    if (!lesson) throw new Error('不支持的链表算法。');
    if (!Array.isArray(values) || values.length > 8 || values.some(x => !integer(x))) throw new Error('请输入最多 8 个 32 位整数；留空表示空表。');
    if (lesson.position && !integer(position)) throw new Error('位置必须是 32 位整数。');
    if (lesson.value && !integer(value)) throw new Error('元素值必须是 32 位整数。');
    if (!Number.isInteger(failAt) || failAt < 0 || failAt > 8) throw new Error('申请失败序号必须为 0 到 8。');
    const build = /Build$/.test(lesson.mode), double = lesson.kind === 'double', circular = lesson.kind === 'circular';
    const initial = build ? [] : values;
    const nodes = { H: { id: 'H', data: null, next: initial.length ? 'N1' : circular ? 'H' : null, ...(double ? { prior: null } : {}), freed: false } };
    initial.forEach((data, n) => { nodes[`N${n + 1}`] = { id: `N${n + 1}`, data, next: n + 1 < initial.length ? `N${n + 2}` : circular ? 'H' : null,
      ...(double ? { prior: n ? `N${n}` : 'H' } : {}), freed: false }; });
    let s = { nodes, pointers: { L: 'H' }, vars: { ...(lesson.position ? { i: position } : {}), ...(lesson.value ? { e: value } : {}) },
      input: values.slice(), output: [], allocated: 0, freed: 0, walks: 0, writes: 0,
      line: null, phase: '准备就绪', action: '尚未执行代码', explanation: build ? '初始只有头节点 H。输入序列是待建表的数据流。' : '头指针 L 指向头节点 H，数据节点从第 1 个开始。',
      detail: 'H、N1 等是示意节点身份，不是真实内存地址。图中布局相邻不代表内存连续。',
      read: [], changed: [], critical: false, condition: null, done: false, result: null, returnValue: null };
    if (lesson.mode === 'delete') s.vars['*e'] = null;
    const steps = [copy(s)];
    function emit(tag, phase, action, explanation, detail = '', effects = {}) {
      if (!lesson.lines[tag]) throw new Error(`未定义代码标记 ${operation}:${tag}`);
      Object.assign(s, { line: lesson.lines[tag], phase, action, explanation, detail, read: [], changed: [], critical: false, condition: null }, effects);
      steps.push(copy(s));
    }
    function ptr(tag, key, target, explanation, walked = false, read = []) {
      s.pointers[key] = target;
      if (walked) s.walks++;
      emit(tag, '指针变量赋值', `令 ${key} 指向 ${target === null ? 'NULL' : target}`, explanation,
        '只改变指针变量保存的地址，不改变任何节点的 next 或 prior。', { read });
    }
    function field(tag, id, key, target, explanation, read = []) {
      const before = s.nodes[id][key]; s.nodes[id][key] = target; s.writes++;
      emit(tag, key === 'data' ? '写入数据' : '改写节点链接', `设置 ${id}.${key} = ${target === null ? 'NULL' : target}`, explanation,
        key === 'data' ? '只写入当前节点的数据域。' : `链接由 ${before === '?' ? '未初始化' : before === null ? 'NULL' : before} 改为 ${target === null ? 'NULL' : target}。此步会改变节点关系。`,
        { changed: [{ id, field: key, before, after: target }], read, critical: key !== 'data' });
    }
    function condition(tag, action, pass, explanation, read = []) {
      emit(tag, '条件判断', action, explanation, `条件结果为 ${pass ? 'true，进入对应分支或循环体' : 'false，跳过对应分支或退出循环'}。`, { condition: pass, read });
    }
    function finish(tag, returned, success, explanation) {
      emit(tag, '结束观察', returned === undefined ? '函数返回（void）' : `返回 ${returned === null ? 'NULL' : returned}`, explanation,
        '函数结束后，面板保留最后一次观察记录；函数内的局部变量已离开作用域。',
        { done: true, result: success, returnValue: returned === undefined ? 'void' : returned });
    }
    function allocate() {
      s.allocated++;
      const failed = failAt !== 0 && s.allocated === failAt;
      const id = build ? `B${s.allocated}` : 'S';
      if (!failed) s.nodes[id] = { id, data: null, next: '?', ...(double ? { prior: '?' } : {}), freed: false };
      s.pointers.s = failed ? null : id;
      emit('alloc', '申请内存', failed ? 'malloc 返回 NULL' : `申请新节点 ${id}`, failed ? `第 ${s.allocated} 次申请按设定失败，s 为 NULL。` : `新节点 ${id} 已分配，数据和链接尚未初始化。`,
        'malloc 只分配内存，不会自动设置 data 或 next。', { critical: true, changed: failed ? [] : [{ id, field: 'allocate' }] });
      condition('allocCheck', '检查 s 是否为 NULL', failed, `s = ${failed ? 'NULL' : id}。`);
      if (failed) finish('allocFail', false, false, build ? '申请失败，返回 false。已经接入 L 的部分链表保留，由调用方继续管理或释放。' : '申请失败，返回 false；原链表尚未改动。');
      return failed ? null : id;
    }
    function traverseTo(limit) {
      ptr('p', 'p', 'H', 'p 从头节点开始，寻找目标位置的前驱。');
      s.vars.j = 0; emit('j', '初始化计数', '令 j = 0', '头节点对应位置 0，不是第一个有效元素。');
      condition('low', '检查 i 是否小于 1', position < 1, `i = ${position}。`);
      if (position < 1) { finish('lowFail', lesson.mode === 'access' ? null : false, false, '位置小于 1，拒绝本次操作。'); return false; }
      for (;;) {
        const p = s.pointers.p;
        const pass = (circular ? s.nodes[p].next !== 'H' : p !== null) && s.vars.j < limit;
        condition('loop', '判断是否继续寻找位置', pass,
          circular ? `p.next ${s.nodes[p].next === 'H' ? '已回到' : '尚未回到'} H，j = ${s.vars.j}，目标计数 = ${limit}。` : `p = ${p === null ? 'NULL' : p}，j = ${s.vars.j}，目标计数 = ${limit}。`, circular ? [p] : []);
        if (!pass) break;
        ptr('walk', 'p', s.nodes[p].next, '沿当前节点的 next 向后前进一次。', true, [p]);
        s.vars.j++; emit('inc', '更新计数', '将 j 加一', `j 现在为 ${s.vars.j}。`);
      }
      return true;
    }

    if (['insert', 'delete'].includes(lesson.mode)) {
      if (!traverseTo(position - 1)) return { lesson, steps };
      const p = s.pointers.p;
      const invalid = circular ? s.vars.j !== position - 1 || (lesson.mode === 'delete' && s.nodes[p].next === 'H') : p === null || (lesson.mode === 'delete' && s.nodes[p].next === null);
      condition('valid', '检查前驱或待删节点是否存在', invalid,
        invalid ? '未找到所需前驱，或该前驱后面没有可删除的数据节点。' : `前驱是 ${p}，位置条件满足。`, p && lesson.mode === 'delete' ? [p] : []);
      if (invalid) finish('invalid', false, false, '位置超过本次操作的合法范围，原链表保持不变。');
      else if (lesson.mode === 'insert') {
        const id = allocate(); if (!id) return { lesson, steps };
        field('data', id, 'data', value, `将输入值 ${value} 写入新节点的数据域。`);
        field('snext', id, 'next', s.nodes[p].next, '先保存原后继，让新节点接到原后继之前。', [p]);
        if (double) {
          field('sprior', id, 'prior', p, '新节点的前驱是 p。');
          const next = s.nodes[id].next;
          condition('hasNext', '检查新节点后面是否有后继', next !== null, `s.next = ${next === null ? 'NULL' : next}。`, [id]);
          if (next !== null) field('back', next, 'prior', id, '将原后继的 prior 改为新节点，补齐反向链接。', [id]);
        }
        field('attach', p, 'next', id, '最后让前驱 p 的 next 指向新节点。');
        finish('return', true, true, '插入完成。数据节点无需像顺序表那样整体移动。');
      } else {
        const q = s.nodes[p].next;
        ptr('q', 'q', q, 'q 保存待删除节点，便于读取数据并在最后释放。', false, [p]);
        s.vars['*e'] = s.nodes[q].data;
        emit('save', '保存输出', '保存被删节点的数据', `通过 *e 输出 ${s.vars['*e']}。`, 'e 指向有效的输出变量。', { read: [q] });
        const next = s.nodes[q].next;
        field('bypass', p, 'next', next, '让前驱越过 q，直接接到 q 原来的后继。', [q]);
        if (double) {
          condition('hasNext', '检查 q 是否存在后继', next !== null, `q.next = ${next === null ? 'NULL' : next}。`, [q]);
          if (next !== null) field('back', next, 'prior', p, '将后继的 prior 改回 p，保持双向关系。', [q]);
        }
        s.nodes[q].freed = true; s.freed++;
        emit('free', '释放节点', `释放节点 ${q}`, '执行 free(q)，节点存储不再可访问。',
          'free 不会自动把 q 置为 NULL。图中的墓碑仅用于观察释放事件，不能再解引用 q。', { critical: true, changed: [{ id: q, field: 'free' }] });
        finish('return', true, true, `删除完成，输出值为 ${s.vars['*e']}。`);
      }
    } else if (lesson.mode === 'access') {
      if (!traverseTo(position)) return { lesson, steps };
      const p = s.pointers.p;
      finish('return', p, p !== null, p === null ? '已到链尾 NULL，该位置不存在。' : `返回节点 ${p}，其数据为 ${s.nodes[p].data}。`);
    } else if (lesson.mode === 'search') {
      ptr('p', 'p', s.nodes.H.next, 'p 指向首元节点；空表时 p 为 NULL。', false, ['H']);
      s.vars.j = 1; emit('j', '初始化计数', '令 j = 1', '第一个数据节点的位置是 1。');
      for (;;) {
        const p = s.pointers.p, pass = p !== null && s.nodes[p].data !== value;
        condition('loop', '比较当前节点是否需要继续查找', pass,
          p === null ? 'p 为 NULL，短路求值，不读取 p->data。' : `当前数据 ${s.nodes[p].data}，目标 ${value}。`, p ? [p] : []);
        if (!pass) break;
        ptr('walk', 'p', s.nodes[p].next, '当前节点不匹配，沿 next 继续。', true, [p]);
        s.vars.j++; emit('inc', '更新位置', '将 j 加一', `j 现在为 ${s.vars.j}。`);
      }
      const found = s.pointers.p !== null;
      condition('found', '判断是否找到匹配节点', found, found ? 'p 指向首个匹配节点。' : '已经到达 NULL，没有找到。');
      finish(found ? 'returnFound' : 'returnMissing', found ? s.vars.j : 0, found, found ? `返回首个匹配位置 ${s.vars.j}。` : '返回 0，表示未找到；0 不是有效数据位置。');
    } else if (lesson.mode === 'traverse') {
      ptr('p', 'p', s.nodes.H.next, '从首元节点开始，不访问头节点的数据。', false, ['H']);
      for (;;) {
        const p = s.pointers.p, pass = circular ? p !== 'H' : p !== null;
        condition('loop', '检查遍历是否到达终点', pass, circular ? `p = ${p}；回到 H 时结束。` : `p = ${p === null ? 'NULL' : p}；到 NULL 时结束。`);
        if (!pass) break;
        s.output.push(s.nodes[p].data);
        emit('visit', '访问数据', `访问节点 ${p}`, `将 ${s.nodes[p].data} 交给 Visit；当前访问序列为 ${s.output.join(' → ')}。`, 'Visit 是由调用方提供的处理函数，本工具将其记录为输出。', { read: [p] });
        ptr('walk', 'p', s.nodes[p].next, '沿 next 进入下一个节点。', true, [p]);
      }
      finish('return', undefined, true, '遍历完成，头节点没有作为有效元素输出。');
    } else if (lesson.mode === 'reverse') {
      ptr('pre', 'pre', null, '已逆置部分初始为空，因此 pre = NULL。');
      ptr('p', 'p', s.nodes.H.next, 'p 指向待处理链的第一个节点。', false, ['H']);
      for (;;) {
        const p = s.pointers.p;
        condition('loop', '判断是否还有未处理节点', p !== null, `p = ${p === null ? 'NULL' : p}。`);
        if (p === null) break;
        const q = s.nodes[p].next;
        ptr('q', 'q', q, '必须先用 q 保存原后继，否则翻转 next 后可能丢失剩余链的入口。', false, [p]);
        field('flip', p, 'next', s.pointers.pre, '将当前节点接到已逆置部分的前面。节点中的 data 不变。');
        ptr('preMove', 'pre', p, 'pre 前进到新的已逆置链头。');
        ptr('walk', 'p', q, '通过保存的 q 继续处理原来的后继。', true);
      }
      field('attach', 'H', 'next', s.pointers.pre, '最后让头节点接到完整逆置后的首元节点。');
      finish('return', undefined, true, '原地逆置完成，没有申请新节点，也没有交换 data。');
    } else if (build) {
      if (lesson.mode === 'tailBuild') ptr('r', 'r', 'H', '空表的尾指针先指向头节点。');
      s.vars.k = 0; s.vars.n = values.length;
      emit('for', 'for · 初始化', '令 k = 0', '按输入序列从左到右处理。');
      for (;;) {
        const k = s.vars.k, pass = k < values.length;
        condition('for', '判断是否还有待建表元素', pass, `k = ${k}，n = ${values.length}。`);
        if (!pass) break;
        const id = allocate(); if (!id) return { lesson, steps };
        field('data', id, 'data', values[k], `读取输入 a[${k}] = ${values[k]}，写入新节点。`);
        field('snext', id, 'next', lesson.mode === 'headBuild' ? s.nodes.H.next : null,
          lesson.mode === 'headBuild' ? '新节点先指向当前首元节点。' : '新节点将成为表尾，next 设为 NULL。', lesson.mode === 'headBuild' ? ['H'] : []);
        field('attach', lesson.mode === 'headBuild' ? 'H' : s.pointers.r, 'next', id,
          lesson.mode === 'headBuild' ? '将新节点接在头节点后面。' : '让旧表尾连接新节点。');
        if (lesson.mode === 'tailBuild') ptr('tail', 'r', id, '更新 r，使其始终指向当前表尾。');
        s.vars.k++; emit('for', 'for · 更新', '将 k 加一', `k 现在为 ${s.vars.k}。`);
      }
      delete s.vars.k;
      finish('return', true, true, lesson.mode === 'headBuild' ? '头插建表完成，最终顺序与输入相反。for 内局部变量 k 已离开作用域。' : '尾插建表完成，最终顺序与输入一致。for 内局部变量 k 已离开作用域。');
    } else if (lesson.mode === 'badInsert') {
      if (position < 1 || position > values.length + 1) throw new Error('错序实验需要有效前驱，请使用 1 到 n+1 的位置。');
      s.pointers.p = position === 1 ? 'H' : `N${position - 1}`;
      s.pointers.s = 'S'; s.nodes.S = { id: 'S', data: null, next: '?', freed: false };
      s.allocated = 1;
      steps[0] = copy(s);
      field('data', 'S', 'data', value, '实验前提：p 已定位到有效前驱，新节点 s 已分配。先设置新节点的数据。');
      field('attach', s.pointers.p, 'next', 'S', '错误顺序第一步：先覆盖 p->next，原后继入口被覆盖。');
      field('snext', 'S', 'next', s.nodes[s.pointers.p].next, '此时 p->next 已经是 s，因此这句相当于 s->next = s。', [s.pointers.p]);
      finish('return', '结构异常', false, '检测到新节点自环。若继续按 NULL 作为终点遍历，将无法正常结束；原后继部分可能已失去头节点入口。');
    }
    return { lesson, steps };
  }
  function declaration(kind) {
    return '#include <stdbool.h>\n#include <stdlib.h>\n' + (kind === 'double' ? 'typedef struct DNode {\n    int data;\n    struct DNode *prior, *next;\n} DNode;' : 'typedef struct Node {\n    int data;\n    struct Node *next;\n} Node;') + '\n/* Traverse 示例需要调用方提供 void Visit(int value); */';
  }
  return { catalog, kinds, generate, inspect, declaration, copy };
});
