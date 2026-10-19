'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { render } = require('../src/template');

describe('render (template engine)', () => {
  test('interpolates variables, escaping html by default', () => {
    expect(render('Hello {{name}}!', { name: '<b>Ann</b>' })).toBe('Hello &lt;b&gt;Ann&lt;/b&gt;!');
  });

  test('supports triple-brace raw output and dot paths', () => {
    expect(render('{{{site.tagline}}}', { site: { tagline: '<em>x</em>' } })).toBe('<em>x</em>');
    expect(render('{{site.title}}', { site: { title: 'T' } })).toBe('T');
  });

  test('renders missing variables as empty strings', () => {
    expect(render('[{{nope}}]', {})).toBe('[]');
  });

  test('conditionals render on truthiness', () => {
    expect(render('{{#if draft}}DRAFT{{/if}}ok', { draft: true })).toBe('DRAFTok');
    expect(render('{{#if draft}}DRAFT{{/if}}ok', { draft: false })).toBe('ok');
  });

  test('each loops expose item fields and @index', () => {
    const out = render('{{#each posts}}{{@index}}:{{title}};{{/each}}', {
      posts: [{ title: 'a' }, { title: 'b' }],
    });
    expect(out).toBe('0:a;1:b;');
  });

  test('partials are loaded from the partials directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssg-tpl-'));
    fs.mkdirSync(path.join(dir, 'partials'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'partials', 'head.html'), '<title>{{site.title}}</title>');
    const out = render('{{> head}}', { site: { title: 'T' } }, { partialsDir: path.join(dir, 'partials') });
    expect(out).toBe('<title>T</title>');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
