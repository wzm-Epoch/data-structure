(function () {
  'use strict';
  const Lab = window.LinkedLab, Content = window.LinkedContent, $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const storageKey = 'zhixu-linked-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) { /* Storage is optional. */ }
  let completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter(k => Lab.catalog[k] && !Lab.catalog[k].experiment) : []);
  let mastered = new Set(Array.isArray(saved.mastered) ? saved.mastered.filter(n => Number.isInteger(n) && n >= 0 && n < Content.quizzes.length) : []);
  let operation = 'insert', kind = 'single', trace, index = 0, timer = null, selectedNode = 'H', predictionTarget = null, stoppedBefore = null;
  const normalCount = Object.values(Lab.catalog).filter(l => !l.experiment).length;
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ completed: [...completed], mastered: [...mastered] })); } catch (_) { /* No persistence is required to learn. */ }
    $('completed-count').textContent = `${completed.size} / ${normalCount}`;
    $('completion-fill').style.width = `${completed.size / normalCount * 100}%`;
    $('quiz-score').textContent = `已掌握 ${mastered.size} / ${Content.quizzes.length}`;
  }
  function pause() { if (timer !== null) clearInterval(timer); timer = null; $('play').textContent = '▶ 播放'; }
  function hidePrediction() { predictionTarget = null; $('prediction').hidden = true; }
  function clearStop() { stoppedBefore = null; $('pause-message').hidden = true; }
  function showView(view) {
    pause();
    document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `view-${view}`; });
    document.querySelectorAll('.tabs button').forEach(el => {
      const selected = el.dataset.view === view; el.classList.toggle('active', selected);
      el.setAttribute('aria-selected', String(selected)); el.tabIndex = selected ? 0 : -1;
    });
  }
  document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => showView(el.dataset.view)));
  const tabs = [...document.querySelectorAll('.tabs button')];
  tabs.forEach((tab, n) => tab.addEventListener('keydown', event => {
    const target = event.key === 'ArrowRight' ? tabs[(n + 1) % tabs.length] : event.key === 'ArrowLeft' ? tabs[(n + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : null;
    if (target && !event.ctrlKey) { event.preventDefault(); target.click(); target.focus(); }
  }));
  function makeOperationButtons() {
    $('operation-list').innerHTML = Object.values(Lab.catalog).filter(l => l.kind === kind && !l.experiment).map(l =>
      `<button type="button" data-operation="${l.key}" class="operation-chip ${l.key === operation ? 'selected' : ''}" aria-pressed="${l.key === operation}">${escape(l.title)}${completed.has(l.key) ? '<span class="done-dot" aria-label="已完成"></span>' : ''}</button>`).join('');
    if (operation === 'badInsert') $('operation-list').insertAdjacentHTML('beforeend', '<button class="operation-chip selected" data-operation="badInsert" aria-pressed="true">插入错序实验</button>');
    document.querySelectorAll('.segmented [data-kind]').forEach(el => { const active = el.dataset.kind === kind; el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active)); });
  }
  function syncForm() {
    const lesson = Lab.catalog[operation], build = /Build$/.test(lesson.mode);
    $('position-field').hidden = !lesson.position; $('value-field').hidden = !lesson.value;
    $('allocation-field').hidden = !(lesson.mode === 'insert' || build);
    [...$('fail-input').options].forEach(option => { option.hidden = !build && Number(option.value) > 1; });
    if (!build && Number($('fail-input').value) > 1) $('fail-input').value = '0';
    $('value-label').textContent = lesson.mode === 'search' ? '目标值 e' : '插入值 e';
    $('array-label').textContent = build ? '待建表输入序列' : '初始数据节点';
    document.querySelectorAll('[data-scenario]').forEach(button => {
      const scenario = button.dataset.scenario;
      button.disabled = scenario === 'failure' ? !(lesson.mode === 'insert' || build) : ['head', 'tail', 'invalid'].includes(scenario) ? !lesson.position || lesson.experiment && scenario === 'invalid' : false;
    });
  }
  function chooseOperation(key) {
    pause(); hidePrediction(); clearStop();
    operation = key; kind = Lab.catalog[key].kind; $('fail-input').value = '0';
    if (key === 'badInsert') { $('array-input').value = '12, 25, 37'; $('position-input').value = '2'; }
    if (key === 'search') $('value-input').value = '25';
    makeOperationButtons(); syncForm(); showView('demo'); generate();
  }
  $('operation-list').addEventListener('click', event => { const button = event.target.closest('[data-operation]'); if (button) chooseOperation(button.dataset.operation); });
  document.querySelectorAll('[data-kind]').forEach(el => el.addEventListener('click', () => {
    const nextKind = el.dataset.kind;
    chooseOperation(nextKind === 'double' ? 'dInsert' : nextKind === 'circular' ? 'cInsert' : 'insert');
  }));
  document.querySelectorAll('[data-experiment]').forEach(el => el.addEventListener('click', () => chooseOperation('badInsert')));
  $('show-correct').addEventListener('click', () => chooseOperation('insert'));
  function integerInput(id, name) {
    const text = $(id).value.trim();
    if (!/^[+-]?\d+$/.test(text)) throw new Error(`${name}必须填写整数。`);
    const number = Number(text);
    if (!Number.isInteger(number) || number < -2147483648 || number > 2147483647) throw new Error(`${name}必须是 32 位整数。`);
    return number;
  }
  function generate() {
    pause(); hidePrediction(); clearStop();
    try {
      const lesson = Lab.catalog[operation];
      const next = Lab.generate({ operation, values: window.SequenceLab.parseInput($('array-input').value),
        position: lesson.position ? integerInput('position-input', '位置 i') : 1,
        value: lesson.value ? integerInput('value-input', '元素值 e') : 0, failAt: $('allocation-field').hidden ? 0 : Number($('fail-input').value) });
      trace = next; index = 0; selectedNode = 'H';
      $('input-error').hidden = true; $('input-dirty').hidden = true;
      $('lesson-category').textContent = lesson.experiment ? 'POINTER ORDER EXPERIMENT' : { single: 'SINGLY LINKED LIST', double: 'DOUBLY LINKED LIST', circular: 'CIRCULAR LINKED LIST' }[kind];
      $('lesson-title').textContent = lesson.title; $('lesson-focus').textContent = lesson.focus; $('takeaway').textContent = lesson.focus;
      $('complexity').textContent = lesson.complexity; $('source-name').textContent = lesson.fn;
      $('definition-code').textContent = Lab.declaration(kind);
      $('preconditions').textContent = /Build$/.test(lesson.mode) ? 'L 指向已经创建的空头节点，a 指向有效输入数组，n 为输入个数。失败时已建的部分保留，不自动回滚。'
        : lesson.experiment ? '此实验假定 p 是有效前驱、s 已分配。故意演示错误语句顺序，检测到自环后停止。'
        : `L 指向有效头节点，链表初始结构合法、节点可读写。${lesson.mode === 'delete' ? 'e 指向有效输出变量。' : ''}${kind === 'circular' ? '循环链表尾节点 next 为 L。' : '链尾 next 为 NULL。'}`;
      $('graph-type').textContent = `${Lab.kinds[kind]} · 头节点 H 不计入有效元素`;
      $('timeline').max = trace.steps.length - 1;
      const criticalLines = new Set(trace.steps.filter(s => s.critical).map(s => s.line));
      $('code-lines').innerHTML = lesson.source.map((line, n) => `<div id="code-line-${n + 1}" class="code-line ${criticalLines.has(n + 1) ? 'critical-line' : ''}"><span class="line-number">${n + 1}</span><code>${highlight(line)}</code></div>`).join('');
      $('history-list').innerHTML = trace.steps.map((s, n) => `<button type="button" class="history-step" data-step="${n}"><span>${String(n).padStart(2, '0')}</span>${escape(s.action)}<small>${s.line ? '第 ' + s.line + ' 行' : '初始'}</small></button>`).join('');
      $('history-count').textContent = `共 ${trace.steps.length - 1} 步`;
      $('download-code').disabled = !!lesson.experiment;
      render();
    } catch (error) {
      $('input-error').textContent = error.message; $('input-error').hidden = false;
      if (trace && trace.lesson.key !== operation) { operation = trace.lesson.key; kind = trace.lesson.kind; makeOperationButtons(); syncForm(); }
    }
  }
  function highlight(line) {
    if (line.trim().startsWith('/*')) return `<span class="code-comment">${escape(line)}</span>`;
    return escape(line).replace(/\b(bool|int|const|void|if|while|for|return|true|false|NULL|Node|DNode)\b|\b(\d+)\b/g, (all, keyword) => `<span class="token-${keyword ? 'keyword' : 'number'}">${all}</span>`);
  }
  $('input-form').addEventListener('submit', event => { event.preventDefault(); generate(); });
  ['array-input', 'position-input', 'value-input', 'fail-input'].forEach(id => $(id).addEventListener('input', () => { pause(); hidePrediction(); $('input-dirty').hidden = false; }));
  document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => {
    const scenario = button.dataset.scenario, lesson = Lab.catalog[operation];
    $('fail-input').value = '0';
    $('array-input').value = scenario === 'empty' ? '' : scenario === 'single' ? '42' : scenario === 'duplicate' ? '12, 25, 25, -3' : '12, 25, 37';
    const n = window.SequenceLab.parseInput($('array-input').value).length;
    $('position-input').value = String(scenario === 'head' || scenario === 'empty' || scenario === 'single' ? 1 : scenario === 'tail' ? n + (lesson.mode === 'insert' || lesson.experiment ? 1 : 0) : scenario === 'invalid' ? n + 3 : 2);
    $('value-input').value = String(lesson.mode === 'search' ? 25 : 66);
    if (scenario === 'failure') $('fail-input').value = /Build$/.test(lesson.mode) ? '2' : '1';
    generate();
  }));

  const display = value => value === null ? 'NULL' : value === '?' ? '?' : String(value);
  function renderGraph(s, information) {
    const nodes = Object.values(s.nodes), coords = {}, columns = 4;
    nodes.forEach((node, n) => { coords[node.id] = { x: 100 + n % columns * 172, y: 67 + Math.floor(n / columns) * 174 }; });
    const height = Math.ceil(nodes.length / columns) * 174 + 5;
    const graph = $('node-graph'); graph.setAttribute('viewBox', `0 0 720 ${height}`);
    const markers = `<defs>${[['next', '#78a68b'], ['prior', '#89a8bd'], ['change', '#c79544'], ['self', '#be805b']].map(([name, fill]) => `<marker id="arrow-${name}" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z" fill="${fill}"/></marker>`).join('')}</defs>`;
    let edges = '';
    for (const node of nodes) {
      if (node.freed) continue;
      for (const field of ['next', 'prior']) {
        const target = node[field]; if (!target || target === '?' || !coords[target]) continue;
        const from = coords[node.id], to = coords[target];
        const changed = s.changed.some(c => c.id === node.id && c.field === field);
        const self = node.id === target, prior = field === 'prior';
        let path;
        if (self) path = `M${from.x + 28},${from.y} C${from.x + 90},${from.y - 53} ${from.x - 35},${from.y - 53} ${from.x - 28},${from.y}`;
        else if (from.y === to.y && Math.abs(from.x - to.x) < 180) {
          const right = to.x > from.x;
          const x1 = from.x + (right ? 64 : -64), x2 = to.x + (right ? -67 : 67);
          const y = from.y + (prior ? 49 : 26);
          path = `M${x1},${y} Q${(x1 + x2) / 2},${y + (prior ? 9 : -9)} ${x2},${y}`;
        } else if (from.y === to.y) {
          path = `M${from.x},${from.y + (prior ? 74 : 0)} C${from.x},${from.y + (prior ? 123 : -52)} ${to.x},${to.y + (prior ? 123 : -52)} ${to.x},${to.y + (prior ? 77 : -3)}`;
        } else {
          const down = to.y > from.y;
          path = `M${from.x + (prior ? -22 : 22)},${from.y + (down ? 74 : 0)} C${from.x + (prior ? -22 : 22)},${from.y + (down ? 125 : -45)} ${to.x + (prior ? -22 : 22)},${to.y + (down ? -45 : 125)} ${to.x + (prior ? -22 : 22)},${to.y + (down ? -3 : 77)}`;
        }
        const marker = self ? 'self' : changed ? 'change' : prior ? 'prior' : 'next';
        edges += `<path d="${path}" class="${self ? 'edge-self' : changed ? 'edge-highlight' : prior ? 'edge-prior' : 'edge-next'}" marker-end="url(#arrow-${marker})"><title>${node.id}.${field} → ${target}</title></path>`;
      }
    }
    const reachable = new Set(['H', ...information.order]);
    const cards = nodes.map(node => {
      const { x, y } = coords[node.id];
      const pointers = Object.entries(s.pointers).filter(([, id]) => id === node.id).map(([name]) => name);
      const changed = s.changed.some(c => c.id === node.id);
      const classes = ['node-card', node.id === 'H' ? 'sentinel' : '', !reachable.has(node.id) ? 'detached' : '', s.read.includes(node.id) ? 'read' : '', changed ? 'changed' : '', node.freed ? 'freed' : '', selectedNode === node.id ? 'selected' : ''].filter(Boolean).join(' ');
      const text = node.freed ? '已释放' : node.id === 'H' ? '头节点' : node.data === null ? '?' : node.data;
      const small = String(text).length > 6 ? ' style="font-size:10px"' : node.id === 'H' ? ' style="font-size:12px"' : '';
      return `<g class="${classes}" data-node="${node.id}" role="button" tabindex="0" aria-label="观察节点 ${node.id}${node.freed ? ' 已释放' : ''}"><title>${node.id}${node.freed ? '：已释放，不可解引用' : `：data=${node.id === 'H' ? '不作有效数据' : node.data === null ? '未初始化' : display(node.data)}，next=${display(node.next)}`}</title><text x="${x}" y="${y - 22}" text-anchor="middle" class="pointer-tag ${node.freed ? 'alert-tag' : ''}">${escape(pointers.join(' · '))}</text><text x="${x - 60}" y="${y - 7}" class="node-header">${node.id}${node.id === 'H' ? ' / sentinel' : ''}</text><rect class="selection-outline" x="${x - 68}" y="${y - 4}" width="136" height="83" rx="9"/><rect class="node-bg" x="${x - 64}" y="${y}" width="128" height="75" rx="7"/><text x="${x - 24}" y="${y + 19}" text-anchor="middle" class="field-label">${node.id === 'H' ? 'sentinel' : 'data'}</text><text x="${x - 24}" y="${y + 49}" text-anchor="middle" class="node-value"${small}>${escape(text)}</text>${node.freed ? '' : `<line class="node-divider" x1="${x + 15}" y1="${y}" x2="${x + 15}" y2="${y + 75}"/><text x="${x + 39}" y="${y + 16}" text-anchor="middle" class="field-label">next</text><text x="${x + 39}" y="${y + 33}" text-anchor="middle" class="node-field">${escape(display(node.next))}</text>${trace.lesson.kind === 'double' ? `<text x="${x + 39}" y="${y + 49}" text-anchor="middle" class="field-label">prior</text><text x="${x + 39}" y="${y + 64}" text-anchor="middle" class="node-field">${escape(display(node.prior))}</text>` : ''}`}</g>`;
    }).join('');
    graph.innerHTML = markers + edges + cards;
  }
  function renderInspector(s, info) {
    if (!s.nodes[selectedNode]) selectedNode = 'H';
    $('node-select').innerHTML = Object.values(s.nodes).map(node => `<option value="${node.id}" ${node.id === selectedNode ? 'selected' : ''}>${node.id}${node.freed ? '（已释放）' : ''}</option>`).join('');
    const node = s.nodes[selectedNode], refs = Object.entries(s.pointers).filter(([, target]) => target === node.id).map(([key]) => key);
    if (node.freed) { $('node-details').innerHTML = `<p><strong>${node.id} 已释放，不能再读取 data、next 或 prior。</strong></p><p>保留的符号引用：${escape(refs.join('、') || '无')}。这些仅是观察记录，不表示还可以访问节点。</p>`; return; }
    const fields = [['身份', node.id], ['data', node.id === 'H' ? '头节点，不计入数据' : node.data === null ? '未初始化' : node.data], ['next', node.next === '?' ? '未初始化' : display(node.next)], ...(trace.lesson.kind === 'double' ? [['prior', node.prior === '?' ? '未初始化' : display(node.prior)]] : [])];
    $('node-details').innerHTML = `<div class="inspector-fields">${fields.map(([key, value]) => `<div class="inspector-field"><span>${escape(key)}</span><strong>${escape(value)}</strong></div>`).join('')}</div><p>指向该节点的变量：${escape(refs.join('、') || '无')}。</p><p>${node.id === 'H' || info.order.includes(node.id) ? '当前可从 L 沿 next 到达。' : '当前不在 L 主链中；请同时观察指针变量，不能仅据此判定泄漏。'}</p>`;
  }
  function render() {
    const s = trace.steps[index], previous = trace.steps[Math.max(0, index - 1)], info = Lab.inspect(s);
    document.querySelectorAll('.code-line').forEach(el => {
      const active = el.id === `code-line-${s.line}`; el.classList.toggle('active', active);
      if (active) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    renderGraph(s, info); renderInspector(s, info);
    const ending = info.cycle ? `↺ ${info.cycle}（异常环）` : info.unknown ? '?（未初始化链接）' : info.dangling ? `${info.dangling}（无效链接）` : info.endsAtHead ? 'H' : 'NULL';
    $('chain-summary').innerHTML = `<strong>L 主链</strong>H → ${info.order.map(id => `${id}(${s.nodes[id].data === null ? '?' : s.nodes[id].data})`).concat(ending).map(escape).join(' → ')}`;
    $('chain-summary').classList.toggle('warning', !!(info.cycle || info.unknown || info.dangling));
    $('pointer-vars').innerHTML = Object.entries(s.pointers).map(([name, target]) => {
      const freed = target && s.nodes[target]?.freed;
      return `<div class="pointer-chip ${target === null ? 'null-pointer' : ''} ${freed ? 'dangling' : ''} ${previous.pointers[name] !== target && index > 0 ? 'changed-pointer' : ''}">${escape(name)} → ${escape(display(target))}${freed ? '（已释放）' : ''}</div>`;
    }).join('');
    const vars = [['可达数据节点', info.order.length], ...Object.entries(s.vars), ...(s.condition === null ? [] : [['条件结果', String(s.condition)]])];
    $('scalar-vars').innerHTML = vars.map(([key, value]) => `<div class="variable"><span>${escape(key)}</span><strong class="${value === null ? 'null-value' : ''}">${value === null ? '尚未赋值' : escape(value)}</strong></div>`).join('');
    $('step-phase').textContent = s.phase; $('step-line').textContent = s.line ? `第 ${s.line} 行 · 执行后` : '初始状态 · 尚未执行';
    $('step-action').textContent = s.action; $('step-explanation').textContent = s.explanation; $('step-detail').textContent = s.detail;
    document.querySelector('.explanation').classList.toggle('experiment', !!trace.lesson.experiment);
    $('state-badge').textContent = index === 0 ? '尚未执行' : s.done ? trace.lesson.experiment ? '结构异常' : s.result ? '执行完成' : '返回未成功' : '执行后状态';
    $('state-badge').classList.toggle('finished', s.done && !!s.result);
    $('previous').disabled = index === 0; $('next').disabled = s.done; $('play').disabled = s.done || $('predict-toggle').checked;
    $('timeline').value = index; $('step-counter').textContent = `${index} / ${trace.steps.length - 1}`;
    const links = trace.steps.slice(0, index + 1).reduce((n, step) => n + step.changed.filter(c => c.field === 'next' || c.field === 'prior').length, 0);
    $('write-counter').textContent = `链接改写 ${links} 次`;
    $('result-details').innerHTML = `<div class="result-sequence">${s.done ? '最终逻辑序列' : '当前 L 可达序列'}：${info.values.length ? info.values.map(escape).join(' → ') : '空'}${info.cycle ? ' ↺（异常环）' : ''}</div><div class="result-stats"><span>指针前进 ${s.walks} 次</span><span>申请尝试 ${s.allocated} 次</span><span>释放 ${s.freed} 个</span></div>${s.output.length ? `<p>Visit 输出：${s.output.map(escape).join(' → ')}</p>` : ''}<p>${s.done ? `返回记录：${escape(display(s.returnValue))}${'*e' in s.vars ? `；输出 *e = ${escape(s.vars['*e'] === null ? '未写入' : s.vars['*e'])}` : ''}` : '逐步执行后，这里会同步显示结果与输出。'}</p>`;
    $('reuse-result').disabled = !s.done || !!trace.lesson.experiment || info.cycle !== null || info.dangling !== null || info.unknown;
    document.querySelectorAll('.history-step').forEach(el => { const active = Number(el.dataset.step) === index; el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
    if (s.done) { pause(); if (s.result && !trace.lesson.experiment && !completed.has(trace.lesson.key)) { completed.add(trace.lesson.key); persist(); makeOperationButtons(); } }
  }
  function selectNode(id) {
    if (!trace.steps[index].nodes[id]) return;
    selectedNode = id; renderGraph(trace.steps[index], Lab.inspect(trace.steps[index])); renderInspector(trace.steps[index], Lab.inspect(trace.steps[index]));
  }
  $('node-graph').addEventListener('click', event => { const node = event.target.closest('[data-node]'); if (node) selectNode(node.dataset.node); });
  $('node-graph').addEventListener('keydown', event => { const node = event.target.closest('[data-node]'); if (node && ['Enter', ' '].includes(event.key)) { event.preventDefault(); selectNode(node.dataset.node); } });
  $('node-select').addEventListener('change', event => selectNode(event.target.value));
  function goTo(n) { pause(); hidePrediction(); clearStop(); index = Math.max(0, Math.min(n, trace.steps.length - 1)); render(); }
  function mustStop(next) {
    const type = $('breakpoint').value;
    return type === 'critical' ? next.critical : type === 'free' ? next.changed.some(c => c.field === 'free') : type === 'link' ? next.changed.some(c => c.field === 'next' || c.field === 'prior') : false;
  }
  function advance(auto = false) {
    if (index >= trace.steps.length - 1) return;
    if (!auto && $('predict-toggle').checked) { askPrediction(); return; }
    const next = trace.steps[index + 1];
    if (auto && mustStop(next) && stoppedBefore !== index + 1) {
      pause(); stoppedBefore = index + 1; $('pause-message').textContent = `已在第 ${next.line} 行执行前暂停：${next.action}。点“下一步”执行，或再次播放继续。`; $('pause-message').hidden = false; return;
    }
    hidePrediction(); clearStop(); index++; render();
  }
  $('next').addEventListener('click', () => { pause(); advance(); });
  $('previous').addEventListener('click', () => goTo(index - 1)); $('reset').addEventListener('click', () => goTo(0));
  $('timeline').addEventListener('input', event => goTo(Number(event.target.value)));
  $('history-list').addEventListener('click', event => { const button = event.target.closest('[data-step]'); if (button) goTo(Number(button.dataset.step)); });
  $('play').addEventListener('click', () => {
    if (timer !== null) { pause(); return; }
    if (index >= trace.steps.length - 1 || $('predict-toggle').checked) return;
    hidePrediction(); $('play').textContent = 'Ⅱ 暂停'; timer = setInterval(() => advance(true), Number($('speed').value));
  });
  $('speed').addEventListener('change', () => { if (timer !== null) { pause(); $('play').click(); } });
  $('breakpoint').addEventListener('change', () => { pause(); clearStop(); });
  $('predict-toggle').addEventListener('change', () => { pause(); hidePrediction(); clearStop(); render(); });
  function askPrediction() {
    pause(); predictionTarget = index + 1;
    const correct = trace.steps[predictionTarget].action;
    const available = [...new Set(trace.steps.slice(1).map(s => s.action))].filter(text => text !== correct);
    const choices = [correct, ...available.slice(0, 2)];
    for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
    $('prediction-options').replaceChildren(); $('prediction-feedback').textContent = ''; $('prediction-reveal').hidden = true;
    choices.forEach(text => {
      const button = document.createElement('button'); button.className = 'choice'; button.textContent = text;
      button.addEventListener('click', () => {
        if (text === correct) { button.classList.add('correct'); $('prediction-feedback').textContent = '判断正确。现在可以揭示下一步的真实状态。'; $('prediction-reveal').hidden = false; $('prediction-options').querySelectorAll('button').forEach(b => { b.disabled = true; }); }
        else { button.classList.add('incorrect'); button.disabled = true; $('prediction-feedback').textContent = '再看当前代码行和指针状态，区分“变量赋值”与“链接改写”。可以重新选择。'; }
      });
      $('prediction-options').append(button);
    });
    $('prediction').hidden = false;
  }
  $('prediction-reveal').addEventListener('click', () => { if (predictionTarget !== null) goTo(predictionTarget); });
  $('reuse-result').addEventListener('click', () => {
    const values = Lab.inspect(trace.steps[index]).values;
    if (values.length > 8) { $('input-error').textContent = '本次结果有 9 个节点，超过初始输入的展示规模上限 8。请调整输入后再生成。'; $('input-error').hidden = false; return; }
    $('array-input').value = values.join(', '); $('fail-input').value = '0';
    if (/Build$/.test(trace.lesson.mode)) { operation = 'insert'; kind = 'single'; makeOperationButtons(); syncForm(); }
    $('position-input').value = '1'; generate();
  });
  $('download-code').addEventListener('click', () => {
    if (trace.lesson.experiment) return;
    const text = `/* 知序原创教学示例；${Lab.kinds[trace.lesson.kind]}，带头节点。 */\n/* 这是算法片段；调用方负责初始化头节点、输入数据和释放整表。 */\n${Lab.declaration(trace.lesson.kind)}\nvoid Visit(int value);\n\n${trace.lesson.source.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${trace.lesson.fn}.c`; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.addEventListener('keydown', event => {
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'SUMMARY', 'A'].includes(event.target.tagName) || event.target.closest('[data-node]') || $('view-demo').hidden || !$('prediction').hidden || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); pause(); advance(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1); }
    if (event.code === 'Space' && !$('play').disabled) { event.preventDefault(); $('play').click(); }
  });
  function renderQuizzes() {
    $('quiz-list').replaceChildren();
    Content.quizzes.forEach(([title, options, correct, explanation], n) => {
      const card = document.createElement('article'); card.className = 'panel quiz-card';
      card.innerHTML = `<div class="eyebrow">QUESTION ${String(n + 1).padStart(2, '0')}</div><h3>${escape(title)}</h3><div class="quiz-choices"></div><div class="quiz-feedback" hidden></div>`;
      const feedback = card.querySelector('.quiz-feedback');
      options.forEach((text, answer) => {
        const button = document.createElement('button'); button.className = 'quiz-choice'; button.innerHTML = `<span>${String.fromCharCode(65 + answer)}</span>${escape(text)}`;
        if (mastered.has(n)) { button.disabled = true; button.classList.toggle('correct', answer === correct); }
        button.addEventListener('click', () => {
          feedback.hidden = false;
          if (answer === correct) {
            button.classList.add('correct'); feedback.classList.remove('wrong'); feedback.textContent = `正确。${explanation}`;
            mastered.add(n); card.querySelectorAll('button').forEach(b => { b.disabled = true; }); persist();
          } else { button.classList.add('incorrect'); button.disabled = true; feedback.classList.add('wrong'); feedback.textContent = '这个选项不符合本页的结构约定。请结合头节点、终止条件和代码赋值对象再判断一次。'; }
        });
        card.querySelector('.quiz-choices').append(button);
      });
      if (mastered.has(n)) { feedback.hidden = false; feedback.textContent = `已答对。${explanation}`; }
      $('quiz-list').append(card);
    });
  }
  $('quiz-reset').addEventListener('click', () => { mastered.clear(); persist(); renderQuizzes(); });
  function clearProgress() { completed.clear(); mastered.clear(); persist(); renderQuizzes(); makeOperationButtons(); }
  $('clear-progress').addEventListener('click', clearProgress); $('mobile-clear').addEventListener('click', clearProgress);
  $('concept-list').innerHTML = Content.concepts.map(([title, description, example], n) => `<article class="panel concept-card"><span class="card-number">${String(n + 1).padStart(2, '0')}</span><h3>${escape(title)}</h3><p>${escape(description)}</p><div class="concept-example">${escape(example)}</div></article>`).join('');
  $('compare-list').innerHTML = Content.comparisons.map(([title, definition, use, status]) => `<article class="panel comparison-card"><span class="comparison-status ${status.includes('概念') ? 'concept-only' : ''}">${escape(status)}</span><h3>${escape(title)}</h3><p>${escape(definition)}</p><p>${escape(use)}</p></article>`).join('');
  $('pitfall-list').innerHTML = Content.pitfalls.map(([title, description], n) => `<article class="panel concept-card"><span class="card-number">${String(n + 1).padStart(2, '0')}</span><h3>${escape(title)}</h3><p>${escape(description)}</p></article>`).join('');
  persist(); renderQuizzes(); makeOperationButtons(); syncForm(); showView('demo'); generate();
})();
