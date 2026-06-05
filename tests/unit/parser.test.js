import { describe, it, expect } from 'vitest';
import { parseTurtle } from '../../src/services/parser.js';

const SAMPLE_TURTLE = `
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:alice a foaf:Person ;
  foaf:name "Alice" ;
  foaf:knows ex:bob .

ex:bob a foaf:Person ;
  foaf:name "Bob" .
`;

describe('parseTurtle', () => {
  it('parses a simple Turtle document into plain triples', async () => {
    const triples = await parseTurtle(SAMPLE_TURTLE);
    // 2x rdf:type + 2x foaf:name + 1x foaf:knows = 5
    expect(triples).toHaveLength(5);
    const knows = triples.find((t) => t.predicate.endsWith('knows'));
    expect(knows.subject).toBe('http://example.org/alice');
    expect(knows.object).toBe('http://example.org/bob');
    expect(knows.objectType).toBe('NamedNode');
    const name = triples.find((t) => t.predicate.endsWith('name'));
    expect(name.objectType).toBe('Literal');
  });

  it('rejects on invalid Turtle input', async () => {
    await expect(parseTurtle('this is not turtle <<<')).rejects.toBeDefined();
  });
});
