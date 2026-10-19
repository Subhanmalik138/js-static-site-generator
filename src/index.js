'use strict';

const { loadConfig } = require('./config');
const { parseFrontMatter } = require('./frontmatter');
const { renderMarkdown } = require('./markdown');
const { render } = require('./template');

module.exports = { loadConfig, parseFrontMatter, renderMarkdown, render };
