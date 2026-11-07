// ═══════════════════════════════════════════════════════════
//  Campus Notes — single-page app (hash routes, no reloads).
//  Data lives in localStorage for now (per browser); Catalyst sync later.
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── Storage ──────────────────────────────────────────────
  const KEY = 'campusNotes.v1';
  const TRASH_DAYS = 30;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const load = () => {
    try { return Object.assign({ notes: [], tasks: [], slots: [], usage: {} }, JSON.parse(localStorage.getItem(KEY))); }
    catch { return { notes: [], tasks: [], slots: [], usage: {} }; }
  };
  let db = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const today = () => new Date().toISOString().slice(0, 10);

  // Purge notes trashed more than 30 days ago
  const cutoff = Date.now() - TRASH_DAYS * 864e5;
  db.notes = db.notes.filter(n => !n.trashedAt || n.trashedAt > cutoff);
  save();

  // ── Helpers ──────────────────────────────────────────────
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const view = $('#cnView');
  const fmtMin = s => { const m = Math.round(s / 60); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm'; };

  // Minimal, safe Markdown → HTML (input escaped first)
  function md(src) {
    const blocks = [];
    let s = esc(src).replace(/```([\s\S]*?)```/g, (_, c) => { blocks.push(c); return '\u0000' + (blocks.length - 1) + '\u0000'; });
    s = s.replace(/^### (.*)$/gm, '<h4>$1</h4>').replace(/^## (.*)$/gm, '<h3>$1</h3>').replace(/^# (.*)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^[-*] (.*)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<pre><code>' + blocks[i] + '</code></pre>');
  }

  // ── Usage time (active tab only) ─────────────────────────
  let last = Date.now();
  function tick() {
    const now = Date.now();
    if (!document.hidden) {
      const d = today();
      db.usage[d] = (db.usage[d] || 0) + Math.min(60, (now - last) / 1000);
      save();
    }
    last = now;
    $('#cnUsage span').textContent = fmtMin(db.usage[today()] || 0) + ' today';
  }
  setInterval(tick, 15000);
  document.addEventListener('visibilitychange', () => { last = Date.now(); });
  window.addEventListener('pagehide', tick);

  // ── Views ────────────────────────────────────────────────
  const activeNotes = () => db.notes.filter(n => !n.trashedAt);
  const subjects = () => [...new Set(activeNotes().map(n => n.subject).filter(Boolean))].sort();

  function dashboard() {
    const dayIdx = (new Date().getDay() + 6) % 7; // Mon=0
    const todays = db.slots.filter(s => s.day === DAYS[dayIdx]).sort((a, b) => a.start.localeCompare(b.start));
    const due = db.tasks.filter(t => !t.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 6);
    const recent = activeNotes().sort((a, b) => b.updated - a.updated).slice(0, 6);
    const week = Object.entries(db.usage).filter(([d]) => d > new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).reduce((a, [, v]) => a + v, 0);
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const pending = db.tasks.filter(t => !t.done).length;
    view.innerHTML = `<div class="grid">
      <div class="hero"><h2>${greet}</h2><p>${todays.length} class${todays.length === 1 ? '' : 'es'} today · ${pending} pending task${pending === 1 ? '' : 's'} · ${activeNotes().length} notes</p><a class="btn" href="#/notes/new">+ New note</a></div>
      <div class="card"><h3>Study time</h3><div class="stat">${fmtMin(db.usage[today()] || 0)}</div><div class="mute">today · ${fmtMin(week)} this week</div></div>
      <div class="card"><h3>Today's classes</h3>${todays.length ? '<ul class="list">' + todays.map(s => `<li><span>${esc(s.subject)}</span><span class="mute">${esc(s.start)}–${esc(s.end)} ${esc(s.room)}</span></li>`).join('') + '</ul>' : '<p class="mute">No classes today.</p>'}</div>
      <div class="card"><h3>Upcoming</h3>${due.length ? '<ul class="list">' + due.map(t => `<li><span>${esc(t.title)}</span><span class="mute ${t.due && t.due < today() ? 'overdue' : ''}">${esc(t.due || 'no date')}</span></li>`).join('') + '</ul>' : '<p class="mute">Nothing pending</p>'}</div>
      <div class="card"><h3>Recent notes</h3>${recent.length ? '<ul class="list">' + recent.map(n => `<li><a href="#/notes/${n.id}">${esc(n.title || 'Untitled')}</a><span class="mute">${esc(n.subject)}</span></li>`).join('') + '</ul>' : '<p class="mute">No notes yet.</p>'}</div>
    </div>`;
  }

  function notes(param) {
    if (param === 'new') {
      const subj = sessionStorage.getItem('cnSubj') || '';
      const n = { id: uid(), title: '', subject: subj, tags: [], body: '', pinned: false, updated: Date.now() };
      db.notes.push(n); save(); location.replace('#/notes/' + n.id); return;
    }
    const q = (sessionStorage.getItem('cnQ') || '').toLowerCase();
    const subj = sessionStorage.getItem('cnSubj') || '';
    const showTrash = param === 'trash';
    const list = db.notes.filter(n => showTrash ? n.trashedAt : !n.trashedAt)
      .filter(n => showTrash || !subj || n.subject === subj)
      .filter(n => !q || (n.title + ' ' + n.body + ' ' + n.tags.join(' ')).toLowerCase().includes(q))
      .sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));
    const cur = db.notes.find(n => n.id === param);
    const snip = n => esc(new Date(n.updated).toLocaleDateString() + '  ' + (n.body.replace(/[#*`>\-\n]+/g, ' ').trim().slice(0, 60) || 'No additional text'));
    view.innerHTML = `<div class="notes ${cur ? 'has-sel' : ''}">
      <div class="nl">
        <div class="nl-head"><input id="nq" placeholder="Search" value="${esc(q)}"><button class="ghost" id="nnew" title="New note" aria-label="New note">✎</button></div>
        <ul class="list note-list">${list.map(n => `<li class="${cur && cur.id === n.id ? 'sel' : ''}" data-id="${n.id}"><div class="t">${n.pinned ? '📌 ' : ''}${esc(n.title || 'Untitled')}</div><div class="s">${snip(n)}</div></li>`).join('') || `<li class="mute">${showTrash ? 'Trash is empty' : 'No notes'}</li>`}</ul>
      </div>
      <div class="ne" id="ned">${cur ? editorHtml(cur) : '<div class="empty">Select or create a note</div>'}</div>
    </div>`;
    $('#nq').oninput = e => { sessionStorage.setItem('cnQ', e.target.value); notes(param); const i = $('#nq'); i.focus(); i.setSelectionRange(9e9, 9e9); };
    $('#nnew').onclick = () => { location.hash = '#/notes/new'; };
    view.querySelectorAll('.note-list li[data-id]').forEach(li => li.onclick = () => { location.hash = '#/notes/' + li.dataset.id; });
    if (cur) bindEditor(cur);
  }

  function editorHtml(n) {
    const back = `<button class="ghost back" id="nback" aria-label="Back">‹ Notes</button>`;
    if (n.trashedAt) return `<div class="ne-bar">${back}<span class="sp"></span><button class="ghost" id="nrestore">Restore</button><button class="danger" id="npurge">Delete forever</button></div>
      <div class="ne-body"><h2 class="ne-title">${esc(n.title || 'Untitled')}</h2><div class="preview">${md(n.body)}</div></div>`;
    return `<div class="ne-bar">${back}<span class="mute" id="nsaved">${esc(new Date(n.updated).toLocaleString())}</span><span class="sp"></span>
        <button class="ghost" id="nmode">Preview</button><button class="ghost" id="npin">${n.pinned ? 'Unpin' : 'Pin'}</button><button class="danger" id="ntrash">Delete</button></div>
      <div class="ne-body">
        <input class="ne-title" id="nt" placeholder="Title" value="${esc(n.title)}">
        <div class="ne-meta"><input id="nsub" placeholder="Subject" value="${esc(n.subject)}" list="subjList"><datalist id="subjList">${subjects().map(s => `<option>${esc(s)}</option>`).join('')}</datalist>
          <input id="ntags" placeholder="Tags" value="${esc(n.tags.join(', '))}"></div>
        <textarea class="ne-text" id="nb" placeholder="Start writing… (Markdown supported)">${esc(n.body)}</textarea>
        <div class="preview" id="np" hidden></div>
      </div>`;
  }

  function bindEditor(n) {
    $('#nback').onclick = () => { location.hash = n.trashedAt ? '#/notes/trash' : '#/notes'; };
    if (n.trashedAt) {
      $('#nrestore').onclick = () => { delete n.trashedAt; save(); location.hash = '#/notes/' + n.id; };
      $('#npurge').onclick = () => { if (confirm('Delete this note forever?')) { db.notes = db.notes.filter(x => x !== n); save(); location.hash = '#/notes/trash'; } };
      return;
    }
    let timer;
    const persist = () => {
      n.title = $('#nt').value.trim(); n.subject = $('#nsub').value.trim();
      n.tags = $('#ntags').value.split(',').map(t => t.trim()).filter(Boolean);
      n.body = $('#nb').value; n.updated = Date.now(); save();
      $('#nsaved').textContent = 'Saved';
      const li = view.querySelector(`.note-list li[data-id="${n.id}"] .t`);
      if (li) li.textContent = (n.pinned ? '📌 ' : '') + (n.title || 'Untitled');
      folders();
    };
    const onEdit = () => { clearTimeout(timer); timer = setTimeout(persist, 500); };
    ['#nt', '#nsub', '#ntags', '#nb'].forEach(s => $(s).addEventListener('input', onEdit));
    $('#nmode').onclick = () => {
      const p = $('#np'), t = $('#nb'), on = p.hidden;
      if (on) p.innerHTML = md(t.value);
      p.hidden = !on; t.hidden = on; $('#nmode').textContent = on ? 'Edit' : 'Preview';
    };
    $('#npin').onclick = () => { persist(); n.pinned = !n.pinned; save(); notes(n.id); };
    $('#ntrash').onclick = () => { persist(); n.trashedAt = Date.now(); save(); location.hash = '#/notes'; };
    if (!n.title && !n.body) $('#nt').focus();
  }

  // Subject folders in the sidebar (like Notes folders)
  function folders() {
    const box = $('#cnFolders'); if (!box) return;
    const cur = sessionStorage.getItem('cnSubj') || '';
    const onNotes = location.hash.startsWith('#/notes') && !location.hash.startsWith('#/notes/trash');
    const count = s => activeNotes().filter(n => !s || n.subject === s).length;
    const item = (s, label) => `<a href="#/notes" data-subj="${esc(s)}" class="${onNotes && cur === s ? 'active' : ''}"><svg class="ico"><use href="#i-note"/></svg><span>${esc(label)}</span><span class="n">${count(s)}</span></a>`;
    box.innerHTML = item('', 'All notes') + subjects().map(s => item(s, s)).join('') +
      `<a href="#/notes/trash" class="${location.hash.startsWith('#/notes/trash') ? 'active' : ''}"><svg class="ico"><use href="#i-out"/></svg><span>Trash</span><span class="n">${db.notes.filter(n => n.trashedAt).length}</span></a>`;
    box.querySelectorAll('[data-subj]').forEach(a => a.onclick = () => { sessionStorage.setItem('cnSubj', a.dataset.subj); if (location.hash === '#/notes') route(); });
  }

  function tasks() {
    const list = db.tasks.slice().sort((a, b) => (a.done - b.done) || (a.due || '9').localeCompare(b.due || '9'));
    view.innerHTML = `<div class="wrap">
      <form class="row" id="tf"><input id="tt" placeholder="Assignment / to-do" required style="flex:2">
        <select id="tk"><option>Assignment</option><option>Exam</option><option>To-do</option></select>
        <input id="tsub" placeholder="Subject"><input id="td" type="date"><button>Add</button></form>
      <ul class="list">${list.map(t => `<li><label class="${t.done ? 'done' : ''}"><input type="checkbox" data-id="${t.id}" ${t.done ? 'checked' : ''}> ${esc(t.title)} <span class="tag">${esc(t.kind)}</span>${t.subject ? `<span class="tag">${esc(t.subject)}</span>` : ''}</label>
        <span><span class="mute ${!t.done && t.due && t.due < today() ? 'overdue' : ''}">${esc(t.due || '')}</span> <button class="ghost" data-del="${t.id}">✕</button></span></li>`).join('') || '<li class="mute">No tasks yet.</li>'}</ul></div>`;
    $('#tf').onsubmit = e => {
      e.preventDefault();
      db.tasks.push({ id: uid(), title: $('#tt').value.trim(), kind: $('#tk').value, subject: $('#tsub').value.trim(), due: $('#td').value, done: false });
      save(); tasks();
    };
    view.querySelectorAll('input[type=checkbox][data-id]').forEach(c => c.onchange = () => { db.tasks.find(t => t.id === c.dataset.id).done = c.checked; save(); tasks(); });
    view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { db.tasks = db.tasks.filter(t => t.id !== b.dataset.del); save(); tasks(); });
  }

  function timetable() {
    const cell = d => db.slots.filter(s => s.day === d).sort((a, b) => a.start.localeCompare(b.start))
      .map(s => `<div>${esc(s.start)}–${esc(s.end)} <b>${esc(s.subject)}</b> ${esc(s.room)} <button class="ghost" data-del="${s.id}">✕</button></div>`).join('');
    view.innerHTML = `<div class="wrap" style="max-width:none">
      <form class="row" id="sf"><select id="sd">${DAYS.map(d => `<option>${d}</option>`).join('')}</select>
        <input id="ss" type="time" required><input id="se" type="time" required>
        <input id="ssub" placeholder="Subject" required><input id="sr" placeholder="Room"><button>Add class</button></form>
      <table class="tt"><tr>${DAYS.map(d => `<th>${d}</th>`).join('')}</tr><tr>${DAYS.map(d => `<td>${cell(d)}</td>`).join('')}</tr></table></div>`;
    $('#sf').onsubmit = e => {
      e.preventDefault();
      db.slots.push({ id: uid(), day: $('#sd').value, start: $('#ss').value, end: $('#se').value, subject: $('#ssub').value.trim(), room: $('#sr').value.trim() });
      save(); timetable();
    };
    view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { db.slots = db.slots.filter(s => s.id !== b.dataset.del); save(); timetable(); });
  }

  function resources() {
    const pages = (window.LANGUAGES || []);
    view.innerHTML = `<div class="grid">${pages.map(p => `<a class="card" style="text-decoration:none;color:inherit" href="${esc(p.href)}"><h3>${esc(p.id)}</h3><span class="mute">${esc((p.tags || []).join(', '))}</span></a>`).join('')}</div>`;
    if (!pages.length) {
      view.innerHTML = '<p class="mute">Loading…</p>';
      fetch('js/header.js').then(r => r.text()).then(t => {
        const m = t.match(/const LANGUAGES = (\[[\s\S]*?\n\]);/);
        // eslint-disable-next-line no-new-func
        window.LANGUAGES = m ? Function('return ' + m[1])() : [];
        if (location.hash.startsWith('#/resources')) resources();
      });
    }
  }

  // ── Router ───────────────────────────────────────────────
  const ROUTES = { dashboard: ['Dashboard', dashboard], notes: ['Notes', notes], tasks: ['Assignments & To-dos', tasks], timetable: ['Timetable', timetable], resources: ['Resources', resources] };
  function route() {
    const [, name = 'dashboard', param] = location.hash.split('/');
    const r = ROUTES[name] || ROUTES.dashboard;
    $('#cnTitle').textContent = r[0];
    document.title = r[0] + ' — Campus Notes';
    document.querySelectorAll('#cnNav a').forEach(a => a.classList.toggle('active', a.dataset.r === name));
    view.classList.toggle('full', name === 'notes');
    r[1](param);
    folders();
  }

  // ── Theme ────────────────────────────────────────────────
  $('#cnTheme').onclick = () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('cnTheme', t);
  };
  window.addEventListener('hashchange', route);

  // ── Logout ───────────────────────────────────────────────
  $('#cnLogout').onclick = () => {
    tick();
    try { if (window.catalyst && catalyst.auth) { catalyst.auth.signOut(location.origin + '/login.html'); return; } } catch { /* fall through */ }
    location.href = 'login.html';
  };

  tick();
  route();
})();
