'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const RELOAD_SNIPPET = `<script>(function(){var v=__BUILD_ID__;setInterval(function(){fetch("/__reload").then(function(r){return r.text()}).then(function(t){if(t!==String(v))location.reload()})["catch"](function(){})},1000)})();</script>`;

function contentType(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const resolved = path.normalize(path.join(root, decoded));
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  return resolved;
}

/**
 * Start a static dev server over the output directory. When `liveReload`
 * is on, an auto-refresh snippet is injected into HTML pages and
 * `/__reload` reports the current build id (see watch mode).
 */
function serve(outputDir, { port = 3000, liveReload = false, getBuildId = () => '0' } = {}) {
  const root = path.resolve(outputDir);

  const server = http.createServer((req, res) => {
    if (req.url === '/__reload') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(String(getBuildId()));
      return;
    }

    let file = safeJoin(root, req.url === '/' ? '/index.html' : req.url);
    if (!file) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }

    let body = fs.readFileSync(file);
    const type = contentType(file);
    if (liveReload && type.startsWith('text/html')) {
      const id = String(getBuildId());
      const snippet = RELOAD_SNIPPET.replace('__BUILD_ID__', JSON.stringify(id));
      body = Buffer.from(body.toString('utf8').replace(/<\/body>/i, `${snippet}</body>`));
    }
    res.writeHead(200, { 'content-type': type });
    res.end(body);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, port: server.address().port }));
  });
}

module.exports = { serve, contentType };
