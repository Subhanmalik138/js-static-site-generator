'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES = {
  'ssg.config.json': (name) => JSON.stringify({
    contentDir: 'content',
    layoutDir: 'layouts',
    assetDir: 'assets',
    outputDir: 'public',
    defaultLayout: 'default',
    site: { title: name, description: 'A site built with ssg', author: '' },
  }, null, 2) + '\n',

  'content/index.md': (name) => `---
title: Home
date: 2026-10-19
---

# Welcome to ${name}

This is your new static site. Edit the markdown files in \`content/\`
and run \`ssg build\` to regenerate the site.

## Next steps

- Write posts in \`content/\` using markdown with front matter
- Customize \`layouts/default.html\` to change the look
- Run \`ssg serve\` for live reloading while you write
`,

  'content/about.md': () => `---
title: About
date: 2026-10-19
---

# About

Tell the world who you are on this page.
`,

  'layouts/default.html': () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{page.title}} — {{site.title}}</title>
  <meta name="description" content="{{site.description}}">
  <link rel="stylesheet" href="{{site.baseUrl}}style.css">
</head>
<body>
  {{> header}}
  <main>
    {{{content}}}
  </main>
  {{> footer}}
</body>
</html>
`,

  'layouts/partials/header.html': () => `<header>
  <nav>
    <a class="brand" href="{{site.baseUrl}}">{{site.title}}</a>
    {{#each pages}}<a href="{{site.baseUrl}}{{url}}">{{title}}</a>{{/each}}
  </nav>
</header>
`,

  'layouts/partials/footer.html': () => `<footer>
  <p>Built with ssg — a tiny static site generator.</p>
</footer>
`,

  'assets/style.css': () => `body { font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto;
  padding: 2rem 1rem; line-height: 1.6; color: #222; }
nav { display: flex; gap: 1rem; align-items: baseline; margin-bottom: 2rem; }
nav .brand { font-weight: 700; font-size: 1.25rem; }
pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; border-radius: 6px; }
code { background: #f4f4f4; padding: 0.15rem 0.35rem; border-radius: 4px; }
pre code { background: none; padding: 0; }
img { max-width: 100%; }
footer { margin-top: 3rem; color: #666; font-size: 0.9rem; }
`,
};

/**
 * Scaffold a starter site in the target directory.
 */
function init(targetDir, name = 'My Site') {
  const root = path.resolve(targetDir);
  for (const [rel, make] of Object.entries(TEMPLATES)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, make(name));
    }
  }
  return root;
}

module.exports = { init };
