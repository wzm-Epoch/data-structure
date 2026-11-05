// Optional: compare the displayed C algorithms with the teaching engine.
// Usage: node tests/c-parity.cjs path/to/gcc
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const Lab = require('../js/engine.js');
const directory = path.resolve(__dirname, '../work/c-check');
fs.mkdirSync(directory, { recursive: true });
const source = path.join(directory, 'reference.c');
const executable = path.join(directory, process.platform === 'win32' ? 'reference.exe' : 'reference');
fs.writeFileSync(source, `#include <stdio.h>\n${Lab.declaration(8)}\n${Object.values(Lab.sources).map(lines => lines.join('\n')).join('\n\n')}
int main(void) {
    int op, n, i, k;
    for (op = 0; op < 3; ++op) {
        for (n = 0; n <= MAXSIZE; ++n) {
            for (i = -1; i <= n + 2; ++i) {
                SqList list = {{0}, 0};
                int output = 999999;
                bool ok;
                list.length = n;
                for (k = 0; k < n; ++k) list.data[k] = k % 3 == 0 ? -7 : k % 3;
                if (op == 0) ok = ListInsert(&list, i, 66);
                else if (op == 1) ok = ListDelete(&list, i, &output);
                else ok = GetElem(&list, i, &output);
                printf("%d %d %d %d %d %d", op, n, i, (int)ok, list.length, output);
                for (k = 0; k < list.length; ++k) printf(" %d", list.data[k]);
                printf("\\n");
            }
        }
    }
    return 0;
}
`);
const compiler = process.argv[2] || 'gcc';
const build = spawnSync(compiler, ['-std=c11', '-Wall', '-Wextra', '-pedantic', source, '-o', executable], { encoding: 'utf8' });
if (build.error || build.status !== 0) {
  process.stderr.write(build.error?.message || build.stderr || 'C 编译失败');
  process.exit(1);
}
const run = spawnSync(executable, [], { encoding: 'utf8' });
if (run.error || run.status !== 0) {
  process.stderr.write(run.error?.message || run.stderr || 'C 执行失败');
  process.exit(1);
}
const lines = run.stdout.trim().split(/\r?\n/);
for (const line of lines) {
  const [op, length, position, ok, resultLength, output, ...data] = line.split(' ').map(Number);
  const operation = ['insert', 'delete', 'access'][op];
  const values = Array.from({ length }, (_, n) => n % 3 === 0 ? -7 : n % 3);
  const state = Lab.generate({ operation, values, position, value: 66, capacity: 8 }).steps.at(-1);
  assert.equal(Boolean(ok), state.result, line);
  assert.equal(resultLength, state.length, line);
  assert.deepEqual(data, state.memory.slice(0, state.length), line);
  if (op !== 0) assert.equal(output, state.result ? state.vars.e : 999999, line);
}
assert.equal(lines.length, 216);
console.log(`C 示例与演示引擎对照通过：${lines.length} 组，覆盖容量为 8 时的所有表长、合法位置及相邻越界位置。`);
