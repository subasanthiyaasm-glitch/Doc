// ═══════════════════════════════════════════════════════════════
//  script.js  —  Shared runtime for every cheatsheet page
//
//  FEATURES (all reusable, no globals leaked):
//    • Trie-based cross-page search modal (Cmd+K / /)
//    • In-page section filter + text highlight (sidebar input)
//    • Light / dark theme with localStorage persistence
//    • Sidebar show/hide + mobile overlay
//    • Copy-code button on every code-panel
//    • Scroll progress bar
//    • Back-to-top button
//    • Active TOC highlight (IntersectionObserver)
//    • Collapsible sections (click h2)
//    • Notes side-panel (GitHub markdown fetch + cache)
//    • j/k keyboard section navigation
//    • JS fetch demo helpers (runFetch, runAsyncFetch)
// ═══════════════════════════════════════════════════════════════

/* ───────────────────────────────────────────────────
   DEMO HELPERS  (referenced from inline onclick="")
   --------------------------------------------------- */
async function runFetch() {
  const el = document.getElementById('fetch-result');
  if (!el) return;
  el.innerHTML = '<span class="demo-loading">Loading…</span>';
  try {
    const res  = await fetch('https://jsonplaceholder.typicode.com/todos/1');
    const data = await res.json();
    el.innerHTML =
      `<span class="demo-ok">&gt; Title: ${data.title}</span>\n` +
      `<span class="demo-warn">&gt; Completed: ${data.completed}</span>`;
  } catch (e) {
    el.innerHTML = `<span class="demo-err">&gt; Error: ${e.message}</span>`;
  }
}

async function runAsyncFetch() {
  const el = document.getElementById('fetch-result2');
  if (!el) return;
  el.innerHTML = '<span class="demo-loading">Loading…</span>';
  try {
    const res  = await fetch('https://jsonplaceholder.typicode.com/users/1');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const user = await res.json();
    el.innerHTML =
      `<span class="demo-ok">&gt; ${user.name}</span>\n` +
      `<span class="demo-warn">&gt; ${user.email}</span>`;
  } catch (e) {
    el.innerHTML = `<span class="demo-err">&gt; Error: ${e.message}</span>`;
  }
}

/* ───────────────────────────────────────────────────
   UTILITY HELPERS
   --------------------------------------------------- */
/** Escape HTML entities */
const escHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
/** Escape RegExp special chars */
const escRe   = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Debounce: delay fn execution until ms after last call */
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ───────────────────────────────────────────────────
   TRIE-BASED SEARCH INDEX
   Gives O(prefix-length) lookups instead of O(n*m) scan
   --------------------------------------------------- */
class TrieNode {
  constructor() { this.children = {}; this.refs = []; }
}

class SearchTrie {
  constructor() { this.root = new TrieNode(); }

  /** Insert a search record keyed by every word token in `text` */
  insert(tokens, record) {
    for (const token of tokens) {
      let node = this.root;
      for (const ch of token) {
        if (!node.children[ch]) node.children[ch] = new TrieNode();
        node = node.children[ch];
        if (!node.refs.includes(record)) node.refs.push(record);
      }
    }
  }

  /** Return all records whose tokens start with `prefix` */
  search(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }
    return node.refs;
  }
}

/* ───────────────────────────────────────────────────
   MINIMAL MARKDOWN RENDERER  (for notes panel)
   --------------------------------------------------- */
function renderMd(md) {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let h = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, l, c) =>
      `<pre><code class="lang-${l}">${esc(c.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^#{6}\s+(.+)$/gm,'<h6>$1</h6>')
    .replace(/^#{5}\s+(.+)$/gm,'<h5>$1</h5>')
    .replace(/^#{4}\s+(.+)$/gm,'<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm,'<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm,'<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^>\s+(.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^[\-\*]\s+(.+)$/gm,'<li>$1</li>')
    .replace(/^\|(.+)\|$/gm,(m,c)=>{
      const cells=c.split('|').map(x=>x.trim());
      if(cells.every(x=>/^[\-:]+$/.test(x))) return '';
      return '<tr>'+cells.map(x=>`<td>${x}</td>`).join('')+'</tr>';
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent)">$1</a>')
    .replace(/\n{2,}/g,'</p><p>')
    .replace(/\n/g,'<br>');
  h = h.replace(/(<li>[\s\S]*?<\/li>)+/g, m => '<ul>'+m+'</ul>');
  h = h.replace(/(<tr>[\s\S]*?<\/tr>)+/g, m => '<table>'+m+'</table>');
  return '<p>'+h+'</p>';
}

/* ───────────────────────────────────────────────────
   MAIN  —  runs after DOM ready
   --------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {

  // ── 1. THEME ──────────────────────────────────────────────
  const themeBtn = document.getElementById('theme-btn');
  const applyTheme = dark => {
    document.body.classList.toggle('dark-theme', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    if (themeBtn) themeBtn.innerHTML = dark ? svgIcon('sun') : svgIcon('moon');
  };
  applyTheme(localStorage.getItem('theme') === 'dark');
  themeBtn?.addEventListener('click', () =>
    applyTheme(!document.body.classList.contains('dark-theme')));

  // ── 2. SIDEBAR SHOW / HIDE ──────────────────────────────
  const sidebar      = document.getElementById('sidebar');
  const overlay      = document.getElementById('sidebar-overlay');
  const sidebarToggle= document.getElementById('sidebar-toggle');
  const hideBtn      = document.getElementById('sidebar-hide-btn');
  const showBtn      = document.getElementById('sidebar-show-btn');

  if (sidebar) {
    if (localStorage.getItem('sidebar-hidden') === 'true' && window.innerWidth > 768)
      sidebar.classList.add('hidden');

    hideBtn?.addEventListener('click', () => {
      sidebar.classList.add('hidden');
      localStorage.setItem('sidebar-hidden','true');
    });
    showBtn?.addEventListener('click', () => {
      sidebar.classList.remove('hidden');
      localStorage.setItem('sidebar-hidden','false');
    });
  }
  if (sidebarToggle && sidebar && overlay) {
    const openSb  = () => { sidebar.classList.add('open');    overlay.classList.add('active');    };
    const closeSb = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); };
    sidebarToggle.addEventListener('click', () =>
      sidebar.classList.contains('open') ? closeSb() : openSb());
    overlay.addEventListener('click', closeSb);
  }

  // ── 3. BUILD SEARCH INDEX (Trie) ──────────────────────────
  let trie, allDocs; // rebuilt on every (SPA) page change
  function buildIndex() {
  trie    = new SearchTrie();
  allDocs = []; // flat array of all indexable records

  // Index each language entry as a navigable page doc
  LANGUAGES.forEach(lang => {
    const rec = {
      type:    'page',
      page:    lang.id,
      icon:    lang.icon,
      href:    lang.href,
      section: lang.id,
      snippet: lang.tags.join(' '),
      tags:    lang.tags,
    };
    allDocs.push(rec);
    const tokens = [lang.id.toLowerCase(), ...lang.tags];
    trie.insert(tokens, rec);
  });

  // Index sections on the current page
  const currentPageName = document.querySelector('.page-header h1')?.textContent?.trim() || '';
  const currentPageIcon = LANGUAGES.find(l => l.id === currentPageName)?.icon || 'doc';
  const currentHrefBase = location.pathname.replace(/[^/]*$/, '');

  document.querySelectorAll('section[id]').forEach(sec => {
    const h2      = sec.querySelector('h2');
    const title   = h2 ? h2.textContent.trim().replace(/\s*[▾▸]$/, '') : sec.id;
    // Grab visible text, skip style/script, limit to 300 chars
    const rawText = [...sec.querySelectorAll(':not(style):not(script)')]
      .map(el => el.textContent).join(' ')
      .replace(/\s+/g, ' ').trim().slice(0, 300).toLowerCase();
    const rec = {
      type:    'section',
      page:    currentPageName,
      icon:    currentPageIcon,
      href:    currentHrefBase,
      section: title,
      id:      sec.id,
      snippet: rawText,
    };
    allDocs.push(rec);
    const tokens = [...title.toLowerCase().split(/\W+/), ...rawText.split(/\W+/)]
      .filter(t => t.length > 1);
    trie.insert(tokens, rec);
  });
  } // end buildIndex

  /** Run a trie-backed query, applying optional page filter */
  function trieSearch(query, filter = 'all') {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // Collect candidates from every token in the query
    const words    = q.split(/\W+/).filter(w => w.length > 1);
    const queryWords = words.length ? words : [q];
    let candidates  = [];
    for (const w of queryWords) {
      const hits = trie.search(w);
      candidates = candidates.concat(hits);
    }

    // Also do substring fallback for short queries
    if (q.length >= 2) {
      allDocs.forEach(r => {
        const haystack = (r.page + ' ' + r.section + ' ' + (r.snippet||'')).toLowerCase();
        if (haystack.includes(q) && !candidates.includes(r)) candidates.push(r);
      });
    }

    // Filter by active page dropdown
    if (filter !== 'all') candidates = candidates.filter(r => r.page === filter);

    // Score: exact section title match > page match > snippet match
    candidates = candidates.map(r => {
      const sectionMatch = r.section.toLowerCase().includes(q);
      const pageMatch    = r.page.toLowerCase().includes(q);
      const score = sectionMatch ? 3 : pageMatch ? 2 : 1;
      return { r, score };
    });
    candidates.sort((a,b) => b.score - a.score);

    // Deduplicate by page+section and cap at 20 results
    const seen = new Set();
    return candidates
      .map(c => c.r)
      .filter(r => {
        const key = r.page + '|' + r.section;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      })
      .slice(0, 20);
  }


  // ── 4. GLOBAL SEARCH  (Spotlight-style) ────────────────────────
  // ── Search history helpers ───────────────────────────────────
  const HISTORY_KEY  = 'srch_history';
  const getHistory   = () => JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
  const addHistory   = q => {
    if (!q || q.length < 2) return;
    const h = [q, ...getHistory().filter(x=>x!==q)].slice(0,8);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  };
  const clearHistory = () => localStorage.removeItem(HISTORY_KEY);

  // ── Inject HTML ───────────────────────────────────────────────────
  document.body.insertAdjacentHTML('beforeend', `
  <div class="sl-backdrop" id="search-modal" role="dialog" aria-label="Search" aria-modal="true">
    <div class="sl-box">
      <div class="sl-input-row">
        <svg class="sl-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" stroke-width="1.6"/>
          <path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <input id="global-search" type="search"
          placeholder="Search anything… try flexbox, git merge, async"
          autocomplete="off" spellcheck="false" aria-label="Search cheatsheets" />
        <kbd class="sl-esc-key">Esc</kbd>
      </div>
      <div class="sl-filters" id="sl-filters" role="listbox" aria-label="Filter by page"></div>
      <div class="sl-results" id="search-results" role="listbox" aria-label="Search results"></div>
      <div class="sl-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> open</span>
        <span><kbd>Esc</kbd> close</span>
        <span class="sl-footer-right"><kbd>⌘</kbd><kbd>K</kbd> anywhere</span>
      </div>
    </div>
  </div>
  <div class="notes-overlay" id="notes-overlay"></div>
  <aside class="notes-panel" id="notes-panel" role="complementary" aria-label="Notes panel">
    <div class="notes-panel-header">
      <h3 id="notes-panel-title">Notes</h3>
      <button class="notes-panel-close" id="notes-panel-close" aria-label="Close notes">×</button>
    </div>
    <div class="notes-panel-body" id="notes-panel-body"></div>
  </aside>`);

  const searchModal   = document.getElementById('search-modal');
  const globalSearch  = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');
  const slFilters     = document.getElementById('sl-filters');

  // ── Build filter pills ─────────────────────────────────────────────
  let activeFilter = 'all';

  slFilters.innerHTML =
    `<button class="sl-pill sl-pill-active" data-filter="all" role="option" aria-selected="true">
      <span aria-hidden="true">${svgIcon('layers')}</span>All
    </button>` +
    LANGUAGES.map(l =>
      `<button class="sl-pill" data-filter="${l.id}" role="option" aria-selected="false">
        <span aria-hidden="true">${svgIcon(l.icon)}</span>${l.id}
      </button>`
    ).join('');

  slFilters.addEventListener('click', e => {
    const btn = e.target.closest('.sl-pill');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    slFilters.querySelectorAll('.sl-pill').forEach(b => {
      const sel = b.dataset.filter === activeFilter;
      b.classList.toggle('sl-pill-active', sel);
      b.setAttribute('aria-selected', sel);
    });
    renderSearchResults(globalSearch.value);
  });

  // ── Open / close ──────────────────────────────────────────────────
  let resultIdx = 0;

  const openSearch = () => {
    searchModal.classList.add('active');
    globalSearch.value = '';
    resultIdx = 0;
    renderEmpty();
    globalSearch.focus();
  };
  const closeSearch = () => {
    searchModal.classList.remove('active');
  };

  document.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); openSearch(); }
    if (e.key==='/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)
        && !searchModal.classList.contains('active')) { e.preventDefault(); openSearch(); }
  });
  searchModal.addEventListener('click', e => { if (e.target===searchModal) closeSearch(); });

  // ── Empty state: history + quick access ─────────────────────────
  function renderEmpty() {
    const hist = getHistory();
    let html = '';

    if (hist.length) {
      html += `<div class="sl-group">
        Recent
        <button class="sl-clear" id="sl-clear-hist">Clear</button>
      </div>`;
      html += hist.map((q, i) =>
        `<button class="sl-result sl-hist${i===0?' sl-active':''}" data-hist="${escHtml(q)}" data-idx="${i}" role="option" aria-selected="${i===0}">
          <span class="sl-ri">🕘</span>
          <span class="sl-rt">${escHtml(q)}</span>
          <span class="sl-rtype">history</span>
        </button>`
      ).join('');
    }

    html += `<div class="sl-group">Quick Access</div>`;
    html += LANGUAGES.slice(0,10).map((l, i) => {
      const idx = hist.length + i;
      const act = !hist.length && i===0 ? ' sl-active' : '';
      return `<a href="${l.href}" class="sl-result${act}" data-idx="${idx}" role="option" aria-selected="${!hist.length&&i===0}">
        <span class="sl-ri">${svgIcon(l.icon)}</span>
        <div class="sl-rb">
          <span class="sl-rt">${l.id}</span>
        </div>
        <span class="sl-rtype">page</span>
      </a>`;
    }).join('');

    searchResults.innerHTML = html;
    resultIdx = 0;
    document.getElementById('sl-clear-hist')?.addEventListener('click', e => {
      e.stopPropagation(); clearHistory(); renderEmpty();
    });
    searchResults.querySelectorAll('.sl-hist').forEach(btn => {
      btn.addEventListener('click', () => {
        globalSearch.value = btn.dataset.hist;
        renderSearchResults(btn.dataset.hist);
        globalSearch.focus();
      });
    });
  }

  // ── Get href for a result ─────────────────────────────────────────
  function getHref(r) {
    const pagePath = LANGUAGES.find(l=>l.id===r.page)?.href || '#';
    if (r.type==='section') {
      return location.pathname.endsWith(pagePath) ? '#'+r.id : pagePath+'#'+r.id;
    }
    return pagePath;
  }

  // ── Render search results ────────────────────────────────────────
  function renderSearchResults(query) {
    const q = query.trim();
    if (!q) { renderEmpty(); return; }

    const results = trieSearch(q, activeFilter);
    if (!results.length) {
      searchResults.innerHTML =
        `<div class="sl-empty">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M16.5 16.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          No results for <strong>&ldquo;${escHtml(q)}&rdquo;</strong>
          <span>Try a shorter term or check spelling</span>
        </div>`;
      return;
    }

    const re  = new RegExp('('+escRe(q)+')', 'gi');
    const hl  = s => s.replace(re, '<mark>$1</mark>');
    const pages    = results.filter(r=>r.type==='page');
    const sections = results.filter(r=>r.type==='section');
    let html = ''; let gi = 0;

    if (pages.length) {
      html += `<div class="sl-group">Pages</div>`;
      html += pages.map(r => {
        const i=gi++; const act=i===0?' sl-active':'';
        return `<a href="${getHref(r)}" class="sl-result${act}" data-idx="${i}" role="option" aria-selected="${i===0}">
          <span class="sl-ri">${svgIcon(r.icon)}</span>
          <div class="sl-rb"><span class="sl-rt">${hl(escHtml(r.section))}</span></div>
          <span class="sl-rtype">page</span>
        </a>`;
      }).join('');
    }

    if (sections.length) {
      html += `<div class="sl-group">Sections</div>`;
      html += sections.map(r => {
        const i=gi++; const act=(i===0&&!pages.length)?' sl-active':'';
        const snip = hl((r.snippet||'').slice(0,90));
        return `<a href="${getHref(r)}" class="sl-result${act}" data-idx="${i}" role="option" aria-selected="${i===0&&!pages.length}">
          <span class="sl-ri">${svgIcon(r.icon)}</span>
          <div class="sl-rb">
            <span class="sl-rt">${hl(escHtml(r.section))}</span>
            <span class="sl-rs">${escHtml(r.page)} &middot; ${snip}…</span>
          </div>
          <span class="sl-rtype">section</span>
        </a>`;
      }).join('');
    }

    searchResults.innerHTML = html;
    resultIdx = 0;
  }

  // ── Keyboard nav ─────────────────────────────────────────────────
  const debouncedSearch = debounce(renderSearchResults, 100);
  globalSearch.addEventListener('input', () => { debouncedSearch(globalSearch.value); resultIdx=0; });

  globalSearch.addEventListener('keydown', e => {
    const items = searchResults.querySelectorAll('.sl-result:not(.sl-hist)');
    if (e.key==='ArrowDown') { e.preventDefault(); resultIdx=Math.min(resultIdx+1,items.length-1); syncActive(items); }
    if (e.key==='ArrowUp')   { e.preventDefault(); resultIdx=Math.max(resultIdx-1,0);              syncActive(items); }
    if (e.key==='Enter')     { e.preventDefault(); addHistory(globalSearch.value.trim()); if(items[resultIdx]) items[resultIdx].click(); }
    if (e.key==='Escape')    { closeSearch(); }
  });

  function syncActive(items) {
    items.forEach((el,i) => {
      el.classList.toggle('sl-active', i===resultIdx);
      el.setAttribute('aria-selected', i===resultIdx);
    });
    items[resultIdx]?.scrollIntoView({block:'nearest'});
  }

  searchResults.addEventListener('click', e => {
    if (e.target.closest('.sl-result:not(.sl-hist)')) {
      addHistory(globalSearch.value.trim()); closeSearch();
    }
  });

  // Sidebar search → opens modal
  const sidebarSearchInput = document.getElementById('search');
  sidebarSearchInput?.addEventListener('focus', e => { e.preventDefault(); sidebarSearchInput.blur(); openSearch(); });
  sidebarSearchInput?.addEventListener('click', openSearch);

  // ── 5. IN-PAGE SECTION FILTER ─────────────────────────────
  let sections = [];

  function walkText(root, fn) {
    const iter = document.createNodeIterator(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node=iter.nextNode())) { if(fn(node)) break; }
  }

  function filterSections(query) {
    const q = query.toLowerCase().trim();
    sections.forEach(sec => {
      // Restore original HTML first
      sec.querySelectorAll('.code-panel pre').forEach(pre => {
        if (pre.dataset.origHtml) pre.innerHTML = pre.dataset.origHtml;
      });
      if (!q) { sec.classList.remove('section-hidden'); return; }
      const text = sec.textContent.toLowerCase();
      if (!text.includes(q)) { sec.classList.add('section-hidden'); return; }
      sec.classList.remove('section-hidden');
      // Highlight in code panels
      sec.querySelectorAll('.code-panel pre').forEach(pre => {
        if (!pre.dataset.origHtml) pre.dataset.origHtml = pre.innerHTML;
        walkText(pre, node => {
          const i = node.textContent.toLowerCase().indexOf(q);
          if (i===-1) return false;
          const before = document.createTextNode(node.textContent.slice(0,i));
          const mark   = document.createElement('span'); mark.className='highlight'; mark.textContent=node.textContent.slice(i,i+q.length);
          const after  = document.createTextNode(node.textContent.slice(i+q.length));
          node.parentNode.replaceChild(after, node);
          node.parentNode.insertBefore(mark, after);
          node.parentNode.insertBefore(before, mark);
          return true;
        });
      });
    });
  }

  // ── 6. COPY BUTTON ─────────────────────────────────────────
  function setupCopy() {
  document.querySelectorAll('.code-panel').forEach(panel => {
    const pre = panel.querySelector('pre');
    if (!pre || panel.querySelector(':scope > .copy-btn')) return;
    panel.style.position = 'relative';
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.textContent).then(() => {
        btn.textContent = '✓ Copied';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent='Copy'; btn.classList.remove('copied'); }, 1600);
      }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = pre.textContent;
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.textContent='✓ Copied'; btn.classList.add('copied');
        setTimeout(()=>{btn.textContent='Copy';btn.classList.remove('copied');},1600);
      });
    });
    panel.appendChild(btn);
  });
  }

  // ── Guided tour: spotlight each section with an explanation card ──
  let tourCleanup = null;
  function setupTour() {
    if (tourCleanup) { tourCleanup(); tourCleanup = null; }
    const reduceMo = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const secs = [...document.querySelectorAll('main section[id]')];
    if (!secs.length) return;
    const ac = new AbortController();

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
    }, { signal: ac.signal });
    window.addEventListener('resize', () => { if (overlay.classList.contains('active')) place(); }, { signal: ac.signal });
    tourCleanup = () => { ac.abort(); fab.remove(); overlay.remove(); };
  }

  // ── Back to top ──
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.innerHTML = '↑';
  backToTop.title = 'Back to top';
  backToTop.setAttribute('aria-label','Scroll to top');
  document.body.appendChild(backToTop);
  backToTop.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));

  // ── 8. SCROLL PROGRESS BAR ───────────────────────────────
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  progressBar.setAttribute('role','progressbar');
  progressBar.setAttribute('aria-label','Reading progress');
  document.body.appendChild(progressBar);

  const onScroll = () => {
    const st    = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (total>0 ? (st/total)*100 : 0)+'%';
    backToTop.classList.toggle('visible', st>400);
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // ── 9. ACTIVE TOC  (IntersectionObserver – more accurate than scroll) ──
  let tocIO = null;
  function setupToc() {
  if (tocIO) { tocIO.disconnect(); tocIO = null; }
  const tocLinks = document.querySelectorAll('.toc a');
  if (tocLinks.length && sections.length) {
    const io = tocIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(a => {
          a.classList.toggle('toc-active', a.getAttribute('href')==='#'+entry.target.id);
        });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(sec => io.observe(sec));
  }
  }

  // ── 10. COLLAPSIBLE SECTIONS ──────────────────────────────
  function setupCollapsible() {
  document.querySelectorAll('section[id] > h2').forEach(h2 => {
    if (h2.dataset.bound) return;
    h2.dataset.bound = '1';
    h2.style.cursor='pointer';
    h2.setAttribute('role','button');
    h2.setAttribute('aria-expanded','true');
    h2.addEventListener('click', () => {
      const sec     = h2.parentElement;
      const isNowCollapsed = sec.classList.toggle('collapsed');
      h2.setAttribute('aria-expanded', !isNowCollapsed);
    });
  });
  }

  // ── 11. SMOOTH ANCHOR LINKS (delegated: survives SPA page swaps) ──
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    let target = null;
    try { target = document.querySelector(a.getAttribute('href')); } catch (_) {}
    if (target) {
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth'});
      history.replaceState(history.state, '', a.getAttribute('href'));
    }
  });

  // ── 12. KEYBOARD SHORTCUTS ──────────────────────────────
  const kbHelp = document.createElement('div');
  kbHelp.className = 'kb-help';
  kbHelp.setAttribute('aria-hidden','true');
  kbHelp.innerHTML =
    '<kbd>/</kbd> search &nbsp;'
    +'<kbd>j</kbd><kbd>k</kbd> navigate &nbsp;'
    +'<kbd>⌘</kbd><kbd>K</kbd> quick open &nbsp;'
    +'<kbd>Esc</kbd> clear';
  document.body.appendChild(kbHelp);

  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (searchModal.classList.contains('active')) return;

    // j / k  — jump between visible sections
    if (e.key==='j' || e.key==='k') {
      e.preventDefault();
      const visible = sections.filter(s => !s.classList.contains('section-hidden'));
      const cur     = visible.findIndex(s => {
        const r = s.getBoundingClientRect();
        return r.top >= -60 && r.top < 220;
      });
      const next = e.key==='j'
        ? visible[Math.min((cur<0?0:cur)+1, visible.length-1)]
        : visible[Math.max((cur<0?0:cur)-1, 0)];
      next?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  // ── 13. NOTES PANEL (GitHub markdown fetch + 24h cache) ────
  const notesOverlay = document.getElementById('notes-overlay');
  const notesPanel   = document.getElementById('notes-panel');
  const notesBody    = document.getElementById('notes-panel-body');
  const notesClose   = document.getElementById('notes-panel-close');
  const notesTitle   = document.getElementById('notes-panel-title');

  const openNotes = id => {
    const url = SOURCE_MAP[id];
    if (!url) return;
    notesOverlay.classList.add('active');
    notesPanel.classList.add('open');
    notesTitle.textContent = id + ' — Notes';
    notesBody.innerHTML = '<div class="notes-loading"><div class="notes-spinner"></div>Fetching from GitHub…</div>';

    const cacheKey  = 'notes_' + id;
    const cached    = localStorage.getItem(cacheKey);
    const cacheTime = parseInt(localStorage.getItem(cacheKey+'_time')||'0');
    if (cached && Date.now()-cacheTime < 86400000) { notesBody.innerHTML=renderMd(cached); return; }

    let rawUrl = url.replace('github.com','raw.githubusercontent.com')
                    .replace('/tree/main/','/refs/heads/main/');
    if (!rawUrl.endsWith('.md')) rawUrl += '/README.md';

    fetch(rawUrl)
      .then(r => { if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); })
      .then(md => {
        localStorage.setItem(cacheKey, md);
        localStorage.setItem(cacheKey+'_time', Date.now().toString());
        notesBody.innerHTML = renderMd(md);
      })
      .catch(() => {
        notesBody.innerHTML =
          `<div class="notes-loading" style="color:var(--text-subtle);flex-direction:column;gap:.75rem;">
            <span>⚠️ Could not load notes.</span>
            <a href="${url}" target="_blank" rel="noopener" style="color:var(--accent)">🔗 Open on GitHub →</a>
          </div>`;
      });
  };

  const closeNotes = () => {
    notesOverlay.classList.remove('active');
    notesPanel.classList.remove('open');
  };

  document.addEventListener('click', e => {
    const btn = e.target.closest('.notes-toggle');
    if (btn) openNotes(btn.dataset.id);
  });
  notesClose?.addEventListener('click', closeNotes);
  notesOverlay?.addEventListener('click', closeNotes);
  document.addEventListener('keydown', e => { if(e.key==='Escape') { closeSearch(); closeNotes(); } });

  // ── 14. PER-PAGE INIT (re-run by js/router.js after each SPA navigation) ──
  function initPage() {
    sections = Array.from(document.querySelectorAll('section[id]'));
    buildIndex();
    setupCopy();
    setupTour();
    setupToc();
    setupCollapsible();
    closeSearch(); closeNotes();
    onScroll();
  }
  initPage();
  window.DOC_initPage = initPage;

});
