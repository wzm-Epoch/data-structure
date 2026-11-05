(function () {
  'use strict';
  const Lab = window.SequenceLab;
  const $ = id => document.getElementById(id);
  const storageKey = 'zhixu-learning-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) { /* Offline storage may be unavailable. */ }
  let completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter(x => Lab.names[x]) : []);
  let mastered = new Set(Array.isArray(saved.mastered) ? saved.mastered.filter(x => Number.isInteger(x) && x >= 0 && x < 5) : []);
  let operation = 'insert', trace, index = 0, timer = null, predictionTarget = null;
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ completed: [...completed], mastered: [...mastered] })); } catch (_) { /* Learning still works without persistence. */ }
  }
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const highlighted = line => escape(line).replace(/\b(bool|int|const|if|return|for|true|false)\b|\b(\d+)\b|\b(ListInsert|ListDelete|GetElem)\b/g,
    (whole, keyword, number, fn) => `<span class="token-${keyword ? 'keyword' : number ? 'number' : 'function'}">${whole}</span>`);

  function saveProgress() {
    $('completed-count').textContent = `${completed.size} / 3`;
    $('completion-fill').style.width = `${completed.size / 3 * 100}%`;
    $('quiz-score').textContent = `已掌握 ${mastered.size} / ${quizzes.length}`;
    persist();
  }
  function pause() {
    if (timer !== null) clearInterval(timer);
    timer = null; $('play').textContent = '▶ 播放';
  }
  function hidePrediction() {
    $('prediction').hidden = true; predictionTarget = null;
  }
  function showView(view) {
    pause();
    document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `view-${view}`; });
    document.querySelectorAll('.tabs [data-view]').forEach(el => {
      const active = el.dataset.view === view;
      el.classList.toggle('active', active); el.setAttribute('aria-selected', String(active)); el.tabIndex = active ? 0 : -1;
    });
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  const tabButtons = [...document.querySelectorAll('.tabs [data-view]')];
  tabButtons.forEach((button, n) => button.addEventListener('keydown', event => {
    let target;
    if (event.key === 'ArrowRight') target = tabButtons[(n + 1) % tabButtons.length];
    if (event.key === 'ArrowLeft') target = tabButtons[(n + tabButtons.length - 1) % tabButtons.length];
    if (event.key === 'Home') target = tabButtons[0];
    if (event.key === 'End') target = tabButtons.at(-1);
    if (target) { event.preventDefault(); target.click(); target.focus(); }
  }));

  function readInteger(id, label) {
    const raw = $(id).value.trim();
    if (!/^[+-]?\d+$/.test(raw)) throw new Error(`${label}必须填写整数。`);
    const value = Number(raw);
    if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw new Error(`${label}必须在 32 位整数范围内。`);
    return value;
  }
  function generate() {
    pause(); hidePrediction();
    try {
      const nextTrace = Lab.generate({ operation, values: Lab.parseInput($('array-input').value),
        position: readInteger('position-input', '位置 i'), value: operation === 'insert' ? readInteger('value-input', '插入值 e') : 0,
        capacity: Number($('capacity-input').value) });
      trace = nextTrace; index = 0;
      $('input-error').hidden = true; $('input-dirty').hidden = true;
      $('source-name').textContent = { insert: 'ListInsert', delete: 'ListDelete', access: 'GetElem' }[operation];
      $('definition-code').textContent = Lab.declaration(trace.capacity);
      $('code-lines').innerHTML = trace.source.map((line, n) => `<div class="code-line" id="code-line-${n + 1}"><span class="line-number">${n + 1}</span><code>${highlighted(line)}</code></div>`).join('');
      $('timeline').max = trace.steps.length - 1;
      $('memory-stage').style.setProperty('--capacity', trace.capacity);
      $('memory-stage').style.minWidth = `${Math.max(360, trace.capacity * 48)}px`;
      $('takeaway').textContent = {
        insert: '为什么从后向前移动？先保护后面的元素，才能腾出位置。第 i 个位置对应下标 i − 1。',
        delete: '删除完成后，逻辑长度减一；尾部旧值可能还在，但已经不属于顺序表。',
        access: '按位查找直接读取 data[i − 1]，不需要遍历；它和“查找某个值”是不同操作。'
      }[operation];
      render();
    } catch (error) {
      $('input-error').textContent = error.message; $('input-error').hidden = false;
      if (trace && trace.operation !== operation) {
        operation = trace.operation; syncOperation();
      }
    }
  }
  function syncOperation() {
    document.querySelectorAll('[data-operation]').forEach(button => {
      const selected = button.dataset.operation === operation;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
    $('value-field').hidden = operation !== 'insert';
  }
  document.querySelectorAll('[data-operation]').forEach(button => button.addEventListener('click', () => {
    if (operation === button.dataset.operation) return;
    operation = button.dataset.operation; syncOperation(); generate();
  }));
  $('input-form').addEventListener('submit', event => { event.preventDefault(); generate(); });
  ['array-input', 'position-input', 'value-input', 'capacity-input'].forEach(id => $(id).addEventListener('input', () => {
    pause(); hidePrediction(); $('input-dirty').hidden = false;
  }));

  function render() {
    const s = trace.steps[index], prev = trace.steps[Math.max(0, index - 1)];
    document.querySelectorAll('.code-line').forEach(el => {
      const active = el.id === `code-line-${s.line}`;
      el.classList.toggle('active', active);
      if (active) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    $('position-row').innerHTML = s.memory.map((_, n) => `<span class="${n >= s.length ? 'out' : ''}">${n < s.length ? n + 1 : '—'}</span>`).join('');
    $('memory-cells').innerHTML = s.memory.map((value, n) => {
      const classes = ['memory-cell'];
      if (n >= s.length) classes.push('unused');
      if (value !== null && n >= s.length) classes.push('stale');
      if (s.read.includes(n)) classes.push('read');
      if (s.write.includes(n)) classes.push('write');
      if (String(value).length > 5) classes.push('long-value');
      const description = n < s.length ? `第 ${n + 1} 个元素` : value === null ? '未用空间' : '表外旧值';
      return `<div class="${classes.join(' ')}" title="data[${n}]：${description}${value === null ? '' : `，值 ${value}`}" aria-label="data[${n}]：${description}${value === null ? '' : ` ${value}`}">${value === null ? '·' : escape(value)}</div>`;
    }).join('');
    $('index-row').innerHTML = s.memory.map((_, n) => `<span>${n}</span>`).join('');
    drawArrow(s.move);
    const vars = [{ key: 'length', label: 'length', value: s.length, before: prev.length },
      { key: 'capacity', label: 'MAXSIZE', value: trace.capacity, before: trace.capacity },
      ...Object.entries(s.vars).map(([key, value]) => ({ key, label: key === 'e' && trace.operation !== 'insert' ? '*e' : key, value, before: prev.vars[key] }))];
    if (s.condition !== null) vars.push({ key: 'condition', label: '条件结果', value: String(s.condition), before: String(prev.condition) });
    if (s.done) vars.push({ key: 'result', label: 'return', value: String(s.result), before: '' });
    $('variables').innerHTML = vars.map(v => `<div class="variable ${v.value !== v.before && index > 0 ? 'changed' : ''}"><span>${escape(v.label)}</span><strong class="${v.value === null ? 'null-value' : ''}">${v.value === null ? (v.key === 'j' ? (index === 0 ? '尚未声明' : '未初始化') : '尚未赋值') : escape(v.value)}</strong></div>`).join('');
    $('step-phase').textContent = s.phase;
    $('step-line').textContent = s.line ? `第 ${s.line} 行 · 执行后` : '初始状态 · 尚未执行';
    $('step-action').textContent = s.action; $('step-explanation').textContent = s.explanation; $('step-detail').textContent = s.detail;
    $('state-badge').textContent = index === 0 ? '尚未执行' : s.done ? (s.result ? '操作成功' : '操作失败') : '执行后状态';
    $('state-badge').classList.toggle('finished', s.done && s.result);
    $('previous').disabled = index === 0; $('next').disabled = s.done;
    $('play').disabled = s.done || $('predict-toggle').checked;
    $('timeline').value = index; $('step-counter').textContent = `${index} / ${trace.steps.length - 1}`;
    $('move-counter').textContent = `移动 ${s.moves} 次`;
    if (s.done) {
      pause();
      if (s.result) { completed.add(trace.operation); saveProgress(); }
    }
  }
  function drawArrow(move) {
    const svg = $('move-arrow');
    if (!move) { svg.innerHTML = ''; return; }
    const width = $('memory-cells').getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle($('memory-cells')).columnGap) || 6;
    const slot = (width - gap * (trace.capacity - 1)) / trace.capacity;
    const x1 = move.from * (slot + gap) + slot / 2, x2 = move.to * (slot + gap) + slot / 2;
    svg.setAttribute('viewBox', `0 0 ${width} 38`);
    svg.innerHTML = `<defs><marker id="arrow-head" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#4e9c79"/></marker></defs><path d="M${x1},33 Q${(x1 + x2) / 2},-13 ${x2},29" fill="none" stroke="#4e9c79" stroke-width="1.8" marker-end="url(#arrow-head)"/><text x="${(x1 + x2) / 2}" y="11" font-size="9" fill="#4d8f71" text-anchor="middle">复制</text>`;
  }
  window.addEventListener('resize', () => { if (trace) drawArrow(trace.steps[index].move); });
  function goTo(n) { pause(); hidePrediction(); index = Math.max(0, Math.min(n, trace.steps.length - 1)); render(); }
  function advance() {
    if (index >= trace.steps.length - 1) return;
    if ($('predict-toggle').checked) { askPrediction(); return; }
    hidePrediction(); index++; render();
  }
  $('next').addEventListener('click', advance);
  $('previous').addEventListener('click', () => goTo(index - 1));
  $('reset').addEventListener('click', () => goTo(0));
  $('timeline').addEventListener('input', event => goTo(Number(event.target.value)));
  $('play').addEventListener('click', () => {
    if (timer !== null) { pause(); return; }
    if (index >= trace.steps.length - 1 || $('predict-toggle').checked) return;
    hidePrediction(); $('play').textContent = 'Ⅱ 暂停';
    timer = setInterval(advance, Number($('speed').value));
  });
  $('speed').addEventListener('change', () => {
    if (timer !== null) { pause(); $('play').click(); }
  });
  $('predict-toggle').addEventListener('change', () => { pause(); hidePrediction(); render(); });
  function askPrediction() {
    pause();
    predictionTarget = index + 1;
    const correct = trace.steps[predictionTarget].action;
    const distractors = [...new Set(trace.steps.slice(1).map(s => s.action))].filter(x => x !== correct);
    const choices = [correct, ...distractors.slice(0, 2)].sort(() => Math.random() - .5);
    $('prediction-options').replaceChildren(); $('prediction-feedback').textContent = ''; $('prediction-reveal').hidden = true;
    for (const choice of choices) {
      const button = document.createElement('button'); button.className = 'choice'; button.textContent = choice;
      button.addEventListener('click', () => {
        if (choice === correct) {
          button.classList.add('correct'); $('prediction-feedback').textContent = '判断正确。点击下方按钮，观察这一步的执行结果。';
          $('prediction-reveal').hidden = false;
          $('prediction-options').querySelectorAll('button').forEach(b => { b.disabled = true; });
        } else { button.classList.add('incorrect'); button.disabled = true; $('prediction-feedback').textContent = '再看一下循环当前处于哪个阶段，以及上一条执行了什么。可以重新选择。'; }
      });
      $('prediction-options').append(button);
    }
    $('prediction').hidden = false;
    $('prediction-options').querySelector('button').focus({ preventScroll: true });
  }
  $('prediction-reveal').addEventListener('click', () => { if (predictionTarget !== null) goTo(predictionTarget); });
  $('go-quiz').addEventListener('click', () => showView('quiz'));
  document.addEventListener('keydown', event => {
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'SUMMARY'].includes(event.target.tagName) || $('view-demo').hidden || !$('prediction').hidden || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); pause(); advance(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1); }
    if (event.code === 'Space') { event.preventDefault(); if (!$('play').disabled) $('play').click(); }
  });

  const quizzes = [
    { title: '顺序表第 4 个元素，对应哪个数组下标？', options: ['data[4]', 'data[3]', 'data[5]', '取决于元素值'], correct: 1, explanation: '本工具的逻辑位置从 1 开始，数组下标从 0 开始，所以第 i 个元素对应 data[i - 1]。' },
    { title: '长度为 5 的顺序表，在第 3 个位置插入元素，需要移动几个原有元素？', options: ['2 个', '3 个', '4 个', '5 个'], correct: 1, explanation: '原来第 3、4、5 个元素各右移一次，共 5 - 3 + 1 = 3 次。不把写入新元素算作移动原有元素。' },
    { title: '插入操作中，为什么从后向前右移？', options: ['为了让数组自动扩容', '因为 C 语言禁止从前向后循环', '为了避免覆盖尚未复制的元素', '为了把元素从小到大排列'], correct: 2, explanation: '若先把前面的元素复制到后一个位置，就可能覆盖下一步仍要读取的值。从后向前移动可以保护源数据。' },
    { title: '删除完成后，数组尾部仍保留一个旧值，这说明什么？', options: ['删除一定失败', '必须将该格子清零才算删除', 'length 必须保持不变', '旧值在逻辑表之外，不再算作表元素'], correct: 3, explanation: '顺序表通过 length 确定有效元素范围。尾部旧值可以保留，不要求清零；有效下标只到 length - 1。' },
    { title: '按位查找与按值查找相比，本例按位查找为什么是 O(1)？', options: ['可用 i - 1 直接计算数组下标', '每次都从表头扫描到表尾', '顺序表必须已经排好序', '因为所有元素都相等'], correct: 0, explanation: '在固定大小元素的数组模型中，可以根据位置直接定位元素，无需扫描；也不要求顺序表有序。' }
  ];
  function renderQuizzes() {
    $('quiz-list').replaceChildren();
    quizzes.forEach((q, n) => {
      const article = document.createElement('article'); article.className = 'panel quiz-card';
      article.innerHTML = `<div class="eyebrow">QUESTION ${String(n + 1).padStart(2, '0')}</div><h3>${escape(q.title)}</h3><div class="quiz-choices"></div><div class="quiz-feedback" hidden></div>`;
      const feedback = article.querySelector('.quiz-feedback');
      q.options.forEach((text, answer) => {
        const button = document.createElement('button'); button.className = 'quiz-choice';
        button.innerHTML = `<span>${String.fromCharCode(65 + answer)}</span>${escape(text)}`;
        if (mastered.has(n) && answer === q.correct) button.classList.add('correct');
        if (mastered.has(n)) button.disabled = true;
        button.addEventListener('click', () => {
          feedback.hidden = false;
          if (answer === q.correct) {
            button.classList.add('correct'); feedback.classList.remove('wrong'); feedback.textContent = `正确。${q.explanation}`;
            mastered.add(n); article.querySelectorAll('button').forEach(b => { b.disabled = true; }); saveProgress();
          } else {
            button.classList.add('incorrect'); button.disabled = true; feedback.classList.add('wrong');
            feedback.textContent = '这个选项不合适。请区分逻辑位置、数组下标和实际执行过程，再选择一次。';
          }
        });
        article.querySelector('.quiz-choices').append(button);
      });
      if (mastered.has(n)) { feedback.hidden = false; feedback.textContent = `已答对。${q.explanation}`; }
      $('quiz-list').append(article);
    });
  }
  $('quiz-reset').addEventListener('click', () => { mastered.clear(); renderQuizzes(); saveProgress(); });
  $('clear-progress').addEventListener('click', () => { completed.clear(); mastered.clear(); renderQuizzes(); saveProgress(); });
  const roadmap = [
    ['线性表 · 顺序表', '概念、按位查找、插入、删除；代码与状态同步演示。', true],
    ['线性表 · 链表', '单链表、双链表、循环单链表；13 个算法与插入错序实验。', true],
    ['栈与队列', '顺序栈、链栈、循环队列、链式队列的 22 项基本操作；应用算法仍为概念介绍。', true],
    ['串与模式匹配', '基本操作、BF、KMP、next/nextval 构表与对比实验。', true],
    ['树与二叉树', '递归与遍历、重建、线索、森林转换、哈夫曼、并查集；入口 tree.html。', true],
    ['图', '模型与存储、DFS/BFS、生成森林、最短路、拓扑与关键路径；入口 graph.html。', true],
    ['查找', '43种查找与结构调整入口、ASL实验及32道自测；从顶部导航进入。', true],
    ['排序', '20个算法实验、稳定性对比、模拟外存与30道自测；从顶部导航进入。', true],
    ['算法设计与应用', '44个新实验、旧章复用入口、7组对比和36道原创自测；入口 algorithm.html。', true]
  ];
  $('roadmap-list').innerHTML = roadmap.map(([title, description, available], n) => `<article class="panel roadmap-card ${available ? 'available' : ''}"><span class="roadmap-order">${String(n + 1).padStart(2, '0')}</span><div><h3>${escape(title)}</h3><p>${escape(description)}</p></div><span class="roadmap-status">${available ? '当前可学' : '规划中'}</span></article>`).join('');
  renderQuizzes(); saveProgress(); syncOperation(); generate();
  // Keep only the selected tab in the keyboard tab sequence.
  tabButtons.forEach(button => { button.tabIndex = button.dataset.view === 'demo' ? 0 : -1; });
})();

