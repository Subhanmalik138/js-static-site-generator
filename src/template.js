'use strict';

const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('./markdown');

// Minimal template engine. Supported syntax:
//
//   {{title}}            escaped variable (dot paths allowed: {{site.title}})
//   {{{content}}}        raw (unescaped) variable
//   {{> header}}         include a partial (layouts/partials/<name>.html)
//   {{#if draft}}…{{/if}}       conditional block (truthiness of the variable)
//   {{#each posts}}…{{/each}}   iterate an array; item fields merge into scope,
//                               {{@index}} gives the zero-based index

function lookup(context, dotted) {
  if (dotted === '@index') return context['@index'];
  const parts = dotted.split('.');
  let value = context;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = value[part];
  }
  return value;
}

function loadPartial(name, partialsDir, cache) {
  if (cache.has(name)) return cache.get(name);
  const file = path.join(partialsDir, `${name}.html`);
  let source = '';
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch {
    source = '';
  }
  cache.set(name, source);
  return source;
}

function render(template, context = {}, options = {}) {
  const partialsDir = options.partialsDir || null;
  const cache = options.partialCache || new Map();
  let out = String(template);

  // Partials (recursive render so partials can use the same syntax).
  out = out.replace(/\{\{>\s*([\w./-]+)\s*\}\}/g, (_, name) => {
    if (!partialsDir) return '';
    const partial = loadPartial(name, partialsDir, cache);
    return render(partial, context, { partialsDir, partialCache: cache });
  });

  // Each loops.
  out = out.replace(/\{\{#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, body) => {
    const list = lookup(context, key);
    if (!Array.isArray(list)) return '';
    return list
      .map((item, index) => {
        const scope =
          item && typeof item === 'object'
            ? { ...context, ...item, '@index': index }
            : { ...context, this: item, '@index': index };
        return render(body, scope, { partialsDir, partialCache: cache });
      })
      .join('');
  });

  // Conditionals.
  out = out.replace(/\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) => {
    const value = lookup(context, key);
    return value ? render(body, context, { partialsDir, partialCache: cache }) : '';
  });

  // Raw (unescaped) interpolation.
  out = out.replace(/\{\{\{\s*([\w.@]+(?:\.[\w]+)*)\s*\}\}\}/g, (_, key) => {
    const value = lookup(context, key);
    return value === undefined || value === null ? '' : String(value);
  });

  // Escaped interpolation.
  out = out.replace(/\{\{\s*([\w.@]+(?:\.[\w]+)*)\s*\}\}/g, (_, key) => {
    const value = lookup(context, key);
    return value === undefined || value === null ? '' : escapeHtml(String(value));
  });

  return out;
}

module.exports = { render };
