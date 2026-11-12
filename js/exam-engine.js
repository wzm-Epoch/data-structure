(function (g) {
  'use strict';
  const chapters = Object.freeze({ linear: '线性表', stack: '栈与队列', string: '串与模式匹配', tree: '树与二叉树', graph: '图', search: '查找', sort: '排序', algorithm: '算法设计与应用' });
  const storageKey = 'zhixu-exams-v1';
  const own = (object, key) => Object.hasOwn(object, key);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const emptyRecord = () => ({ selected: null, submitted: false, draft: '', assessment: null, revealed: false, reviewed: false, sourceSeen: false });
  function choiceCount(question) { return question.requiresSource ? 4 : (Array.isArray(question.options) ? question.options.length : 0); }
  function validChoice(question, value) { return question.type === 'choice' && Number.isInteger(value) && value >= 0 && value < choiceCount(question); }
  function cleanRecord(value, question) {
    const input = object(value) ? value : {}, result = emptyRecord();
    if (question.type === 'choice') {
      result.selected = validChoice(question, input.selected) ? input.selected : null;
      result.sourceSeen = input.sourceSeen === true;
      result.submitted = input.submitted === true && result.selected !== null && (!question.requiresSource || result.sourceSeen);
    } else {
      result.draft = typeof input.draft === 'string' ? input.draft.slice(0, 12000) : '';
      result.revealed = input.revealed === true;
      result.reviewed = input.reviewed === true || result.revealed;
      result.assessment = result.reviewed && ['mastered', 'review'].includes(input.assessment) ? input.assessment : null;
      result.sourceSeen = input.sourceSeen === true;
      if (question.requiresSource && !result.sourceSeen) result.assessment = null;
    }
    return result;
  }
  function readState(raw, questions) {
    let parsed = {}, damaged = false;
    if (raw != null && raw !== '') {
      try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { damaged = true; }
      if (!object(parsed) || parsed.version !== 1 || !object(parsed.records)) { parsed = {}; damaged = true; }
    }
    const records = Object.create(null), source = parsed.records || {};
    for (const question of questions) {
      if (own(source, question.id)) records[question.id] = cleanRecord(source[question.id], question);
    }
    return { state: { version: 1, records }, damaged };
  }
  function getRecord(state, question) { return cleanRecord(state.records && own(state.records, question.id) ? state.records[question.id] : null, question); }
  function updateRecord(state, question, patch) {
    return { version: 1, records: { ...state.records, [question.id]: cleanRecord({ ...getRecord(state, question), ...patch }, question) } };
  }
  function resetRecord(state, id) {
    const records = { ...state.records }; delete records[id]; return { version: 1, records };
  }
  function outcome(question, record) {
    const r = cleanRecord(record, question);
    if (question.type === 'written') return r.assessment || (r.draft.trim() ? 'draft' : 'unanswered');
    if (!r.submitted) return 'unanswered';
    if (!validChoice(question, question.answer)) return 'recorded';
    if (question.requiresSource || !question.verified) return r.selected === question.answer ? 'source-match' : 'source-difference';
    return r.selected === question.answer ? 'correct' : 'incorrect';
  }
  function matchesStatus(question, record, status) {
    const result = outcome(question, record);
    if (status === 'unanswered') return ['unanswered', 'draft'].includes(result);
    if (status === 'review') return ['incorrect', 'source-difference', 'review'].includes(result);
    if (status === 'mastered') return ['correct', 'mastered'].includes(result);
    return true;
  }
  function filterQuestions(questions, filters, state) {
    const needle = String(filters.query || '').trim().toLocaleLowerCase();
    return questions.filter(q => (!own(chapters, filters.chapter) || q.chapters.includes(filters.chapter))
      && (!/^20(1[7-9]|2[0-6])$/.test(String(filters.year || '')) || q.year === Number(filters.year))
      && (!['choice', 'written'].includes(filters.type) || q.type === filters.type)
      && matchesStatus(q, getRecord(state, q), filters.status)
      && (!needle || [q.id, q.title, q.stem, ...q.chapters.map(c => chapters[c] || '')].join(' ').toLocaleLowerCase().includes(needle)));
  }
  function summarize(questions, state) {
    const result = { total: questions.length, answered: 0, correct: 0, incorrect: 0, sourceMatches: 0, sourceDifferences: 0, writtenMastered: 0, writtenReview: 0, drafts: 0 };
    for (const q of questions) {
      const status = outcome(q, getRecord(state, q));
      if (!['unanswered', 'draft'].includes(status)) result.answered++;
      const key = { correct: 'correct', incorrect: 'incorrect', 'source-match': 'sourceMatches', 'source-difference': 'sourceDifferences', mastered: 'writtenMastered', review: 'writtenReview', draft: 'drafts' }[status];
      if (key) result[key]++;
    }
    return result;
  }
  function safeSource(url) { try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } }
  const api = { chapters, storageKey, emptyRecord, readState, getRecord, updateRecord, resetRecord, outcome, filterQuestions, summarize, safeSource, choiceCount };
  g.ExamEngine = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
