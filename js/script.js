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
  const search = document.getElementById('search');
  const sections = document.querySelectorAll('section[id]');
  const themeBtn = document.getElementById('theme-btn');

  function setTheme(dark) {
    document.body.classList.toggle('dark-theme', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    if (themeBtn) themeBtn.textContent = dark ? '💡' : '🕶️';
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
    if (q) {
      document.querySelectorAll('.cheat-block .code-panel pre').forEach(pre => {
        pre.querySelectorAll('.highlight').forEach(el => {
          const parent = el.parentNode;
          parent.replaceChild(document.createTextNode(el.textContent), el);
          parent.normalize();
        });
      });
      document.querySelectorAll('.cheat-block .code-panel pre').forEach(pre => {
        const text = pre.textContent;
        const idx = text.toLowerCase().indexOf(q);
        if (idx === -1) return;
        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + q.length);
        const after = text.slice(idx + q.length);
        pre.innerHTML = '';
        pre.appendChild(document.createTextNode(before));
        const mark = document.createElement('span');
        mark.className = 'highlight';
        mark.textContent = match;
        pre.appendChild(mark);
        pre.appendChild(document.createTextNode(after));
      });
    } else {
      document.querySelectorAll('.cheat-block .code-panel pre .highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      });
    }
  }
});
