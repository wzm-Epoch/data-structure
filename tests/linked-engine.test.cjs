const test = require('node:test');
const assert = require('node:assert/strict');
const Lab = require('../js/linked-engine.js');
const last = trace => trace.steps.at(-1);
const valuesOf = trace => Lab.inspect(last(trace)).values;
function checkFinal(trace) {
  const s = last(trace), info = Lab.inspect(s);
  assert.equal(s.done, true);
  assert.equal(info.cycle, null);
  assert.equal(info.dangling, null);
  assert.equal(info.unknown, false);
  assert.equal(info.endsAtHead, trace.lesson.kind === 'circular');
  const live = Object.values(s.nodes).filter(n => !n.freed);
  assert.equal(live.length, info.order.length + 1, '结束后不应遗留未管理的节点');
  if (trace.lesson.kind === 'double') {
    let previous = 'H';
    for (const id of info.order) { assert.equal(s.nodes[id].prior, previous); previous = id; }
    assert.equal(s.nodes.H.prior, null);
  }
  for (let n = 1; n < trace.steps.length; n++) {
    const current = trace.steps[n], previous = trace.steps[n - 1];
    assert.ok(current.line >= 1 && current.line <= trace.lesson.source.length);
    assert.notEqual(current.nodes, previous.nodes);
    assert.notEqual(current.pointers, previous.pointers);
    assert.notEqual(current.vars, previous.vars);
    for (const id of current.read) { assert.ok(current.nodes[id]); assert.equal(current.nodes[id].freed, false); }
    for (const id of Object.keys(previous.nodes)) {
      for (const field of ['data', 'next', 'prior']) {
        if (current.nodes[id][field] !== previous.nodes[id][field]) {
          assert.ok(current.changed.some(c => c.id === id && c.field === field), `未记录的写入 ${id}.${field}`);
        }
      }
      if (current.nodes[id].freed !== previous.nodes[id].freed) assert.ok(current.changed.some(c => c.id === id && c.field === 'free'));
    }
    for (const c of current.changed) {
      if (c.field !== 'free') assert.equal(current.nodes[c.id].freed, false);
    }
  }
}
test('目录包含 13 个正常算法与 1 个错序实验，每个源代码标记唯一且有效', () => {
  assert.equal(Object.values(Lab.catalog).filter(l => !l.experiment).length, 13);
  assert.equal(Object.keys(Lab.catalog).length, 14);
  for (const lesson of Object.values(Lab.catalog)) {
    assert.equal(new Set(Object.values(lesson.lines)).size, Object.keys(lesson.lines).length);
    assert.ok(lesson.source.every(line => typeof line === 'string'));
  }
});
test('六种按位修改：穷举长度 0–8、全部合法/邻近非法位置与申请失败', () => {
  let cases = 0;
  for (const operation of ['insert', 'delete', 'dInsert', 'dDelete', 'cInsert', 'cDelete']) {
    const inserting = Lab.catalog[operation].mode === 'insert';
    for (let n = 0; n <= 8; n++) {
      const values = Array.from({ length: n }, (_, k) => k % 3 === 0 ? -7 : k % 3);
      for (let position = -1; position <= n + 2; position++) {
        for (const failAt of inserting ? [0, 1] : [0]) {
          const trace = Lab.generate({ operation, values, position, value: 66, failAt });
          const valid = position >= 1 && position <= n + (inserting ? 1 : 0);
          const expectedSuccess = valid && (!inserting || failAt === 0);
          const expected = values.slice();
          if (expectedSuccess) inserting ? expected.splice(position - 1, 0, 66) : expected.splice(position - 1, 1);
          assert.equal(last(trace).result, expectedSuccess, `${operation} n=${n} i=${position} fail=${failAt}`);
          assert.deepEqual(valuesOf(trace), expected);
          if (expectedSuccess && !inserting) assert.equal(last(trace).vars['*e'], values[position - 1]);
          assert.equal(last(trace).freed, expectedSuccess && !inserting ? 1 : 0);
          checkFinal(trace); cases++;
        }
      }
    }
  }
  assert.equal(cases, 648);
});
test('按位查找返回正确节点或 NULL，按值查找返回首个匹配位置', () => {
  for (let n = 0; n <= 8; n++) {
    const values = Array.from({ length: n }, (_, k) => k % 3 - 1);
    for (let position = -1; position <= n + 2; position++) {
      const trace = Lab.generate({ operation: 'access', values, position });
      const valid = position >= 1 && position <= n;
      assert.equal(last(trace).returnValue, valid ? `N${position}` : null);
      assert.equal(last(trace).result, valid); assert.deepEqual(valuesOf(trace), values); checkFinal(trace);
    }
    for (const value of [-5, -1, 0, 1, 9]) {
      const trace = Lab.generate({ operation: 'search', values, value });
      assert.equal(last(trace).returnValue, values.indexOf(value) + 1);
      assert.equal(last(trace).result, values.includes(value)); checkFinal(trace);
    }
  }
});
test('普通和循环遍历只输出数据节点；空循环表立即停止', () => {
  for (const operation of ['traverse', 'cTraverse']) for (let n = 0; n <= 8; n++) {
    const values = Array.from({ length: n }, (_, k) => k - 4);
    const trace = Lab.generate({ operation, values });
    assert.deepEqual(last(trace).output, values);
    assert.deepEqual(valuesOf(trace), values);
    assert.equal(last(trace).returnValue, 'void');
    checkFinal(trace);
  }
});
test('逆置仅修改 next，节点身份和 data 保持不变，空表与单节点正确', () => {
  for (let n = 0; n <= 8; n++) {
    const values = Array.from({ length: n }, (_, k) => k % 2 ? -5 : 12);
    const trace = Lab.generate({ operation: 'reverse', values });
    assert.deepEqual(valuesOf(trace), values.slice().reverse());
    assert.equal(last(trace).allocated, 0); assert.equal(last(trace).freed, 0);
    for (const step of trace.steps) for (let k = 0; k < n; k++) assert.equal(step.nodes[`N${k + 1}`].data, values[k]);
    checkFinal(trace);
  }
});
test('头插/尾插建表：完整结果、所有第 k 次申请失败及部分结果归属', () => {
  for (const operation of ['headBuild', 'tailBuild']) for (let n = 0; n <= 8; n++) {
    const values = Array.from({ length: n }, (_, k) => k - 3);
    for (let failAt = 0; failAt <= Math.min(n + 1, 8); failAt++) {
      const fail = failAt > 0 && failAt <= n;
      const trace = Lab.generate({ operation, values, failAt });
      const expected = values.slice(0, fail ? failAt - 1 : n);
      if (operation === 'headBuild') expected.reverse();
      assert.deepEqual(valuesOf(trace), expected);
      assert.equal(last(trace).result, !fail);
      assert.equal(trace.steps[0].nodes.H.next, null);
      checkFinal(trace);
    }
  }
});
test('错序实验：覆盖入口后新节点自环；中间快照能恢复原链接', () => {
  const trace = Lab.generate({ operation: 'badInsert', values: [10, 20, 30], position: 2, value: 99 });
  const info = Lab.inspect(last(trace));
  assert.equal(info.cycle, 'S'); assert.deepEqual(info.values, [10, 99]);
  assert.equal(last(trace).nodes.S.next, 'S'); assert.equal(last(trace).nodes.N1.next, 'S');
  assert.equal(trace.steps[1].nodes.N1.next, 'N2');
  assert.equal(trace.steps[2].nodes.S.next, '?');
  assert.equal(last(trace).nodes.N2.freed, false);
  assert.equal(last(trace).result, false);
});
test('节点读取标记准确区分字段读取、变量赋值和节点写入', () => {
  const insertion = Lab.generate({ operation: 'insert', values: [10, 20], position: 2, value: 9 });
  const at = (trace, tag) => trace.steps.filter(s => s.line === trace.lesson.lines[tag]);
  assert.deepEqual(at(insertion, 'p')[0].read, []);
  assert.deepEqual(at(insertion, 'walk')[0].read, ['H']);
  assert.deepEqual(at(insertion, 'snext')[0].read, ['N1']);
  assert.deepEqual(at(insertion, 'attach')[0].read, []);
  const reverse = Lab.generate({ operation: 'reverse', values: [10, 20] });
  assert.deepEqual(at(reverse, 'p')[0].read, ['H']);
  assert.deepEqual(at(reverse, 'q')[0].read, ['N1']);
  assert.deepEqual(at(reverse, 'preMove')[0].read, []);
  assert.deepEqual(at(reverse, 'walk')[0].read, []);
});
test('快照与输入独立；32 位边界值与展示规模限制', () => {
  const values = [-2147483648, 2147483647];
  const trace = Lab.generate({ operation: 'insert', values, position: 2, value: -2147483648 });
  const finalBefore = JSON.stringify(last(trace));
  trace.steps[0].nodes.N1.data = 1; trace.steps[0].pointers.L = null;
  assert.equal(JSON.stringify(last(trace)), finalBefore);
  assert.deepEqual(values, [-2147483648, 2147483647]);
  assert.throws(() => Lab.generate({ values: Array(9).fill(1) }));
  assert.throws(() => Lab.generate({ values: [NaN] }));
  assert.throws(() => Lab.generate({ position: 1.2 }));
  assert.throws(() => Lab.generate({ value: 2147483648 }));
  assert.throws(() => Lab.generate({ failAt: 9 }));
  assert.throws(() => Lab.generate({ operation: 'badInsert', values: [], position: 2 }));
});
