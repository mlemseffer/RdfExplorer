# 🕸️ RdfExplorer

**RdfExplorer** est une application web interactive permettant d'explorer, visualiser et filtrer dynamiquement des graphes RDF à partir de fichiers au format Turtle (`.ttl`) ou via un endpoint SPARQL (comme Apache Jena Fuseki).  
Elle utilise **D3.js** pour la visualisation, **N3.js** pour le parsing RDF, et propose une interface riche orientée exploration et requêtage.

---

## 🚀 Fonctionnalités

- Chargement de fichiers `.ttl` (Turtle) RDF
- Analyse et parsing RDF avec `N3.js`
- Visualisation dynamique avec `D3.js`
- Exploration interactive par degré, profondeur, type RDF ou prédicat
- Requêtage SPARQL via endpoint externe (DBpedia ou Fuseki local)
- Statistiques dynamiques (nombre de nœuds, prédicats, types, etc.)
- Recherche du chemin le plus court ou de tous les chemins entre deux nœuds
- Export en `.ttl`, `.json` et `.svg`

---

## 📁 Structure du projet

```
RdfExplorer/
│
├── index.html               # Interface principale
├── script.js                # Logique d’analyse et de visualisation RDF
├── style.css                # Feuilles de style
│
├── graphs/                  # Exemples de fichiers RDF
│   ├── fichier_test.ttl
│   └── test_people.ttl
│
├── libs/                    # Bibliothèques JS externes
│   ├── d3.v7.min.js
│   ├── n3.min.js
│   └── sparql.js
```

---

## 🔧 Installation & utilisation

### ⚙️ Pré-requis

- Un navigateur moderne (Chrome, Firefox, Edge)
- Aucun backend requis (100% client-side)
- (Optionnel) Serveur SPARQL local si vous utilisez Fuseki

### 🚀 Lancer l’application

```bash
# Clonez ou téléchargez le dépôt
git clone https://github.com/ton-user/RdfExplorer.git
cd RdfExplorer

# Lancez simplement l'interface
open index.html  # ou double-cliquez sur le fichier
```

---

## 📊 Chargement d’un graphe RDF

1. Cliquez sur **📁 Importer RDF**
2. Sélectionnez un fichier `.ttl` depuis votre disque
3. Le graphe sera affiché automatiquement avec ses nœuds et arêtes

---

## 🔌 Intégration avec Fuseki (SPARQL)

Depuis la version récente, `RdfExplorer` permet d’interroger un **endpoint SPARQL externe**, comme [Apache Jena Fuseki](https://jena.apache.org/).

### ➕ Exemple de configuration :

1. Lancez Fuseki :

```bash
 cd C:\rdf-tools\apache-jena-fuseki-5.4.0
 java -jar fuseki-server.jar
```

2. Créez un dataset nommé `rdfexplorer`  
3. Chargez un fichier `.ttl` dans le **graphe par défaut**
4. Dans l'interface RdfExplorer, entrez le endpoint :

```text
http://localhost:3030/rdfexplorer/sparql
```

5. Tapez votre requête SPARQL dans le panneau de droite :

```sparql
SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100
```

6. Cliquez sur ▶️ **Exécuter**

---

## ✨ Dépendances

- [D3.js](https://d3js.org/)
- [N3.js](https://github.com/rdfjs/N3.js)
- [sparql.js](https://github.com/RubenVerborgh/SPARQL.js)

---

## 📷 Exemple d’utilisation

- Cliquez sur un nœud pour voir ses connexions
- Utilisez les filtres (type RDF, degré, prédicat) pour ajuster l'affichage
- Explorez le graphe à partir d’un nœud de départ avec profondeur réglable
- Utilisez les boutons “Tous les chemins” ou “Chemin le plus court” pour visualiser les liens entre deux entités

---

## 🧪 Jeux de données fournis

- `fichier_test.ttl` : mini graphe
- `test_people.ttl` : 500 personnes liées par `foaf:knows`

---

## 📫 Contact

Pour toute question ou suggestion :  
📧 mohamed.lemseffer@insa-lyon.fr
