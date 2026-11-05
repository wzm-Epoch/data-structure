// Compile the displayed C source and compare it with independently generated traces.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const Lab = require('../js/linked-engine.js');
const lessons = Object.values(Lab.catalog).filter(l => !l.experiment);
const cases = [];
for (const lesson of lessons) for (let n = 0; n <= 8; n++) {
  const values = Array.from({ length: n }, (_, k) => k % 3 - 1);
  if (lesson.position) {
    for (let position = -1; position <= n + 2; position++) for (const failAt of lesson.mode === 'insert' ? [0, 1] : [0]) cases.push({ operation: lesson.key, values, position, value: 66, failAt });
  } else if (lesson.mode === 'search') {
    for (const value of [-7, -1, 0, 1, 99]) cases.push({ operation: lesson.key, values, value });
  } else if (/Build$/.test(lesson.mode)) {
    for (let failAt = 0; failAt <= Math.min(n + 1, 8); failAt++) cases.push({ operation: lesson.key, values, failAt });
  } else cases.push({ operation: lesson.key, values });
}
const switchCases = lessons.map((lesson, code) => {
  const head = lesson.kind === 'double' ? 'D' : 'L';
  let call;
  if (lesson.mode === 'insert') call = `returned = ${lesson.fn}(${head}, i, value);`;
  else if (lesson.mode === 'delete') call = `returned = ${lesson.fn}(${head}, i, &output);`;
  else if (lesson.mode === 'access') call = `Node *found = ${lesson.fn}(L, i); returned = found != NULL; if (found) output = found->data;`;
  else if (lesson.mode === 'search') call = `returned = ${lesson.fn}(L, value);`;
  else if (/Build$/.test(lesson.mode)) call = `returned = ${lesson.fn}(L, a, n);`;
  else call = `${lesson.fn}(L); returned = 1;`;
  return `case ${code}: { ${call} break; }`;
}).join('\n');
const directory = path.resolve(__dirname, '../work/linked-c-check');
fs.mkdirSync(directory, { recursive: true });
const file = path.join(directory, 'linked-reference.c');
const executable = path.join(directory, process.platform === 'win32' ? 'linked-reference.exe' : 'linked-reference');
fs.writeFileSync(file, `#include <stdio.h>
${Lab.declaration('single')}
${Lab.declaration('double')}
static int fail_at, attempts, releases, visited[16], visited_count;
static void *TrackedMalloc(size_t size) { ++attempts; if (fail_at && attempts == fail_at) return NULL; return malloc(size); }
static void TrackedFree(void *pointer) { ++releases; free(pointer); }
void Visit(int value) { visited[visited_count++] = value; }
#define malloc TrackedMalloc
#define free TrackedFree
${lessons.map(l => l.source.join('\n')).join('\n\n')}
#undef malloc
#undef free
int main(void) {
    int code, n, i, value, failure, a[8], k;
    while (scanf("%d%d%d%d%d", &code, &n, &i, &value, &failure) == 5) {
        Node *L = NULL, *tail = NULL;
        DNode *D = NULL, *dtail = NULL;
        int output = 999999, returned = 0, consistent = 1, count = 0;
        const int double_kind = ${lessons.map((l, n) => l.kind === 'double' ? `code == ${n}` : null).filter(Boolean).join(' || ')};
        const int circular_kind = ${lessons.map((l, n) => l.kind === 'circular' ? `code == ${n}` : null).filter(Boolean).join(' || ')};
        const int build = ${lessons.map((l, n) => /Build$/.test(l.mode) ? `code == ${n}` : null).filter(Boolean).join(' || ')};
        for (k = 0; k < n; ++k) if (scanf("%d", &a[k]) != 1) return 2;
        if (double_kind) {
            D = malloc(sizeof *D); if (!D) return 3;
            D->prior = NULL; D->next = NULL; D->data = 0; dtail = D;
            for (k = 0; k < n; ++k) {
                DNode *node = malloc(sizeof *node); if (!node) return 3;
                node->data = a[k]; node->next = NULL; node->prior = dtail;
                dtail->next = node; dtail = node;
            }
        } else {
            L = malloc(sizeof *L); if (!L) return 3;
            L->data = 0; L->next = NULL; tail = L;
            if (!build) for (k = 0; k < n; ++k) {
                Node *node = malloc(sizeof *node); if (!node) return 3;
                node->data = a[k]; node->next = NULL; tail->next = node; tail = node;
            }
            if (circular_kind) tail->next = L;
        }
        attempts = 0; releases = 0; visited_count = 0; fail_at = failure;
        switch (code) { ${switchCases} default: return 4; }
        printf("{\\"returned\\":%d,\\"output\\":%d,\\"attempts\\":%d,\\"releases\\":%d,\\"values\\":[", returned, output, attempts, releases);
        if (double_kind) {
            DNode *p = D->next, *previous = D;
            while (p && count < 12) {
                if (count++) printf(","); printf("%d", p->data);
                if (p->prior != previous) consistent = 0;
                previous = p; p = p->next;
            }
            if (p) consistent = 0;
        } else {
            Node *p = L->next;
            while (p && p != L && count < 12) {
                if (count++) printf(","); printf("%d", p->data); p = p->next;
            }
            if (circular_kind ? p != L : p != NULL) consistent = 0;
        }
        printf("],\\"visited\\":[");
        for (k = 0; k < visited_count; ++k) { if (k) printf(","); printf("%d", visited[k]); }
        printf("],\\"consistent\\":%d}\\n", consistent);
        if (!consistent) return 5;
        if (double_kind) { DNode *p = D->next; while (p) { DNode *next = p->next; free(p); p = next; } free(D); }
        else { Node *p = L->next; while (p && p != L) { Node *next = p->next; free(p); p = next; } free(L); }
    }
    return 0;
}
`);
const build = spawnSync(process.argv[2] || 'gcc', ['-std=c11', '-Wall', '-Wextra', '-pedantic', file, '-o', executable], { encoding: 'utf8' });
if (build.error || build.status !== 0) { process.stderr.write(build.error?.message || build.stderr); process.exit(1); }
const input = cases.map(c => `${lessons.findIndex(l => l.key === c.operation)} ${c.values.length} ${c.position || 0} ${c.value || 0} ${c.failAt || 0} ${c.values.join(' ')}`).join('\n') + '\n';
const run = spawnSync(executable, [], { encoding: 'utf8', input, maxBuffer: 4 * 1024 * 1024 });
if (run.error || run.status !== 0) { process.stderr.write(run.error?.message || run.stderr || `C 执行失败 ${run.status}`); process.exit(1); }
const outputs = run.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line));
assert.equal(outputs.length, cases.length);
cases.forEach((c, n) => {
  const trace = Lab.generate(c), state = trace.steps.at(-1), actual = outputs[n], context = JSON.stringify(c);
  assert.equal(actual.consistent, 1, context);
  assert.deepEqual(actual.values, Lab.inspect(state).values, context);
  assert.deepEqual(actual.visited, state.output, context);
  assert.equal(actual.attempts, state.allocated, context);
  assert.equal(actual.releases, state.freed, context);
  assert.equal(Boolean(actual.returned), state.result, context);
  if (trace.lesson.mode === 'search') assert.equal(actual.returned, state.returnValue, context);
  if (trace.lesson.mode === 'access' && state.result) assert.equal(actual.output, state.nodes[state.returnValue].data, context);
  if (trace.lesson.mode === 'delete') assert.equal(actual.output, state.result ? state.vars['*e'] : 999999, context);
});
console.log(`链表实际 C 对照通过：${cases.length} 组，覆盖 ${lessons.length} 个算法及申请失败场景。`);
