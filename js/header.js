// ── Icon set: inline monoline SVGs (no emoji), currentColor, 24×24 ──
const ICONS = {
  brackets: '<polyline points="8 7 3 12 8 17"/><polyline points="16 7 21 12 16 17"/>',
  css:      '<path d="M12 3c3.5 4.5 5.5 7.2 5.5 10a5.5 5.5 0 0 1-11 0c0-2.8 2-5.5 5.5-10z"/>',
  bolt:     '<polygon points="13 2 5 13 11 13 10 22 19 10 13 10 13 2"/>',
  coffee:   '<path d="M4 8h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><line x1="7" y1="2.5" x2="7" y2="5"/><line x1="11" y1="2.5" x2="11" y2="5"/>',
  chip:     '<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><line x1="10" y1="3" x2="10" y2="6"/><line x1="14" y1="3" x2="14" y2="6"/><line x1="10" y1="18" x2="10" y2="21"/><line x1="14" y1="18" x2="14" y2="21"/><line x1="3" y1="10" x2="6" y2="10"/><line x1="3" y1="14" x2="6" y2="14"/><line x1="18" y1="10" x2="21" y2="10"/><line x1="18" y1="14" x2="21" y2="14"/>',
  snake:    '<path d="M7 7h7a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h9"/><circle cx="7" cy="7" r="1.3" fill="currentColor" stroke="none"/><circle cx="17" cy="19" r="1.3" fill="currentColor" stroke="none"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7" ry="2.8"/><path d="M5 5.5v13c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-13"/><path d="M5 12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><polyline points="7 9 10 12 7 15"/><line x1="12.5" y1="15" x2="16" y2="15"/>',
  git:      '<circle cx="6" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="9" r="2"/><path d="M6 9v6"/><path d="M17 11a5 5 0 0 1-5 5H9"/>',
  bars:     '<line x1="6" y1="20" x2="6" y2="11"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="18" y1="20" x2="18" y2="14"/>',
  cube:     '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9z"/><path d="M4 7.5 12 12l8-4.5"/><path d="M12 12v9"/>',
  network:  '<circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><line x1="8" y1="11" x2="16" y2="7"/><line x1="8" y1="13" x2="16" y2="17"/>',
  globe:    '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  folder:   '<path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  pen:      '<path d="M5 19h3L19 8l-3-3L5 16z"/><line x1="14" y1="7" x2="17" y2="10"/>',
  spark:    '<circle cx="12" cy="12" r="3"/><line x1="12" y1="4" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="20"/><line x1="4" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="20" y2="12"/><line x1="6.5" y1="6.5" x2="8.5" y2="8.5"/><line x1="15.5" y1="15.5" x2="17.5" y2="17.5"/><line x1="17.5" y1="6.5" x2="15.5" y2="8.5"/><line x1="8.5" y1="15.5" x2="6.5" y2="17.5"/>',
  robot:    '<rect x="5" y="8" width="14" height="10" rx="2"/><line x1="12" y1="4" x2="12" y2="8"/><circle cx="12" cy="4" r="1.3" fill="currentColor" stroke="none"/><circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none"/>',
  monitor:  '<rect x="3" y="4" width="18" height="12" rx="2"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/>',
  layout:   '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/>',
  blueprint:'<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="13" y1="3" x2="13" y2="14"/>',
  doc:      '<path d="M6 3h8l4 4v14H6z"/><polyline points="14 3 14 7 18 7"/>',
  layers:   '<polygon points="12 3 21 8 12 13 3 8"/><polyline points="3 13 12 18 21 13"/>',
  bookopen: '<path d="M12 6c-1.5-1.3-3.5-2-6-2v13c2.5 0 4.5.7 6 2 1.5-1.3 3.5-2 6-2V4c-2.5 0-4.5.7-6 2z"/><line x1="12" y1="6" x2="12" y2="21"/>',
  sun:      '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="7" y2="7"/><line x1="17" y1="17" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="17" y2="7"/><line x1="7" y1="17" x2="4.9" y2="19.1"/>',
  moon:     '<path d="M20 13.5A8 8 0 1 1 10.5 4 6.3 6.3 0 0 0 20 13.5z"/>',
  search:   '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
  key:      '<circle cx="8" cy="15" r="4"/><path d="M10.6 12.4 20 3"/><path d="M16 7l3 3"/><path d="M13.5 9.5l2.5 2.5"/>',
};

function svgIcon(name, cls) {
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.doc) + '</svg>';
}

const LANGUAGES = [
  { id: 'HTML', href: 'index.html', icon: 'brackets' },
  { id: 'CSS', href: 'css-cheatsheet.html', icon: 'css' },
  { id: 'JS', href: 'js-cheatsheet.html', icon: 'bolt' },
  { id: 'Java', href: 'java-cheatsheet.html', icon: 'coffee' },
  { id: 'C', href: 'c-cheatsheet.html', icon: 'chip' },
  { id: 'Python', href: 'python-cheatsheet.html', icon: 'snake' },
  { id: 'SQL', href: 'postgresql-cheatsheet.html', icon: 'database' },
  { id: 'Shell', href: 'shell-cheatsheet.html', icon: 'terminal' },
  { id: 'Git', href: 'git-cheatsheet.html', icon: 'git' },
  { id: 'DSA', href: 'dsa-cheatsheet.html', icon: 'bars' },
  { id: 'OOP', href: 'oop-cheatsheet.html', icon: 'cube' },
  { id: 'Networking', href: 'networking-cheatsheet.html', icon: 'network' },
  { id: 'Java Web', href: 'java-web-cheatsheet.html', icon: 'coffee' },
  { id: 'File Tools', href: 'filetools-cheatsheet.html', icon: 'folder' },
  { id: 'VS Code', href: 'vscode-cheatsheet.html', icon: 'pen' },
  { id: 'AI Concepts', href: 'ai-concepts-cheatsheet.html', icon: 'spark' },
  { id: 'AI Apps', href: 'ai-apps-cheatsheet.html', icon: 'robot' },
  { id: 'Mac', href: 'mac-cheatsheet.html', icon: 'monitor' },
  { id: 'HLD', href: 'hld-cheatsheet.html', icon: 'blueprint' },
  { id: 'LLD', href: 'lld-cheatsheet.html', icon: 'layout' },
  { id: 'REST API', href: 'rest-api-cheatsheet.html', icon: 'globe' },
  { id: 'XML', href: 'xml-cheatsheet.html', icon: 'doc' },
  { id: 'Concepts', href: 'programming-concepts-cheatsheet.html', icon: 'spark' },
  { id: 'Data Types', href: 'data-types-cheatsheet.html', icon: 'layers' },
  { id: 'Accounts', href: 'accounts-cheatsheet.html', icon: 'key' },
];

const GITHUB_BASE = 'https://github.com/arun1742002/obsidian/tree/main/Notes';

const SOURCE_MAP = {
  'HTML': GITHUB_BASE + '/Web/HTML.md',
  'CSS': GITHUB_BASE + '/Web/CSS.md',
  'JS': GITHUB_BASE + '/Web/JavaScript.md',
  'Java': GITHUB_BASE + '/Languages/Java.md',
  'C': null,
  'Python': GITHUB_BASE + '/Languages/Python.md',
  'SQL': GITHUB_BASE + '/Database/SQL%20DB.md',
  'Shell': null,
  'Git': null,
  'DSA': GITHUB_BASE + '/DSA',
  'OOP': GITHUB_BASE + '/DSA/Data%20Strucure/OOPS.md',
  'Networking': GITHUB_BASE + '/Networking',
  'Java Web': GITHUB_BASE + '/Web',
  'File Tools': GITHUB_BASE + '/FileHandling',
  'VS Code': null,
  'AI Concepts': GITHUB_BASE + '/AI%20%26%20ML',
  'AI Apps': GITHUB_BASE + '/AI%20%26%20ML/LLM%20%26%20AI%20Agents%20%E2%80%94%20Complete%20Concepts%20Guide.md',
  'Mac': null,
  'HLD': null,
  'LLD': null,
  'REST API': null,
  'XML': GITHUB_BASE + '/Web/XML.md',
  'Concepts': null,
  'Data Types': null,
  'Accounts': null,
};

function renderHeader(activeId) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  nav.innerHTML = LANGUAGES.map(l => {
    const active = l.id === activeId ? ' active' : '';
    return `<a href="${l.href}" class="nav-item${active}">
      <span class="nav-icon">${svgIcon(l.icon)}</span>
      <span class="nav-label">${l.id}</span>
    </a>`;
  }).join('');

  const brand = document.querySelector('.sidebar-brand');
  if (brand && !brand.querySelector('a')) {
    brand.innerHTML = `<span class="brand-name">${svgIcon('layers')} Cheatsheets</span><a href="${GITHUB_BASE}" target="_blank" class="gh-link" title="GitHub Source">${svgIcon('bolt')}</a>`;
  }
}

function renderSourceLink(activeId) {
  const el = document.getElementById('source-link');
  if (!el) return;
  const url = SOURCE_MAP[activeId];
  if (url) {
    el.innerHTML = `<button class="source-btn notes-toggle" data-id="${activeId}">${svgIcon('bookopen')} View Notes</button> <a href="${url}" target="_blank" class="source-btn">${svgIcon('bolt')} GitHub</a>`;
  }
}
