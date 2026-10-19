'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  contentDir: 'content',
  layoutDir: 'layouts',
  assetDir: 'assets',
  outputDir: 'public',
  defaultLayout: 'default',
  baseUrl: '/',
  site: {
    title: 'My Site',
    description: '',
    author: '',
  },
};

/**
 * Load site configuration from ssg.config.json in the project root and
 * merge it over the defaults. Returns the merged config with absolute
 * paths resolved against the project root.
 */
function loadConfig(rootDir) {
  const root = path.resolve(rootDir);
  let userConfig = {};
  const configFile = path.join(root, 'ssg.config.json');
  if (fs.existsSync(configFile)) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (err) {
      throw new Error(`invalid ssg.config.json: ${err.message}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid ssg.config.json: top level must be an object');
    }
    userConfig = parsed;
  }

  const config = {
    ...DEFAULTS,
    ...userConfig,
    site: { ...DEFAULTS.site, ...(userConfig.site || {}) },
  };

  config.paths = {
    content: path.join(root, config.contentDir),
    layouts: path.join(root, config.layoutDir),
    assets: path.join(root, config.assetDir),
    output: path.join(root, config.outputDir),
    cache: path.join(root, '.ssg', 'cache.json'),
  };

  return config;
}

/**
 * Ensure the required source directories exist. Throws a helpful error
 * instead of failing deep inside the build pipeline.
 */
function assertSourceDirs(config) {
  for (const key of ['content', 'layouts']) {
    if (!fs.existsSync(config.paths[key]) || !fs.statSync(config.paths[key]).isDirectory()) {
      throw new Error(`missing directory: ${config.paths[key]} (run "ssg init" to scaffold a site)`);
    }
  }
}

module.exports = { DEFAULTS, loadConfig, assertSourceDirs };
