'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { DEFAULTS, loadConfig, assertSourceDirs } = require('../src/config');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ssg-cfg-'));
}

describe('loadConfig', () => {
  test('returns defaults with resolved paths when no config file exists', () => {
    const root = tmpRoot();
    const config = loadConfig(root);
    expect(config.contentDir).toBe(DEFAULTS.contentDir);
    expect(config.paths.content).toBe(path.join(root, 'content'));
    expect(config.site.title).toBe('My Site');
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('merges user config over defaults', () => {
    const root = tmpRoot();
    fs.writeFileSync(
      path.join(root, 'ssg.config.json'),
      JSON.stringify({ outputDir: 'dist', site: { title: 'Blog' } })
    );
    const config = loadConfig(root);
    expect(config.paths.output).toBe(path.join(root, 'dist'));
    expect(config.site.title).toBe('Blog');
    expect(config.site.description).toBe('');
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('throws on invalid json or non-object config', () => {
    const root = tmpRoot();
    fs.writeFileSync(path.join(root, 'ssg.config.json'), '{oops');
    expect(() => loadConfig(root)).toThrow('invalid ssg.config.json');
    fs.writeFileSync(path.join(root, 'ssg.config.json'), '["x"]');
    expect(() => loadConfig(root)).toThrow('top level must be an object');
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe('assertSourceDirs', () => {
  test('throws a helpful error when content dir is missing', () => {
    const root = tmpRoot();
    const config = loadConfig(root);
    expect(() => assertSourceDirs(config)).toThrow('missing directory');
    fs.rmSync(root, { recursive: true, force: true });
  });
});
