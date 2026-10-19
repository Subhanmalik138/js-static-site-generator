'use strict';

const { renderMarkdown } = require('../src/markdown');

describe('renderMarkdown', () => {
  test('renders headings and paragraphs', () => {
    const html = renderMarkdown('# Hello\n\nSome text.\n');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<p>Some text.</p>');
  });

  test('renders inline formatting', () => {
    const html = renderMarkdown('**bold** and *italic* and `code` and [link](https://x.test).\n');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<a href="https://x.test">link</a>');
  });

  test('renders fenced code blocks with language class and escapes html', () => {
    const html = renderMarkdown('```js\nconst a = 1 < 2;\n```\n');
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain('1 &lt; 2');
  });

  test('renders lists and blockquotes', () => {
    const html = renderMarkdown('- one\n- two\n\n> quoted\n');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<blockquote>');
  });

  test('renders ordered lists and horizontal rules', () => {
    const html = renderMarkdown('1. first\n2. second\n\n---\n');
    expect(html).toContain('<ol>');
    expect(html).toContain('<hr>');
  });

  test('escapes raw html in prose but keeps markup in code spans literal', () => {
    const html = renderMarkdown('<script>alert(1)</script> and `<b>`\n');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<code>&lt;b&gt;</code>');
  });

  test('renders images', () => {
    const html = renderMarkdown('![alt](/img.png "title")\n');
    expect(html).toContain('<img src="/img.png" alt="alt" title="title">');
  });
});
