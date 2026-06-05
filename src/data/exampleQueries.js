/**
 * Built-in SPARQL example queries grouped by endpoint.
 * @type {Record<string, Array<{label:string, query:string}>>}
 */
export const exampleQueries = {
  'http://localhost:3030/rdfexplorer/sparql': [
    { label: 'Choisir un exemple', query: '' },
    { label: '100 triplets généraux', query: 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100' },
    {
      label: 'Propriété MediumInterest',
      query:
        'PREFIX ns: <https://coursera.graph.edu/> SELECT ?s ?p ?o WHERE { ?s ns:MediumInterest ?o BIND(ns:MediumInterest AS ?p) } LIMIT 1000',
    },
    {
      label: 'Propriété isKnowledgeTopicOf',
      query:
        'PREFIX ns: <https://coursera.graph.edu/> SELECT ?s ?p ?o WHERE { ?s ns:isKnowledgeTopicOf ?o BIND(ns:isKnowledgeTopicOf AS ?p) } LIMIT 1000',
    },
    {
      label: "Objets contenant 'machine'",
      query:
        'PREFIX ns: <https://schema.org/> SELECT ?s ?p ?o WHERE { ?s ?p ?o . FILTER(isLiteral(?o) && CONTAINS(LCASE(STR(?o)), "machine")) }',
    },
  ],
  'https://dbpedia.org/sparql': [
    { label: 'Choisir un exemple', query: '' },
    {
      label: 'Villes et pays',
      query:
        'SELECT ?s ?p ?o WHERE { ?s a dbo:City ; dbo:country ?o . BIND(dbo:country AS ?p) } LIMIT 100',
    },
    {
      label: 'Films et réalisateurs',
      query:
        'SELECT ?s ?p ?o WHERE { ?s a dbo:Film ; dbo:director ?o . BIND(dbo:director AS ?p) } LIMIT 100',
    },
    {
      label: 'Séries télé et genre',
      query:
        'SELECT ?s ?p ?o WHERE { ?s a dbo:TelevisionShow ; dbo:genre ?o . BIND(dbo:genre AS ?p) } LIMIT 100',
    },
  ],
  'https://query.wikidata.org/sparql': [
    { label: 'Choisir un exemple', query: '' },
    {
      label: 'Écrivains et lieu de naissance',
      query:
        'SELECT ?s ?p ?o WHERE { ?s wdt:P31 wd:Q5 ; wdt:P106 wd:Q36180 ; wdt:P19 ?o . BIND(wdt:P19 AS ?p) } LIMIT 100',
    },
    {
      label: 'Pays et voisins',
      query:
        'SELECT ?s ?p ?o WHERE { ?s wdt:P31 wd:Q6256 ; wdt:P47 ?o . BIND(wdt:P47 AS ?p) } LIMIT 100',
    },
    {
      label: 'Films et réalisateurs',
      query:
        'SELECT ?s ?p ?o WHERE { ?s wdt:P31 wd:Q11424 ; wdt:P57 ?o . BIND(wdt:P57 AS ?p) } LIMIT 100',
    },
  ],
  'https://rdf.insee.fr/sparql': [
    { label: 'Choisir un exemple', query: '' },
    {
      label: 'Communes et triplets',
      query:
        'PREFIX insee: <http://rdf.insee.fr/def/geo#> SELECT ?s ?p ?o WHERE { ?s a insee:Commune ; ?p ?o . } LIMIT 100',
    },
    {
      label: 'Communes et code INSEE',
      query:
        'PREFIX geo: <http://rdf.insee.fr/def/geo#> SELECT ?s ?p ?o WHERE { ?s a geo:Commune ; geo:codeINSEE ?o . BIND(geo:codeINSEE AS ?p) } LIMIT 100',
    },
    {
      label: 'Arrondissements et code INSEE',
      query:
        'PREFIX geo: <http://rdf.insee.fr/def/geo#> SELECT ?s ?p ?o WHERE { ?s geo:codeINSEE ?o . BIND(geo:codeINSEE AS ?p) } LIMIT 100',
    },
  ],
};
