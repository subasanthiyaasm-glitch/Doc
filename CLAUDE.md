# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static HTML/CSS/JS cheatsheet site with live previews. No build step, no package manager, no framework — open any `.html` file directly in a browser.

## Running the site

```bash
open index.html                  # macOS: open in default browser
python3 -m http.server 8000      # serve locally (needed for fetch demos)
```

## Architecture

Three shared assets power all pages:

- **`js/header.js`** — The `LANGUAGES` array is the single source of truth for the tab bar. `renderHeader(activeId)` generates the nav on every page. Add a new language here only; all pages pick it up automatically.
- **`js/script.js`** — Search filtering (section-level visibility + text highlight), theme toggle (`localStorage`), keyboard shortcuts (`/` and `Cmd/Ctrl+K` focus search, `Enter`/`Shift+Enter` cycle matches, `Esc` clears), and the JS fetch demo functions.
- **`css/style.css`** — All styles via CSS custom properties. Light/dark tokens defined in `:root` and `.dark-theme` respectively. The code panel always uses dark bg (`--code-bg`); the live panel uses `--panel-bg`.

Each cheatsheet page (`index.html`, `*-cheatsheet.html`) is self-contained HTML that:
1. Links `css/style.css`
2. Includes a `<nav class="tab-bar" id="tab-bar">` and calls `renderHeader('LangId')`
3. Has a TOC `<nav class="toc">` linking to `<section id="...">` anchors

## Adding a new cheatsheet

1. Add an entry to the `LANGUAGES` array in `js/header.js`.
2. Copy an existing page as a template (e.g. `cp java-cheatsheet.html foo-cheatsheet.html`).
3. Update `<title>`, `<h1>`, `renderHeader('Foo')`, TOC links, and section content.

## Cheat-block markup pattern

Every example follows this two-part structure:

```html
<div class="block-desc">
  <span>One-sentence explanation with <code>inline code</code>.</span>
  <a class="w3-link" href="https://www.w3schools.com/..." target="_blank">W3Schools →</a>
</div>
<div class="cheat-block">
  <div class="code-panel">
    <div class="panel-label">filename or topic</div>
    <pre><!-- syntax-highlighted code --></pre>
  </div>
  <div class="live-panel">
    <div class="live-output"><!-- rendered result --></div>
  </div>
</div>
```

Syntax highlighting in `<pre>` blocks uses plain `<span class="c">` for comments/accents. For non-HTML languages, add a `<style>` block in `<head>` with custom highlight colors.

## Consistency checks

When editing, verify tab bars stay in sync across all pages:

```bash
rg 'renderHeader' *.html
```
