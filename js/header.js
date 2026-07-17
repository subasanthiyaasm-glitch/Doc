const LANGUAGES = [
  { id: 'HTML', href: 'index.html', icon: '🌐' },
  { id: 'CSS', href: 'css-cheatsheet.html', icon: '🎨' },
  { id: 'JS', href: 'js-cheatsheet.html', icon: '⚡' },
  { id: 'Java', href: 'java-cheatsheet.html', icon: '☕' },
  { id: 'C', href: 'c-cheatsheet.html', icon: '⚙️' },
  { id: 'Python', href: 'python-cheatsheet.html', icon: '🔷' },
  { id: 'SQL', href: 'postgresql-cheatsheet.html', icon: '🗄️' },
  { id: 'Shell', href: 'shell-cheatsheet.html', icon: '💻' },
  { id: 'Git', href: 'git-cheatsheet.html', icon: '🌿' },
  { id: 'DSA', href: 'dsa-cheatsheet.html', icon: '🧮' },
  { id: 'OOP', href: 'oop-cheatsheet.html', icon: '🏛️' },
  { id: 'Networking', href: 'networking-cheatsheet.html', icon: '🌐' },
  { id: 'Java Web', href: 'java-web-cheatsheet.html', icon: '☕' },
  { id: 'File Tools', href: 'filetools-cheatsheet.html', icon: '📁' },
  { id: 'VS Code', href: 'vscode-cheatsheet.html', icon: '📝' },
  { id: 'AI Concepts', href: 'ai-concepts-cheatsheet.html', icon: '🧠' },
  { id: 'AI Apps', href: 'ai-apps-cheatsheet.html', icon: '🤖' },
  { id: 'Mac', href: 'mac-cheatsheet.html', icon: '🍎' },
  { id: 'HLD', href: 'hld-cheatsheet.html', icon: '🏗️' },
  { id: 'LLD', href: 'lld-cheatsheet.html', icon: '🔩' },
  { id: 'REST API', href: 'rest-api-cheatsheet.html', icon: '🌐' },
  { id: 'XML', href: 'xml-cheatsheet.html', icon: '📄' },
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
};

function renderHeader(activeId) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  nav.innerHTML = LANGUAGES.map(l => {
    const active = l.id === activeId ? ' active' : '';
    return `<a href="${l.href}" class="nav-item${active}">
      <span class="nav-icon">${l.icon}</span>
      <span class="nav-label">${l.id}</span>
    </a>`;
  }).join('');

  const brand = document.querySelector('.sidebar-brand');
  if (brand && !brand.querySelector('a')) {
    brand.innerHTML = `📚 Cheatsheets <a href="${GITHUB_BASE}" target="_blank" class="gh-link" title="GitHub Source">⚡</a>`;
  }
}

function renderSourceLink(activeId) {
  const el = document.getElementById('source-link');
  if (!el) return;
  const url = SOURCE_MAP[activeId];
  if (url) {
    el.innerHTML = `<button class="source-btn notes-toggle" data-id="${activeId}">📖 View Notes</button> <a href="${url}" target="_blank" class="source-btn">⚡ GitHub</a>`;
  }
}
