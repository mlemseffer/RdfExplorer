# 🕸️ Manuel d'utilisation — RdfExplorer

## 📌 Introduction

**RdfExplorer** est une application web interactive qui permet de visualiser, explorer et analyser des graphes RDF issus de fichiers `.ttl` (Turtle). Elle utilise les bibliothèques **N3.js** pour le parsing RDF, **D3.js** pour la visualisation dynamique, et **sparql.js** pour le requêtage SPARQL.

> ⚠️ **L'application est encore en cours de développement**

---

## ⚙️ Prérequis techniques

- Navigateur recommandé : **Google Chrome** ou **Mozilla Firefox**
- Aucun serveur requis (application 100% client-side)
- Fichier d'entrée requis : `.ttl` bien formé au format RDF

---

## 📂 Chargement des données RDF

1. Clique sur **📁 Importer RDF** dans la barre supérieure.
2. Sélectionne un fichier `.ttl` depuis ton ordinateur.
3. Les triplets RDF sont analysés et affichés sous forme de graphe interactif.

> ℹ️ En cas d’erreur : vérifier la syntaxe du fichier (triplets bien formés).

---

## 🖥️ Interface utilisateur

| Zone | Description |
|------|-------------|
| **Barre supérieure** | Import/export de RDF/JSON/SVG, contrôle de la simulation |
| **Sidebar gauche** | Filtres (type, degré, prédicats), options d’affichage |
| **Zone principale** | Visualisation interactive du graphe |
| **Barre droite** | Statistiques, style graphique, mini-map, infos sur les nœuds, requêtes SPARQL |

---

## 🔍 Filtres et apparence

- **Degré minimum** : masque les nœuds peu connectés
- **Types RDF** : sélectionne les classes à afficher
- **Prédicats** : filtre les types de relations à afficher
- **Masquer nœuds isolés** : option activable
- **Afficher les labels** :
  - Nœuds
  - Arêtes
- **Apparence** :
  - Taille des nœuds : degré entrant / sortant / total
  - Couleur des nœuds : par type ou degré
  - Couleur des arêtes : par prédicat ou neutre

---

## 🧭 Exploration dynamique

### 1. Sélection d’un nœud de départ
- Tape son nom ou clique dessus
- Sélectionne la direction des liens : `Entrantes`, `Sortantes`, `Entrantes + Sortantes`

### 2. Exploration en profondeur
- Choisis une **profondeur maximale**
- Clique sur **🎯 Explorer en profondeur**
- Les couches du graphe s'affichent progressivement

### 3. Recherche de chemin
- Indique un **nœud d’arrivée**
- Choisis :
  - **⚡ Chemin le plus court**
  - **🗺️ Tous les chemins**
- Navigation entre les chemins avec les flèches ⬅️ ➡️

---

## 🌳 Sous-graphe

- Clique sur **🕸️ Afficher le sous graphe** pour explorer les voisins du nœud de départ jusqu’à une certaine profondeur
- Reviens au graphe complet via **🌳 Afficher le graphe entier**

---

## 📊 Statistiques et légendes

- Triplets totaux
- Nœuds uniques
- Prédicats uniques
- Nœuds isolés
- Répartition par type RDF
- Légendes dynamiques :
  - Couleur des nœuds selon type ou degré
  - Couleur des arêtes selon prédicat

---

## 📝 Requête SPARQL

### 📌 Objectif
Exécuter des requêtes SPARQL dynamiques sur un endpoint distant ou local.

### 🔧 Définir le endpoint SPARQL

Un champ dédié permet de spécifier une **URL de serveur SPARQL**.  
> 💡 Par défaut, le champ est pré-rempli avec :  
> `http://localhost:3030/rdfexplorer/sparql`

Cela permet d’utiliser un **serveur Fuseki local** si vous avez chargé vos données RDF dans un dataset nommé `rdfexplorer`.

### 🧪 Exemple de requête

\`\`\`
SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100
\`\`\`

Cliquez sur **▶️ Exécuter** pour interroger le graphe. Le graphe est reconstruit à partir des triplets retournés.

---

## 💾 Export / Sauvegarde

- **📤 Exporter SVG** : image du graphe
- **📤 Exporter (RDF+Config)** :
  - `.ttl` : les triplets visibles
  - `.json` : configuration actuelle (affichage, filtres)

### ✅ Rechargement de configuration

- Cliquez sur **📁 Importer Configuration (JSON)** pour restaurer un état précédent

---

## 💡 Conseils d’utilisation

- **Pause simulation** pour déplacer manuellement les nœuds
- **Réduire le zoom** ou masquer les labels sur les grands graphes
- **Filtrer par degré ou type** pour clarifier les vues

---

## 🔗 Connexion à Apache Jena Fuseki (optionnel)

### 📦 Prérequis :
- [Java 11 ou 17](https://adoptium.net)
- [Fuseki 5.4.0](https://jena.apache.org/download/)

### 🚀 Étapes :

1. Lancer Fuseki :
   \`\`\`java -jar fuseki-server.jar\`\`\`
2. Créer un dataset nommé `rdfexplorer` dans l’interface web
3. Importer votre fichier `.ttl` dans le **graphe par défaut**
4. Utiliser comme endpoint dans RdfExplorer :
   \`\`\`
   http://localhost:3030/rdfexplorer/sparql
   \`\`\`

---

## 📎 Exemple de fichier RDF (.ttl)

\`\`\`ttl
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<http://example.org/person#Alice> a foaf:Person ;
    foaf:name "Alice" ;
    foaf:knows <http://example.org/person#Bob> .

<http://example.org/person#Bob> a foaf:Person ;
    foaf:name "Bob" .
\`\`\`
