const test = require('node:test');
const assert = require('node:assert/strict');
const Lab = require('../js/stack-queue-engine.js');
const last = t => t.steps.at(-1);
function check(t) {
  assert.equal(t.steps[0].line, null); assert.equal(last(t).done, true);
  for (let i = 1; i < t.steps.length; i++) {
    const a = t.steps[i - 1], b = t.steps[i];
    assert.ok(b.line > 0 && b.line <= t.lesson.source.length);
    for (const field of ['memory', 'nodes', 'pointers', 'vars']) assert.notEqual(a[field], b[field]);
    for (let j = 0; j < a.memory.length; j++) if (a.memory[j] !== b.memory[j]) assert.ok(b.changed.includes(`data[${j}]`));
    for (const name of Object.keys(b.vars)) if (a.vars[name] !== b.vars[name]) assert.ok(b.changed.includes(name));
    for (const name of Object.keys(b.pointers)) if (a.pointers[name] !== b.pointers[name]) assert.ok(b.changed.includes(name));
    for (const id of Object.keys(a.nodes)) {
      if (b.nodes[id].freed) { assert.equal(b.nodes[id].data, null); assert.equal(b.nodes[id].next, null); }
      for (const f of ['data', 'next']) if (a.nodes[id][f] !== b.nodes[id][f]) assert.ok(b.changed.includes(id + '.' + f) || b.changed.includes(id + '.free'));
    }
    for (const field of b.read) {
      if (/^data\[/.test(field)) { const k = Number(field.slice(5, -1)); assert.ok(k >= 0 && k < a.capacity); assert.notEqual(a.memory[k], null); }
      if (/^[HNP]\d*\./.test(field)) { const [id, f] = field.split('.'); assert.ok(a.nodes[id]); assert.equal(a.nodes[id].freed, false); assert.notEqual(a.nodes[id][f], '?'); }
    }
  }
}
test('22 个算法与 C 行标记', () => {
  assert.equal(Object.keys(Lab.catalog).length, 22);
  for (const l of Object.values(Lab.catalog)) assert.equal(new Set(Object.values(l.lines)).size, Object.keys(l.lines).length);
});
test('数组穷举容量 2–12、所有长度、循环 front 与全部操作', () => {
  let count = 0;
  for (const kind of ['arrayStack', 'circularQueue']) for (let capacity = 2; capacity <= 12; capacity++) {
    const max = capacity - (kind === 'circularQueue' ? 1 : 0);
    for (let n = 0; n <= max; n++) for (let front = 0; front < (kind === 'circularQueue' ? capacity : 1); front++) for (const op of ['empty', 'full', 'peek', 'add', 'remove', ...(n === 0 ? ['init'] : [])]) {
      const values = Array.from({length:n}, (_, i) => i % 3 - 1), expected = values.slice();
      const t = Lab.generate({operation:kind + '_' + op, values, capacity, front, value:77}), s = last(t);
      const result = op === 'empty' ? n === 0 : op === 'full' ? n === max : op === 'add' ? n < max : ['remove', 'peek'].includes(op) ? n > 0 : true;
      if (op === 'add' && result) expected.push(77);
      if (op === 'remove' && result) kind === 'arrayStack' ? expected.pop() : expected.shift();
      assert.equal(s.result, result); assert.deepEqual(Lab.inspect(s), expected);
      if (['peek','remove'].includes(op)) assert.equal(s.vars['*e'], result ? values[kind === 'arrayStack' ? n - 1 : 0] : null);
      if (kind === 'arrayStack') assert.equal(s.vars.top, expected.length);
      else assert.equal((s.vars.rear - s.vars.front + capacity) % capacity, expected.length);
      check(t); count++;
    }
  }
  console.log('数组场景：', count);
});
test('链式空/单元素/重复值/失败分支，末节点 rear 与释放', () => {
  for (const kind of ['linkedStack', 'linkedQueue']) for (let n = 0; n <= 8; n++) for (const op of ['empty', 'peek', 'add', 'remove', ...(n === 0 ? ['init'] : [])]) for (const failAt of op === 'add' ? [0,1] : [0]) {
    const values = Array.from({length:n}, (_, i) => i % 2), expected = values.slice();
    const t = Lab.generate({operation:kind + '_' + op, values, failAt, value:66}), s = last(t);
    const result = op === 'empty' ? n === 0 : op === 'add' ? !failAt : ['remove','peek'].includes(op) ? n > 0 : true;
    if (op === 'add' && result) kind === 'linkedStack' ? expected.unshift(66) : expected.push(66);
    if (op === 'remove' && result) expected.shift();
    assert.equal(s.result, result); assert.deepEqual(Lab.inspect(s), expected);
    if (['peek','remove'].includes(op)) assert.equal(s.vars['*e'], result ? values[0] : null);
    assert.equal(s.frees, op === 'remove' && result ? 1 : 0);
    if (kind === 'linkedQueue') { assert.equal(s.nodes[s.pointers.rear].next, null); if (!expected.length) assert.equal(s.pointers.rear, 'H'); }
    assert.equal(Object.values(s.nodes).filter(x => !x.freed).length, expected.length + 1);
    check(t);
  }
});
test('关键中间步骤与完整快照回退', () => {
  const t = Lab.generate({operation:'linkedQueue_remove', values:[42]});
  const freed = t.steps.findIndex(s => s.critical === 'free');
  assert.equal(t.steps[freed].nodes.N1.freed, true);
  assert.equal(t.steps[freed-1].nodes.N1.freed, false);
  assert.equal(t.steps[freed-1].nodes.N1.data, 42);
  assert.equal(t.steps[freed-1].pointers.rear, 'H');
  const a = Lab.generate({operation:'arrayStack_add',values:[]});
  const written = a.steps.find(s => s.critical === 'write');
  assert.equal(written.vars.top, 0); assert.equal(written.memory[0], 66);
  const snapshot = JSON.stringify(t.steps[0]); last(t).nodes.H.next='bad'; assert.equal(JSON.stringify(t.steps[0]), snapshot);
  const input=[3,3]; Lab.generate({operation:'linkedStack_add',values:input}); assert.deepEqual(input,[3,3]);
});
test('格式/越界/整数范围与初始化前提', () => {
  for (const extra of [{capacity:1},{capacity:13},{front:-1},{front:8},{values:Array(9).fill(0)},{value:2147483648},{failAt:2},{values:[NaN]}]) assert.throws(() => Lab.generate({operation:'arrayStack_add',...extra}));
  assert.throws(() => Lab.generate({operation:'linkedQueue_init',values:[1]}));
  for (const value of [-2147483648,2147483647]) assert.equal(last(Lab.generate({operation:'arrayStack_peek',values:[value]})).vars['*e'],value);
});
