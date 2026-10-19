# ssg — a tiny incremental static site generator

A fast, dependency-free static site generator in Node.js. Write markdown
with front matter, wrap it in layouts and partials, and get a static site —
with incremental rebuilds, a file watcher, and a dev server with live reload.

```bash
npx js-static-site-generator init my-blog
cd my-blog
npx ssg build        # -> public/
npx ssg serve        # build + watch + serve at http://localhost:3000
```

## How it works

```
content/          markdown pages (*.md) with YAML-style front matter
layouts/          *.html page layouts + partials/*.html reusable snippets
assets/           copied verbatim (css, images, fonts…)
public/           generated output
.ssg/cache.json   content-hash cache powering incremental rebuilds
```

Each page's front matter (`title`, `date`, `layout`, `draft`, …) is merged
into the template context as `page.*`. The markdown body becomes `{{{content}}}`,
and every page gets a `pages` list (newest first) plus `site.*` from
`ssg.config.json` — enough to build nav bars and blog indexes with no plugins.

## Key design decisions

1. **Zero runtime dependencies.** The markdown renderer and template engine
   are hand-written (~300 lines combined), so `npm install` pulls nothing and
   there is no supply-chain surface beyond dev-only jest. The markdown subset
   covers what blogs and docs actually use; anything fancier belongs in a
   plugin, not the core.
2. **Content-hash incremental builds.** Each page's cache key hashes the
   markdown body, its metadata, and the resolved layout source — so editing a
   layout correctly rebuilds every page that uses it, while untouched pages
   are skipped. Rebuilds of a 200-page site take milliseconds after the first.
3. **Small template language, deliberately.** `{{var}}` (escaped),
   `{{{var}}}` (raw), `{{> partial}}`, `{{#if}}`, `{{#each}}` — enough for
   real sites, too small to become a second programming language to debug.
4. **Live reload without a websocket.** The dev server injects a tiny polling
   snippet into served HTML and exposes `/__reload`; the watcher bumps a
   build id after each rebuild. No extra client dependency, works everywhere.

## Usage

```bash
ssg init [dir] [--name "My Site"]   # scaffold a starter site
ssg build [--force]                 # build into the output directory
ssg watch                           # rebuild on every source change
ssg serve [--port 3000]             # build + watch + serve with live reload
ssg clean                           # remove output dir and build cache
```

Configuration lives in `ssg.config.json` (all fields optional):

```json
{
  "contentDir": "content",
  "layoutDir": "layouts",
  "assetDir": "assets",
  "outputDir": "public",
  "defaultLayout": "default",
  "baseUrl": "/",
  "site": { "title": "My Site", "description": "", "author": "" }
}
```

Front matter example:

```markdown
---
title: Hello world
date: 2026-10-19
layout: post
draft: false
tags: [intro, meta]
---

# Hello world

Your **markdown** here.
```

See [`example/`](example) for a complete starter site you can build and serve.

## Templates

```html
<title>{{page.title}} — {{site.title}}</title>
{{> header}}
<main>{{{content}}}</main>
{{#if page.draft}}<span>draft</span>{{/if}}
{{#each pages}}<a href="{{site.baseUrl}}{{url}}">{{title}}</a>{{/each}}
{{> footer}}
```

## Running the tests

```bash
npm install
npm test
```

34 tests across 5 suites: front-matter parsing, the markdown renderer, the
template engine, config loading/validation, and the builder — including
incremental-rebuild and layout-invalidation behavior.

## Tech stack

Node.js 18+ (no runtime dependencies), Jest for tests. Standard library only:
`fs`/`path` for I/O, `crypto` for content hashing, `http` for the dev server.

## License

MIT — see [LICENSE](LICENSE).
