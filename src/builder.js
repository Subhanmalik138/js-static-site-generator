'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseFrontMatter } = require('./frontmatter');
const { renderMarkdown } = require('./markdown');
const { render } = require('./template');
const { assertSourceDirs } = require('./config');

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function walk(dir, ext) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full, ext));
    else if (entry.isFile() && full.endsWith(ext)) found.push(full);
  }
  return found.sort();
}

function loadCache(cacheFile) {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cacheFile, cache) {
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

function pageUrl(relPath) {
  // content/blog/hello.md -> blog/hello.html ; content/index.md -> index.html
  const withoutExt = relPath.replace(/\.md$/, '');
  const normalized = withoutExt.split(path.sep).join('/');
  return normalized === 'index' ? 'index.html' : `${normalized}.html`;
}

/**
 * Discover markdown pages under the content directory. Drafts
 * (front matter `draft: true`) are skipped.
 */
function collectPages(config) {
  const files = walk(config.paths.content, '.md');
  const pages = [];
  for (const file of files) {
    const rel = path.relative(config.paths.content, file);
    const source = fs.readFileSync(file, 'utf8');
    const { data, body } = parseFrontMatter(source);
    if (data.draft === true) continue;
    pages.push({
      file,
      rel,
      url: pageUrl(rel),
      data,
      body,
      layout: data.layout || config.defaultLayout,
      title: data.title || path.basename(rel, '.md'),
    });
  }
  return pages;
}

function loadLayout(layoutsDir, name, cache) {
  if (cache.has(name)) return cache.get(name);
  const file = path.join(layoutsDir, `${name}.html`);
  if (!fs.existsSync(file)) {
    throw new Error(`layout not found: ${name} (expected ${file})`);
  }
  const source = fs.readFileSync(file, 'utf8');
  cache.set(name, source);
  return source;
}

function pageHash(page, layoutSource) {
  return sha256(page.body + '\n\x00\n' + layoutSource + '\n\x00\n' + JSON.stringify(page.data));
}

function renderPage(page, layoutSource, context) {
  const content = renderMarkdown(page.body);
  return render(layoutSource, {
    ...context,
    page: { ...page.data, title: page.title, url: page.url },
    content,
  }, { partialsDir: path.join(context.__layoutsDir, 'partials') });
}

function copyDir(src, dest) {
  let copied = 0;
  if (!fs.existsSync(src)) return copied;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copied += copyDir(from, to);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      copied += 1;
    }
  }
  return copied;
}

/**
 * Build the site. Unchanged pages (same content + layout + metadata)
 * are skipped using a content-hash cache, so rebuilds stay fast.
 * Returns { built, skipped, assets }.
 */
function build(config, { force = false } = {}) {
  assertSourceDirs(config);
  fs.mkdirSync(config.paths.output, { recursive: true });

  const cache = force ? {} : loadCache(config.paths.cache);
  const layoutCache = new Map();
  const pages = collectPages(config);

  // Shared page listing (newest first) available to every template.
  const listing = pages
    .map((p) => ({ title: p.title, url: p.url, date: p.data.date || '' }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const baseContext = {
    site: { ...config.site, baseUrl: config.baseUrl },
    pages: listing,
    __layoutsDir: config.paths.layouts,
  };

  let built = 0;
  let skipped = 0;

  for (const page of pages) {
    const layoutSource = loadLayout(config.paths.layouts, page.layout, layoutCache);
    const hash = pageHash(page, layoutSource);
    const outFile = path.join(config.paths.output, page.url);
    const cached = cache[page.rel];

    if (!force && cached && cached.hash === hash && fs.existsSync(outFile)) {
      skipped += 1;
      continue;
    }

    const html = renderPage(page, layoutSource, baseContext);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, html);
    cache[page.rel] = { hash, output: page.url };
    built += 1;
  }

  // Drop cache entries for deleted pages.
  const known = new Set(pages.map((p) => p.rel));
  for (const key of Object.keys(cache)) {
    if (!known.has(key)) delete cache[key];
  }
  saveCache(config.paths.cache, cache);

  const assets = copyDir(config.paths.assets, config.paths.output);

  return { built, skipped, assets };
}

module.exports = { build, collectPages, copyDir, pageUrl };
