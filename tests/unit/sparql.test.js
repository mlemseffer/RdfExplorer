import { describe, it, expect, vi, afterEach } from 'vitest';
import { runSparqlRequest, convertSparqlResultsToTriples } from '../../src/services/sparql.js';

describe('convertSparqlResultsToTriples', () => {
  it('returns an empty array for malformed input', () => {
    expect(convertSparqlResultsToTriples(null)).toEqual([]);
    expect(convertSparqlResultsToTriples({})).toEqual([]);
    expect(convertSparqlResultsToTriples({ head: { vars: ['s', 'p'] } })).toEqual([]);
  });

  it('converts SPARQL JSON bindings into triples', () => {
    const results = {
      head: { vars: ['s', 'p', 'o'] },
      results: {
        bindings: [
          {
            s: { type: 'uri', value: 'http://example.org/alice' },
            p: { type: 'uri', value: 'http://xmlns.com/foaf/0.1/name' },
            o: { type: 'literal', value: 'Alice' },
          },
          {
            s: { type: 'uri', value: 'http://example.org/alice' },
            p: { type: 'uri', value: 'http://xmlns.com/foaf/0.1/knows' },
            o: { type: 'uri', value: 'http://example.org/bob' },
          },
        ],
      },
    };
    const triples = convertSparqlResultsToTriples(results);
    expect(triples).toHaveLength(2);
    expect(triples[0]).toMatchObject({
      subject: 'http://example.org/alice',
      object: 'Alice',
      objectType: 'Literal',
    });
    expect(triples[1].objectType).toBe('NamedNode');
  });

  it('fills missing s/o from nodeId when expanding', () => {
    const results = {
      head: { vars: ['s', 'p', 'o'] },
      results: {
        bindings: [
          {
            // s missing
            p: { type: 'uri', value: 'http://example.org/p' },
            o: { type: 'uri', value: 'http://example.org/x' },
          },
        ],
      },
    };
    const triples = convertSparqlResultsToTriples(results, true, 'http://example.org/me');
    expect(triples[0].subject).toBe('http://example.org/me');
  });
});

describe('runSparqlRequest', () => {
  const ORIGINAL_FETCH = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('throws when endpoint is missing', async () => {
    await expect(runSparqlRequest('', 'SELECT * WHERE { ?s ?p ?o }')).rejects.toThrow();
  });

  it('throws when query is empty', async () => {
    await expect(runSparqlRequest('http://example.org/sparql', '   ')).rejects.toThrow();
  });

  it('returns parsed JSON on a successful POST', async () => {
    const payload = { head: { vars: ['s', 'p', 'o'] }, results: { bindings: [] } };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });
    const out = await runSparqlRequest('http://example.org/sparql', 'SELECT * WHERE { ?s ?p ?o }');
    expect(out).toEqual(payload);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.method).toBe('POST');
  });

  it('falls back to GET when POST fails', async () => {
    const payload = { head: { vars: ['s', 'p', 'o'] }, results: { bindings: [] } };
    let call = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return Promise.resolve({ ok: false, text: () => Promise.resolve('boom') });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
    });
    const out = await runSparqlRequest('http://example.org/sparql', 'SELECT * WHERE { ?s ?p ?o }');
    expect(out).toEqual(payload);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[1][1].method).toBe('GET');
  });

  it('propagates AbortError without falling back', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);
    await expect(
      runSparqlRequest('http://example.org/sparql', 'SELECT * WHERE { ?s ?p ?o }')
    ).rejects.toBe(abortError);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });
});
