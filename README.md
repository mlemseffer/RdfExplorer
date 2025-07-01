# RdfExplorer

**RdfExplorer** est une application web interactive permettant d'explorer et de visualiser des graphes RDF à partir de fichiers au format Turtle (`.ttl`). Elle utilise les bibliothèques D3.js pour la visualisation et N3.js pour l'analyse des triplets RDF.

---

## 🚀 Fonctionnalités

- Chargement de fichiers `.ttl` (Turtle) RDF
- Analyse des triplets RDF via N3.js
- Visualisation graphique interactive avec D3.js
- Exploration des entités, relations et propriétés
- Interface légère et responsive

---

## 📁 Structure du projet

```
RdfExplorer-main/
│
├── index.html               # Point d'entrée principal de l'application web
├── script.js                # Logique d'analyse RDF et de visualisation
├── style.css                # Styles CSS pour l'application
│
├── graphs/                  # Fichiers RDF de test au format Turtle
│   ├── fichier_test.ttl
│   ├── graph_cours.ttl
│   └── test_people_500.ttl
│
├── libs/                    # Bibliothèques JavaScript externes
│   ├── d3.v7.min.js
│   └── n3.min.js
│
└── README.md
```

---

## 🔧 Installation & utilisation

### Pré-requis

- Un navigateur web moderne (Chrome, Firefox, Edge...)
- Aucun serveur ou backend nécessaire

### Étapes

1. Clonez le dépôt ou téléchargez le ZIP :
```bash
git clone https://github.com/votre-utilisateur/RdfExplorer.git
```

2. Ouvrez simplement `index.html` dans votre navigateur :
```bash
cd RdfExplorer
open index.html
```

3. Chargez un fichier `.ttl` depuis l’interface pour visualiser le graphe RDF.

---

## ✨ Dépendances

- [D3.js](https://d3js.org/) : pour la visualisation des graphes
- [N3.js](https://github.com/rdfjs/N3.js) : pour l'analyse des fichiers RDF

---

## 📷 Exemple d’utilisation

1. Choisissez un fichier `.ttl` depuis le dossier `graphs/`
2. Le graphe RDF s'affiche avec les entités et leurs relations
3. Cliquez sur un nœud pour explorer ses connexions

---

## 🧪 Jeux de données fournis

- `fichier_test.ttl` : mini graphe de démonstration
- `graph_cours.ttl` : graphe plus complexe utilisé en cours
- `test_people_500.ttl` : dataset avec 500 entités pour test de performance

---

## 📝 Licence

Ce projet est distribué sous la licence MIT. Voir le fichier `LICENSE` pour plus d'informations.

---

## 🙌 Contribuer

Les contributions sont les bienvenues ! Pour proposer une amélioration :
- Forkez le projet
- Créez une branche `feature/ma-feature`
- Soumettez une Pull Request

---

## 📫 Contact

Pour toute question ou suggestion :
[Email](mailto:votre.email@domaine.com)
