import { Parser } from 'n3';

/**
 * Parse a Turtle/N-Triples string into an array of plain triple objects.
 * @param {string} content - Raw RDF content in Turtle or N-Triples.
 * @returns {Promise<Array<{subject:string,predicate:string,object:string,objectType:string}>>}
 */
export function parseTurtle(content) {
  return new Promise((resolve, reject) => {
    const parser = new Parser();
    const triples = [];
    parser.parse(content, (error, quad) => {
      if (error) {
        reject(error);
        return;
      }
      if (quad) {
        triples.push({
          subject: quad.subject.value,
          predicate: quad.predicate.value,
          object: quad.object.value,
          objectType: quad.object.termType,
        });
      } else {
        resolve(triples);
      }
    });
  });
}
