(function () {
  'use strict';
  const records = {
    linear: [['zhixu-learning-v1','completed'],['zhixu-linked-v1','completed']],
    stack: [['zhixu-stack-queue-v1','completed']], string: [['zhixu-string-v1','completed']],
    tree: [['zhixu-tree-v1','completed']], graph: [['zhixu-graph-v1','algorithms']],
    search: [['zhixu-search-v1','algorithms']], sort: [['zhixu-sort-v1','done']],
    algorithm: [['zhixu-algorithm-v1','completed']]
  };
  for (const label of document.querySelectorAll('.progress-label')) {
    let count = 0;
    for (const [key, field] of records[label.dataset.chapter] || []) {
      try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(saved?.[field])) count += new Set(saved[field].filter(v=>typeof v==='string'||Number.isInteger(v))).size;
      } catch (_) { /* Reading progress is optional and never overwrites it. */ }
    }
    if (count) { label.textContent = `已完成 ${count} 项演示`; label.dataset.started = 'true'; }
  }
  const pages = ['sequence','linked','stack-queue','string','tree','graph','search','sort','algorithm'];
  try {
    const recent = localStorage.getItem('zhixu-last-chapter-v1');
    if (pages.includes(recent)) {
      const link = document.getElementById('continue-learning');
      link.href = recent + '.html'; link.querySelector('b').textContent = '继续学习';
    }
  } catch (_) { /* Keep the default link. */ }
  const card = document.getElementById('linear-card'), dialog = document.getElementById('linear-dialog');
  if (typeof dialog.showModal === 'function') {
    card.setAttribute('aria-haspopup','dialog'); card.setAttribute('aria-controls',dialog.id);
    card.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); dialog.showModal();
    });
    dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r=dialog.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
    });
  }
})();
