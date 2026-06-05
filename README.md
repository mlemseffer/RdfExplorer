# 🕸️ RdfExplorer

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

**RdfExplorer** est une application web interactive pour explorer, visualiser et
filtrer des graphes RDF, à partir de fichiers Turtle (`.ttl`) ou d'un endpoint
SPARQL (Fuseki, DBpedia, Wikidata, INSEE…).

La visualisation s'appuie sur **D3.js** (force-directed layout, tree, mini-map),
le parsing RDF sur **N3.js**, et le tout est packagé avec une chaîne moderne
**Vite + ESLint + Prettier + Vitest + Playwright + GitHub Actions + Docker**.

---

## ✨ Fonctionnalités

- Import de fichiers Turtle (`.ttl`) et de fichiers de configuration `.json`
- Exécution de requêtes SPARQL (POST avec repli GET, gestion d'annulation)
- Filtrage dynamique par prédicat, type RDF, degré, et masquage de nœuds isolés
- Exploration par profondeur (BFS), plus court chemin, énumération de chemins
- Mode sous-graphe et mode arbre (MST), clustering (par type / Louvain LPA)
- Légendes interactives, mini-map, mode sombre persistant, exports SVG / TTL / JSON

---

## 🚀 Démarrage rapide

### Prérequis

- [Node.js](https://nodejs.org/) ≥ 20 (voir [.nvmrc](.nvmrc))
- npm ≥ 10

### Installation

```bash
npm install
```

### Lancer en développement (HMR)

```bash
npm run dev
```

L'application s'ouvre sur [http://localhost:5173](http://localhost:5173).

### Build de production

```bash
npm run build      # génère ./dist
npm run preview    # sert ./dist sur http://localhost:4173
```

---

## 🧪 Tests

| Commande                | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `npm test`              | Tests unitaires Vitest (`tests/unit`)                    |
| `npm run test:watch`    | Mode watch                                               |
| `npm run test:coverage` | Couverture (V8) au format texte + HTML + lcov            |
| `npm run test:e2e`      | Tests end-to-end Playwright (Chromium)                   |
| `npm run lint`          | Analyse statique ESLint                                  |
| `npm run format`        | Formatte le code avec Prettier                           |
| `npm run ci`            | Pipeline complète locale (lint + format + tests + build) |

Avant le premier lancement des tests E2E :

```bash
npm run test:e2e:install
```

---

## 🐳 Docker

L'image se construit en deux étapes (Node 20 alpine → Nginx 1.27 alpine) :

```bash
docker build -t rdf-explorer .
docker run --rm -p 8080:8080 rdf-explorer
# → http://localhost:8080
```

Ou via Docker Compose :

```bash
docker compose up --build
```

Un endpoint de santé est exposé sur `/healthz`.

---

## ⚙️ CI/CD

Deux workflows GitHub Actions sont fournis :

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — lint, format, tests
  unitaires, build et tests Playwright à chaque push/PR.
- [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) —
  déploiement automatique sur GitHub Pages depuis `main`/`master`.

Pour activer le déploiement Pages : `Settings → Pages → Source = GitHub Actions`.

---

## 🗂️ Structure du projet

```
RdfExplorer/
├── index.html                  # Page d'entrée (chargée par Vite)
├── src/
│   ├── main.js                 # Bootstrap (import du CSS, init RdfExplorer + thème)
│   ├── app/
│   │   └── RdfExplorer.js      # Classe principale (UI, D3, état global)
│   ├── services/
│   │   ├── parser.js           # Wrapper N3.js (Turtle → triples)
│   │   └── sparql.js           # Client SPARQL + conversion résultats
│   ├── data/
│   │   └── exampleQueries.js   # Exemples SPARQL par endpoint
│   ├── utils/
│   │   ├── labels.js           # Fonctions pures (extractLabel, categorizeType…)
│   │   └── theme.js            # Contrôleur thème clair/sombre
│   └── styles/
│       └── main.css            # Feuille de style unique (variables CSS)
├── public/                     # Assets statiques copiés tel quels
│   ├── favicon.ico
│   └── graphs/                 # Jeux de données d'exemple (.ttl)
├── tests/
│   ├── unit/                   # Tests Vitest (jsdom)
│   └── e2e/                    # Tests Playwright (Chromium)
├── deploy/
│   └── nginx.conf              # Configuration nginx pour l'image Docker
├── Dockerfile / docker-compose.yml
├── vite.config.js / vitest.config.js / playwright.config.js
├── eslint.config.js / .prettierrc.json / .editorconfig
└── .github/workflows/          # CI + déploiement GitHub Pages
```

---

## 🔌 Endpoint SPARQL local (Fuseki)

```bash
cd <chemin>/apache-jena-fuseki
java -jar fuseki-server.jar
# Créez un dataset `rdfexplorer`, chargez un .ttl, puis dans l'app :
#   Endpoint = http://localhost:3030/rdfexplorer/sparql
#   Exemple  = SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100
```

---

## 📫 Contact

mohamed.lemseffer@insa-lyon.fr
