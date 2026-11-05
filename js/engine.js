(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SequenceLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const names = { insert: '插入', delete: '删除', access: '按位查找' };
  const sources = {
    insert: [
      'bool ListInsert(SqList *L, int i, int e) {',
      '    int j;',
      '    if (i < 1 || i > L->length + 1)',
      '        return false;',
      '    if (L->length == MAXSIZE)',
      '        return false;',
      '    for (j = L->length; j >= i; --j)',
      '        L->data[j] = L->data[j - 1];',
      '    L->data[i - 1] = e;',
      '    ++L->length;',
      '    return true;',
      '}'
    ],
    delete: [
      'bool ListDelete(SqList *L, int i, int *e) {',
      '    int j;',
      '    if (i < 1 || i > L->length)',
      '        return false;',
      '    *e = L->data[i - 1];',
      '    for (j = i; j < L->length; ++j)',
      '        L->data[j - 1] = L->data[j];',
      '    --L->length;',
      '    return true;',
      '}'
    ],
    access: [
      'bool GetElem(const SqList *L, int i, int *e) {',
      '    if (i < 1 || i > L->length)',
      '        return false;',
      '    *e = L->data[i - 1];',
      '    return true;',
      '}'
    ]
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const isInt = value => Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;

  function parseInput(text) {
    if (!text.trim()) return [];
    if (/[,，]\s*[,，]/.test(text)) throw new Error('两个逗号之间缺少元素；请补齐整数或移除多余的逗号。');
    const tokens = text.trim().split(/[,，\s]+/);
    if (tokens.some(t => !/^[+-]?\d+$/.test(t) || !isInt(Number(t)))) {
      throw new Error('请输入 32 位整数，用逗号或空格分隔；留空表示空表。');
    }
    return tokens.map(Number);
  }

  function generate(options) {
    const { operation, values, position, value = 0, capacity = 8 } = options;
    if (!names[operation]) throw new Error('不支持的操作。');
    if (!Array.isArray(values) || values.some(v => !isInt(v))) throw new Error('表元素必须是 32 位整数。');
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 12) throw new Error('容量必须是 1 到 12 的整数。');
    if (values.length > capacity) throw new Error(`初始元素不能超过容量 ${capacity}。`);
    if (!isInt(position) || (operation === 'insert' && !isInt(value))) throw new Error('位置和插入值必须是 32 位整数。');
    let s = {
      memory: Array.from({ length: capacity }, (_, n) => n < values.length ? values[n] : null),
      length: values.length,
      vars: operation === 'access' ? { i: position, e: null } : { i: position, e: operation === 'insert' ? value : null, j: null },
      line: null, phase: '准备就绪', action: '尚未执行代码',
      explanation: '先观察初始顺序表，再点“下一步”。位置 i 从 1 开始，数组下标从 0 开始。',
      detail: '所有步骤显示刚执行完的状态。灰色格子位于逻辑表之外。',
      read: [], write: [], move: null, condition: null, moves: 0, result: null, done: false
    };
    const steps = [clone(s)];
    function push(line, phase, action, explanation, detail, effects = {}) {
      s.line = line; s.phase = phase; s.action = action;
      s.explanation = explanation; s.detail = detail;
      s.read = []; s.write = []; s.move = null; s.condition = null;
      Object.assign(s, effects);
      steps.push(clone(s));
    }
    function finish(line, result, reason) {
      push(line, '函数返回', `返回 ${result}`, reason,
        result ? '本次操作成功。可回退检查中间状态，或更换输入重新演示。' : '本次操作失败，顺序表保持不变。',
        { result, done: true });
    }
    if (operation !== 'access') {
      push(2, '变量声明', '声明局部变量 j', '声明循环变量 j，此时尚未赋初值。', '未初始化的变量不能读取；后续 for 的初始化会给 j 赋值。');
    }
    const invalid = position < 1 || position > values.length + (operation === 'insert' ? 1 : 0);
    const upper = values.length + (operation === 'insert' ? 1 : 0);
    push(operation === 'access' ? 2 : 3, '条件判断', '检查位置是否合法',
      `i = ${position}，本次合法位置为 ${upper < 1 ? '无（空表不能访问或删除）' : `1 到 ${upper}`}。`,
      `越界条件为 ${invalid ? 'true，进入返回失败分支' : 'false，继续执行'}。`, { condition: invalid });
    if (invalid) {
      finish(operation === 'access' ? 3 : 4, false, '位置不合法，返回 false；没有读写表中元素。');
      return { operation, capacity, source: sources[operation].slice(), steps };
    }
    if (operation === 'insert') {
      const full = s.length === capacity;
      push(5, '条件判断', '检查顺序表是否已满', `length = ${s.length}，MAXSIZE = ${capacity}。`,
        `length == MAXSIZE 为 ${full}。${full ? '没有空闲容量，不能插入。' : '有足够容量，可以继续。'}`, { condition: full });
      if (full) finish(6, false, '顺序表已满，返回 false；没有移动元素。');
      else {
        s.vars.j = s.length;
        push(7, 'for · 初始化', '初始化 j 为当前表长', `令 j = length = ${s.length}。`, '右移从表尾开始：先为后面的元素腾出位置。');
        for (;;) {
          const pass = s.vars.j >= position;
          push(7, 'for · 条件', '判断是否继续右移', `判断 j >= i，即 ${s.vars.j} >= ${position}，结果为 ${pass}。`,
            pass ? '条件成立，接下来执行循环体。' : '条件不成立，退出循环，准备写入新元素。', { condition: pass });
          if (!pass) break;
          const j = s.vars.j, item = s.memory[j - 1];
          s.memory[j] = item; s.moves++;
          push(8, '循环体 · 右移', '将一个元素向右复制', `把 data[${j - 1}] 的 ${item} 复制到 data[${j}]。`,
            '这是赋值复制，不是交换。源格子保留原值，后续步骤会覆盖相应位置。',
            { read: [j - 1], write: [j], move: { from: j - 1, to: j } });
          --s.vars.j;
          push(7, 'for · 更新', '将 j 减一', `执行 --j，j 现在是 ${s.vars.j}。`, '下一步重新判断循环条件。');
        }
        s.memory[position - 1] = value;
        push(9, '写入新元素', '写入待插入元素', `将 e = ${value} 写到 data[i - 1]，即 data[${position - 1}]。`,
          '第 i 个位置对应数组下标 i - 1。此时 length 还没有增加。', { write: [position - 1] });
        s.length++;
        push(10, '更新表长', '将 length 加一', `执行 ++L->length，逻辑长度变为 ${s.length}。`, '新增加的一个物理格子现在属于逻辑表。');
        finish(11, true, `插入成功，共移动 ${s.moves} 个原有元素。`);
      }
    } else if (operation === 'delete') {
      s.vars.e = s.memory[position - 1];
      push(5, '保存删除值', '保存将被删除的元素', `通过 *e 将 data[${position - 1}] 的 ${s.vars.e} 传回调用方。`,
        '这里的 e 是有效输出指针；面板显示 *e 的值。保存元素还不等于完成删除。', { read: [position - 1] });
      s.vars.j = position;
      push(6, 'for · 初始化', '初始化 j 为删除位置', `令 j = i = ${position}。`, '循环将 data[j] 复制到 data[j - 1]，从左到右填补空位。');
      for (;;) {
        const pass = s.vars.j < s.length;
        push(6, 'for · 条件', '判断是否继续左移', `判断 j < length，即 ${s.vars.j} < ${s.length}，结果为 ${pass}。`,
          pass ? '条件成立，后面还有元素需要前移。' : '条件不成立，结束元素移动。', { condition: pass });
        if (!pass) break;
        const j = s.vars.j, item = s.memory[j];
        s.memory[j - 1] = item; s.moves++;
        push(7, '循环体 · 左移', '将一个元素向左复制', `把 data[${j}] 的 ${item} 复制到 data[${j - 1}]。`,
          '从前向后移动，避免覆盖后续仍要读取的源元素。', { read: [j], write: [j - 1], move: { from: j, to: j - 1 } });
        ++s.vars.j;
        push(6, 'for · 更新', '将 j 加一', `执行 ++j，j 现在是 ${s.vars.j}。`, '下一步重新判断循环条件。');
      }
      s.length--;
      push(8, '更新表长', '将 length 减一', `执行 --L->length，逻辑长度变为 ${s.length}。`,
        '尾部旧值并没有被清零，但已在逻辑表之外，不再算作表元素。');
      finish(9, true, `删除成功，输出值为 ${s.vars.e}，共移动 ${s.moves} 个元素。`);
    } else {
      s.vars.e = s.memory[position - 1];
      push(4, '读取元素', '读取指定位置的元素', `读取 data[i - 1]，即 data[${position - 1}] = ${s.vars.e}，通过 *e 输出。`,
        '按位查找可直接定位下标，不需要逐个遍历，也不会改动原表。', { read: [position - 1] });
      finish(5, true, `按位查找成功，输出值为 ${s.vars.e}。`);
    }
    return { operation, capacity, source: sources[operation].slice(), steps };
  }
  function declaration(capacity) {
    return `#include <stdbool.h>\n#define MAXSIZE ${capacity}\ntypedef struct {\n    int data[MAXSIZE];\n    int length;\n} SqList;`;
  }
  return { names, sources, parseInput, generate, declaration };
});
