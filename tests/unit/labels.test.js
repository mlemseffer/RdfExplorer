import { describe, it, expect } from 'vitest';
import {
  extractLabel,
  categorizeType,
  inferLiteralType,
  inferDefaultType,
  isRdfTypePredicate,
} from '../../src/utils/labels.js';

describe('extractLabel', () => {
  it('returns local name after the last "#"', () => {
    expect(extractLabel('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')).toBe('type');
  });

  it('returns the segment after the last "/"', () => {
    expect(extractLabel('http://example.org/people/alice')).toBe('alice');
  });

  it('returns the input when no separator is present', () => {
    expect(extractLabel('alice')).toBe('alice');
  });

  it('handles non-string input gracefully', () => {
    expect(extractLabel(undefined)).toBe('');
    expect(extractLabel(null)).toBe('');
    expect(extractLabel(42)).toBe('');
  });
});

describe('categorizeType', () => {
  it('lowercases the local name', () => {
    expect(categorizeType('http://example.org/Person')).toBe('person');
  });

  it('returns "unknown" for empty/invalid input', () => {
    expect(categorizeType('')).toBe('unknown');
    expect(categorizeType(null)).toBe('unknown');
    expect(categorizeType(undefined)).toBe('unknown');
  });
});

describe('inferLiteralType', () => {
  it('uses the predicate local name as the literal type', () => {
    expect(inferLiteralType('http://schema.org/name')).toBe('name');
  });
});

describe('inferDefaultType', () => {
  it('returns "unknown" for non-HTTP URIs', () => {
    expect(inferDefaultType('blank-node-1')).toBe('unknown');
  });

  it('detects FOAF/schema as Class', () => {
    expect(inferDefaultType('http://xmlns.com/foaf/0.1/Person')).toBe('Class');
    expect(inferDefaultType('https://schema.org/name')).toBe('Class');
  });

  it('detects course_ as LearningResource', () => {
    expect(inferDefaultType('https://example.org/courses/course_42')).toBe('LearningResource');
  });

  it('detects user_ as Person', () => {
    expect(inferDefaultType('https://example.org/users/user_42')).toBe('Person');
  });

  it('falls back to penultimate path segment', () => {
    expect(inferDefaultType('https://example.org/foo/bar')).toBe('foo');
  });
});

describe('isRdfTypePredicate', () => {
  it('matches the standard rdf:type URI', () => {
    expect(isRdfTypePredicate('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')).toBe(true);
  });

  it('matches any URI ending with #type', () => {
    expect(isRdfTypePredicate('http://example.org/voc#type')).toBe(true);
  });

  it('rejects other predicates', () => {
    expect(isRdfTypePredicate('http://example.org/name')).toBe(false);
    expect(isRdfTypePredicate(null)).toBe(false);
  });
});
