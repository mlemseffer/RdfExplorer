/**
 * Pure utility functions for working with RDF URIs and labels.
 * These are framework-agnostic and easy to unit-test.
 */

/**
 * Extract a human-readable label from an RDF URI by taking the local name
 * after the last `#` or `/`. Falls back to the input if neither is present.
 * @param {string} uri
 * @returns {string}
 */
export function extractLabel(uri) {
  if (typeof uri !== 'string') return '';
  if (uri.includes('#')) return uri.split('#').pop();
  if (uri.includes('/')) return uri.split('/').pop();
  return uri;
}

/**
 * Categorize an RDF type URI into a lowercased local name.
 * @param {string} typeUri
 * @returns {string}
 */
export function categorizeType(typeUri) {
  if (!typeUri || typeof typeUri !== 'string') return 'unknown';
  const label = extractLabel(typeUri);
  return label ? label.toLowerCase() : 'unknown';
}

/**
 * Infer a pseudo-type for a literal value from its predicate URI.
 * @param {string} predicate
 * @returns {string}
 */
export function inferLiteralType(predicate) {
  return extractLabel(predicate);
}

/**
 * Heuristically derive a default type for a node whose `rdf:type` is missing.
 * @param {string} id - Node URI/IRI.
 * @returns {string} Inferred type (or "unknown").
 */
export function inferDefaultType(id) {
  if (!id || typeof id !== 'string') return 'unknown';
  if (!(id.startsWith('http://') || id.startsWith('https://'))) return 'unknown';

  if (id.includes('xmlns.com/foaf/0.1/') || id.includes('schema.org')) return 'Class';
  if (id.includes('course_')) return 'LearningResource';
  if (id.includes('user_')) return 'Person';

  const segments = id.split('/').filter(Boolean);
  if (segments.length >= 2) return segments[segments.length - 2];
  return 'unknown';
}

/**
 * Quick predicate test for `rdf:type` URIs.
 * @param {string} predicate
 * @returns {boolean}
 */
export function isRdfTypePredicate(predicate) {
  if (typeof predicate !== 'string') return false;
  return predicate.includes('rdf-syntax-ns#type') || predicate.endsWith('#type');
}
