import { describe, it, expect } from 'vitest';
import { exampleQueries } from '../../src/data/exampleQueries.js';

describe('exampleQueries', () => {
  it('exposes example sets for all known endpoints', () => {
    expect(Object.keys(exampleQueries)).toEqual(
      expect.arrayContaining([
        'http://localhost:3030/rdfexplorer/sparql',
        'https://dbpedia.org/sparql',
        'https://query.wikidata.org/sparql',
        'https://rdf.insee.fr/sparql',
      ])
    );
  });

  it('every entry has a label and a query string', () => {
    for (const list of Object.values(exampleQueries)) {
      expect(Array.isArray(list)).toBe(true);
      for (const ex of list) {
        expect(typeof ex.label).toBe('string');
        expect(typeof ex.query).toBe('string');
      }
    }
  });
});
