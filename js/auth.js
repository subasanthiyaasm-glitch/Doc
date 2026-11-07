// ═══════════════════════════════════════════════════════════
//  auth.js — login gate, daily-login + time tracking, attachments
//  Loaded automatically by header.js on every page.
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';

  const API = 'https://quickguide-60034244588.development.catalystserverless.in/server/doc_api';
  const PUBLIC_PAGES = ['login.html'];
  const HEARTBEAT_MS = 30000;

  const pageFile = (location.pathname.split('/').pop() || 'index.html');
  const pageId = pageFile.replace(/\.html$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'index';
  if (PUBLIC_PAGES.includes(pageFile)) return;

  const api = (path, opts = {}) =>
    fetch(API + path, { credentials: 'include', ...opts }).then(async r => {
      if (r.status === 401) { goLogin(); throw new Error('401'); }
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || r.statusText);
      return body;
    });

  function goLogin() {
    // Loop guard: if we already bounced to login in the last 60s, the session cookie
    // is being blocked (cross-site). Show the page instead of looping/blank screen.
    const last = +sessionStorage.getItem('doc_login_redirect') || 0;
    if (Date.now() - last < 60000) {
      document.documentElement.style.visibility = '';
      onReady(renderSignInBadge);
      return;
    }
    sessionStorage.setItem('doc_login_redirect', String(Date.now()));
    location.replace('login.html?next=' + encodeURIComponent(pageFile + location.hash));
  }

  function renderSignInBadge() {
    if (document.getElementById('docSignIn')) return;
    const a = document.createElement('a');
    a.id = 'docSignIn';
    a.href = 'login.html?next=' + encodeURIComponent(pageFile);
    a.textContent = 'Sign in (session blocked by browser cookies)';
    a.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9999;padding:6px 10px;border-radius:6px;background:#c0392b;color:#fff;font:12px sans-serif;text-decoration:none';
    document.body.appendChild(a);
  }

  const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.ceil(n / 1024) + ' KB';

  // Hide content until auth is confirmed
  document.documentElement.style.visibility = 'hidden';

  api('/me').then(me => {
    document.documentElement.style.visibility = '';
    sessionStorage.removeItem('doc_login_redirect');
    window.DOC_USER = me;
    trackDailyLogin();
    trackTime();
    onReady(() => { renderUserBadge(me); renderAttachments(); });
  }).catch(() => {
    // Network/API failure (not 401): never leave the page blank
    document.documentElement.style.visibility = '';
  });

  function onReady(fn) {
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  }

  // ── daily login (once per browser per day; server de-dupes too) ──
  function trackDailyLogin() {
    const key = 'doc_login_' + new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key)) return;
    api('/login-event', { method: 'POST' }).then(() => localStorage.setItem(key, '1')).catch(() => {});
  }

  // ── active time on page (only while tab is visible) ──
  function trackTime() {
    const sessionKey = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
    let active = 0, since = document.visibilityState === 'visible' ? Date.now() : null;
    const total = () => Math.round((active + (since ? Date.now() - since : 0)) / 1000);
    const send = (beacon) => {
      const body = JSON.stringify({ page: pageId, sessionKey, activeSeconds: total() });
      if (beacon) {
        fetch(API + '/heartbeat', { method: 'POST', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
      } else {
        api('/heartbeat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { if (since) { active += Date.now() - since; since = null; } send(true); }
      else since = Date.now();
    });
    setInterval(() => { if (since) send(false); }, HEARTBEAT_MS);
    setTimeout(() => send(false), 5000);
  }

  // ── user badge + logout in the sidebar brand ──
  function renderUserBadge(me) {
    const host = document.querySelector('.sidebar-brand') || document.body;
    const div = document.createElement('div');
    div.className = 'doc-user';
    div.innerHTML = `<span title="${escHtml(me.email)}">👤 ${escHtml(me.name || me.email)}</span>` +
      (me.isAdmin ? ' <a href="stats.html">📊</a>' : '') +
      ' <a href="#" id="doc-logout">Logout</a>';
    host.appendChild(div);
    div.querySelector('#doc-logout').addEventListener('click', e => {
      e.preventDefault();
      localStorage.removeItem('doc_login_' + new Date().toISOString().slice(0, 10));
      location.href = 'login.html?logout=1';
    });
  }

  // ── attachments panel at the bottom of the main content ──
  function renderAttachments() {
    if (pageFile === 'stats.html') return;
    const main = document.querySelector('main') || document.querySelector('.content') || document.body;
    const box = document.createElement('section');
    box.className = 'doc-attachments';
    box.id = 'attachments';
    box.innerHTML = '<h2>📎 Attachments</h2><div class="att-upload"></div><ul class="att-list"><li>Loading…</li></ul>';
    main.appendChild(box);
    loadList(box);
  }

  function loadList(box) {
    api('/attachments?page=' + pageId).then(data => {
      const list = box.querySelector('.att-list');
      list.innerHTML = data.items.length ? data.items.map(a =>
        `<li data-id="${escHtml(a.ROWID)}">
          <a href="#" class="att-dl">📄 ${escHtml(a.file_name)}</a>
          <small>${fmtSize(Number(a.size) || 0)} · ${escHtml(a.CREATEDTIME || '')}</small>
          ${data.canUpload ? '<button class="att-del" title="Delete">✕</button>' : ''}
        </li>`).join('') : '<li class="att-empty">No attachments yet.</li>';

      list.querySelectorAll('.att-dl').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const id = a.closest('li').dataset.id;
        api(`/attachments/${id}/download`).then(r => window.open(r.url, '_blank', 'noopener')).catch(err => alert(err.message));
      }));
      list.querySelectorAll('.att-del').forEach(b => b.addEventListener('click', () => {
        const li = b.closest('li');
        if (!confirm('Delete this attachment?')) return;
        api(`/attachments/${li.dataset.id}`, { method: 'DELETE' }).then(() => loadList(box)).catch(err => alert(err.message));
      }));

      const up = box.querySelector('.att-upload');
      if (data.canUpload && !up.childElementCount) {
        up.innerHTML = '<input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.zip,.docx"> <button>Upload</button> <small>max 10 MB</small>';
        up.querySelector('button').addEventListener('click', () => {
          const file = up.querySelector('input').files[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) return alert('File exceeds 10 MB');
          api('/attachments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream', 'X-Page': pageId, 'X-File-Name': encodeURIComponent(file.name) },
            body: file,
          }).then(() => { up.querySelector('input').value = ''; loadList(box); }).catch(err => alert(err.message));
        });
      }
    }).catch(() => {});
  }
})();
