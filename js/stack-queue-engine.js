(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StackQueueLab = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function() {
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  const integer = x => Number.isInteger(x) && x >= -2147483648 && x <= 2147483647;
  const kinds = { arrayStack: '顺序栈', linkedStack: '链栈', circularQueue: '循环队列', linkedQueue: '链式队列' };
  const titles = { init: '初始化', empty: '判空', full: '判满', peek: '读取栈顶 / 队头', add: '入栈 / 入队', remove: '出栈 / 出队' };
  const catalog = {};
  function declaration(kind, capacity = 8) {
    return '#include <stdbool.h>\n#include <stdlib.h>\n' + (kind === 'arrayStack'
      ? `#define M ${capacity}\ntypedef struct { int data[M]; int top; } Structure;`
      : kind === 'circularQueue' ? `#define M ${capacity}\ntypedef struct { int data[M]; int front, rear; } Structure;`
      : 'typedef struct Node { int data; struct Node *next; } Node;\n' + (kind === 'linkedStack' ? 'typedef struct { Node *top; } Structure;' : 'typedef struct { Node *front, *rear; } Structure;'));
  }
  for (const kind of Object.keys(kinds)) {
    const stack = /Stack$/.test(kind), array = kind === 'arrayStack' || kind === 'circularQueue';
    for (const op of ['init', 'empty', ...(array ? ['full'] : []), 'peek', 'add', 'remove']) {
      const key = kind + '_' + op, fn = kind + '_' + op, lines = {};
      const rows = [], add = (tag, c) => { lines[tag] = rows.length + 1; rows.push(c); };
      const empty = kind === 'arrayStack' ? 'S->top == 0' : kind === 'circularQueue' ? 'S->front == S->rear' : kind === 'linkedStack' ? 'S->top->next == NULL' : 'S->front == S->rear';
      const full = kind === 'arrayStack' ? 'S->top == M' : '(S->rear + 1) % M == S->front';
      rows.push(`bool ${fn}(Structure *S${op === 'add' ? ', int e' : ['peek', 'remove'].includes(op) ? ', int *e' : ''}) {`);
      if (op === 'init') {
        if (kind === 'arrayStack') add('initTop', '    S->top = 0;');
        else if (kind === 'circularQueue') { add('initFront', '    S->front = 0;'); add('initRear', '    S->rear = 0;'); }
        else { add('initNext', `    S->${stack ? 'top' : 'front'}->next = NULL;`); if (!stack) add('initTail', '    S->rear = S->front;'); }
      } else if (op === 'empty' || op === 'full') add('query', `    return ${op === 'empty' ? empty : full};`);
      else {
        if (op !== 'add' || array) { add('check', `    if (${op === 'add' ? full : empty})`); add('fail', '        return false;'); }
        if (array) {
          const cell = kind === 'arrayStack' ? (op === 'add' ? 'S->top' : 'S->top - 1') : (op === 'add' ? 'S->rear' : 'S->front');
          if (op === 'add') add('data', `    S->data[${cell}] = e;`);
          else add('save', `    *e = S->data[${cell}];`);
          if (op !== 'peek') add('move', kind === 'arrayStack' ? `    ${op === 'add' ? '++' : '--'}S->top;` : `    S->${op === 'add' ? 'rear' : 'front'} = (S->${op === 'add' ? 'rear' : 'front'} + 1) % M;`);
        } else if (op === 'add') {
          add('alloc', '    Node *p = malloc(sizeof *p);'); add('allocCheck', '    if (p == NULL)'); add('allocFail', '        return false;');
          add('data', '    p->data = e;');
          add('next', `    p->next = ${stack ? 'S->top->next' : 'NULL'};`);
          add('attach', `    S->${stack ? 'top' : 'rear'}->next = p;`);
          if (!stack) add('tail', '    S->rear = p;');
        } else {
          add('p', `    Node *p = S->${stack ? 'top' : 'front'}->next;`); add('save', '    *e = p->data;');
          if (op === 'remove') {
            add('detach', `    S->${stack ? 'top' : 'front'}->next = p->next;`);
            if (!stack) { add('last', '    if (S->rear == p)'); add('tail', '        S->rear = S->front;'); }
            add('free', '    free(p);');
          }
        }
      }
      if (!['empty', 'full'].includes(op)) add('return', '    return true;');
      rows.push('}');
      catalog[key] = { key, kind, op, fn, source: rows, lines, title: titles[op].replace('读取栈顶 / 队头', stack ? '读取栈顶' : '读取队头').replace('入栈 / 入队', stack ? '入栈' : '入队').replace('出栈 / 出队', stack ? '出栈' : '出队') };
    }
  }
  function inspect(s) {
    if (s.kind === 'arrayStack') return s.memory.slice(0, s.vars.top);
    if (s.kind === 'circularQueue') {
      const a = []; for (let i = s.vars.front; i !== s.vars.rear; i = (i + 1) % s.capacity) a.push(s.memory[i]); return a;
    }
    const a = [], seen = new Set(); let id = s.nodes.H.next;
    while (id !== null) {
      if (id === '?' || seen.has(id) || !s.nodes[id] || s.nodes[id].freed) break;
      seen.add(id); a.push(s.nodes[id].data); id = s.nodes[id].next;
    }
    return a;
  }
  function generate({ operation, values = [], capacity = 8, front = 0, value = 66, failAt = 0 }) {
    const lesson = catalog[operation]; if (!lesson) throw new Error('不支持的算法。');
    const { kind, op } = lesson, stack = /Stack$/.test(kind), array = kind === 'arrayStack' || kind === 'circularQueue';
    if (!Array.isArray(values) || values.some(v => !integer(v))) throw new Error('元素必须为 32 位整数。');
    if (!integer(value)) throw new Error('入栈或入队值必须为 32 位整数。');
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 12) throw new Error('物理容量 M 必须为 2–12 的整数。');
    if (!Number.isInteger(front) || front < 0 || front >= capacity) throw new Error('初始 front 必须是 0 到 M−1 的整数下标。');
    if (![0, 1].includes(failAt)) throw new Error('申请失败选项必须为 0 或 1。');
    const limit = array ? capacity - (stack ? 0 : 1) : 8;
    if (values.length > limit) throw new Error(`初始元素最多 ${limit} 个${array ? '（受当前容量约束）' : '（仅为展示限制）'}。`);
    if (op === 'init' && values.length) throw new Error('初始化演示要求空输入；链式头节点已由调用方提供，不覆盖非空结构。');
    const s = { kind, capacity, memory: array ? Array(capacity).fill(null) : [], nodes: {}, pointers: {}, vars: {}, line: null, action: '尚未执行代码', explanation: '观察输入。后续每步均显示对应语句执行后状态。', read: [], changed: [], condition: null, critical: null, result: null, done: false, attempts: 0, frees: 0 };
    if (array) {
      if (stack) { s.vars.top = values.length; values.forEach((v, i) => s.memory[i] = v); }
      else { s.vars.front = front; s.vars.rear = (front + values.length) % capacity; values.forEach((v, i) => s.memory[(front + i) % capacity] = v); }
    } else {
      // Input order is top-to-bottom for a linked stack; head-to-tail for a queue.
      s.nodes.H = { id: 'H', data: null, next: values.length ? 'N1' : null, freed: false };
      values.forEach((v, i) => s.nodes['N' + (i + 1)] = { id: 'N' + (i + 1), data: v, next: i + 1 < values.length ? 'N' + (i + 2) : null, freed: false });
      if (stack) s.pointers.top = 'H'; else { s.pointers.front = 'H'; s.pointers.rear = values.length ? 'N' + values.length : 'H'; }
    }
    if (['peek', 'remove'].includes(op)) s.vars['*e'] = null;
    if (op === 'add') s.vars.e = value;
    const steps = [copy(s)];
    function emit(tag, action, explanation, read = [], changed = [], condition = null, critical = null) {
      Object.assign(s, { line: lesson.lines[tag], action, explanation, read, changed, condition, critical });
      if (!s.line) throw new Error('缺少 C 行标记：' + tag);
      steps.push(copy(s));
    }
    function finish(tag, result, explanation) { s.done = true; s.result = result; emit(tag, `返回 ${result}`, explanation); }
    const empty = () => array ? stack ? s.vars.top === 0 : s.vars.front === s.vars.rear : s.nodes.H.next === null;
    const full = () => stack ? s.vars.top === capacity : (s.vars.rear + 1) % capacity === s.vars.front;
    if (op === 'init') {
      if (kind === 'arrayStack') { s.vars.top = 0; emit('initTop', '设置 top = 0', '写入 top；空栈没有可读取的 data[top−1]。', [], ['top'], null, 'pointer'); }
      else if (kind === 'circularQueue') {
        s.vars.front = 0; emit('initFront', '设置 front = 0', '写入队头下标，初始化过程中暂不应用稳定结构不变量。', [], ['front'], null, 'pointer');
        s.vars.rear = 0; emit('initRear', '设置 rear = 0', '写入下一次入队位置，队列为空。', [], ['rear'], null, 'pointer');
      } else {
        s.nodes.H.next = null; emit('initNext', '设置 H.next = NULL', '通过有效头指针写入头节点链接；调用方已提供空头节点。', [], ['H.next'], null, 'pointer');
        if (!stack) { s.pointers.rear = 'H'; emit('initTail', 'rear 指向 H', '读取 front 指针并赋给 rear，没有读取数据节点字段。', ['front'], ['rear'], null, 'pointer'); }
      }
      finish('return', true, '初始化完成；未初始化数组格子不作为有效数据读取。');
    } else if (op === 'empty' || op === 'full') {
      const result = op === 'empty' ? empty() : full();
      s.done = true; s.result = result;
      emit('query', `${op === 'empty' ? '判空' : '判满'}返回 ${result}`, '只读取判定所需变量；false 是正常的判断结果，不代表操作失败。', array ? stack ? ['top'] : ['front', 'rear'] : stack ? ['top', 'H.next'] : ['front', 'rear'], [], result);
    } else {
      if (op !== 'add' || array) {
        const rejected = op === 'add' ? full() : empty();
        emit('check', op === 'add' ? '检查是否已满' : '检查是否为空', `条件为 ${rejected}。${rejected ? '进入返回 false 分支，不能读写数据。' : '继续执行操作。'}`, array ? stack ? ['top'] : ['front', 'rear'] : stack ? ['top', 'H.next'] : ['front', 'rear'], [], rejected);
        if (rejected) { finish('fail', false, '边界检查失败；原结构和输出参数保持不变。'); return { lesson, capacity, steps }; }
      }
      if (array) {
        const i = stack ? op === 'add' ? s.vars.top : s.vars.top - 1 : op === 'add' ? s.vars.rear : s.vars.front;
        if (op === 'add') { s.memory[i] = value; emit('data', `写入 data[${i}]`, `读取输入 e = ${value}，写入当前空位。此时${stack ? ' top' : ' rear'}尚未更新，接下来才将新值纳入逻辑结构。`, ['e', stack ? 'top' : 'rear'], [`data[${i}]`], null, 'write'); }
        else { s.vars['*e'] = s.memory[i]; emit('save', `保存输出 ${s.memory[i]}`, `读取 data[${i}]，写回有效输出指针 *e；${op === 'peek' ? '读取操作不删除元素。' : '先保存输出，再更新边界。'}`, [stack ? 'top' : 'front', `data[${i}]`], ['*e']); }
        if (op !== 'peek') {
          const name = stack ? 'top' : op === 'add' ? 'rear' : 'front', before = s.vars[name];
          s.vars[name] = stack ? before + (op === 'add' ? 1 : -1) : (before + 1) % capacity;
          emit('move', `更新 ${name} = ${s.vars[name]}`, `读取 ${name} 的旧值 ${before}，写入 ${s.vars[name]}。${stack ? 'top 等于有效元素个数。' : '对 M 取模，越过最后下标后回到 0。'}${op === 'remove' ? '原数组数据未被擦除，逻辑范围外旧值无效。' : ''}`, [name], [name], null, 'pointer');
        }
      } else if (op === 'add') {
        s.attempts++; s.pointers.p = failAt ? null : 'P';
        if (!failAt) s.nodes.P = { id: 'P', data: null, next: '?', freed: false };
        emit('alloc', failAt ? '申请失败，p = NULL' : '申请新节点 P', '写入局部指针 p；新节点字段尚未初始化，申请失败不改变原链。', [], ['p', ...(!failAt ? ['P.alloc'] : [])], null, 'memory');
        emit('allocCheck', '检查 p == NULL', `读取 p，条件为 ${!!failAt}。`, ['p'], [], !!failAt);
        if (failAt) { finish('allocFail', false, '申请失败，没有接入任何新节点，也不释放原有节点。'); return { lesson, capacity, steps }; }
        s.nodes.P.data = value; emit('data', '写入 P.data', '读取输入 e，写入新节点数据域。', ['e'], ['P.data'], null, 'write');
        s.nodes.P.next = stack ? s.nodes.H.next : null;
        emit('next', '初始化 P.next', stack ? '读取 H.next，让新节点先接住原栈顶。' : '新尾节点的 next 写为 NULL。', stack ? ['H.next'] : [], ['P.next'], null, 'pointer');
        const id = stack ? 'H' : s.pointers.rear;
        s.nodes[id].next = 'P'; emit('attach', stack ? '接入新栈顶' : '接入新队尾', `读取${stack ? ' top' : ' rear'}指针定位 ${id}，改写 ${id}.next；不交换任何数据。`, [stack ? 'top' : 'rear', 'p'], [id + '.next'], null, 'pointer');
        if (!stack) { s.pointers.rear = 'P'; emit('tail', 'rear 指向 P', '读取 p 并赋给 rear；指针赋值不读取旧尾节点字段。', ['p'], ['rear'], null, 'pointer'); }
      } else {
        const id = s.nodes.H.next; s.pointers.p = id;
        emit('p', `p 指向 ${id}`, '读取 H.next，保存待访问节点身份。', ['H.next'], ['p']);
        s.vars['*e'] = s.nodes[id].data; emit('save', '保存输出值', `读取 ${id}.data = ${s.nodes[id].data}，写回 *e。`, [id + '.data'], ['*e']);
        if (op === 'remove') {
          s.nodes.H.next = s.nodes[id].next; emit('detach', '绕过待删除节点', `读取 ${id}.next 并写入 H.next，先断开主链链接。`, [id + '.next'], ['H.next'], null, 'pointer');
          if (!stack) {
            const last = s.pointers.rear === id;
            emit('last', '检查删除的是否为尾节点', `读取 rear 与 p，条件为 ${last}；单元素队列删除后必须恢复 rear。`, ['rear', 'p'], [], last);
            if (last) { s.pointers.rear = 'H'; emit('tail', 'rear 恢复指向 H', '读取 front 并写入 rear；此时空队列 front == rear。', ['front'], ['rear'], null, 'pointer'); }
          }
          s.nodes[id].freed = true; s.nodes[id].data = null; s.nodes[id].next = null; s.frees++;
          emit('free', `释放 ${id}`, '释放内存；观察记录隐藏全部字段，局部 p 仅保留符号身份，不能再解引用。', ['p'], [id + '.free'], null, 'free');
        }
      }
      finish('return', true, '操作完成。局部变量保留退出前观察记录；可回退检查完整状态。');
    }
    return { lesson, capacity, steps };
  }
  return { catalog, kinds, generate, inspect, declaration };
});
