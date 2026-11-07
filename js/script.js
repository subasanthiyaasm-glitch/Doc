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
          <span class="smi-icon">${svgIcon('search')}</span>
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
  searchFilterList.innerHTML = '<li><a data-filter="all" class="filter-active"><span class="fi">' + svgIcon('layers') + '</span>All Pages</a></li>' +
    LANGUAGES.map(l => `<li><a data-filter="${l.id}"><span class="fi">${svgIcon(l.icon)}</span>${l.id}</a></li>`).join('');

  // Open/close modal
  function openSearchModal() {
    searchModal.classList.add('active');
    globalSearch.value = '';
    searchResults.innerHTML = '';
    globalSearch.focus();
    if (typeof startPrefetch === 'function') startPrefetch(); // ensure the whole site is indexed
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

  // ── Cross-page search engine ──────────────────────────────
  // The current page is indexed instantly; every other cheatsheet is fetched,
  // parsed and cached in the background so one box searches the whole site.
  function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  const INDEX_VERSION = 'v3';
  const PAGE_BY_ID = {};
  LANGUAGES.forEach(l => { PAGE_BY_ID[l.id] = l; });
  const BASE = location.href.replace(/[^/]*$/, '');
  const currentPage = (document.querySelector('.page-header h1')?.textContent || '').trim();

  let searchIndex = [];
  const indexedPages = new Set();

  function indexDoc(doc, page, href) {
    if (!page || indexedPages.has(page)) return;
    indexedPages.add(page);
    const icon = PAGE_BY_ID[page]?.icon || '📄';
    searchIndex.push({ page, icon, href, id: '', section: page + ' cheatsheet',
      title: page, text: (page + ' cheatsheet quick reference').toLowerCase() });
    doc.querySelectorAll('section[id]').forEach(sec => {
      const h2 = sec.querySelector('h2');
      const title = (h2 ? h2.textContent : sec.id).replace(/[▾▸]/g, '').trim();
      searchIndex.push({
        page, icon, href, id: sec.id, section: title, title,
        text: sec.textContent.replace(/\s+/g, ' ').toLowerCase().slice(0, 600)
      });
    });
  }

  // Index the page we are on right now.
  indexDoc(document, currentPage || (LANGUAGES[0] && LANGUAGES[0].id),
           BASE + (PAGE_BY_ID[currentPage]?.href || location.pathname.split('/').pop()));

  function persistIndex() {
    try { localStorage.setItem('searchIndex_' + INDEX_VERSION,
      JSON.stringify({ pages: [...indexedPages], items: searchIndex })); } catch (e) {}
  }

  function prefetchAll() {
    try {
      const cached = JSON.parse(localStorage.getItem('searchIndex_' + INDEX_VERSION) || 'null');
      if (cached && Array.isArray(cached.items)) {
        cached.items.forEach(it => { if (!indexedPages.has(it.page)) searchIndex.push(it); });
        (cached.pages || []).forEach(p => indexedPages.add(p));
      }
    } catch (e) {}
    const queue = LANGUAGES.filter(l => !indexedPages.has(l.id));
    let i = 0;
    (function next() {
      if (i >= queue.length) { persistIndex(); return; }
      const l = queue[i++];
      fetch(BASE + l.href)
        .then(r => r.ok ? r.text() : Promise.reject())
        .then(html => {
          indexDoc(new DOMParser().parseFromString(html, 'text/html'), l.id, BASE + l.href);
          if (searchModal.classList.contains('active') && globalSearch.value.trim()) doGlobalSearch(globalSearch.value);
        })
        .catch(() => {})
        .then(() => setTimeout(next, 25));
    })();
  }
  let prefetchStarted = false;
  function startPrefetch() { if (prefetchStarted) return; prefetchStarted = true; prefetchAll(); }
  if ('requestIdleCallback' in window) requestIdleCallback(startPrefetch, { timeout: 1200 });
  setTimeout(startPrefetch, 500); // reliable fallback when idle callbacks are throttled

  function scoreItem(item, terms) {
    const t = item.title.toLowerCase(), sec = item.section.toLowerCase(), pg = item.page.toLowerCase(), body = item.text;
    let score = 0;
    for (const term of terms) {
      if (!(t.includes(term) || sec.includes(term) || pg.includes(term) || body.includes(term))) return -1; // all terms must match
      if (pg === term) score += 12;
      if (t.startsWith(term)) score += 8;
      if (t.includes(term)) score += 5;
      if (sec.includes(term)) score += 3;
      if (pg.includes(term)) score += 2;
      if (body.includes(term)) score += 1;
    }
    if (item.page === currentPage) score += 1.5; // gentle bias to the open page
    return score;
  }

  function doGlobalSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) { searchResults.innerHTML = ''; return; }
    const terms = q.split(/\s+/).filter(Boolean);

    let results = searchIndex
      .filter(item => activeFilter === 'all' || item.page === activeFilter)
      .map(item => ({ item, s: scoreItem(item, terms) }))
      .filter(x => x.s >= 0)
      .sort((a, b) => b.s - a.s);

    const seen = new Set();
    results = results.filter(({ item }) => {
      const k = item.page + '|' + item.section;
      if (seen.has(k)) return false; seen.add(k); return true;
    }).slice(0, 20);

    if (!results.length) {
      const stillIndexing = indexedPages.size < LANGUAGES.length
        ? ' <span style="opacity:.55">(still indexing other pages…)</span>' : '';
      searchResults.innerHTML = '<div class="search-modal-empty">No results for "' + escHtml(query) + '"' + stillIndexing + '</div>';
      return;
    }

    const rx = new RegExp('(' + terms.map(escRegex).join('|') + ')', 'gi');
    const hl = s => escHtml(s).replace(rx, '<mark style="background:var(--highlight-bg);padding:0 2px;border-radius:2px;">$1</mark>');

    searchResults.innerHTML = results.map(({ item }, i) => {
      const href = item.id ? item.href + '#' + item.id : item.href;
      let body = item.text;
      const pos = body.search(rx);
      if (pos > 40) body = '…' + body.slice(pos - 28);
      return `<a href="${href}" class="search-result-item${i === 0 ? ' result-active' : ''}" data-idx="${i}" style="animation-delay:${Math.min(i * 22, 260)}ms">
        <span class="search-result-icon">${svgIcon(item.icon)}</span>
        <div class="search-result-info">
          <div class="search-result-title">${hl(item.section)}</div>
          <div class="search-result-section">${escHtml(item.page)} — ${hl(body.slice(0, 120))}…</div>
        </div>
        <span class="search-result-badge">${escHtml(item.page)}</span>
      </a>`;
    }).join('');
    resultIdx = 0;
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

  const search = document.getElementById('search');
  if (search && search.parentElement && !search.parentElement.querySelector('.search-ico')) {
    const si = document.createElement('span');
    si.className = 'search-ico';
    si.innerHTML = svgIcon('search');
    search.parentElement.insertBefore(si, search);
  }
  // The sidebar search box is a trigger that opens the full command palette.
  if (search) {
    search.setAttribute('readonly', '');
    search.setAttribute('placeholder', 'Search cheatsheets…');
    search.classList.add('search-trigger');
    const openFromSidebar = (e) => { e.preventDefault(); search.blur(); openSearchModal(); };
    search.addEventListener('focus', openFromSidebar);
    search.addEventListener('click', openFromSidebar);
  }
  const sidebarSearch = document.getElementById('sidebar-search');
  const sections = document.querySelectorAll('section[id]');
  const themeBtn = document.getElementById('theme-btn');

  function setTheme(dark) {
    document.body.classList.toggle('dark-theme', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    if (themeBtn) themeBtn.innerHTML = dark ? svgIcon('sun') : svgIcon('moon');
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

  // `/` and Cmd/Ctrl+K open the command palette (handled above); here we only
  // let Escape clear the inline sidebar filter.
  document.addEventListener('keydown', e => {
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

  // ── Guided tour: spotlight each section with an explanation card ──
  (function setupTour() {
    const reduceMo = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const secs = [...document.querySelectorAll('main section[id]')];
    if (!secs.length) return;

    const fab = document.createElement('button');
    fab.className = 'tour-fab';
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M10 8.5 15.5 12 10 15.5 Z" fill="currentColor" stroke="none"></path></svg><span>Guided tour</span>';
    document.body.appendChild(fab);

    const overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.innerHTML = '<div class="tour-spot"></div><div class="tour-card"></div>';
    document.body.appendChild(overlay);
    const spot = overlay.querySelector('.tour-spot');
    const card = overlay.querySelector('.tour-card');
    let i = 0;

    function titleOf(sec) { const h = sec.querySelector('h2'); return (h ? h.textContent : sec.id).replace(/[▾▸]/g, '').trim(); }
    function blurbOf(sec) {
      const d = sec.querySelector('.block-desc span');
      const t = d && d.textContent.trim();
      return t || 'Browse the examples in this section — the code is on the left and a live preview on the right.';
    }

    function place() {
      const sec = secs[i];
      sec.scrollIntoView({ behavior: reduceMo() ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => {
        const r = sec.getBoundingClientRect();
        const pad = 8;
        const top = Math.max(8, r.top - pad);
        const h = Math.min(window.innerHeight - 16, r.height + pad * 2);
        spot.style.left = Math.max(4, r.left - pad) + 'px';
        spot.style.top = top + 'px';
        spot.style.width = (r.width + pad * 2) + 'px';
        spot.style.height = h + 'px';
        const cardW = Math.min(340, window.innerWidth * 0.86);
        const belowOk = top + h + 14 < window.innerHeight - 170;
        card.style.top = (belowOk ? top + h + 14 : Math.max(12, top - 180)) + 'px';
        card.style.left = Math.min(window.innerWidth - cardW - 12, Math.max(12, r.left)) + 'px';
        card.innerHTML =
          '<div class="tc-step">Step ' + (i + 1) + ' of ' + secs.length + '</div>'
          + '<h4>' + escHtml(titleOf(sec)) + '</h4>'
          + '<p>' + escHtml(blurbOf(sec)) + '</p>'
          + '<div class="tc-progress">' + secs.map((_, n) => '<span class="tc-dot' + (n === i ? ' on' : '') + '"></span>').join('') + '</div>'
          + '<div class="tc-controls">'
          + '<button class="tc-prev"' + (i === 0 ? ' disabled' : '') + '>Back</button>'
          + '<button class="tc-next">' + (i === secs.length - 1 ? 'Finish' : 'Next →') + '</button>'
          + '<button class="tc-end">Skip</button></div>';
        card.querySelector('.tc-next').onclick = () => { if (i >= secs.length - 1) end(); else { i++; place(); } };
        card.querySelector('.tc-prev').onclick = () => { if (i > 0) { i--; place(); } };
        card.querySelector('.tc-end').onclick = end;
      }, reduceMo() ? 0 : 380);
    }
    function start() { i = 0; overlay.classList.add('active'); place(); }
    function end() { overlay.classList.remove('active'); }

    fab.addEventListener('click', start);
    overlay.addEventListener('click', e => { if (e.target === overlay) end(); });
    document.addEventListener('keydown', e => {
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape') end();
      else if (e.key === 'ArrowRight') { if (i < secs.length - 1) { i++; place(); } else end(); }
      else if (e.key === 'ArrowLeft') { if (i > 0) { i--; place(); } }
    });
    window.addEventListener('resize', () => { if (overlay.classList.contains('active')) place(); });
  })();

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
