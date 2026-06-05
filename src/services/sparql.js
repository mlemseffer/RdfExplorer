/**
 * Service layer for SPARQL endpoints.
 *
 * Provides:
 *  - `runSparqlRequest(endpoint, query, signal)`: POST with GET fallback.
 *  - `convertSparqlResultsToTriples(results, [isExpand], [nodeId])`: results -> triples.
 */

const ACCEPT_JSON = 'application/sparql-results+json';

/**
 * Execute a SPARQL SELECT query against an endpoint.
 *
 * Uses POST with `application/x-www-form-urlencoded` (avoids URL length limits),
 * and falls back to GET if the POST fails (e.g. due to CORS configuration).
 *
 * @param {string} endpoint - Full endpoint URL.
 * @param {string} query - SPARQL query.
 * @param {AbortSignal} [signal] - Optional abort signal.
 * @returns {Promise<object>} Parsed SPARQL JSON results.
 */
export async function runSparqlRequest(endpoint, query, signal) {
  if (!endpoint) throw new Error('Endpoint SPARQL manquant.');
  if (!query || !query.trim()) throw new Error('Requête SPARQL vide.');

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: ACCEPT_JSON,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: 'query=' + encodeURIComponent(query),
      signal,
    });
    if (!resp.ok) throw new Error(await resp.text());
    return await resp.json();
  } catch (postError) {
    if (postError && postError.name === 'AbortError') throw postError;
    // Fallback GET
    const fullUrl = endpoint + '?query=' + encodeURIComponent(query);
    const resp = await fetch(fullUrl, {
      method: 'GET',
      headers: { Accept: ACCEPT_JSON },
      signal,
    });
    if (!resp.ok) {
      throw new Error(`Erreur SPARQL ${resp.status} :\n${await resp.text()}`);
    }
    return resp.json();
  }
}

/**
 * Convert a SPARQL JSON result set into an array of triples.
 *
 * The function looks at the first three projected variables (in order)
 * and treats them as subject, predicate, object respectively.
 *
 * @param {object} results - SPARQL JSON results.
 * @param {boolean} [isExpand=false] - When true, missing s/o are filled with `nodeId`.
 * @param {string|null} [nodeId=null] - Node id used to fill missing values when expanding.
 * @returns {Array<{subject:string,predicate:string,object:string,objectType:string}>}
 */
export function convertSparqlResultsToTriples(results, isExpand = false, nodeId = null) {
  const triples = [];
  if (!results || !results.head || !Array.isArray(results.head.vars)) return triples;
  const variables = results.head.vars;
  if (variables.length < 3) return triples;
  const [firstVar, secondVar, thirdVar] = variables;
  const bindings = results.results?.bindings ?? [];

  for (const binding of bindings) {
    const s = binding[firstVar]?.value ?? (isExpand ? nodeId : null);
    const p = binding[secondVar]?.value ?? null;
    const o = binding[thirdVar]?.value ?? (isExpand ? nodeId : null);
    const oType = binding[thirdVar]?.type === 'literal' ? 'Literal' : 'NamedNode';

    if (s && p && o) {
      triples.push({ subject: s, predicate: p, object: o, objectType: oType });
    }
  }
  return triples;
}
