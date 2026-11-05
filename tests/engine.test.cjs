const test = require('node:test');
const assert = require('node:assert/strict');
const Lab = require('../js/engine.js');
const final = trace => trace.steps.at(-1);

test('输入解析：空表、负数、重复值和分隔符；拒绝无效及超范围整数', () => {
  assert.deepEqual(Lab.parseInput(''), []);
  assert.deepEqual(Lab.parseInput(' 1，-2  1,+4 '), [1, -2, 1, 4]);
  for (const text of ['1,a', '2.5', 'NaN', 'Infinity', '2147483648', '-2147483649', '1,,2', '1,']) {
    assert.throws(() => Lab.parseInput(text));
  }
});

test('穷举容量 1–12、所有长度和全部合法/越界位置，结果与独立数组操作一致', () => {
  let cases = 0;
  for (let capacity = 1; capacity <= 12; capacity++) {
    for (let length = 0; length <= capacity; length++) {
      const values = Array.from({ length }, (_, n) => n % 3 === 0 ? -7 : n % 3);
      for (let position = -1; position <= length + 2; position++) {
        for (const operation of ['insert', 'delete', 'access']) {
          const original = [...values];
          const trace = Lab.generate({ operation, values, position, value: 99, capacity });
          const result = final(trace);
          const valid = position >= 1 && position <= length + (operation === 'insert' ? 1 : 0)
            && !(operation === 'insert' && length === capacity);
          const expected = [...values];
          let output = null;
          if (valid && operation === 'insert') expected.splice(position - 1, 0, 99);
          if (valid && operation === 'delete') output = expected.splice(position - 1, 1)[0];
          if (valid && operation === 'access') output = expected[position - 1];
          assert.equal(result.done, true);
          assert.equal(result.result, valid);
          assert.deepEqual(result.memory.slice(0, result.length), expected);
          assert.deepEqual(values, original, '不能修改调用方输入');
          assert.equal(result.moves, valid ? operation === 'insert' ? length - position + 1 : operation === 'delete' ? length - position : 0 : 0);
          if (valid && operation !== 'insert') assert.equal(result.vars.e, output);
          if (!valid) assert.deepEqual(result.memory, trace.steps[0].memory);
          for (let n = 1; n < trace.steps.length; n++) {
            const s = trace.steps[n], previous = trace.steps[n - 1];
            assert.equal(s.memory.length, capacity);
            assert.ok(s.length >= 0 && s.length <= capacity);
            assert.ok(s.line >= 1 && s.line <= trace.source.length);
            for (let cell = 0; cell < capacity; cell++) {
              if (s.memory[cell] !== previous.memory[cell]) assert.ok(s.write.includes(cell), '只允许本步写入位置发生变化');
            }
            for (const cell of [...s.read, ...s.write]) assert.ok(cell >= 0 && cell < capacity, '不得越界读写');
            if (s.move) {
              assert.equal(s.memory[s.move.to], previous.memory[s.move.from], '移动应复制执行前的源值');
              assert.equal(s.memory[s.move.from], previous.memory[s.move.from], '源值不得自动清空');
              assert.equal(s.moves, previous.moves + 1);
            } else assert.equal(s.moves, previous.moves);
            assert.notEqual(s.memory, previous.memory);
            assert.notEqual(s.vars, previous.vars);
          }
          cases++;
        }
      }
    }
  }
  assert.equal(cases, 2172); // Σ[3 × (capacity + 1) × (capacity / 2 + 4)]，capacity=1…12。
});

test('插入：循环初始化、判断、循环体和更新分别记录，映射同一 for 行', () => {
  const trace = Lab.generate({ operation: 'insert', values: [10, 20, 30], position: 2, value: 9, capacity: 6 });
  const loop = trace.steps.filter(s => s.line === 7 || s.line === 8);
  assert.deepEqual(loop.map(s => s.phase), ['for · 初始化', 'for · 条件', '循环体 · 右移', 'for · 更新', 'for · 条件', '循环体 · 右移', 'for · 更新', 'for · 条件']);
  assert.deepEqual(loop.filter(s => s.move).map(s => s.move), [{ from: 2, to: 3 }, { from: 1, to: 2 }]);
  assert.equal(loop.at(-1).condition, false);
  assert.equal(loop.at(-1).vars.j, 1);
});

test('删除：从前向后复制，尾部保留旧值，但逻辑长度缩短', () => {
  const trace = Lab.generate({ operation: 'delete', values: [10, 20, 30, 40], position: 2, capacity: 6 });
  assert.deepEqual(trace.steps.filter(s => s.move).map(s => s.move), [{ from: 2, to: 1 }, { from: 3, to: 2 }]);
  assert.deepEqual(final(trace).memory, [10, 30, 40, 40, null, null]);
  assert.equal(final(trace).length, 3);
  assert.equal(final(trace).vars.e, 20);
});

test('空表插入、尾插、尾删和按位查找不移动原有元素', () => {
  const cases = [
    { operation: 'insert', values: [], position: 1, value: 0 },
    { operation: 'insert', values: [1, 2], position: 3, value: 0 },
    { operation: 'delete', values: [1, 2], position: 2 },
    { operation: 'access', values: [1, 2], position: 2 }
  ];
  for (const options of cases) {
    const trace = Lab.generate({ ...options, capacity: 6 });
    assert.equal(final(trace).result, true);
    assert.equal(final(trace).moves, 0);
    assert.equal(trace.steps.filter(s => s.move).length, 0);
  }
});

test('失败分支：非法位置优先，满表返回前不执行循环或写入', () => {
  const invalid = Lab.generate({ operation: 'insert', values: [1], position: 0, value: 2, capacity: 1 });
  const full = Lab.generate({ operation: 'insert', values: [1], position: 1, value: 2, capacity: 1 });
  assert.equal(final(invalid).line, 4);
  assert.equal(final(full).line, 6);
  for (const trace of [invalid, full]) assert.ok(trace.steps.every(s => s.write.length === 0 && s.moves === 0));
  for (const operation of ['delete', 'access']) assert.equal(final(Lab.generate({ operation, values: [], position: 1 })).result, false);
});

test('状态快照独立：更改一个快照，不污染前后步骤，支持准确回退', () => {
  const trace = Lab.generate({ operation: 'insert', values: [2, 2, -5], position: 1, value: -8, capacity: 6 });
  const saved = JSON.stringify(trace.steps[0]);
  const last = JSON.stringify(final(trace));
  trace.steps[2].memory[0] = 999;
  trace.steps[2].vars.i = -1;
  assert.equal(JSON.stringify(trace.steps[0]), saved);
  assert.equal(JSON.stringify(final(trace)), last);
});

test('参数校验、32 位边界以及 MAXSIZE 定义保持一致', () => {
  for (const capacity of [6, 8, 12]) assert.match(Lab.declaration(capacity), new RegExp(`#define MAXSIZE ${capacity}\\b`));
  assert.throws(() => Lab.generate({ operation: 'bad', values: [], position: 1 }));
  assert.throws(() => Lab.generate({ operation: 'insert', values: [1, 2], position: 1, capacity: 1 }));
  assert.throws(() => Lab.generate({ operation: 'insert', values: [], position: 1.5 }));
  assert.throws(() => Lab.generate({ operation: 'insert', values: [], position: 1, value: 2147483648 }));
  for (const value of [-2147483648, 2147483647]) {
    const trace = Lab.generate({ operation: 'insert', values: [], position: 1, value, capacity: 1 });
    assert.equal(final(trace).memory[0], value);
  }
});
