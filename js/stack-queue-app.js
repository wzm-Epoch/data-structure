(function() {
  'use strict';
  const Lab = window.StackQueueLab, Content = window.StackQueueContent, $ = id => document.getElementById(id);
  const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const key = 'zhixu-stack-queue-v1'; let saved;
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (_) { saved = {}; }
  const completed = new Set((Array.isArray(saved.completed) ? saved.completed : []).filter(k => Lab.catalog[k]));
  const mastered = new Set((Array.isArray(saved.mastered) ? saved.mastered : []).filter(n => Number.isInteger(n) && Content.quizzes[n]));
  let operation = 'arrayStack_add', trace, index = 0, timer = null, predictionTarget = null, stoppedBefore = null;
  const kind = () => Lab.catalog[operation].kind;
  const array = () => ['arrayStack', 'circularQueue'].includes(kind());
  function persist() {
    try { localStorage.setItem(key, JSON.stringify({ completed: [...completed], mastered: [...mastered] })); } catch (_) { /* optional local storage */ }
    $('completed-count').textContent = `${completed.size} / ${Object.keys(Lab.catalog).length}`;
    $('completion-fill').style.width = `${completed.size / Object.keys(Lab.catalog).length * 100}%`;
    $('quiz-score').textContent = `已掌握 ${mastered.size} / ${Content.quizzes.length}`;
  }
  function pause() { clearInterval(timer); timer = null; $('play').textContent = '▶ 播放'; }
  function clearTransient() { predictionTarget = null; $('prediction').hidden = true; stoppedBefore = null; $('pause-message').hidden = true; }
  function showView(view) {
    pause(); document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== 'view-' + view);
    document.querySelectorAll('.tabs button').forEach(el => { const selected = el.dataset.view === view; el.classList.toggle('active', selected); el.setAttribute('aria-selected', selected); el.tabIndex = selected ? 0 : -1; });
  }
  document.querySelectorAll('[data-view]').forEach(el => el.onclick = () => showView(el.dataset.view));
  const tabs = [...document.querySelectorAll('.tabs button')];
  tabs.forEach((el, n) => el.onkeydown = event => { const i = event.key === 'ArrowRight' ? (n + 1) % tabs.length : event.key === 'ArrowLeft' ? (n + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null; if (i !== null) { event.preventDefault(); tabs[i].click(); tabs[i].focus(); } });
  function sync() {
    const l = Lab.catalog[operation];
    $('operation-list').innerHTML = Object.values(Lab.catalog).filter(x => x.kind === kind()).map(x => `<button class="operation-chip ${x.key === operation ? 'selected' : ''}" aria-pressed="${x.key === operation}" data-operation="${x.key}">${esc(x.title)}${completed.has(x.key) ? ' ✓' : ''}</button>`).join('');
    document.querySelectorAll('[data-kind]').forEach(el => { el.classList.toggle('selected', el.dataset.kind === kind()); el.setAttribute('aria-pressed', el.dataset.kind === kind()); });
    $('capacity-field').hidden = !array(); $('front-field').hidden = kind() !== 'circularQueue';
    $('value-field').hidden = l.op !== 'add'; $('allocation-field').hidden = array() || l.op !== 'add';
    $('array-input').disabled = l.op === 'init';
    $('array-label').textContent = kind() === 'arrayStack' ? '初始元素（栈底 → 栈顶）' : kind() === 'linkedStack' ? '初始元素（栈顶 → 栈底）' : '初始元素（队头 → 队尾）';
    document.querySelectorAll('[data-scenario]').forEach(el => el.disabled = l.op === 'init' ? el.dataset.scenario !== 'empty' : el.dataset.scenario === 'full' ? !array() : el.dataset.scenario === 'wrap' ? kind() !== 'circularQueue' : el.dataset.scenario === 'failure' ? array() || l.op !== 'add' : false);
  }
  function choose(next) {
    pause(); clearTransient(); operation = next;
    $('array-input').value = Lab.catalog[operation].op === 'init' ? '' : '12, 25, 37'; $('front-input').value = '0'; $('fail-input').value = '0';
    sync(); showView('demo'); generate();
  }
  $('operation-list').onclick = e => { const b = e.target.closest('[data-operation]'); if (b) choose(b.dataset.operation); };
  document.querySelectorAll('[data-kind]').forEach(el => el.onclick = () => choose(el.dataset.kind + '_add'));
  function integer(id) { const t = $(id).value.trim(); if (!/^[+-]?\d+$/.test(t)) throw new Error('请输入整数，不能留空。'); return Number(t); }
  function generate() {
    pause(); clearTransient();
    try {
      const l = Lab.catalog[operation];
      const next = Lab.generate({ operation, values: window.SequenceLab.parseInput($('array-input').value), capacity: array() ? Number($('capacity-input').value) : 8, front: kind() === 'circularQueue' ? integer('front-input') : 0, value: l.op === 'add' ? integer('value-input') : 0, failAt: $('allocation-field').hidden ? 0 : Number($('fail-input').value) });
      trace = next; index = 0;
      $('input-error').hidden = true; $('input-dirty').hidden = true;
      $('lesson-category').textContent = Lab.kinds[kind()]; $('lesson-title').textContent = l.title;
      $('lesson-focus').textContent = Content.conventions[kind()]; $('preconditions').textContent = Content.conventions[kind()];
      $('definition-code').textContent = Lab.declaration(kind(), trace.capacity); $('source-name').textContent = l.fn;
      $('code-lines').innerHTML = l.source.map((line, n) => `<div class="code-line" id="code-line-${n + 1}"><span class="line-number">${n + 1}</span><code>${esc(line)}</code></div>`).join('');
      $('history-list').innerHTML = trace.steps.map((s, n) => `<button class="history-step" data-step="${n}"><span>${n}</span>${esc(s.action)}<small>${s.line ? '第 ' + s.line + ' 行' : '尚未执行'}</small></button>`).join('');
      $('timeline').max = trace.steps.length - 1; render();
    } catch (e) { $('input-error').textContent = e.message; $('input-error').hidden = false; }
  }
  $('input-form').onsubmit = e => { e.preventDefault(); generate(); };
  $('input-form').oninput = () => { pause(); clearTransient(); $('input-dirty').hidden = false; };
  document.querySelectorAll('[data-scenario]').forEach(el => el.onclick = () => {
    const scenario = el.dataset.scenario, m = Number($('capacity-input').value);
    $('array-input').value = scenario === 'empty' ? '' : scenario === 'single' ? '42' : scenario === 'duplicate' ? '12, 12, -3' : scenario === 'full' ? Array.from({ length: m - (kind() === 'circularQueue' ? 1 : 0) }, (_, i) => i + 1).join(', ') : '12, 25, 37';
    // Put the boundary-crossing update in this operation, not only in the input.
    $('front-input').value = scenario === 'wrap' ? (Lab.catalog[operation].op === 'remove' ? m - 1 : m - 4) : 0;
    $('fail-input').value = scenario === 'failure' ? '1' : '0';
    if (scenario === 'invalid') $('array-input').value = '1,,2';
    generate();
  });
  function graph(s) {
    const k = s.kind, stack = k === 'arrayStack';
    if (s.memory.length) {
      const active = new Set(stack ? Array.from({ length: s.vars.top }, (_, i) => i) : Array.from({ length: (s.vars.rear - s.vars.front + s.capacity) % s.capacity }, (_, i) => (s.vars.front + i) % s.capacity));
      $('graph-note').textContent = stack ? '上方是栈顶方向；格子标注物理下标。top 指向下一空位。' : '固定物理格子按下标排列；更新下标时以模 M 从末格绕回 0。有效容量 M−1，预留格随队列移动。';
      $('structure-graph').innerHTML = `<div class="sq-array ${stack ? 'sq-stack' : ''}">${s.memory.map((v, i) => { const marks = stack ? [i === s.vars.top ? 'top →' : '', i === s.vars.top - 1 ? '栈顶元素' : '', i === 0 ? '栈底方向' : ''] : [i === s.vars.front ? 'front' : '', i === s.vars.rear ? 'rear' : '']; return `<div class="sq-slot"><small>${esc(marks.filter(Boolean).join(' / '))}</small><div class="memory-cell ${active.has(i) ? '' : 'unused'} ${s.read.includes('data[' + i + ']') ? 'read' : ''} ${s.changed.includes('data[' + i + ']') ? 'write' : ''} ${String(v).length > 6 ? 'long-value' : ''}">${v === null ? '·' : esc(v)}</div><small class="sq-index">下标 ${i}</small></div>`; }).join('')}</div>${stack && s.vars.top === s.capacity ? '<p class="sq-ring-note">top = M，指向数组末尾之外，不能解引用；当前已满。</p>' : ''}`;
    } else {
      $('graph-note').textContent = 'H 是头节点，不存有效数据。节点位置是展示布局，不表示内存连续；箭头仅由 next 决定。';
      const nodes = Object.values(s.nodes), coords = Object.fromEntries(nodes.map((n, i) => [n.id, { x: 25 + i % 4 * 165, y: 48 + Math.floor(i / 4) * 140 }]));
      const edges = nodes.filter(n => !n.freed && coords[n.next]).map(n => { const a = coords[n.id], b = coords[n.next]; return `<path d="M${a.x + 124} ${a.y + 34} C${a.x + 159} ${a.y + 34},${b.x - 35} ${b.y + 34},${b.x - 4} ${b.y + 34}" marker-end="url(#sq-arrow)"><title>${n.id}.next → ${n.next}</title></path>`; }).join('');
      const cards = nodes.map(n => { const p = coords[n.id], refs = Object.entries(s.pointers).filter(([, id]) => id === n.id).map(([name]) => name).join(', '), changed = s.changed.some(f => f.startsWith(n.id + '.')), read = s.read.some(f => f.startsWith(n.id + '.'));
        return `<g class="${n.freed ? 'freed' : ''} ${changed ? 'changed' : ''} ${read ? 'read' : ''}"><text x="${p.x}" y="${p.y - 13}">${esc(n.id + (refs ? ' ← ' + refs : ''))}</text><rect class="node-box" x="${p.x}" y="${p.y}" width="124" height="70" rx="7"/>${n.freed ? `<text x="${p.x + 12}" y="${p.y + 40}">已释放，不可读</text>` : `<text x="${p.x + 9}" y="${p.y + 26}">${n.id === 'H' ? '头节点' : 'data: ' + (n.data === null ? '未初始化' : esc(n.data))}</text><text x="${p.x + 9}" y="${p.y + 52}">next: ${n.next === '?' ? '未初始化' : esc(n.next === null ? 'NULL' : n.next)}</text>`}</g>`; }).join('');
      $('structure-graph').innerHTML = `<svg class="sq-linked" viewBox="0 0 700 ${Math.ceil(nodes.length / 4) * 140 + 10}" role="img" aria-label="节点及真实 next 链接"><defs><marker id="sq-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><polygon points="0,0 8,4 0,8" fill="#78a68b"/></marker></defs>${edges}${cards}</svg>`;
    }
  }
  function render() {
    const s = trace.steps[index], l = trace.lesson;
    document.querySelectorAll('.code-line').forEach(el => { const active = el.id === 'code-line-' + s.line; el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
    graph(s);
    const values = Lab.inspect(s);
    $('chain-summary').textContent = `${s.kind === 'arrayStack' ? '逻辑序列（栈底 → 栈顶）' : s.kind === 'linkedStack' ? '逻辑序列（栈顶 → 栈底）' : '逻辑序列（队头 → 队尾）'}：${values.length ? values.join(' → ') : '空'}。${s.critical ? '当前为单句执行后的中间状态，尚可能需要后续语句恢复完整不变量。' : ''}`;
    $('pointer-vars').innerHTML = Object.entries(s.pointers).map(([k, v]) => `<div class="pointer-chip ${v && s.nodes[v]?.freed ? 'dangling' : ''}">${k} → ${v === null ? 'NULL' : esc(v)}${s.nodes[v]?.freed ? '（已释放，仅符号记录）' : ''}</div>`).join('');
    $('scalar-vars').innerHTML = [...Object.entries(s.vars), ...(s.condition === null ? [] : [['条件结果', s.condition]]), ['申请次数', s.attempts], ['释放次数', s.frees]].map(([k, v]) => `<div class="variable"><span>${esc(k)}</span><strong>${v === null ? '尚未写入' : esc(v)}</strong></div>`).join('');
    $('step-line').textContent = s.line ? `第 ${s.line} 行 · 执行后` : '初始状态 · 尚未执行';
    $('step-phase').textContent = s.done ? '函数返回' : s.condition === null ? '观察语句' : '条件判断';
    $('step-action').textContent = s.action; $('step-explanation').textContent = s.explanation;
    $('step-detail').textContent = `读取：${s.read.join('、') || '无'}；改变：${s.changed.join('、') || '无'}。`;
    $('state-badge').textContent = index === 0 ? '尚未执行' : s.done ? '已返回' : '执行后';
    $('timeline').value = index; $('step-counter').textContent = `${index} / ${trace.steps.length - 1}`; $('write-counter').textContent = `当前 ${values.length} 个逻辑元素`;
    $('previous').disabled = index === 0; $('next').disabled = s.done; $('play').disabled = s.done || $('predict-toggle').checked;
    $('reuse-result').disabled = !s.done || values.length > (s.memory.length ? 12 : 8);
    $('result-details').textContent = s.done ? `${['empty', 'full'].includes(l.op) ? '判断结果' : '操作返回'}：${s.result}；逻辑序列 [${values.join(', ')}]${'*e' in s.vars ? `；*e：${s.vars['*e'] === null ? '未写入' : s.vars['*e']}` : ''}。` : '尚未返回；当前显示逐句执行的中间状态。';
    document.querySelectorAll('.history-step').forEach(el => el.classList.toggle('active', Number(el.dataset.step) === index));
    if (s.done) { pause(); if (s.result || ['empty', 'full'].includes(l.op)) { completed.add(l.key); persist(); } }
  }
  function jump(n) { pause(); clearTransient(); index = Math.max(0, Math.min(trace.steps.length - 1, n)); render(); }
  function next() {
    if (index >= trace.steps.length - 1) return;
    if ($('predict-toggle').checked) {
      if (predictionTarget !== null) return;
      predictionTarget = index + 1; const target = trace.steps[predictionTarget];
      const distractors = ['交换栈底和队头元素', '清空全部数组和节点', '不读取任何变量，自动完成全部操作'].filter(x => x !== target.action);
      const choices = [target.action, ...distractors.slice(0, 2)]; const shift = predictionTarget % choices.length; choices.push(...choices.splice(0, shift));
      $('prediction-options').innerHTML = choices.map(x => `<button class="choice" data-correct="${x === target.action}">${esc(x)}</button>`).join('');
      $('prediction-feedback').textContent = ''; $('prediction-reveal').hidden = true; $('prediction').hidden = false;
    } else { clearTransient(); index++; render(); }
  }
  $('prediction-options').onclick = e => { const b = e.target.closest('button'); if (!b) return; const correct = b.dataset.correct === 'true'; b.classList.add(correct ? 'correct' : 'incorrect'); $('prediction-feedback').textContent = correct ? '正确，点击揭示查看完整状态。' : '再想想：只执行下一条语句。'; $('prediction-reveal').hidden = !correct; };
  $('prediction-reveal').onclick = () => { if (predictionTarget !== null) jump(predictionTarget); };
  $('next').onclick = next; $('previous').onclick = () => jump(index - 1); $('reset').onclick = () => jump(0);
  $('timeline').oninput = () => jump(Number($('timeline').value)); $('history-list').onclick = e => { const b = e.target.closest('[data-step]'); if (b) jump(Number(b.dataset.step)); };
  function play() {
    if (timer !== null) { pause(); return; } if ($('predict-toggle').checked || trace.steps[index].done) return;
    $('play').textContent = 'Ⅱ 暂停';
    timer = setInterval(() => {
      const upcoming = trace.steps[index + 1]; if (!upcoming) { pause(); return; }
      const bp = $('breakpoint').value;
      if (upcoming.critical && (bp === upcoming.critical || bp === 'critical') && stoppedBefore !== index + 1) {
        stoppedBefore = index + 1; pause(); $('pause-message').textContent = `已在“${upcoming.action}”之前暂停，再次播放或单步会执行这一步。`; $('pause-message').hidden = false; return;
      }
      clearTransient(); index++; render();
    }, Number($('speed').value));
  }
  $('play').onclick = play; $('speed').onchange = () => { const running = timer !== null; pause(); if (running) play(); };
  $('predict-toggle').onchange = () => { pause(); clearTransient(); render(); }; $('breakpoint').onchange = () => { pause(); clearTransient(); };
  document.addEventListener('keydown', e => { if (!$('view-demo').hidden && !e.ctrlKey && !e.altKey && !e.metaKey && !e.target.closest('input,select,button,a,summary,textarea')) { if (e.key === 'ArrowRight') { e.preventDefault(); next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); jump(index - 1); } else if (e.code === 'Space') { e.preventDefault(); play(); } } });
  $('reuse-result').onclick = () => {
    const values = Lab.inspect(trace.steps[index]); const front = trace.steps[index].vars.front;
    if (trace.lesson.op === 'init') { choose(trace.lesson.kind + '_add'); }
    $('array-input').value = values.join(', '); if (trace.lesson.kind === 'circularQueue' && Number.isInteger(front)) $('front-input').value = front;
    $('fail-input').value = '0'; generate();
  };
  $('download-code').onclick = () => {
    const text = '/* 原创教学片段，无 main。对象/输出指针有效；初始化仅用于空结构，链式头节点已创建。 */\n' + Lab.declaration(trace.lesson.kind, trace.capacity) + '\n\n' + trace.lesson.source.join('\n') + '\n';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), a = document.createElement('a'); a.href = url; a.download = trace.lesson.fn + '.c'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const cards = a => a.map(([title, text]) => `<article class="panel concept-card"><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('');
  $('concept-list').innerHTML = cards(Content.concepts); $('compare-list').innerHTML = cards(Content.comparisons); $('pitfall-list').innerHTML = cards(Content.pitfalls);
  function quizzes() {
    $('quiz-list').innerHTML = Content.quizzes.map((q, n) => `<article class="quiz-card panel"><div class="eyebrow">QUESTION ${n + 1}</div><h3>${esc(q.q)}</h3><div class="quiz-choices">${q.a.map((a, i) => `<button class="quiz-choice ${mastered.has(n) && i === q.correct ? 'correct' : ''}" data-question="${n}" data-answer="${i}">${esc(a)}</button>`).join('')}</div><p class="quiz-feedback" id="feedback-${n}" ${mastered.has(n) ? '' : 'hidden'}>${esc(q.why)}</p></article>`).join('');
  }
  $('quiz-list').onclick = e => { const b = e.target.closest('[data-question]'); if (!b) return; const n = Number(b.dataset.question), q = Content.quizzes[n], correct = Number(b.dataset.answer) === q.correct; b.classList.add(correct ? 'correct' : 'incorrect'); const f = $('feedback-' + n); f.hidden = false; f.textContent = (correct ? '正确。' : '再试一次。') + q.why; if (correct) { mastered.add(n); persist(); } };
  $('quiz-reset').onclick = () => { mastered.clear(); persist(); quizzes(); };
  function clearProgress() { completed.clear(); mastered.clear(); persist(); quizzes(); sync(); }
  $('clear-progress').onclick = clearProgress; $('mobile-clear').onclick = clearProgress;
  quizzes(); persist(); sync(); showView('demo'); generate();
})();
