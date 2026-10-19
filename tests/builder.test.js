'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig } = require('../src/config');
const { build, collectPages, pageUrl } = require('../src/builder');

function scaffold() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssg-bld-'));
  fs.mkdirSync(path.join(root, 'content', 'blog'), { recursive: true });
  fs.mkdirSync(path.join(root, 'layouts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'content', 'index.md'),
    '---\ntitle: Home\ndate: 2026-10-19\n---\n\n# Hello\n\nWelcome.\n'
  );
  fs.writeFileSync(
    path.join(root, 'content', 'blog', 'first.md'),
    '---\ntitle: First post\ndate: 2026-10-18\n---\n\nPost body.\n'
  );
  fs.writeFileSync(
    path.join(root, 'content', 'draft.md'),
    '---\ntitle: Draft\ndraft: true\n---\n\nNot published.\n'
  );
  fs.writeFileSync(path.join(root, 'layouts', 'default.html'), '<html><body>{{{content}}}</body></html>');
  fs.writeFileSync(path.join(root, 'assets', 'style.css'), 'body{}');
  return root;
}

describe('pageUrl', () => {
  test('maps index.md to index.html and nested files to nested urls', () => {
    expect(pageUrl('index.md')).toBe('index.html');
    expect(pageUrl(path.join('blog', 'first.md'))).toBe('blog/first.html');
  });
});

describe('build', () => {
  test('renders pages, skips drafts, copies assets, and rebuilds incrementally', () => {
    const root = scaffold();
    const config = loadConfig(root);

    expect(collectPages(config)).toHaveLength(2);

    const first = build(config);
    expect(first.built).toBe(2);
    expect(first.skipped).toBe(0);
    expect(first.assets).toBe(1);

    const indexHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
    expect(indexHtml).toContain('<h1>Hello</h1>');
    expect(fs.existsSync(path.join(root, 'public', 'draft.html'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'public', 'style.css'))).toBe(true);

    // Nothing changed: everything skipped.
    const second = build(config);
    expect(second.built).toBe(0);
    expect(second.skipped).toBe(2);

    // Touch one page: only that page rebuilds.
    fs.appendFileSync(path.join(root, 'content', 'blog', 'first.md'), '\nMore.\n');
    const third = build(config);
    expect(third.built).toBe(1);
    expect(third.skipped).toBe(1);

    // Force rebuilds everything.
    const fourth = build(config, { force: true });
    expect(fourth.built).toBe(2);

    fs.rmSync(root, { recursive: true, force: true });
  });

  test('layout changes invalidate the cache', () => {
    const root = scaffold();
    const config = loadConfig(root);
    build(config);
    fs.writeFileSync(path.join(root, 'layouts', 'default.html'), '<html><body class="x">{{{content}}}</body></html>');
    const stats = build(config);
    expect(stats.built).toBe(2);
    const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
    expect(html).toContain('class="x"');
    fs.rmSync(root, { recursive: true, force: true });
  });
});
