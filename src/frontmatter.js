'use strict';

const FRONT_MATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Parse a scalar value from front matter. Supports quoted strings,
 * numbers, booleans, null, and inline arrays like [a, b, c].
 */
function parseScalar(raw) {
  const value = raw.trim();
  if (value === '' || value === '~' || value.toLowerCase() === 'null') return null;
  const lower = value.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  const quoted = /^(['"])([\s\S]*)\1$/.exec(value);
  if (quoted) return quoted[2];
  if (/^[+-]?\d+$/.test(value)) return parseInt(value, 10);
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(value)) return parseFloat(value);
  const array = /^\[([\s\S]*)\]$/.exec(value);
  if (array) {
    const inner = array[1].trim();
    return inner === '' ? [] : splitCsv(inner).map(parseScalar);
  }
  return value;
}

// Split on commas that are not inside quotes.
function splitCsv(s) {
  const parts = [];
  let current = '';
  let quote = null;
  for (const ch of s) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ',') {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/**
 * Split a markdown document into front matter metadata and body.
 * Returns { data, body }. If there is no valid front-matter block,
 * data is {} and body is the full source.
 */
function parseFrontMatter(source) {
  const text = String(source);
  const match = FRONT_MATTER_RE.exec(text);
  if (!match) return { data: {}, body: text };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    if (!key) continue;
    data[key] = parseScalar(line.slice(colon + 1));
  }
  return { data, body: text.slice(match[0].length) };
}

module.exports = { parseFrontMatter, parseScalar };
