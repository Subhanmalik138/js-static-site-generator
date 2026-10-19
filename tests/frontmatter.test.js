'use strict';

const { parseFrontMatter, parseScalar } = require('../src/frontmatter');

describe('parseFrontMatter', () => {
  test('splits metadata from body', () => {
    const { data, body } = parseFrontMatter('---\ntitle: Hello\n---\n# Body\n');
    expect(data).toEqual({ title: 'Hello' });
    expect(body).toBe('# Body\n');
  });

  test('returns empty data when no front matter is present', () => {
    const { data, body } = parseFrontMatter('# Just markdown\n');
    expect(data).toEqual({});
    expect(body).toBe('# Just markdown\n');
  });

  test('parses scalars, booleans, numbers and inline arrays', () => {
    const src = '---\ndraft: true\nviews: 42\nrating: 4.5\ntags: [a, b, c]\nempty:\n---\ntext';
    const { data } = parseFrontMatter(src);
    expect(data).toEqual({ draft: true, views: 42, rating: 4.5, tags: ['a', 'b', 'c'], empty: null });
  });

  test('handles quoted strings containing colons', () => {
    const { data } = parseFrontMatter('---\ntitle: "Hello: world"\n---\n');
    expect(data.title).toBe('Hello: world');
  });

  test('ignores comment lines and malformed lines', () => {
    const { data } = parseFrontMatter('---\n# a comment\ntitle: Hi\nno-colon-here\n---\n');
    expect(data).toEqual({ title: 'Hi' });
  });
});

describe('parseScalar', () => {
  test.each([
    ['true', true],
    ['false', false],
    ['null', null],
    ['~', null],
    ['42', 42],
    ['3.14', 3.14],
    ['"quoted"', 'quoted'],
    ["'single'", 'single'],
    ['plain text', 'plain text'],
  ])('parses %p as %p', (raw, expected) => {
    expect(parseScalar(raw)).toBe(expected);
  });
});
