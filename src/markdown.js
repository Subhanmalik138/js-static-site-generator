'use strict';

// A compact, dependency-free Markdown renderer covering the subset blogs
// and docs actually use: headings, fenced code blocks, blockquotes,
// ordered/unordered lists, horizontal rules, paragraphs, and inline
// formatting (code, bold, italic, links, images).

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text) {
  // Escape first, then re-introduce markup from the escaped text. The
  // escape/unescape pairs below are safe because escapeHtml never emits
  // the placeholder characters themselves as markup.
  let out = escapeHtml(text);

  // Inline code spans (processed first so markup inside code stays literal).
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);

  // Images before links so the leading ! is consumed correctly.
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, alt, src, title) =>
      title
        ? `<img src="${src}" alt="${alt}" title="${title}">`
        : `<img src="${src}" alt="${alt}">`);

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, label, href, title) =>
      title
        ? `<a href="${href}" title="${title}">${label}</a>`
        : `<a href="${href}">${label}</a>`);

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^_\w])_([^_\n]+)_(?![_\w])/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return out;
}

function listItemType(line) {
  if (/^(\s*)[-*+]\s+/.test(line)) return 'ul';
  if (/^(\s*)\d+[.)]\s+/.test(line)) return 'ol';
  return null;
}

function renderLines(lines) {
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block.
    const fence = /^```(\S*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1];
      const code = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // consume closing fence
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      html.push(`<pre><code${cls}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // ATX heading.
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      html.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);
      i += 1;
      continue;
    }

    // Horizontal rule.
    if (/^\s*([-*_]\s*){3,}$/.test(line)) {
      html.push('<hr>');
      i += 1;
      continue;
    }

    // Blockquote (merge consecutive > lines).
    if (/^\s*>/.test(line)) {
      const quoted = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*> ?/, ''));
        i += 1;
      }
      html.push(`<blockquote>\n${renderLines(quoted).join('\n')}\n</blockquote>`);
      continue;
    }

    // Lists (merge consecutive items of the same list type; one nesting level via indentation).
    const type = listItemType(line);
    if (type) {
      const items = [];
      while (i < lines.length && listItemType(lines[i]) === type) {
        items.push(lines[i].replace(/^(\s*)(?:[-*+]|\d+[.)])\s+/, ''));
        i += 1;
      }
      html.push(`<${type}>\n${items.map((t) => `<li>${renderInline(t)}</li>`).join('\n')}\n</${type}>`);
      continue;
    }

    // Blank line: paragraph separator.
    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    // Paragraph: merge consecutive non-blank, non-block lines.
    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6}\s|```|\s*>)/.test(lines[i]) &&
      !listItemType(lines[i]) &&
      !/^\s*([-*_]\s*){3,}$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${renderInline(para.join(' '))}</p>`);
  }

  return html;
}

function renderMarkdown(source) {
  return renderLines(String(source).replace(/\r\n?/g, '\n').split('\n')).join('\n');
}

module.exports = { renderMarkdown, renderInline, escapeHtml };
