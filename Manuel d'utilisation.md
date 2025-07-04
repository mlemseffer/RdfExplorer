# 🕸️ Manuel d'utilisation — RdfExplorer

## 📌 Introduction

**RdfExplorer** est une application web interactive qui permet de visualiser, explorer et analyser des graphes RDF issus de fichiers `.ttl` (Turtle). Elle utilise les bibliothèques **N3.js** pour le parsing RDF et **D3.js** pour la visualisation dynamique.

​🆘​​🆘​​🆘​ **L'application est encore en cours de développement**
---

## ⚙️ Prérequis techniques

- Navigateur recommandé : **Google Chrome** ou **Mozilla Firefox**
- Aucun serveur requis (application 100% client-side)
- Fichier d'entrée requis : `.ttl` bien formé au format RDF

---

## 📂 Chargement des données RDF

1. Clique sur **📁 Importer RDF** dans la barre supérieure.
2. Sélectionne un fichier `.ttl` depuis ton ordinateur.
3. Les triplets RDF sont analysés et affichés en graphe.

> ℹ️ En cas d’erreur : vérifier la syntaxe du fichier (triplets bien formés).

---

## 🖥️ Interface utilisateur

| Zone | Description |
|------|-------------|
| **Barre supérieure** | Import/export de RDF/JSON/SVG, contrôle de la simulation |
| **Sidebar gauche** | Filtres (type, degré, prédicats), options d’affichage |
| **Zone principale** | Visualisation interactive du graphe |
| **Barre droite** | Statistiques, style graphique, mini-map, infos sur les nœuds |

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
  - Taille des nœuds : degré entrant/sortant/total
  - Couleur des nœuds : type ou degré
  - Couleur des arêtes : par prédicat ou non

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

- Clique sur **🕸️ Afficher le sous graphe** pour afficher uniquement les nœuds accessibles depuis le nœud de départ.
- Revenir au graphe complet via **🌳 Afficher le graphe entier**

---

## 📊 Statistiques et légendes

- Nombre de triplets
- Nombre de nœuds uniques
- Prédicats uniques
- Nœuds isolés
- Répartition par type RDF
- Légendes dynamiques de couleur pour les nœuds et arêtes

---

## 📝 Requête SPARQL

- Ecris une requête SPARQL (pour l'instant, seul le endpoint dbpedia est supporté
- Lance la requête et observe le graphe obtenu

---

## 💾 Export / Sauvegarde

- **📤 Exporter SVG** : exporte une image statique du graphe
- **📤 Exporter (RDF+Config)** :
  - `.ttl` contenant uniquement les triplets visibles
  - `.json` avec les paramètres d'affichage actuels

### ✅ Rechargement
- Clique sur **📁 Importer Configuration (JSON)** pour recharger une sauvegarde précédente

---

## 💡 Conseils d’utilisation

- **Mettre en pause la simulation** pour déplacer les nœuds manuellement
- **Réduire le zoom** ou masquer les labels pour les grands graphes
- **Utiliser les sliders** pour affiner la lisibilité

---

## 📎 Exemple de fichier RDF (.ttl)

```ttl
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<http://example.org/person#Alice> a foaf:Person ;
    foaf:name "Alice" ;
    foaf:knows <http://example.org/person#Bob> .

<http://example.org/person#Bob> a foaf:Person ;
    foaf:name "Bob" .
