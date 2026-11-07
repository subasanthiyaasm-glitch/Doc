// ═══════════════════════════════════════════════════════════
//  router.js — single-page navigation + page previews
//  • Clicking any internal cheatsheet link swaps <main>/<footer>,
//    page styles and title in place: URL changes, no full reload.
//  • Back/forward work (popstate). Pages are cached after first fetch.
//  • Hovering a sidebar link shows a preview card (title + sections).
//  Loaded by header.js. Falls back to a normal load on any error.
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.DOC_ROUTER) return;
  window.DOC_ROUTER = true;

  // Pages with a different shell (no sidebar layout) always do a full load
  const FULL_LOAD = /^(login|login-sample|account|stats)\.html$/i;
  const cache = new Map(); // file -> Promise<Document>
  const fileOf = url => (url.pathname.split('/').pop() || 'index.html');

  function isSpaLink(a) {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return null;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return null;
    let url;
    try { url = new URL(href, location.href); } catch (_) { return null; }
    if (url.origin !== location.origin || !/\.html$/i.test(url.pathname) && !url.pathname.endsWith('/')) return null;
    if (FULL_LOAD.test(fileOf(url))) return null;
    return url;
  }

  function fetchDoc(file) {
    if (!cache.has(file)) {
      cache.set(file, fetch(file, { credentials: 'same-origin', cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(html => new DOMParser().parseFromString(html, 'text/html'))
        .catch(err => { cache.delete(file); throw err; }));
    }
    return cache.get(file);
  }

  // Mark the first page's own <style> blocks so they get swapped out later
  document.querySelectorAll('head style').forEach(s => s.dataset.page = '1');

  function runScript(old) {
    if (old.src && /js\/(header|script|auth|router)\.js/.test(old.src)) return;
    const type = (old.type || '').toLowerCase();
    if (type && !/javascript|module/.test(type)) return; // templates / JSON data blocks
    const s = document.createElement('script');
    [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
    s.textContent = old.textContent;
    try { old.replaceWith(s); } catch (err) { console.warn('[router] page script failed:', err.message); }
  }

  function pageIdOf(doc) {
    const m = doc.body.innerHTML.match(/renderHeader\(\s*['"]([^'"]+)['"]\s*\)/);
    return m ? m[1] : '';
  }

  async function navigate(url, push) {
    const file = fileOf(url);
    let doc;
    try { doc = await fetchDoc(file); } catch (_) { location.href = url.href; return; }
    const newMain = doc.querySelector('body main');
    const curMain = document.querySelector('body > main') || document.querySelector('main');
    if (!newMain || !curMain) { location.href = url.href; return; }

    if (push) history.pushState({ spa: 1 }, '', url.href);

    // styles + title
    document.querySelectorAll('head style[data-page]').forEach(s => s.remove());
    doc.querySelectorAll('head style').forEach(s => {
      const c = document.createElement('style'); c.dataset.page = '1'; c.textContent = s.textContent;
      document.head.appendChild(c);
    });
    document.title = doc.title;

    // content
    const fresh = document.importNode(newMain, true);
    curMain.replaceWith(fresh);
    const curFooter = document.querySelector('body > footer');
    const newFooter = doc.querySelector('body > footer');
    if (curFooter && newFooter) curFooter.replaceWith(document.importNode(newFooter, true));

    // sidebar active item + notes buttons
    const id = pageIdOf(doc);
    if (typeof renderHeader === 'function') renderHeader(id);
    if (typeof renderSourceLink === 'function') renderSourceLink(id);
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

    // page-specific inline scripts (inside main + after main)
    fresh.querySelectorAll('script').forEach(runScript);
    [...doc.body.querySelectorAll(':scope > script')].forEach(s => {
      if (s.src || /renderHeader|renderSourceLink/.test(s.textContent)) return;
      const c = document.createElement('script'); c.textContent = s.textContent;
      document.body.appendChild(c); c.remove();
    });

    if (typeof window.DOC_initPage === 'function') window.DOC_initPage();
    window.dispatchEvent(new CustomEvent('doc:navigate', { detail: { file, id } }));

    const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
    target ? target.scrollIntoView() : window.scrollTo(0, 0);
    hidePreview();
  }

  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    const url = isSpaLink(a);
    if (!url) return;
    e.preventDefault();
    if (fileOf(url) === fileOf(location) && url.hash) {
      document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(history.state, '', url.href);
      return;
    }
    navigate(url, true);
  });

  window.addEventListener('popstate', () => {
    if (FULL_LOAD.test(fileOf(location))) { location.reload(); return; }
    navigate(new URL(location.href), false);
  });
  history.replaceState({ spa: 1 }, '', location.href);

  // ── Hover preview for sidebar / in-content links ──
  let card, timer;
  function hidePreview() { clearTimeout(timer); card?.classList.remove('show'); }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function showPreview(a, url) {
    if (!card) {
      card = document.createElement('div');
      card.className = 'spa-preview';
      document.body.appendChild(card);
    }
    const r = a.getBoundingClientRect();
    card.style.top = Math.min(window.innerHeight - 280, Math.max(8, r.top)) + 'px';
    card.style.left = Math.min(window.innerWidth - 330, r.right + 10) + 'px';
    card.innerHTML = '<div class="spa-pv-loading">Loading preview…</div>';
    card.classList.add('show');
    fetchDoc(fileOf(url)).then(doc => {
      if (!card.classList.contains('show')) return;
      const h1 = doc.querySelector('.page-header h1, main h1')?.textContent.trim() || doc.title;
      const desc = doc.querySelector('.page-header p, main p')?.textContent.trim().slice(0, 140) || '';
      const secs = [...doc.querySelectorAll('main section[id] > h2')]
        .map(h => h.textContent.replace(/[▾▸]/g, '').trim()).filter(Boolean);
      card.innerHTML = `<div class="spa-pv-title">${esc(h1)}</div>` +
        (desc ? `<div class="spa-pv-desc">${esc(desc)}</div>` : '') +
        `<div class="spa-pv-count">${secs.length} sections</div>` +
        `<ul>${secs.slice(0, 8).map(s => `<li>${esc(s)}</li>`).join('')}${secs.length > 8 ? '<li>…</li>' : ''}</ul>`;
    }).catch(() => card.classList.remove('show'));
  }

  document.addEventListener('mouseover', e => {
    const a = e.target.closest('.nav-item, a[data-preview]');
    if (!a) return;
    const url = isSpaLink(a);
    if (!url || fileOf(url) === fileOf(location)) return;
    clearTimeout(timer);
    timer = setTimeout(() => showPreview(a, url), 350);
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('.nav-item, a[data-preview]')) hidePreview();
  });
})();
