async function runFetch() {
  const el = document.getElementById('fetch-result');
  el.innerHTML = '<div style="color:#8892b0;">Loading...</div>';
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
    const data = await res.json();
    el.innerHTML = `<div style="color:#9ece6a;">&gt; Title: ${data.title}</div><div style="color:#e0af68;">&gt; Completed: ${data.completed}</div>`;
  } catch (e) {
    el.innerHTML = `<div style="color:#f7768e;">&gt; Error: ${e.message}</div>`;
  }
}

async function runAsyncFetch() {
  const el = document.getElementById('fetch-result2');
  el.innerHTML = '<div style="color:#8892b0;">Loading...</div>';
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/users/1');
    if (!res.ok) throw new Error('Failed');
    const user = await res.json();
    el.innerHTML = `<div style="color:#9ece6a;">&gt; ${user.name}</div><div style="color:#e0af68;">&gt; ${user.email}</div>`;
  } catch (e) {
    el.innerHTML = `<div style="color:#f7768e;">&gt; Error: ${e.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // ── Inject global search modal ──
  const modalHtml = `
  <div class="search-modal" id="search-modal">
    <div class="search-modal-box">
      <div class="search-modal-header">
        <div class="search-modal-dropdown" id="search-dropdown">
          <button class="search-modal-dropdown-btn" id="search-dropdown-btn">
            <span id="search-filter-label">All Pages</span>
            <span class="arrow">▾</span>
          </button>
          <ul class="search-modal-filter-list" id="search-filter-list"></ul>
        </div>
        <div class="search-modal-input">
          <input type="search" id="global-search" placeholder="Search across all cheatsheets..." autocomplete="off" />
        </div>
        <div class="search-modal-kbd"><kbd>Esc</kbd></div>
        <div class="search-modal-close"><button id="search-modal-close">✕</button></div>
      </div>
      <div class="search-modal-results" id="search-results"></div>
      <div class="search-modal-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>Enter</kbd> open</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const searchModal = document.getElementById('search-modal');
  const globalSearch = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');
  const searchDropdown = document.getElementById('search-dropdown');
  const searchDropdownBtn = document.getElementById('search-dropdown-btn');
  const searchFilterList = document.getElementById('search-filter-list');
  const searchFilterLabel = document.getElementById('search-filter-label');
  const searchModalClose = document.getElementById('search-modal-close');

  // Build filter list from LANGUAGES
  let activeFilter = 'all';
  searchFilterList.innerHTML = '<li><a data-filter="all" class="filter-active"><span class="fi">📚</span>All Pages</a></li>' +
    LANGUAGES.map(l => `<li><a data-filter="${l.id}"><span class="fi">${l.icon}</span>${l.id}</a></li>`).join('');

  // Open/close modal
  function openSearchModal() {
    searchModal.classList.add('active');
    globalSearch.value = '';
    searchResults.innerHTML = '';
    globalSearch.focus();
  }

  function closeSearchModal() {
    searchModal.classList.remove('active');
    searchDropdown.classList.remove('open');
  }

  // Keyboard shortcuts to open
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearchModal(); }
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !searchModal.classList.contains('active')) {
      e.preventDefault(); openSearchModal();
    }
  });

  searchModalClose.addEventListener('click', closeSearchModal);
  searchModal.addEventListener('click', e => { if (e.target === searchModal) closeSearchModal(); });

  // Dropdown toggle
  searchDropdownBtn.addEventListener('click', e => { e.stopPropagation(); searchDropdown.classList.toggle('open'); });
  document.addEventListener('click', () => searchDropdown.classList.remove('open'));
  searchDropdown.addEventListener('click', e => e.stopPropagation());

  // Filter selection
  searchFilterList.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    activeFilter = a.dataset.filter;
    searchFilterLabel.textContent = activeFilter === 'all' ? 'All Pages' : activeFilter;
    searchFilterList.querySelectorAll('a').forEach(x => x.classList.toggle('filter-active', x.dataset.filter === activeFilter));
    searchDropdown.classList.remove('open');
    doGlobalSearch(globalSearch.value);
  });

  // Build search index
  const searchIndex = [];
  LANGUAGES.forEach(lang => {
    const pageName = lang.id;
    const href = lang.href;
    searchIndex.push({ page: pageName, icon: lang.icon, href, section: 'Page', text: pageName.toLowerCase() });
  });

  document.querySelectorAll('section[id]').forEach(sec => {
    const h2 = sec.querySelector('h2');
    const title = h2 ? h2.textContent.trim() : sec.id;
    const pageEl = sec.closest('main') ? (document.querySelector('.page-header h1') || {}) : {};
    const page = pageEl.textContent || '';
    searchIndex.push({
      page,
      icon: LANGUAGES.find(l => l.id === page)?.icon || '📄',
      href: location.href.replace(/[^/]*$/, ''),
      section: title,
      id: sec.id,
      text: sec.textContent.toLowerCase().substring(0, 500)
    });
  });

  function doGlobalSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) { searchResults.innerHTML = ''; return; }

    let results = searchIndex.filter(item => {
      if (activeFilter !== 'all' && item.page !== activeFilter) return false;
      return item.text.includes(q) || item.section.toLowerCase().includes(q) || item.page.toLowerCase().includes(q);
    });

    // Deduplicate by page+section
    const seen = new Set();
    results = results.filter(r => {
      const key = r.page + '|' + r.section;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 15);

    if (!results.length) {
      searchResults.innerHTML = '<div class="search-modal-empty">No results for "' + escHtml(query) + '"</div>';
      return;
    }

    searchResults.innerHTML = results.map((r, i) => {
      const href = r.id ? r.href + '#' + r.id : (LANGUAGES.find(l => l.id === r.page)?.href || '#');
      const snippet = r.text.substring(0, 120).replace(new RegExp('(' + escRegex(q) + ')', 'gi'), '<mark style="background:var(--highlight-bg);padding:0 2px;border-radius:2px;">$1</mark>');
      return `<a href="${href}" class="search-result-item${i === 0 ? ' result-active' : ''}" data-idx="${i}">
        <span class="search-result-icon">${r.icon}</span>
        <div class="search-result-info">
          <div class="search-result-title">${escHtml(r.section)}</div>
          <div class="search-result-section">${escHtml(r.page)} — ${snippet}...</div>
        </div>
        <span class="search-result-badge">${escHtml(r.page)}</span>
      </a>`;
    }).join('');
  }

  let resultIdx = 0;
  globalSearch.addEventListener('input', () => { doGlobalSearch(globalSearch.value); resultIdx = 0; });

  globalSearch.addEventListener('keydown', e => {
    const items = searchResults.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); resultIdx = Math.min(resultIdx + 1, items.length - 1); updateActive(items); }
    if (e.key === 'ArrowUp') { e.preventDefault(); resultIdx = Math.max(resultIdx - 1, 0); updateActive(items); }
    if (e.key === 'Enter') { e.preventDefault(); if (items[resultIdx]) items[resultIdx].click(); }
  });

  function updateActive(items) {
    items.forEach((el, i) => el.classList.toggle('result-active', i === resultIdx));
    items[resultIdx]?.scrollIntoView({ block: 'nearest' });
  }

  function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  const search = document.getElementById('search');
  const sidebarSearch = document.getElementById('sidebar-search');
  const sections = document.querySelectorAll('section[id]');
  const themeBtn = document.getElementById('theme-btn');

  function setTheme(dark) {
    document.body.classList.toggle('dark-theme', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    if (themeBtn) themeBtn.textContent = dark ? '☀️' : '🌙';
  }

  setTheme(localStorage.getItem('theme') === 'dark');

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      setTheme(!document.body.classList.contains('dark-theme'));
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      search.focus();
    }
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      search.focus();
    }
    if (e.key === 'Escape' && document.activeElement === search) {
      search.blur();
      search.value = '';
      filterSections('');
    }
  });

  if (sidebarSearch) {
    sidebarSearch.addEventListener('focus', e => {
      e.preventDefault();
      sidebarSearch.blur();
      openSearchModal();
    });
    sidebarSearch.addEventListener('click', e => {
      e.preventDefault();
      sidebarSearch.blur();
      openSearchModal();
    });
  }

  search.addEventListener('input', () => { filterSections(search.value); currentMatch = -1; });

  let currentMatch = -1;

  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const visible = Array.from(sections).filter(s => !s.classList.contains('section-hidden'));
      if (!visible.length) return;
      if (e.shiftKey) {
        currentMatch = (currentMatch - 1 + visible.length) % visible.length;
      } else {
        currentMatch = (currentMatch + 1) % visible.length;
      }
      visible[currentMatch].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  function filterSections(query) {
    const q = query.toLowerCase().trim();
    sections.forEach(section => {
      if (!q) {
        section.classList.remove('section-hidden');
        return;
      }
      const text = section.textContent.toLowerCase();
      section.classList.toggle('section-hidden', !text.includes(q));
    });
    document.querySelectorAll('.cheat-block .code-panel pre').forEach(pre => {
      if (!pre.dataset.origHtml) pre.dataset.origHtml = pre.innerHTML;
      pre.innerHTML = pre.dataset.origHtml;
    });
    if (q) {
      document.querySelectorAll('.cheat-block .code-panel pre').forEach(pre => {
        const idx = pre.textContent.toLowerCase().indexOf(q);
        if (idx === -1) return;
        walkTextNodes(pre, node => {
          const text = node.textContent;
          const i = text.toLowerCase().indexOf(q);
          if (i === -1) return false;
          const before = document.createTextNode(text.slice(0, i));
          const mark = document.createElement('span');
          mark.className = 'highlight';
          mark.textContent = text.slice(i, i + q.length);
          const after = document.createTextNode(text.slice(i + q.length));
          node.parentNode.replaceChild(after, node);
          node.parentNode.insertBefore(mark, after);
          node.parentNode.insertBefore(before, mark);
          return true;
        });
      });
    }
  }

  function walkTextNodes(root, fn) {
    const iter = document.createNodeIterator(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = iter.nextNode())) {
      if (fn(node)) break;
    }
  }

  // Mobile sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const showBtn = document.getElementById('sidebar-show-btn');

  if (sidebar) {
    // Restore sidebar state
    const savedHidden = localStorage.getItem('sidebar-hidden');
    if (savedHidden === 'true' && window.innerWidth > 768) {
      sidebar.classList.add('hidden');
    }

    // Hide sidebar
    const hideBtn = document.getElementById('sidebar-hide-btn');
    if (hideBtn) {
      hideBtn.addEventListener('click', () => {
        sidebar.classList.add('hidden');
        localStorage.setItem('sidebar-hidden', 'true');
      });
    }

    // Show sidebar
    if (showBtn) {
      showBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        localStorage.setItem('sidebar-hidden', 'false');
      });
    }
  }

  if (sidebarToggle && sidebar && overlay) {
    function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('active'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    overlay.addEventListener('click', closeSidebar);
  }

  // ── Copy code button ──
  document.querySelectorAll('.code-panel pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      const code = pre.textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
      });
    });
    pre.parentElement.style.position = 'relative';
    pre.parentElement.appendChild(btn);
  });

  // ── Back to top ──
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.innerHTML = '↑';
  backToTop.title = 'Back to top';
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Active TOC highlight on scroll ──
  const tocLinks = document.querySelectorAll('.toc a');
  const sectionEls = document.querySelectorAll('section[id]');

  function highlightToc() {
    let current = '';
    sectionEls.forEach(section => {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) current = section.id;
    });
    tocLinks.forEach(link => {
      link.classList.toggle('toc-active', link.getAttribute('href') === '#' + current);
    });
  }

  window.addEventListener('scroll', highlightToc, { passive: true });
  highlightToc();

  // ── Scroll progress bar ──
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }, { passive: true });

  // ── Collapsible sections ──
  document.querySelectorAll('section[id] > h2').forEach(h2 => {
    h2.style.cursor = 'pointer';
    h2.addEventListener('click', () => {
      const section = h2.parentElement;
      section.classList.toggle('collapsed');
    });
  });

  // ── Keyboard shortcuts help ──
  const kbHelp = document.createElement('div');
  kbHelp.className = 'kb-help';
  kbHelp.innerHTML = '<kbd>/</kbd> search &nbsp; <kbd>j</kbd><kbd>k</kbd> navigate &nbsp; <kbd>⌘</kbd><kbd>K</kbd> focus &nbsp; <kbd>Esc</kbd> clear';
  document.body.appendChild(kbHelp);

  // ── Notes panel (fetch markdown from GitHub) ──
  const notesOverlay = document.getElementById('notes-overlay');
  const notesPanel = document.getElementById('notes-panel');
  const notesBody = document.getElementById('notes-panel-body');
  const notesClose = document.getElementById('notes-panel-close');
  const notesTitle = document.getElementById('notes-panel-title');

  if (notesOverlay && notesPanel && notesBody && notesClose) {
    function openNotes(id) {
      const url = SOURCE_MAP[id];
      if (!url) return;
      notesOverlay.classList.add('active');
      notesPanel.classList.add('open');
      notesTitle.textContent = id + ' — Source Notes';
      notesBody.innerHTML = '<div class="notes-loading"><div class="notes-spinner"></div>Fetching from GitHub...</div>';

      let rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/tree/main/', '/refs/heads/main/');
      if (!rawUrl.endsWith('.md')) rawUrl += '/README.md';

      const cacheKey = 'notes_' + id;
      const cacheTime = localStorage.getItem(cacheKey + '_time');
      const now = Date.now();

      if (localStorage.getItem(cacheKey) && cacheTime && (now - parseInt(cacheTime)) < 86400000) {
        notesBody.innerHTML = renderMd(localStorage.getItem(cacheKey));
        return;
      }

      fetch(rawUrl).then(r => { if (!r.ok) throw new Error('Not found'); return r.text(); })
        .then(md => {
          localStorage.setItem(cacheKey, md);
          localStorage.setItem(cacheKey + '_time', now.toString());
          notesBody.innerHTML = renderMd(md);
        })
        .catch(() => {
          notesBody.innerHTML = '<div class="notes-loading" style="color:var(--text-subtle);">Could not fetch notes. <a href="' + url + '" target="_blank" style="color:var(--accent);margin-left:0.3rem;">Open on GitHub →</a></div>';
        });
    }

    function closeNotes() { notesOverlay.classList.remove('active'); notesPanel.classList.remove('open'); }

    document.addEventListener('click', e => { const btn = e.target.closest('.notes-toggle'); if (btn) openNotes(btn.dataset.id); });
    notesClose.addEventListener('click', closeNotes);
    notesOverlay.addEventListener('click', closeNotes);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNotes(); });
  }

  function renderMd(md) {
    let h = md
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, l, c) => `<pre><code>${esc(c.trim())}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/^\|(.+)\|$/gm, (m, c) => {
        const cells = c.split('|').map(x => x.trim());
        if (cells.every(x => /^[\-:]+$/.test(x))) return '';
        return '<tr>' + cells.map(x => `<td>${x.replace(/\*\*/g, '')}</td>`).join('') + '</tr>';
      })
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent);">$1</a>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
    h = h.replace(/(<li>[\s\S]*?<\/li>)/g, m => m.startsWith('<ul>') ? m : '<ul>' + m + '</ul>');
    h = h.replace(/(<tr>[\s\S]*?<\/tr>)/g, m => '<table>' + m + '</table>');
    return '<p>' + h + '</p>';
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', e => {
    // j/k to navigate sections
    if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      const visible = Array.from(sectionEls).filter(s => !s.classList.contains('section-hidden'));
      const currentIdx = visible.findIndex(s => {
        const rect = s.getBoundingClientRect();
        return rect.top >= -100 && rect.top < 200;
      });

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        const next = visible[Math.min(currentIdx + 1, visible.length - 1)];
        if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        const prev = visible[Math.max(currentIdx - 1, 0)];
        if (prev) prev.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});
