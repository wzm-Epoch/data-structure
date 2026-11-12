(function (g) {
  'use strict';
  // Shared, build-free helpers. Chapter engines remain independent.
  function shuffleChoices(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function highlightC(line, pattern) {
    const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let result = '', offset = 0;
    for (const match of line.matchAll(pattern)) {
      result += esc(line.slice(offset, match.index));
      result += `<span class="token-${match[1] ? 'keyword' : match[2] ? 'number' : 'function'}">${esc(match[0])}</span>`;
      offset = match.index + match[0].length;
    }
    return result + esc(line.slice(offset));
  }

  function readProgress(key, catalog, quizCount) {
    let saved = {}, damaged = false;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        saved = JSON.parse(raw);
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
          saved = {}; damaged = true;
        }
        for (const field of ['completed', 'mastered']) {
          if (!Array.isArray(saved[field])) { saved[field] = []; damaged = true; }
        }
      }
    } catch (_) { damaged = true; }
    const completed = [...new Set((saved.completed || []).filter(k => typeof k === 'string' && Object.hasOwn(catalog, k)))];
    const mastered = [...new Set((saved.mastered || []).filter(n => Number.isInteger(n) && n >= 0 && n < quizCount))];
    if (completed.length !== (saved.completed || []).length || mastered.length !== (saved.mastered || []).length) damaged = true;
    if (damaged) {
      const notice = document.createElement('p');
      notice.className = 'storage-notice'; notice.setAttribute('role', 'status');
      notice.textContent = '本章记录格式异常，已忽略无效项目；可以继续学习。';
      document.querySelector('main').prepend(notice);
    }
    return { completed, mastered };
  }

  function windowLog(host, steps, index, jump) {
    const start = Math.max(0, index - 150), end = Math.min(steps.length, index + 151);
    // Rebuild only when the cursor approaches the edge of the current window.
    if (host._steps !== steps || index < host._start + 25 && host._start > 0 || index >= host._end - 25 && host._end < steps.length) {
      host._steps = steps; host._start = start; host._end = end;
      const fragment = document.createDocumentFragment();
      const add = (i, text, className = 'log-row') => {
        const button = document.createElement('button');
        button.className = className; button.dataset.step = i; button.textContent = text; fragment.append(button);
      };
      if (start > 0) add(0, '跳到开头');
      for (let i = start; i < end; i++) add(i, `${i}. ${steps[i].event || steps[i].phase || '初始'} · ${steps[i].explanation}`);
      if (end < steps.length) add(steps.length - 1, '跳到结尾');
      host.replaceChildren(fragment);
    }
    host.querySelector('.active')?.classList.remove('active');
    host.querySelector(`[data-step="${index}"]`)?.classList.add('active');
    host.onclick = event => {
      const button = event.target.closest('[data-step]');
      if (button && host.contains(button)) jump(Number(button.dataset.step));
    };
  }

  g.SiteShell = { shuffleChoices, highlightC, readProgress, windowLog };
  const chapters = [
    ['sequence.html', '顺序表'], ['linked.html', '链表'], ['stack-queue.html', '栈队列'],
    ['string.html', '串'], ['tree.html', '树'], ['graph.html', '图'],
    ['search.html', '查找'], ['sort.html', '排序'], ['algorithm.html', '算法']
  ];
  const nav = document.querySelector('.chapter-switch');
  if (nav) {
    nav.setAttribute('aria-label', '章节导航'); nav.replaceChildren();
    chapters.forEach(([href, label]) => {
      const a = document.createElement('a'); a.href = href; a.textContent = label;
      if (location.pathname.endsWith('/' + href)) a.setAttribute('aria-current', 'page');
      nav.append(a);
    });
  }
  // Navigation and focus mode only affect presentation, never chapter state.
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && nav) {
    const directory = document.createElement('nav');
    directory.className = 'course-nav';
    directory.setAttribute('aria-label', '全部实验章节');
    const labels = ['顺序表', '链表', '栈与队列', '串与模式匹配', '树与二叉树', '图', '查找', '排序', '算法设计与应用'];
    const numbers = ['01.1', '01.2', '02', '03', '04', '05', '06', '07', '08'];
    [...nav.children].forEach((link, i) => {
      const a = link.cloneNode(false);
      const number = document.createElement('span');
      number.className = 'course-number'; number.textContent = numbers[i];
      const label = document.createElement('span'); label.textContent = labels[i];
      a.append(number, label); directory.append(a);
    });
    sidebar.querySelector('.course-label').after(directory);
    sidebar.classList.add('has-course-nav');
    const tools = document.createElement('div'); tools.className = 'workspace-tools';
    const badge = document.createElement('span'); badge.className = 'offline-label'; badge.textContent = '本地学习 · 离线可用';
    const focus = document.createElement('button');
    focus.type = 'button'; focus.id = 'focus-mode'; focus.className = 'secondary';
    focus.textContent = '专注演示'; focus.setAttribute('aria-pressed', 'false');
    focus.addEventListener('click', () => {
      const on = document.body.classList.toggle('focus-mode');
      focus.setAttribute('aria-pressed', String(on));
      focus.textContent = on ? '退出专注' : '专注演示';
    });
    tools.append(badge, focus); document.querySelector('.topbar').append(tools);
  }
  const chapterIds = ['linear','linear','stack','string','tree','graph','search','sort','algorithm'];
  const currentChapter = chapters.findIndex(([href]) => location.pathname.endsWith('/' + href));
  if (currentChapter >= 0) {
    try { localStorage.setItem('zhixu-last-chapter-v1', chapters[currentChapter][0].replace('.html','')); } catch (_) {}
    const quiz = document.getElementById('view-quiz');
    if (quiz) {
      const entry = document.createElement('div'); entry.className = 'chapter-exam-entry';
      const text = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = '把知识放进真题里';
      const description = document.createElement('p'); description.textContent = '2017—2026 历年题 · 题意整理、解题思路与原题来源';
      text.append(title, description);
      const link = document.createElement('a'); link.href = 'exams.html?chapter=' + chapterIds[currentChapter];
      link.textContent = '本章真题练习 ↗'; entry.append(text, link); quiz.prepend(entry);
    }
  }
  // Reorder the actual panels so visual and keyboard reading order agree.
  document.querySelectorAll('.lab-grid,.tree-lab,.search-lab,.sort-lab,.algorithm-lab').forEach(lab => {
    const code = lab.querySelector('#code-lines,#code');
    const panel = code?.closest('.panel');
    if (!panel || panel.parentElement !== lab) return;
    panel.classList.add('source-panel');
    const visual = [...lab.children].find(child => child !== panel);
    if (visual) visual.classList.add('canvas-panel');
    lab.classList.add('studio-grid'); lab.append(panel);
    const playback = [...lab.parentElement.children].find(child => child.classList.contains('playback'));
    if (playback) {
      const options = playback.nextElementSibling;
      lab.before(playback);
      if (options?.classList.contains('playback-options')) lab.before(options);
    }
  });
  const tabs = [...document.querySelectorAll('.tabs [data-view]')];
  function syncTabs() {
    tabs.forEach(tab => {
      const on = !document.getElementById('view-' + tab.dataset.view).hidden;
      tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1;
    });
  }
  tabs.forEach(tab => tab.addEventListener('click', () => queueMicrotask(syncTabs)));
  document.querySelector('.tabs')?.addEventListener('keydown', event => {
    const i = tabs.indexOf(event.target);
    if (i < 0) return;
    const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault(); event.stopImmediatePropagation(); tabs[next].click(); tabs[next].focus();
  }, true);
  // Let focused controls keep their native Space action, while arrows on playback buttons navigate.
  document.addEventListener('keydown', event => {
    if (event.target.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"]),[role="tab"],a,summary') || event.ctrlKey || event.altKey || event.metaKey || event.code === 'Space' && event.target.closest('button')) event.stopImmediatePropagation();
  });
  const mobile = document.getElementById('mobile-clear');
  if (mobile) mobile.addEventListener('click', () => document.getElementById('clear-progress').click());
})(globalThis);
