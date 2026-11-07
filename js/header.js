// ═══════════════════════════════════════════════════════════
//  header.js  —  Single source of truth for all pages
//  Shared registry + reusable render functions
// ═══════════════════════════════════════════════════════════

/** @type {Array<{id:string, href:string, icon:string, tags:string[]}>} */
const LANGUAGES = [
  { id: 'HTML',        href: 'index.html',                  icon: '🌐', tags: ['web','markup','frontend','html'] },
  { id: 'CSS',         href: 'css-cheatsheet.html',         icon: '🎨', tags: ['web','styling','frontend','flexbox','grid','css'] },
  { id: 'JS',          href: 'js-cheatsheet.html',          icon: '⚡', tags: ['javascript','web','frontend','async','es6'] },
  { id: 'Java',        href: 'java-cheatsheet.html',        icon: '☕', tags: ['backend','oop','language','jvm','spring'] },
  { id: 'C',           href: 'c-cheatsheet.html',           icon: '⚙️', tags: ['systems','language','low-level','pointers'] },
  { id: 'Python',      href: 'python-cheatsheet.html',      icon: '🔷', tags: ['scripting','ai','data','ml','django'] },
  { id: 'SQL',         href: 'postgresql-cheatsheet.html',  icon: '🗄️', tags: ['database','query','postgres','sql','joins'] },
  { id: 'Shell',       href: 'shell-cheatsheet.html',       icon: '💻', tags: ['terminal','bash','cli','linux','unix'] },
  { id: 'Git',         href: 'git-cheatsheet.html',         icon: '🌿', tags: ['version-control','vcs','github','branching'] },
  { id: 'DSA',         href: 'dsa-cheatsheet.html',         icon: '🧮', tags: ['algorithms','data structures','complexity','sorting'] },
  { id: 'OOP',         href: 'oop-cheatsheet.html',         icon: '🏛️', tags: ['design','patterns','object','encapsulation'] },
  { id: 'Networking',  href: 'networking-cheatsheet.html',  icon: '🌐', tags: ['tcp','http','protocols','ip','dns'] },
  { id: 'Java Web',    href: 'java-web-cheatsheet.html',    icon: '☕', tags: ['servlet','spring','backend','rest','jpa'] },
  { id: 'File Tools',  href: 'filetools-cheatsheet.html',   icon: '📁', tags: ['filesystem','io','tools','files','streams'] },
  { id: 'VS Code',     href: 'vscode-cheatsheet.html',      icon: '📝', tags: ['editor','shortcuts','ide','extensions','vscode'] },
  { id: 'AI Concepts', href: 'ai-concepts-cheatsheet.html', icon: '🧠', tags: ['ml','llm','ai','deep learning','neural networks'] },
  { id: 'AI Apps',     href: 'ai-apps-cheatsheet.html',     icon: '🤖', tags: ['llm','agents','langchain','gpt','rag','tools'] },
  { id: 'Mac',         href: 'mac-cheatsheet.html',         icon: '🍎', tags: ['macos','shortcuts','terminal','spotlight'] },
  { id: 'HLD',         href: 'hld-cheatsheet.html',         icon: '🏗️', tags: ['system design','architecture','scalability','caching'] },
  { id: 'LLD',         href: 'lld-cheatsheet.html',         icon: '🔩', tags: ['design patterns','solid','oop','clean code'] },
  { id: 'REST API',    href: 'rest-api-cheatsheet.html',    icon: '🌐', tags: ['http','api','rest','json','crud','status codes'] },
  { id: 'XML',         href: 'xml-cheatsheet.html',         icon: '📄', tags: ['markup','xpath','parsing','schema','xslt'] },
];

const GITHUB_BASE = 'https://github.com/arun1742002/obsidian/tree/main/Notes';

/** Map of page id → GitHub source URL (null = no source) */
const SOURCE_MAP = {
  'HTML':        GITHUB_BASE + '/Web/HTML.md',
  'CSS':         GITHUB_BASE + '/Web/CSS.md',
  'JS':          GITHUB_BASE + '/Web/JavaScript.md',
  'Java':        GITHUB_BASE + '/Languages/Java.md',
  'C':           null,
  'Python':      GITHUB_BASE + '/Languages/Python.md',
  'SQL':         GITHUB_BASE + '/Database/SQL%20DB.md',
  'Shell':       null,
  'Git':         null,
  'DSA':         GITHUB_BASE + '/DSA',
  'OOP':         GITHUB_BASE + '/DSA/Data%20Strucure/OOPS.md',
  'Networking':  GITHUB_BASE + '/Networking',
  'Java Web':    GITHUB_BASE + '/Web',
  'File Tools':  GITHUB_BASE + '/FileHandling',
  'VS Code':     null,
  'AI Concepts': GITHUB_BASE + '/AI%20%26%20ML',
  'AI Apps':     GITHUB_BASE + '/AI%20%26%20ML/LLM%20%26%20AI%20Agents%20%E2%80%94%20Complete%20Concepts%20Guide.md',
  'Mac':         null,
  'HLD':         null,
  'LLD':         null,
  'REST API':    null,
  'XML':         GITHUB_BASE + '/Web/XML.md',
};

// ─── Render sidebar nav ────────────────────────────────────────────
/**
 * Populates #sidebar-nav with icon links; marks activeId as .active.
 * Also sets the sidebar-brand GitHub link.
 * @param {string} activeId  Must match a LANGUAGES[].id
 */
function renderHeader(activeId) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  nav.innerHTML = LANGUAGES.map(l => {
    const isActive = l.id === activeId;
    return `<a href="${l.href}" class="nav-item${isActive ? ' active' : ''}" aria-current="${isActive ? 'page' : 'false'}">
      <span class="nav-icon" aria-hidden="true">${l.icon}</span>
      <span class="nav-label">${l.id}</span>
    </a>`;
  }).join('');

  const brand = document.querySelector('.sidebar-brand');
  if (brand && !brand.querySelector('a.gh-link')) {
    brand.innerHTML =
      `<span>📚 Cheatsheets</span>
      <a href="${GITHUB_BASE}" target="_blank" rel="noopener" class="gh-link" title="GitHub Source">⚡</a>`;
  }
}

// ─── Render source / notes buttons ────────────────────────────────
/**
 * Injects "View Notes" + "GitHub" buttons into #source-link.
 * @param {string} activeId
 */
function renderSourceLink(activeId) {
  const el = document.getElementById('source-link');
  if (!el) return;
  const url = SOURCE_MAP[activeId];
  if (!url) return;
  el.innerHTML =
    `<button class="source-btn notes-toggle" data-id="${activeId}" aria-label="View notes for ${activeId}">📖 View Notes</button>` +
    ` <a href="${url}" target="_blank" rel="noopener" class="source-btn" aria-label="${activeId} on GitHub">⚡ GitHub</a>`;
}

// ─── Auth, tracking & attachments (see js/auth.js) ────────────────
(function loadAuth() {
  const s = document.createElement('script');
  s.src = 'js/auth.js';
  document.head.appendChild(s);
})();
