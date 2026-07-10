const LANGUAGES = [
  { id: 'HTML', href: 'index.html', icon: '🌐' },
  { id: 'CSS', href: 'css-cheatsheet.html', icon: '🎨' },
  { id: 'JS', href: 'js-cheatsheet.html', icon: '⚡' },
  { id: 'Java', href: 'java-cheatsheet.html', icon: '☕' },
  { id: 'C', href: 'c-cheatsheet.html', icon: '⚙️' },
  { id: 'Python', href: 'python-cheatsheet.html', icon: '🔷' },
  { id: 'SQL', href: 'postgresql-cheatsheet.html', icon: '🗄️' },
  { id: 'Shell', href: 'shell-cheatsheet.html', icon: '💻' },
  { id: 'VS Code', href: 'vscode-cheatsheet.html', icon: '📝' },
  { id: 'AI', href: 'ai-cheatsheet.html', icon: '🤖' },
  { id: 'Mac', href: 'mac-cheatsheet.html', icon: '🍎' },
  { id: 'Git', href: 'git-cheatsheet.html', icon: '🌿' },
];

function renderHeader(activeId) {
  const tabBar = document.getElementById('tab-bar');
  if (!tabBar) return;
  tabBar.innerHTML = LANGUAGES.map(l => {
    const active = l.id === activeId ? ' active' : '';
    return `<a href="${l.href}" class="tab${active}">
      <span class="tab-icon">${l.icon}</span>
      <span class="tab-label">${l.id}</span>
    </a>`;
  }).join('');
}
