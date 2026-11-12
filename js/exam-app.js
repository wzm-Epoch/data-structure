(function () {
  'use strict';
  const E = globalThis.ExamEngine, $ = id => document.getElementById(id);
  const questions = [...(globalThis.ExamDataEarly || []), ...(globalThis.ExamDataLate || [])].sort((a, b) => b.year - a.year || a.number - b.number);
  const pageLinks = { linear: 'sequence.html', stack: 'stack-queue.html', string: 'string.html', tree: 'tree.html', graph: 'graph.html', search: 'search.html', sort: 'sort.html', algorithm: 'algorithm.html' };
  let state, filtered = [], selectedId = '', storageAvailable = true;
  const params = new URLSearchParams(location.search);
  function notice(text) { $('storage-notice').textContent = text; $('storage-notice').hidden = false; }
  try {
    const loaded = E.readState(localStorage.getItem(E.storageKey), questions);
    state = loaded.state;
    if (loaded.damaged) notice('真题记录格式异常，已忽略无效内容；其他章节的学习记录不受影响。');
  } catch (_) {
    state = E.readState(null, questions).state; storageAvailable = false;
    notice('当前浏览器不允许保存记录。本次仍可练习，关闭或刷新后作答可能丢失。');
  }
  if (!globalThis.ExamDataEarly || !globalThis.ExamDataLate) notice('部分题库文件未加载。请确认两个真题资料文件与页面保存在同一项目中；当前仅显示已加载内容。');
  function save() {
    if (storageAvailable) try { localStorage.setItem(E.storageKey, JSON.stringify(state)); } catch (_) {
      storageAvailable = false; notice('本机记录保存失败，本次作答仍保留在当前页面。其他章节记录未修改。');
    }
  }
  function write(question, patch) { state = E.updateRecord(state, question, patch); save(); }
  function current() { return filtered.find(q => q.id === selectedId); }
  function filters() { return { chapter: $('exam-chapter').value, year: $('exam-year').value, type: $('exam-type').value, query: $('exam-query').value, status: $('exam-status').value }; }
  function urlSync() {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filters())) if (v) p.set(k, v);
    if (selectedId) p.set('question', selectedId);
    try { history.replaceState(null, '', location.pathname + (p.size ? '?' + p.toString() : '')); } catch (_) { /* File browsers may restrict history changes. */ }
  }
  function stats() {
    const s = E.summarize(questions, state);
    $('stat-total').textContent = s.total;
    $('stat-answered').textContent = s.answered;
    $('stat-correct').textContent = s.correct;
    $('stat-review').textContent = s.incorrect + s.sourceDifferences + s.writtenReview;
    $('stat-detail').textContent = `来源答案相符 ${s.sourceMatches} · 综合题自评掌握 ${s.writtenMastered} · 记录仅存本机`;
  }
  function fillOptions(id, entries) {
    for (const [value, label] of entries) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; $(id).append(option);
    }
  }
  fillOptions('exam-chapter', Object.entries(E.chapters));
  fillOptions('exam-year', Array.from({ length: 10 }, (_, i) => [String(2026 - i), String(2026 - i)]));
  for (const [key, id] of [['chapter', 'exam-chapter'], ['year', 'exam-year'], ['type', 'exam-type'], ['status', 'exam-status']]) {
    if ([...$(id).options].some(o => o.value === params.get(key))) $(id).value = params.get(key);
  }
  $('exam-query').value = (params.get('query') || '').slice(0, 300);
  selectedId = params.get('question') || '';
  function renderDirectory() {
    const fragment = document.createDocumentFragment();
    for (const q of filtered) {
      const button = document.createElement('button'), status = E.outcome(q, E.getRecord(state, q));
      button.type = 'button'; button.dataset.question = q.id; button.textContent = q.id;
      button.setAttribute('aria-current', String(q.id === selectedId));
      const label = { correct: '答对', incorrect: '待复习', 'source-match': '与来源答案一致', 'source-difference': '与来源答案不同', mastered: '自评掌握', review: '自评待复习', draft: '已写草稿', recorded: '已记录' }[status] || '尚未作答';
      button.setAttribute('aria-label', `${q.year} 年第 ${q.number} 题，${q.title}，${label}`);
      button.title = q.title + ' · ' + label;
      if (['correct', 'mastered', 'source-match', 'recorded'].includes(status)) button.className = 'done';
      if (['incorrect', 'review', 'source-difference'].includes(status)) button.className = 'needs-review';
      fragment.append(button);
    }
    $('question-directory').replaceChildren(fragment);
    $('result-count').textContent = `${filtered.length} 题`;
  }
  function feedback(q, record) {
    const show = q.type === 'choice' ? record.submitted : record.revealed;
    $('question-feedback').hidden = !show;
    if (!show) return;
    const status = E.outcome(q, record);
    const titles = { correct: '回答正确', incorrect: '还差一步，看看思路', 'source-match': '对照来源参考答案：一致', 'source-difference': '对照来源参考答案：不同', recorded: '已保存你的选项；本题暂无可用参考答案' };
    $('feedback-title').textContent = q.type === 'written' ? '参考思路 · 请自行对照' : titles[status];
    const answer = Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 ? `参考选项：${String.fromCharCode(65 + q.answer)}\n\n` : '';
    $('feedback-explanation').textContent = (q.type === 'choice' ? answer : '') + (q.explanation || '本题请结合来源中的完整题面与参考答案复习。');
    $('question-feedback').className = 'question-feedback' + (['incorrect', 'source-difference'].includes(status) ? ' wrong' : (q.requiresSource || !q.verified) ? ' reference' : '');
    $('written-assessment').hidden = q.type !== 'written';
    $('mark-mastered').setAttribute('aria-pressed', String(record.assessment === 'mastered'));
    $('mark-review').setAttribute('aria-pressed', String(record.assessment === 'review'));
  }
  function syncActions(q, record) {
    const canAnswer = !q.requiresSource || record.sourceSeen;
    $('submit-choice').disabled = record.selected === null || record.submitted || !canAnswer;
    $('submit-choice').textContent = record.submitted ? '已提交 · 可重做本题' : q.requiresSource || !q.verified ? '保存并对照参考答案' : '提交答案';
    $('reveal-written').disabled = !canAnswer;
    $('reveal-written').textContent = record.revealed ? '收起参考思路' : '查看参考思路';
    $('reveal-written').setAttribute('aria-expanded', String(record.revealed));
    $('mark-mastered').disabled = !canAnswer; $('mark-review').disabled = !canAnswer;
  }
  function renderQuestion() {
    const q = current();
    $('empty-state').hidden = !!q; $('question-card').hidden = !q;
    if (!q) return;
    const record = E.getRecord(state, q), position = filtered.indexOf(q);
    $('question-year').textContent = `${q.year} · 第 ${q.number} 题`;
    $('question-type').textContent = q.type === 'choice' ? '选择题' : '综合题';
    $('question-position').textContent = '408 数据结构';
    $('question-title').textContent = q.title;
    $('question-version').textContent = q.requiresSource ? '需查看原题 · 本页为考点提要' : q.verified ? '题意整理 · 条件与答案已独立核对，非官方全文' : '题意整理 · 对照来源参考答案';
    $('question-stem').textContent = q.stem;
    $('question-source-note').textContent = q.sourceNote || '来源为公开整理版；与原卷有差异时，以完整原卷为准。';
    const source = E.safeSource(q.source);
    $('question-source').hidden = !source;
    if (source) $('question-source').href = source; else $('question-source').removeAttribute('href');
    $('source-required').hidden = !q.requiresSource;
    $('source-seen').checked = record.sourceSeen;
    const tags = q.chapters.map(c => { const span = document.createElement('span'); span.textContent = E.chapters[c] || c; return span; });
    $('question-tags').replaceChildren(...tags);
    $('choice-form').hidden = q.type !== 'choice'; $('written-form').hidden = q.type !== 'written';
    const choices = document.createDocumentFragment();
    if (q.type === 'choice') for (let i = 0; i < E.choiceCount(q); i++) {
      const label = document.createElement('label'); label.className = 'option-label';
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'exam-choice'; radio.value = i; radio.checked = record.selected === i; radio.disabled = record.submitted;
      const letter = document.createElement('span'); letter.className = 'option-letter'; letter.textContent = String.fromCharCode(65 + i);
      const content = document.createElement('span'); content.className = 'option-text'; content.textContent = q.options[i] || `原题中的选项 ${String.fromCharCode(65 + i)}`;
      label.append(radio, letter, content); choices.append(label);
    }
    $('question-options').replaceChildren(choices);
    $('written-draft').value = record.draft;
    $('draft-status').textContent = record.draft ? storageAvailable ? '草稿已保存到本机' : '草稿保留在本页' : '';
    feedback(q, record); syncActions(q, record);
    $('pager-position').textContent = `${position + 1} / ${filtered.length}`;
    $('previous-question').disabled = position <= 0; $('next-question').disabled = position >= filtered.length - 1;
  }
  function refresh() {
    filtered = E.filterQuestions(questions, filters(), state);
    if (!filtered.some(q => q.id === selectedId)) selectedId = filtered[0]?.id || '';
    const chapter = $('exam-chapter').value;
    $('back-to-chapter').href = pageLinks[chapter] || 'index.html';
    $('back-to-chapter').textContent = chapter ? `回到${E.chapters[chapter]}实验 ↗` : '返回八章学习目录 ↗';
    renderDirectory(); renderQuestion(); stats(); urlSync();
  }
  function resetFilters() { $('exam-filters').reset(); selectedId = ''; refresh(); }
  $('exam-filters').addEventListener('submit', e => { e.preventDefault(); refresh(); });
  $('exam-filters').addEventListener('change', refresh);
  $('exam-query').addEventListener('input', refresh);
  $('reset-filters').addEventListener('click', resetFilters); $('empty-reset').addEventListener('click', resetFilters);
  $('question-directory').addEventListener('click', event => {
    const button = event.target.closest('button[data-question]'); if (!button) return;
    selectedId = button.dataset.question; refresh(); $('question-panel').focus({ preventScroll: true });
    if (matchMedia('(max-width: 760px)').matches) $('question-panel').scrollIntoView({ block: 'start' });
  });
  $('source-seen').addEventListener('change', () => {
    const q = current(); if (!q) return;
    write(q, { sourceSeen: $('source-seen').checked });
    renderQuestion(); renderDirectory(); stats(); $('source-seen').focus({ preventScroll: true });
  });
  $('question-options').addEventListener('change', event => {
    const q = current(); if (!q || E.getRecord(state, q).submitted) return;
    write(q, { selected: Number(event.target.value) }); syncActions(q, E.getRecord(state, q));
  });
  $('choice-form').addEventListener('submit', event => {
    event.preventDefault(); const q = current(); if (!q || $('submit-choice').disabled) return;
    write(q, { submitted: true }); refresh();
  });
  $('written-draft').addEventListener('input', () => {
    const q = current(); if (!q) return;
    write(q, { draft: $('written-draft').value });
    $('draft-status').textContent = storageAvailable ? '草稿已保存到本机' : '草稿保留在本页';
    renderDirectory(); stats();
  });
  $('reveal-written').addEventListener('click', () => {
    const q = current(); if (!q) return; const record = E.getRecord(state, q);
    write(q, { revealed: !record.revealed }); renderQuestion(); $('reveal-written').focus({ preventScroll: true });
  });
  for (const [id, assessment] of [['mark-mastered', 'mastered'], ['mark-review', 'review']]) $(id).addEventListener('click', () => {
    const q = current(); if (!q) return; write(q, { assessment }); refresh();
  });
  $('reset-question').addEventListener('click', () => { const q = current(); if (!q) return; state = E.resetRecord(state, q.id); save(); refresh(); });
  for (const [id, direction] of [['previous-question', -1], ['next-question', 1]]) $(id).addEventListener('click', () => {
    const next = filtered[filtered.findIndex(q => q.id === selectedId) + direction];
    if (next) { selectedId = next.id; refresh(); $('question-panel').focus({ preventScroll: true }); }
  });
  refresh();
})();
