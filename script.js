class RdfExplorer {
    //Constructeur par defaut de l'application, unique constructeur
    constructor() {
        this.graph = {
            nodes: [],
            links: [],
            triples: []
        };

        //Noeuds et arêtes visibles qui seront calculées
        this.visibleNodes = [];
        this.visibleLinks = [];

        //Simulation
        this.svg = null;
        this.simulation = null;

        //Paramètres de la visualisations
        this.activePredicates = new Set();
        this.activeTypes = new Set();
        this.hideIsolatedNodes = false;
        this.showEdgeLabels = false;
        this.showNodeLabels = false;
        this.minDegreeFilter = 0;
        this.gravityForce = -200;

        //Tailles et couleurs
        this.nodeSizeMode = 'in';
        this.nodeColorMode = 'type';
        this.edgeColorMode = 'predicate';

        // ➕ Clustering
        // none | type | louvain
        this.clusterMode = 'none';
        this.clusterAssignments = new Map(); // nodeId -> clusterKey (string)
        this.clusterCenters = new Map();     // clusterKey -> {x,y}

        //Attributs de l'exploration
        this.startNodeInput = document.getElementById('startNodeInput');
        this.startNode = null;
        this.endNodeInput = document.getElementById('endNodeInput');
        this.endNode = null;
        this.allPaths = [];
        this.currentPathIndex = 0;

        //Pause
        this.simulationPaused = false;

        //Affichage du sous graphe
        this.isSubgraphMode = false;
        this.previousVisibleNodes = [];
        this.previousVisibleLinks = [];

        this.subgraphNodes = [];
        this.subgraphLinks = [];
        this.subgraphRootNode = null;

        //Optimisation
        this.nodeMap = new Map();
        this.adjList = new Map();
        this.revAdjList = new Map();
        this.labelMap = new Map();

        //Noeud sélectionné
        this.selectedNode = null;

        //SPARQL
        this.isSparqlGraph = false;
        this.currentAbortController = null;

        //Ne pas recalculer à chaque fois toute la légende
        this.globalPredicates = new Set();
        this.globalTypes = new Set();
        this.typeColorMap = new Map();
        this.predicateColorMap = new Map();
        this.colorPalette = d3.schemeCategory10.concat(d3.schemeSet3);

        //Clique droit pour supprimer les noeuds
        this.hiddenNodes = new Set();

        //Exemples
        this.exampleQueries = {
            "http://localhost:3030/rdfexplorer/sparql": [
                { label: "Choisir un exemple", query: "" },
                { label: "100 triplets généraux", query: "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100" },
                { label: "Propriété MediumInterest", query: "PREFIX ns: <https://coursera.graph.edu/> SELECT ?s ?p ?o WHERE { ?s ns:MediumInterest ?o BIND(ns:MediumInterest AS ?p) } LIMIT 1000" },
                { label: "Propriété isKnowledgeTopicOf", query: "PREFIX ns: <https://coursera.graph.edu/> SELECT ?s ?p ?o WHERE { ?s ns:isKnowledgeTopicOf ?o BIND(ns:isKnowledgeTopicOf AS ?p) } LIMIT 1000" },
                { label: "Objets contenant 'machine'", query: "PREFIX ns: <https://schema.org/> SELECT ?s ?p ?o WHERE { ?s ?p ?o . FILTER(isLiteral(?o) && CONTAINS(LCASE(STR(?o)), \"machine\")) }" }
            ],
            "https://dbpedia.org/sparql": [
                { label: "Choisir un exemple", query: "" },
                { label: "Villes et pays", query: "SELECT ?s ?p ?o WHERE { ?s a dbo:City ; dbo:country ?o . BIND(dbo:country AS ?p) } LIMIT 100" },
                { label: "Films et réalisateurs", query: "SELECT ?s ?p ?o WHERE { ?s a dbo:Film ; dbo:director ?o . BIND(dbo:director AS ?p) } LIMIT 100" },
                { label: "Séries télé et genre", query: "SELECT ?s ?p ?o WHERE { ?s a dbo:TelevisionShow ; dbo:genre ?o . BIND(dbo:genre AS ?p) } LIMIT 100" }
            ],
            "https://query.wikidata.org/sparql": [
                { label: "Choisir un exemple", query: "" },
                { label: "Écrivains et lieu de naissance", query: "SELECT ?s ?p ?o WHERE { ?s wdt:P31 wd:Q5 ; wdt:P106 wd:Q36180 ; wdt:P19 ?o . BIND(wdt:P19 AS ?p) } LIMIT 100" },
                { label: "Pays et voisins", query: "SELECT ?s ?p ?o WHERE { ?s wdt:P31 wd:Q6256 ; wdt:P47 ?o . BIND(wdt:P47 AS ?p) } LIMIT 100" },
                { label: "Films et réalisateurs", query: "SELECT ?s ?p ?o WHERE { ?s wdt:P31 wd:Q11424 ; wdt:P57 ?o . BIND(wdt:P57 AS ?p) } LIMIT 100" }
            ],
            "https://rdf.insee.fr/sparql": [
                { label: "Choisir un exemple", query: "" },
                { label: "Communes et triplets", query: "PREFIX insee: <http://rdf.insee.fr/def/geo#> SELECT ?s ?p ?o WHERE { ?s a insee:Commune ; ?p ?o . } LIMIT 100" },
                { label: "Communes et code INSEE", query: "PREFIX geo: <http://rdf.insee.fr/def/geo#> SELECT ?s ?p ?o WHERE { ?s a geo:Commune ; geo:codeINSEE ?o . BIND(geo:codeINSEE AS ?p) } LIMIT 100" },
                { label: "Arrondissements et code INSEE", query: "PREFIX geo: <http://rdf.insee.fr/def/geo#> SELECT ?s ?p ?o WHERE { ?s geo:codeINSEE ?o . BIND(geo:codeINSEE AS ?p) } LIMIT 100" }
            ]
        };

        //Arbre
        this.isTreeMode = false;
        this.treeData = null;

        //Demarrage de l'application
        this.init();
    }

    init() {
        //Mode d'emploi : 
        // Initialise l'application en configurant les écouteurs d'événements et le graphe de base
        this.setupEventListeners();
        this.updateExampleSelect();
        this.initializeGraph();
    }

    setupEventListeners() {
        //Mode d'emploi : 
        // Configure tous les écouteurs des boutons et champs d’interface

        //Bouton importer RDF
        document.getElementById('importRDFBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        //Bouton exporter
        document.getElementById('exportRDFConfigBtn').addEventListener('click', () => {
            this.exportVisibleRDFandConfig();
        });

        //Bouton importer config
        document.getElementById('importConfigBtn').addEventListener('click', () => {
            document.getElementById('configInput').click();
        });

        //Fichier de configuration (.json)
        document.getElementById('configInput').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.json')) {
                this.loadConfigFile(file);
            } else {
                alert('Veuillez sélectionner un fichier .json');
            }
        });

        //Fichier rdf (en .ttl)
        document.getElementById('fileInput').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.ttl')) {
                this.loadRDFFile(file);
            } else {
                alert('Veuillez sélectionner un fichier .ttl');
            }
        });

        //Bouton pour supprimer le graphe
        document.getElementById('deleteGraphBtn').addEventListener('click', () => {
            location.reload();
        });

        //Bouton pour réinitialiser le graphe
        document.getElementById('resetGraphBtn').addEventListener('click', () => {
            this.resetGraphView();
        });

        //Bouton pour exporter l'image du graphe
        document.getElementById('exportSVGBtn').addEventListener('click', () => {
            this.exportSVG();
        });

        //Bouton pour montrer les noms des arêtes
        document.getElementById('showEdgeLabels').addEventListener('change', (e) => {
            this.showEdgeLabels = e.target.checked;
            this.renderGraph();
        });

        //Bouton pour montrer les noms des noeuds
        document.getElementById('showNodeLabels').addEventListener('change', (e) => {
            this.showNodeLabels = e.target.checked;
            this.renderGraph();
        });

        //Bouton pour cacher les noeuds isolés
        document.getElementById('hideIsolatedNodes').addEventListener('change', (e) => {
            this.hideIsolatedNodes = e.target.checked;
            if (this.hideIsolatedNodes) {
                this.hideCurrentlyIsolatedNodes();
            } else {
                this.renderGraph(); // remise à jour complète
            }
        });


        //Mise à jour dynamique du filtre de degré
        const rangeInput = document.getElementById('degreeRangeInput');
        rangeInput.addEventListener('input', (e) => {
            this.minDegreeFilter = parseInt(e.target.value);
            document.getElementById('minDegreeValue').textContent = e.target.value;
            this.renderGraph();
        });

        //Selection du mode de taille de noeud
        const sizeSelect = document.getElementById('nodeSizeModeSelect');
        sizeSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value.includes('entrant')) this.nodeSizeMode = 'in';
            else if (value.includes('sortant')) this.nodeSizeMode = 'out';
            else if (value.includes('total')) this.nodeSizeMode = 'total';
            else if (value.includes('Fixe')) this.nodeSizeMode = 'fixed';
            this.renderGraph();
        });

        //Selection du mode de coloration
        const colorSelect = document.getElementById('nodeColorModeSelect');
        colorSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value.includes('entrant')) this.nodeColorMode = 'in';
            else if (value.includes('sortant')) this.nodeColorMode = 'out';
            else if (value.includes('total')) this.nodeColorMode = 'total';
            else this.nodeColorMode = 'type';
            this.updateNodeColors();
        });

        //Selection de la profondeur de parcours
        const depthRangeInput = document.getElementById('depthRange');
        depthRangeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('depthValue').textContent = value;
        });

        // Autocomplétion dans le champ "nœud de départ"
        this.startNodeInput.addEventListener('input', () => this.showAutocomplete(this.startNodeInput, 'start'));
        this.startNodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.selectNodeFromInput(this.startNodeInput.value);
        });

        //Selection d'un noeud de départ
        document.getElementById('startNodeBtn').addEventListener('click', () => {
            const value = this.startNodeInput.value.trim();
            if (this.selectedNode) {
                this.setStartNode(this.selectedNode);
            } else {
                this.selectNodeFromInput(value);
            }
        });

        //Autocomplétion dans le champ "nœud d'arrivée"
        this.endNodeInput.addEventListener('input', () => this.showAutocomplete(this.endNodeInput, 'end'));
        this.endNodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.selectNodeFromInput(this.endNodeInput.value, 'end');
        });

        //Selection du noeud d'arrivée
        document.getElementById('endNodeBtn').addEventListener('click', () => {
            const value = this.endNodeInput.value.trim();
            if (this.selectedNode) {
                this.setEndNode(this.selectedNode);
            } else {
                this.selectNodeFromInput(value, 'end');
            }
        });

        //Selection du mode de parcours
        this.exploreDirectionSelect = document.getElementById('edgeDirectionSelect');

        //Exploration des voisins avec profondeur maximale choisie
        document.getElementById('depthExploreBtn').addEventListener('click', () => {
            const maxDepth = parseInt(document.getElementById('depthRange').value);
            this.exploreFromStartNode(maxDepth, 1000); // 1 seconde
        });

        //Recherche du plus court chemin
        document.getElementById('shortestPathBtn').addEventListener('click', () => {
            this.findShortestPath();
        });

        //Recherche de tous les chemins
        document.getElementById('allPathsBtn').addEventListener('click', () => {
            this.findAllPaths();
        });

        //Bouton pour revenir au chemin précédent
        document.getElementById('prevPathBtn').addEventListener('click', () => {
            if (this.allPaths.length < 2) return;
            this.currentPathIndex = (this.currentPathIndex - 1 + this.allPaths.length) % this.allPaths.length;
            this.highlightPath(this.allPaths[this.currentPathIndex]);
            document.getElementById('pathCounter').textContent = `${this.currentPathIndex + 1} / ${this.allPaths.length}`;
        });

        //Bouton pour aller au chemin suivant
        document.getElementById('nextPathBtn').addEventListener('click', () => {
            if (this.allPaths.length < 2) return;
            this.currentPathIndex = (this.currentPathIndex + 1) % this.allPaths.length;
            this.highlightPath(this.allPaths[this.currentPathIndex]);
            document.getElementById('pathCounter').textContent = `${this.currentPathIndex + 1} / ${this.allPaths.length}`;
        });

        //Mise en pause de la simulation
        document.getElementById('toggleSimulationBtn').addEventListener('click', () => {
            this.toggleSimulation();
        });

        //Bouton pour afficher le sous graphe
        document.getElementById('SubGraphBtn').addEventListener('click', () => {
            if (this.isSubgraphMode) {
                this.resetToFullGraph();
            } else {
                this.showSubgraph();
            }
        });

        //Choix de la coloration des arêtes
        const edgeColorSelect = document.getElementById('edgeColorModeSelect');
        edgeColorSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            this.edgeColorMode = value.includes('prédicats') ? 'predicate' : 'none';
            this.updateEdgeColors(); // appliquer sans relancer tout renderGraph
        });



        //Bouton pour lancer la requête SPARQL saisie
        document.getElementById('runSparqlBtn').addEventListener('click', async () => {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex'; // montre l'animation
            }

            const query = document.getElementById('sparqlQueryInput').value;
            if (!query.trim()) {
                alert("Veuillez saisir une requête SPARQL.");
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none'; // cache même si erreur
                }
                return;
            }

            try {
                const results = await this.runSparqlRequest(query);
                const triples = this.convertSparqlResultsToTriples(results);

                if (triples.length === 0) {
                    alert("Aucun triplet retourné.");
                    return;
                }

                if (this.isTreeMode) {
                    this.isTreeMode = false;
                    const treeBtn = document.getElementById('TreeGraphBtn');
                    if (treeBtn) {
                        treeBtn.textContent = '🌲 Afficher l\'arbre';
                    }

                    // Réactiver les boutons désactivés en mode arbre
                    const depthExploreBtn = document.getElementById('depthExploreBtn');
                    const subGraphBtn = document.getElementById('SubGraphBtn');
                    if (depthExploreBtn) {
                        depthExploreBtn.disabled = false;
                        depthExploreBtn.classList.remove('disabled-button');
                    }
                    if (subGraphBtn) {
                        subGraphBtn.disabled = false;
                        subGraphBtn.classList.remove('disabled-button');
                    }
                }

                this.deleteGraph();
                this.graph.triples = triples;
                this.buildGraphFromTriples(triples);

                this.globalPredicates = new Set(this.graph.triples.map(t => t.predicate));
                this.globalTypes = new Set(this.graph.nodes.map(n => n.type));
                this.typeColorMap.clear();
                this.predicateColorMap.clear();

                this.activePredicates = new Set(this.globalPredicates);
                this.activeTypes.clear();

                this.extractActivePredicates();
                this.extractActiveTypes();
                this.updateStatistics();
                this.renderGraph();

            } catch (e) {
                alert("Erreur lors de l'exécution SPARQL : " + e.message);
                console.error(e);
            } finally {
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            }
        });


        //Bouton expand pour le noeud selectionné
        document.getElementById('expandSparqlBtn').addEventListener('click', async () => {
            await this.expandSelectedNode();
        });

        //Mettre à jour la valeur du range des triplets à ajouter
        document.getElementById('expandLimitRange').addEventListener('input', (e) => {
            document.getElementById('expandLimitValue').textContent = e.target.value;
        });

        //Bouton Etendre et filtrer
        document.getElementById('expandFilterSparqlBtn').addEventListener('click', async () => {
            await this.expandAndFilterSelectedNode();
        });

        //Bouton ajouter tous les voisins
        document.getElementById('addAllNeighborsSparqlBtn').addEventListener('click', async () => {
            await this.addAllNeighborsOfSelectedNode();
        });

        //Bouton pour remettre les noeuds invisibilisés
        document.getElementById('resetNodesBtn').addEventListener('click', () => {
            this.hiddenNodes.clear();
            this.renderGraph();
        });

        const resizeHandle = document.getElementById('resizeToolbar');
        const toolbar = document.getElementById('toolbar');
        let isResizing = false;

        resizeHandle.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'ew-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const containerRect = document.querySelector('.app-container').getBoundingClientRect();
            const newWidth = containerRect.right - e.clientX;
            if (newWidth >= 200 && newWidth <= 600) {
                toolbar.style.width = `${newWidth}px`;
                document.querySelector('.app-container').style.gridTemplateColumns = `280px 1fr ${newWidth}px`;
                resizeHandle.style.left = `${containerRect.width - newWidth - 8}px`; // met à jour la position à gauche
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
            }
        });

        document.getElementById('endpointInput').addEventListener('change', () => {
            this.updateExampleSelect();
        });

        //Bouton pour l'arbre
        // Bouton pour l'arbre (corrigé : ne supprime pas le graphe si aucun nœud de départ n'est choisi)
        const treeBtn = document.getElementById('TreeGraphBtn');
        treeBtn.addEventListener('click', () => {
            const depthExploreBtn = document.getElementById('depthExploreBtn');
            const subGraphBtn = document.getElementById('SubGraphBtn');

            if (!this.isTreeMode) {
                // ✅ CORRECTION : vérifier AVANT toute suppression du SVG
                if (!this.startNode) {
                    alert("Veuillez sélectionner un nœud de départ.");
                    return; // on quitte sans toucher au graphe -> il ne disparaît plus
                }

                // ➤ MODE ARBRE : stopper la simulation
                if (this.simulation) {
                    this.simulation.stop();
                    this.simulationPaused = true;
                    const pauseBtn = document.getElementById('toggleSimulationBtn');
                    if (pauseBtn) pauseBtn.textContent = '▶️ Reprendre Simulation';
                }

                // On peut maintenant retirer le SVG (on sait qu'on a un startNode)
                d3.select('#graphContainer svg').remove();

                const mstEdges = this.computeMinimalSpanningTree();
                this.treeData = this.buildHierarchyFromEdges(mstEdges, this.startNode.id);
                this.renderTreeWithFilters(this.treeData);

                this.isTreeMode = true;
                treeBtn.textContent = '🕸️ Revenir au graphe';

                // Désactiver les boutons en mode arbre
                depthExploreBtn.disabled = true;
                subGraphBtn.disabled = true;
                depthExploreBtn.classList.add('disabled-button');
                subGraphBtn.classList.add('disabled-button');

            } else {
                // ➤ RETOUR AU MODE GRAPHE
                d3.select('#graphContainer svg').remove();

                // Récréer les overlays au besoin
                if (!document.getElementById('graphOverlay')) {
                    const graphOverlay = document.createElement('div');
                    graphOverlay.id = 'graphOverlay';
                    graphOverlay.className = 'graph-overlay';
                    graphOverlay.innerHTML = `📊 Graphe: 0 nœuds • 0 arêtes • <span id="zoom">Zoom : 100%</span>`;
                    document.getElementById('graphContainer').appendChild(graphOverlay);
                }

                if (!document.getElementById('loadingOverlay')) {
                    const loadingOverlay = document.createElement('div');
                    loadingOverlay.id = 'loadingOverlay';
                    loadingOverlay.className = 'loading-overlay';
                    loadingOverlay.style.display = 'none';
                    loadingOverlay.innerHTML = `<div class="spinner"></div>`;
                    document.getElementById('graphContainer').appendChild(loadingOverlay);
                }

                // Recréer le SVG et le zoom
                this.svg = d3.select('#graphContainer')
                    .append('svg')
                    .attr('width', '100%')
                    .attr('height', '100%')
                    .call(
                        d3.zoom()
                            .scaleExtent([0.05, 5])
                            .on('zoom', (event) => {
                                this.svg.select('g.zoom-group').attr('transform', event.transform);
                                this.updateZoomLabel(event.transform.k);
                                this.updateMiniMap(this.visibleNodes, this.visibleLinks);
                            })
                    )
                    .style('background', 'radial-gradient(circle at 50% 50%, #fafbfc 0%, #f4f6f8 100%)');

                this.svg.append('g').attr('class', 'zoom-group');
                this.svg.select('.zoom-group').append('g').attr('class', 'links');
                this.svg.select('.zoom-group').append('g').attr('class', 'nodes');

                this.isTreeMode = false;

                this.renderGraph();
                treeBtn.textContent = '🌲 Afficher l\'arbre';

                if (this.simulation) {
                    this.simulation.alpha(0.3).restart();
                    this.simulationPaused = false;
                    const pauseBtn = document.getElementById('toggleSimulationBtn');
                    if (pauseBtn) pauseBtn.textContent = '⏸️ Pause Simulation';
                }

                // Réactiver les boutons en mode graphe
                depthExploreBtn.disabled = false;
                subGraphBtn.disabled = false;
                depthExploreBtn.classList.remove('disabled-button');
                subGraphBtn.classList.remove('disabled-button');
            }
        });

        //Bouton annuler
        const cancelBtn = document.getElementById('cancelSparqlBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => {
            if (this.currentAbortController) this.currentAbortController.abort();
        });

        //Clustering
        // On l'ajoute sous le sélecteur "Couleur des arêtes"
        const apparencePanel = document.querySelector('.panel .panel-header')
            ? Array.from(document.querySelectorAll('.panel .panel-header'))
                .find(h => h.textContent.includes('🎨'))
                .parentElement
            : null;

        if (apparencePanel) {
            const container = apparencePanel.querySelector('.panel-content');
            const wrapper = document.createElement('div');
            wrapper.className = 'form-group';
            wrapper.innerHTML = `
            <label for="clusterModeSelect">Clustering</label>
            <select class="form-control" id="clusterModeSelect">
                <option value="none">Aucun</option>
                <option value="type">Par type RDF</option>
                <option value="louvain">Communautés (Louvain)</option>
            </select>
            <div style="font-size:11px;color:var(--muted-2);margin-top:6px;">
                Regroupe spatialement les nœuds par catégorie.
            </div>
        `;
            container.appendChild(wrapper);

            const clusterSelect = wrapper.querySelector('#clusterModeSelect');
            clusterSelect.addEventListener('change', (e) => {
                this.clusterMode = e.target.value;
                // recalcul d’un éventuel partitionnement
                if (this.clusterMode === 'type') {
                    this.clusterAssignments = this.computeClustersByType();
                } else if (this.clusterMode === 'louvain') {
                    this.clusterAssignments = this.computeCommunitiesLPA(); // implémentation Louvain-like
                } else {
                    this.clusterAssignments.clear();
                    this.clusterCenters.clear();
                }
                this.renderGraph();
            });
        }
    }

    async loadRDFFile(file) {
        //Mode d'emploi : 
        // Charge un fichier RDF (.ttl), l’analyse et construit le graphe. Si un graphe était déjà présent, on le supprime

        try {
            this.isSparqlGraph = false;
            this.updateExpandButtonState();
            this.deleteGraph();
            const content = await this.readFileContent(file);
            const triples = await this.parseWithN3(content);
            this.graph.triples = triples;
            this.buildGraphFromTriples(triples);

            this.globalPredicates = new Set(this.graph.triples.map(t => t.predicate));
            this.globalTypes = new Set(this.graph.nodes.map(n => n.type));
            this.typeColorMap.clear();
            this.predicateColorMap.clear();

            this.activePredicates = new Set(this.globalPredicates);
            this.activeTypes.clear();

            this.extractActivePredicates();
            this.extractActiveTypes();
            this.updateStatistics();
            this.renderGraph();
        } catch (error) {
            console.error('Erreur lors du chargement du fichier RDF:', error);
            alert('Erreur lors du chargement du fichier RDF: ' + error.message);
        }
    }



    readFileContent(file) {
        //Mode d'emploi : 
        // Lit le contenu texte d’un fichier local (RDF ou config)

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    async parseWithN3(content) {
        //Mode d'emploi : 
        // Parse un fichier RDF au format Turtle avec N3.js

        return new Promise((resolve, reject) => {
            const parser = new N3.Parser();
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
                        objectType: quad.object.termType
                    });
                } else {
                    resolve(triples);
                }
            });
        });
    }

    buildGraphFromTriples(triples) {
        //Mode d'emploi
        //A partir d'une liste de triplets spo, le graphe est construit
        const nodeMap = new Map();
        const links = [];
        const adjList = new Map();
        const revAdjList = new Map();

        for (const triple of triples) {
            const { subject, predicate, object, objectType } = triple;

            if (!nodeMap.has(subject)) {
                nodeMap.set(subject, {
                    id: subject,
                    label: this.extractLabel(subject),
                    type: 'unknown',
                    inDegree: 0,
                    outDegree: 0
                });
            }

            if (!nodeMap.has(object)) {
                nodeMap.set(object, {
                    id: object,
                    label: objectType === 'Literal' ? object : this.extractLabel(object),
                    type: objectType === 'Literal' ? this.inferLiteralType(predicate) : 'unknown',
                    inDegree: 0,
                    outDegree: 0
                });
            }

            nodeMap.get(subject).outDegree++;
            nodeMap.get(object).inDegree++;

            // Création du lien
            links.push({
                source: subject,
                target: object,
                predicate: predicate,
                label: this.extractLabel(predicate)
            });

            // Liste d’adjacence
            if (!adjList.has(subject)) adjList.set(subject, []);
            adjList.get(subject).push(object);

            if (!revAdjList.has(object)) revAdjList.set(object, []);
            revAdjList.get(object).push(subject);
        }

        // Déduction de type depuis les triplets
        for (const triple of triples) {
            const { subject, predicate, object } = triple;
            if (predicate.includes('type') || predicate.endsWith('#type')) {
                if (nodeMap.has(subject)) {
                    nodeMap.get(subject).type = this.categorizeType(object);
                }
            }
            if (predicate.toLowerCase().includes('topic') && predicate.toLowerCase().includes('has')) {
                if (nodeMap.has(object)) {
                    nodeMap.get(object).type = "topics";
                }
            }
        }

        nodeMap.forEach(node => {
            if (node.type === 'unknown' && (node.id.startsWith('http://') || node.id.startsWith('https://'))) {
                if (node.id.includes('xmlns.com/foaf/0.1/') || node.id.includes('schema.org')) {
                    // Cas spécial foaf : on considère directement comme une classe
                    node.type = "Class";
                }
                else if (node.id.includes('course_')) {
                    node.type = "LearningResource"
                }
                else if (node.id.includes('user_')) {
                    node.type = "Person"
                }
                else {
                    const segments = node.id.split('/').filter(Boolean);
                    if (segments.length >= 2) {
                        node.type = segments[segments.length - 2]; // avant-dernier segment
                    }
                }
            }
        });

        this.nodeMap = nodeMap;
        this.adjList = adjList;
        this.revAdjList = revAdjList;
        this.graph.nodes = Array.from(nodeMap.values());
        this.graph.links = links;
        this.graph.nodes.forEach(n => this.labelMap.set(n.label, n));

        this.updateDegreeSlider();
    }


    extractActivePredicates() {
        //Mode d'emploi : 
        // Extrait et affiche la liste des prédicats du graphe sous forme de cases à cocher
        const predicateSet = new Set(this.graph.triples.map(t => t.predicate));
        const container = document.getElementById('predicatePanelContent');
        const group = document.getElementById('predicateCheckboxes');
        if (!container || !group) return;

        group.innerHTML = '';

        predicateSet.forEach(pred => {
            this.activePredicates.add(pred);
            this.globalPredicates.add(pred);
            if (!this.predicateColorMap.has(pred)) {
                const index = this.predicateColorMap.size % this.colorPalette.length;
                this.predicateColorMap.set(pred, this.colorPalette[index]);
            }
        });

        this.globalPredicates.forEach(pred => {
            const id = `pred-${this.extractLabel(pred).replace(/[^a-zA-Z0-9]/g, '')}`;
            const checked = this.activePredicates.has(pred);

            const div = document.createElement('div');
            div.classList.add('checkbox-item');
            div.innerHTML = `
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                <label for="${id}">${this.extractLabel(pred)}</label>
            `;
            group.appendChild(div);

            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activePredicates.add(pred);
                } else {
                    this.activePredicates.delete(pred);
                }
                this.renderGraph();

                if (this.isTreeMode && this.treeData) {
                    const mstEdges = this.computeMinimalSpanningTree();
                    this.treeData = this.buildHierarchyFromEdges(mstEdges, this.startNode.id);
                    this.renderTreeWithFilters(this.treeData);
                }
            });
        });
    }

    extractActiveTypes() {
        //Mode d'emploi : 
        // Extrait et affiche la liste des types RDF du graphe sous forme de cases à cocher
        const typeSet = new Set(this.graph.nodes.map(n => n.type));
        const container = document.getElementById('rdfTypesCheckboxes');
        if (!container) return;

        container.innerHTML = '';

        typeSet.forEach(type => {
            this.globalTypes.add(type);
            if (!this.typeColorMap.has(type)) {
                const index = this.typeColorMap.size % this.colorPalette.length;
                this.typeColorMap.set(type, this.colorPalette[index]);
            }
        });

        this.globalTypes.forEach(type => {
            const id = `type-${type.replace(/[^a-zA-Z0-9]/g, '')}`;
            const checked = this.activeTypes.has(type);

            const div = document.createElement('div');
            div.classList.add('checkbox-item');
            div.innerHTML = `
                <input type="checkbox" id="${id}" data-type="${type}" ${checked ? 'checked' : ''}>
                <label for="${id}">${type}</label>
            `;
            container.appendChild(div);

            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activeTypes.add(type);
                } else {
                    this.activeTypes.delete(type);
                }
                this.renderGraph();

                if (this.isTreeMode && this.treeData) {
                    const mstEdges = this.computeMinimalSpanningTree();
                    this.treeData = this.buildHierarchyFromEdges(mstEdges, this.startNode.id);
                    this.renderTreeWithFilters(this.treeData);
                }
            });
        });
    }

    extractLabel(uri) {
        //Mode d'emploi : 
        // Extrait un label lisible à partir d’une URI RDF

        if (uri.includes('#')) return uri.split('#').pop();
        if (uri.includes('/')) return uri.split('/').pop();
        return uri;
    }

    categorizeType(typeUri) {
        //Mode d'emploi : 
        // Retourne un type à partir d’un URI de type RDF

        if (!typeUri || typeof typeUri !== 'string') return 'unknown';
        const label = this.extractLabel(typeUri);
        return label ? label.toLowerCase() : 'unknown';
    }

    inferLiteralType(predicate) {
        //Mode d'emploi : 
        // Déduit un type de littéral basé sur son prédicat

        return this.extractLabel(predicate);
    }

    initializeGraph() {
        //Mode d'emploi : 
        // Crée le canevas SVG de base pour la visualisation du graphe

        const container = document.getElementById('graphContainer');

        this.svg = d3.select('.graph-container')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .call(
                d3.zoom()
                    .scaleExtent([0.05, 5])
                    .on('zoom', (event) => {
                        this.svg.select('g.zoom-group').attr('transform', event.transform);
                        this.updateZoomLabel(event.transform.k);
                        this.updateMiniMap(this.visibleNodes, this.visibleLinks);
                    })
            )
            .style('background', 'radial-gradient(circle at 50% 50%, #fafbfc 0%, #f4f6f8 100%)');

        this.svg.append('g').attr('class', 'zoom-group');
        this.svg.select('.zoom-group').append('g').attr('class', 'links');
        this.svg.select('.zoom-group').append('g').attr('class', 'nodes');

        // (dans initializeGraph(), juste après avoir créé this.svg et les groupes)
        if (this.svg.select('defs#arrow-defs').empty()) {
            const defs = this.svg.append('defs').attr('id', 'arrow-defs');
            defs.append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 16)   // décale la pointe au bord du nœud
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', '#9ca3af');
        }

        this.updateDepthSlider(10);
    }

    updateZoomLabel(k) {
        //Mode d'emploi : 
        // Affiche dynamiquement le niveau de zoom en pourcentage

        const percent = Math.round(k * 100);
        const zoomLabel = document.getElementById('zoom');
        if (zoomLabel) {
            zoomLabel.textContent = `Zoom : ${percent}%`;
        }
    }

    renderGraph() {
        if (!this.svg) return;

        if (this.isTreeMode) {
            return;
        }

        let sourceNodes, sourceLinks;
        if (this.isSubgraphMode) {
            sourceNodes = this.subgraphNodes;
            sourceLinks = this.subgraphLinks;
        } else {
            sourceNodes = this.graph.nodes;
            sourceLinks = this.graph.links;
        }

        const predicateFilteredLinks = sourceLinks.filter(l => this.activePredicates.has(l.predicate));

        const anchorNodeId = this.isSubgraphMode && this.subgraphRootNode ? this.subgraphRootNode.id : (this.startNode ? this.startNode.id : null);

        const nodeCandidates = sourceNodes.filter(n => {
            const totalDegree = n.inDegree + n.outDegree;
            const passesDegree = totalDegree >= this.minDegreeFilter;
            const isVisibleType = this.activeTypes ? this.activeTypes.has(n.type) : true;
            const isAnchorNode = anchorNodeId && n.id === anchorNodeId;
            const isNotHidden = !this.hiddenNodes.has(n.id);
            return ((passesDegree && isVisibleType) || isAnchorNode) && isNotHidden;
        });

        const candidateNodeIds = new Set(nodeCandidates.map(n => n.id));

        const visibleLinks = predicateFilteredLinks.filter(l => {
            const src = typeof l.source === 'object' ? l.source.id : l.source;
            const tgt = typeof l.target === 'object' ? l.target.id : l.target;
            return candidateNodeIds.has(src) && candidateNodeIds.has(tgt);
        });

        const usedNodeIds = new Set();
        visibleLinks.forEach(link => {
            const src = typeof link.source === 'object' ? link.source.id : link.source;
            const tgt = typeof link.target === 'object' ? link.target.id : link.target;
            usedNodeIds.add(src);
            usedNodeIds.add(tgt);
        });

        const visibleNodes = nodeCandidates.filter(n => {
            return (!this.hideIsolatedNodes || usedNodeIds.has(n.id)) || (anchorNodeId && n.id === anchorNodeId);
        });

        this.visibleNodes = visibleNodes;
        this.visibleLinks = visibleLinks;

        const width = this.svg.node().getBoundingClientRect().width;
        const height = this.svg.node().getBoundingClientRect().height;

        const sizeAccessor = d => {
            if (this.nodeSizeMode === 'fixed') return 1;
            if (this.nodeSizeMode === 'in') return d.inDegree;
            if (this.nodeSizeMode === 'out') return d.outDegree;
            return d.inDegree + d.outDegree;
        };

        const sizeScale = this.nodeSizeMode === 'fixed'
            ? () => 12
            : d3.scaleLinear()
                .domain(d3.extent(sourceNodes, sizeAccessor))
                .range([8, 30]);

        // ⚙️ Simulation
        this.simulation = d3.forceSimulation(visibleNodes)
            .force('link', d3.forceLink(visibleLinks).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(this.gravityForce))
            .force('center', d3.forceCenter(width / 2, height / 2));

        // ➕ Appliquer un regroupement si demandé
        if (this.clusterMode !== 'none') {
            // (re)calcul des clusters si besoin (cas où l’utilisateur change les filtres)
            if (this.clusterMode === 'type') {
                this.clusterAssignments = this.computeClustersByType();
            } else if (this.clusterMode === 'louvain') {
                this.clusterAssignments = this.computeCommunitiesLPA();
            }
            this.applyClusteringForces(this.simulation, width, height);
        }

        const pauseBtn = document.getElementById('toggleSimulationBtn');
        if (this.simulationPaused) {
            this.simulation.stop();
            if (pauseBtn) pauseBtn.textContent = '▶️ Reprendre Simulation';
        } else {
            this.simulation.alpha(0.3).restart();
            if (pauseBtn) pauseBtn.textContent = '⏸️ Pause Simulation';
        }

        this.svg.selectAll('.links > *').remove();
        this.svg.selectAll('.nodes > *').remove();

        const link = this.svg.select('.zoom-group .links')
            .selectAll('line')
            .data(visibleLinks)
            .enter().append('line')
            .attr('stroke', '#9ca3af')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.7)
            .attr('marker-end', 'url(#arrowhead)');

        if (this.showEdgeLabels) {
            this.svg.select('.zoom-group .links')
                .selectAll('text')
                .data(visibleLinks)
                .enter().append('text')
                .text(d => this.extractLabel(d.predicate))
                .attr('font-size', '12px')
                .attr('text-anchor', 'middle')
                .style('fill', '#666')
                .style('pointer-events', 'none');
        }

        const node = this.svg.select('.zoom-group .nodes')
            .selectAll('circle')
            .data(visibleNodes)
            .enter().append('circle')
            .attr('r', d => {
                const baseSize = this.nodeSizeMode === 'fixed' ? sizeScale() : sizeScale(sizeAccessor(d));
                if (this.isSubgraphMode && d === this.subgraphRootNode) return baseSize * 5.0;
                return baseSize;
            })
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (event, d) => this.dragstarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragended(event, d)))
            .attr('stroke', d => {
                if (d === this.startNode) return 'green';
                if (d === this.endNode) return 'red';
                return 'white';
            })
            .attr('stroke-width', d => {
                if (d === this.startNode || d === this.endNode) return 4;
                return 2;
            })
            .on('click', (event, d) => this.selectNode(d))
            .on('contextmenu', (event, d) => {
                event.preventDefault();
                this.hiddenNodes.add(d.id);
                this.hideNodeInView(d.id);
            });

        const labelsGroup = this.svg.select('.zoom-group .nodes');
        labelsGroup.selectAll('text').remove();
        if (this.showNodeLabels) {
            labelsGroup
                .selectAll('text')
                .data(visibleNodes)
                .enter().append('text')
                .text(d => d.label)
                .attr('font-size', '12px')
                .attr('text-anchor', 'middle')
                .attr('dy', '.35em')
                .style('pointer-events', 'none')
                .style('fill', 'black')
                .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.7)');
        }

        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            this.svg.selectAll('.zoom-group .links text')
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            if (this.showNodeLabels) {
                this.svg.selectAll('.zoom-group .nodes text')
                    .attr('x', d => d.x)
                    .attr('y', d => d.y);
            }

            this.updateMiniMap(visibleNodes, visibleLinks);
        });

        const overlay = document.getElementById('graphOverlay');
        if (overlay) {
            overlay.innerHTML = `📊 Graphe: ${visibleNodes.length} nœuds • ${visibleLinks.length} arêtes • <span id="zoom">Zoom : 100%</span>`;
        }

        this.updateNodeColors();
        this.updateEdgeColors();
    }


    selectNode(node) {
        //Mode d'emploi : 
        // Affiche les infos d’un nœud sélectionné dans l’interface

        this.selectedNode = node;
        const nodeInfo = document.getElementById('selectedNodeInfo');
        nodeInfo.innerHTML = `
            <strong>${node.label}</strong><br>
            <small>Type: ${node.type}</small>
            <div style="margin: 10px 0;">
                <div class="stats-item">
                    <span>Degré entrant:</span>
                    <span class="stats-value">${node.inDegree}</span>
                </div>
                <div class="stats-item">
                    <span>Degré sortant:</span>
                    <span class="stats-value">${node.outDegree}</span>
                </div>
            </div>
        `;
        this.updateSelectedNodeHighlight();
    }

    updateStatistics() {
        //Mode d'emploi :
        // Calcule et affiche les statistiques globales du graphe

        const stats = {
            totalTriples: this.graph.triples.length,
            uniqueNodes: this.graph.nodes.length,
            uniquePredicates: [...new Set(this.graph.triples.map(t => t.predicate))].length,
            isolatedNodes: this.graph.nodes.filter(n => n.inDegree === 0 && n.outDegree === 0).length
        };

        const typeCount = {};
        this.graph.nodes.forEach(node => {
            typeCount[node.type] = (typeCount[node.type] || 0) + 1; // ||0 au cas où c'est undefined
        });

        const statsPanel = document.getElementById('statsPanelContent');
        statsPanel.innerHTML = `
            <div class="stats-item">
                <span>Triplets totaux:</span>
                <span class="stats-value">${stats.totalTriples}</span>
            </div>
            <div class="stats-item">
                <span>Nœuds uniques:</span>
                <span class="stats-value">${stats.uniqueNodes}</span>
            </div>
            <div class="stats-item">
                <span>Prédicats uniques:</span>
                <span class="stats-value">${stats.uniquePredicates}</span>
            </div>
            <div class="stats-item">
                <span>Nœuds isolés:</span>
                <span class="stats-value">${stats.isolatedNodes}</span>
            </div>
            <div style="margin-top: 15px;">
                <label style="font-size: 13px; font-weight: 600;">Distribution par type:</label>
                ${Object.entries(typeCount).map(([type, count]) => `
                    <div class="stats-item">
                        <span>${type}</span>
                        <span class="stats-value">${count}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    exportSVG() {
        //Mode d'emploi : 
        // Exporte le graphe visible au format SVG
        if (!this.svg) {
            alert("Aucun graphe à exporter.");
            return;
        }

        const svgNode = this.svg.node().cloneNode(true);

        // Fix namespaces
        svgNode.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svgNode.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

        // Supprime l'attribut inline width/height si c'est du 100%
        svgNode.removeAttribute("width");
        svgNode.removeAttribute("height");

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgNode);
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "graphe_rdf.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }

    deleteGraph() {
        //Mode d'emploi : 
        // Supprime le graphe courant et réinitialise l’état

        this.graph = {
            nodes: [],
            links: [],
            triples: []
        };

        this.labelMap.clear();

        this.activePredicates.clear();
        this.activeTypes.clear();

        if (this.svg) {
            this.svg.selectAll('*').remove();
            this.svg.append('g').attr('class', 'zoom-group');
            this.svg.select('.zoom-group').append('g').attr('class', 'links');
            this.svg.select('.zoom-group').append('g').attr('class', 'nodes');
        }

        this.updateStatistics();
        document.getElementById('fileInput').value = '';

        this.allPaths = [];
        this.currentPathIndex = 0;
        this.startNode = null;
        this.endNode = null;
        this.startNodeInput.value = '';
        this.endNodeInput.value = '';
        document.getElementById('pathNavigationControls').style.display = 'none';

        const overlay = document.getElementById('graphOverlay');
        if (overlay) {
            overlay.innerHTML = `📊 Graphe: 0 nœuds • 0 arêtes • <span id="zoom">Zoom : 100%</span>`;
        }
    }


    dragstarted(event, d) {
        //Mode d'emploi : 
        // Permet de déplacer manuellement les nœuds du graphe

        if (!event.active && !this.simulationPaused) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        //Mode d'emploi : 
        // Permet de déplacer manuellement les nœuds du graphe

        d.fx = event.x;
        d.fy = event.y;

        // Mise à jour manuelle si la simulation est en pause
        if (this.simulationPaused) {
            d.x = event.x;
            d.y = event.y;
            this.svg.selectAll('.nodes circle')
                .filter(n => n.id === d.id)
                .attr('cx', d.x)
                .attr('cy', d.y);

            if (this.showNodeLabels) {
                this.svg.selectAll('.nodes text')
                    .filter(n => n.id === d.id)
                    .attr('x', d.x)
                    .attr('y', d.y);
            }

            this.svg.selectAll('.zoom-group .links line')
                .attr('x1', l => l.source.x)
                .attr('y1', l => l.source.y)
                .attr('x2', l => l.target.x)
                .attr('y2', l => l.target.y);

            this.svg.selectAll('.zoom-group .links text')
                .attr('x', l => (l.source.x + l.target.x) / 2)
                .attr('y', l => (l.source.y + l.target.y) / 2);

            this.updateMiniMap(this.visibleNodes, this.visibleLinks);
        }
    }

    dragended(event, d) {
        //Mode d'emploi : 
        // Permet de déplacer manuellement les nœuds du graphe

        if (!event.active && !this.simulationPaused) this.simulation.alphaTarget(0);
        if (!this.simulationPaused) {
            d.fx = null;
            d.fy = null;
        }
    }

    updateDegreeSlider() {
        //Mode d'emploi : 
        // Met à jour les valeurs du filtre par degré (slider)

        const degrees = this.graph.nodes.map(n => n.inDegree + n.outDegree);
        if (degrees.length === 0) return;

        const min = 0;
        const max = Math.max(...degrees);
        const median = Math.round((min + max) / 2);

        const rangeInput = document.getElementById('degreeRangeInput');
        const labels = document.getElementById('degreeRangeLabels').children;

        rangeInput.min = min;
        rangeInput.max = max;
        rangeInput.value = min;
        this.minDegreeFilter = min;

        labels[0].textContent = min;
        labels[1].textContent = median;
        labels[2].textContent = max;

        document.getElementById('minDegreeValue').textContent = min;
    }

    updatecolorNodeLegend(colorScale) {
        //Mode d'emploi : 
        // Affiche la légende de couleurs selon le mode actif

        const legendContainer = document.getElementById('colorNodeLegend');
        legendContainer.innerHTML = '';

        if (!colorScale) return; // ne rien afficher si mode degré

        colorScale.domain().forEach(type => {
            const color = colorScale(type);
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-color" style="background: ${color};"></div>
                <span>${type}</span>
            `;
            legendContainer.appendChild(item);
        });
    }

    updateMiniMap(nodes, links) {
        //Mode d'emploi : 
        // Met à jour la mini-carte de navigation du graphe

        const miniSvg = d3.select("#miniMapSvg");
        miniSvg.selectAll("*").remove();

        const width = miniSvg.node().clientWidth;
        const height = miniSvg.node().clientHeight;

        if (!nodes || nodes.length === 0 || !width || !height) return;

        // Étendue des coordonnées réelles
        const xExtent = d3.extent(nodes, d => d.x);
        const yExtent = d3.extent(nodes, d => d.y);

        // Vérification des étendues valides
        if (!isFinite(xExtent[0]) || !isFinite(xExtent[1]) || !isFinite(yExtent[0]) || !isFinite(yExtent[1])) return;

        // Échelles de la minimap
        const xScale = d3.scaleLinear().domain(xExtent).range([10, width - 10]);
        const yScale = d3.scaleLinear().domain(yExtent).range([10, height - 10]);

        const group = miniSvg.append("g");

        // Liens
        group.selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("x1", d => xScale(d.source.x))
            .attr("y1", d => yScale(d.source.y))
            .attr("x2", d => xScale(d.target.x))
            .attr("y2", d => yScale(d.target.y))
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1);

        // Nœuds
        group.selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 2)
            .attr("fill", "#555");

        // Rectangle rouge (vue principale)
        const zoomTransform = d3.zoomTransform(this.svg.node());
        if (!zoomTransform || !isFinite(zoomTransform.k) || zoomTransform.k === 0) return;

        const mainW = this.svg.node().clientWidth;
        const mainH = this.svg.node().clientHeight;

        const visibleX1 = -zoomTransform.x / zoomTransform.k;
        const visibleY1 = -zoomTransform.y / zoomTransform.k;
        const visibleX2 = visibleX1 + mainW / zoomTransform.k;
        const visibleY2 = visibleY1 + mainH / zoomTransform.k;

        const x1 = xScale(visibleX1);
        const y1 = yScale(visibleY1);
        const x2 = xScale(visibleX2);
        const y2 = yScale(visibleY2);

        if ([x1, x2, y1, y2].some(v => !isFinite(v))) return;

        group.append("rect")
            .attr("x", x1)
            .attr("y", y1)
            .attr("width", x2 - x1)
            .attr("height", y2 - y1)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 2");
    }

    exportVisibleRDFandConfig() {
        //Mode d'emploi : 
        // Exporte les données RDF visibles et la configuration actuelle au format TTL et JSON
        const visibleNodeIds = new Set(this.visibleNodes.map(n => n.id));

        const visibleTriples = this.graph.triples.filter(t => {
            const isSubjectVisible = visibleNodeIds.has(t.subject);
            const isObjectVisible = visibleNodeIds.has(t.object);
            const isRDFType = t.predicate.includes('rdf-syntax-ns#type') || t.predicate.endsWith('#type');
            return (isSubjectVisible && isObjectVisible) || (isSubjectVisible && isRDFType);
        });

        let ttlContent = '';
        visibleTriples.forEach(t => {
            const subject = `<${t.subject}>`;
            const predicate = `<${t.predicate}>`;
            const object = t.objectType === 'Literal' ? `"${t.object}"` : `<${t.object}>`;
            ttlContent += `${subject} ${predicate} ${object} .\n`;
        });

        const config = {
            activePredicates: Array.from(this.activePredicates),
            activeTypes: Array.from(this.activeTypes),
            hideIsolatedNodes: this.hideIsolatedNodes,
            minDegreeFilter: this.minDegreeFilter,
            nodeColorMode: this.nodeColorMode,
            nodeSizeMode: this.nodeSizeMode,
            showEdgeLabels: this.showEdgeLabels,
            simulationPaused: this.simulationPaused,
            globalPredicates: Array.from(this.globalPredicates),
            globalTypes: Array.from(this.globalTypes),
            typeColorMap: Object.fromEntries(this.typeColorMap),
            predicateColorMap: Object.fromEntries(this.predicateColorMap)
        };

        const configContent = JSON.stringify(config, null, 2);

        const download = (filename, content, mimeType) => {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        download("export.ttl", ttlContent, "text/turtle");
        download("config.json", configContent, "application/json");
    }

    async loadConfigFile(file) {
        //Mode d'emploi : 
        // Charge un fichier de configuration JSON pour restaurer l'état de l'application
        try {
            const content = await file.text();
            const config = JSON.parse(content);

            this.activePredicates = new Set(config.activePredicates || []);
            this.activeTypes = new Set(config.activeTypes || []);
            this.hideIsolatedNodes = !!config.hideIsolatedNodes;
            this.minDegreeFilter = config.minDegreeFilter ?? 0;
            this.nodeColorMode = config.nodeColorMode || 'type';
            this.nodeSizeMode = config.nodeSizeMode || 'total';
            this.showEdgeLabels = !!config.showEdgeLabels;
            this.simulationPaused = !!config.simulationPaused;

            this.globalPredicates = new Set(config.globalPredicates || []);
            this.globalTypes = new Set(config.globalTypes || []);
            this.typeColorMap = new Map(Object.entries(config.typeColorMap || {}));
            this.predicateColorMap = new Map(Object.entries(config.predicateColorMap || {}));

            document.getElementById('showEdgeLabels').checked = this.showEdgeLabels;
            document.getElementById('hideIsolatedNodes').checked = this.hideIsolatedNodes;

            const rangeInput = document.getElementById('degreeRangeInput');
            rangeInput.value = this.minDegreeFilter;
            document.getElementById('minDegreeValue').textContent = this.minDegreeFilter;

            document.getElementById('nodeColorModeSelect').value = {
                'type': 'Par type RDF',
                'in': 'Par degré entrant',
                'out': 'Par degré sortant',
                'total': 'Par degré total'
            }[this.nodeColorMode];

            document.getElementById('nodeSizeModeSelect').value = {
                'in': 'Par degré entrant',
                'out': 'Par degré sortant',
                'total': 'Par degré total',
                'fixed': 'Fixe (même taille)'
            }[this.nodeSizeMode];

            this.renderGraph();

            const toggle = document.getElementById('toggleSimulationBtn');
            if (this.simulationPaused) {
                this.simulation.stop();
                if (toggle) toggle.textContent = '▶️ Reprendre Simulation';
            } else {
                this.simulation.alpha(0.3);
                if (toggle) toggle.textContent = '⏸️ Pause Simulation';
            }

        } catch (e) {
            console.error('Erreur lors du chargement de la configuration:', e);
            alert('Erreur lors du chargement du fichier de configuration.');
        }
    }

    updateDepthSlider(maxDepth) {
        //Mode d'emploi : 
        // Met à jour le slider d’exploration en profondeur
        const rangeInput = document.getElementById('depthRange');
        const labels = document.getElementById('depthRangeLabels').children;

        const min = 1;
        const max = Math.max(1, maxDepth);  // min 1, max au moins 1
        const median = Math.floor((min + max) / 2);

        rangeInput.min = min;
        rangeInput.max = max;
        rangeInput.value = min;

        labels[0].textContent = min;
        labels[1].textContent = median;
        labels[2].textContent = max;

        document.getElementById('depthValue').textContent = min;

    }

    showAutocomplete(inputElement, type) {
        //Mode d'emploi : 
        // Affiche une liste de suggestions pour la saisie de nœuds

        const input = inputElement.value.trim().toLowerCase();
        const container = inputElement.parentElement;

        const old = container.querySelector('.autocomplete');
        if (old) old.remove();

        if (!input) return;

        const matches = this.visibleNodes
            .filter(n => n.label.toLowerCase().startsWith(input))
            .slice(0, 10);


        if (matches.length === 0) return;

        const list = document.createElement('div');
        list.className = 'autocomplete';
        Object.assign(list.style, {
            border: '1px solid #ccc',
            background: 'white',
            position: 'absolute',
            zIndex: 1000,
            width: '100%'
        });

        matches.forEach(n => {
            const item = document.createElement('div');
            item.textContent = n.label;
            Object.assign(item.style, {
                padding: '5px',
                cursor: 'pointer'
            });
            item.addEventListener('click', () => {
                inputElement.value = n.label;
                this.selectNodeFromInput(n.label, type);
                list.remove();
            });
            list.appendChild(item);
        });

        container.style.position = 'relative';
        container.appendChild(list);

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                const old = container.querySelector('.autocomplete');
                if (old) old.remove();
            }
        }, { once: true });
    }


    selectNodeFromInput(label, type = 'start') {
        //Mode d'emploi : 
        // Sélectionne un nœud via son nom saisi dans un champ texte

        const node = this.labelMap.get(label);
        if (node) {
            if (type === 'start') {
                this.setStartNode(node);
            } else {
                this.setEndNode(node);
            }
        } else {
            alert('Nœud introuvable');
        }
    }


    setStartNode(node) {
        //Mode d'emploi : 
        // Définit un nœud de départ  pour les explorations

        this.startNode = node;
        this.startNodeInput.value = node.label;
        this.updateNodeStyles();
    }

    setEndNode(node) {
        //Mode d'emploi : 
        // Définit un nœud de départ ou d’arrivée pour les explorations

        this.endNode = node;
        this.endNodeInput.value = node.label;
        this.updateNodeStyles();
    }

    updateNodeStyles() {
        //Mode d'emploi : 
        // Met à jour les styles visuels des nœuds sélectionnés

        this.svg.selectAll('.nodes circle')
            .attr('stroke', d => {
                if (this.isSubgraphMode && d === this.subgraphRootNode) return 'blue';
                if (d === this.startNode) return 'green';
                if (d === this.endNode) return 'red';
                return 'white';
            })
            .attr('stroke-width', d => {
                if (this.isSubgraphMode && d === this.subgraphRootNode) return 6;
                if (d === this.startNode || d === this.endNode) return 4;
                return 2;
            });

    }

    updateSelectedNodeHighlight() {
        //Mode d'emploi : 
        // Met à jour les styles visuels des nœuds sélectionnés

        this.svg.selectAll('.nodes circle')
            .attr('stroke', d => {
                if (d === this.startNode) return 'green';
                if (d === this.endNode) return 'red';
                if (d === this.selectedNode) return 'orange';
                return 'white';
            })
            .attr('stroke-width', d => {
                if (d === this.startNode || d === this.endNode || d === this.selectedNode) return 4;
                return 2;
            });
    }

    async exploreFromStartNode(maxDepth = 3, delay = 1000) {
        // Mode d'emploi :
        // Parcours en largeur (BFS) depuis le nœud de départ, par couches.
        // Utilise adjList / revAdjList pour calculer les voisins, et restreint
        // le parcours au graphe actuellement visible (filtres & sous-graphe) via
        // this.visibleNodes / this.visibleLinks.

        // 1) Préconditions
        if (!this.startNode) {
            alert("Veuillez sélectionner un nœud de départ.");
            return;
        }

        const direction = this.exploreDirectionSelect.value; // "Entrantes", "Sortantes", "Entrantes + Sortantes"

        // 2) Index rapides du graphe VISIBLE (respecte prédicats & filtres)
        const visibleNodeIds = new Set(this.visibleNodes.map(n => n.id));
        const visibleEdgeSet = new Set(
            this.visibleLinks.map(l => {
                const src = typeof l.source === 'object' ? l.source.id : l.source;
                const tgt = typeof l.target === 'object' ? l.target.id : l.target;
                return `${src}->${tgt}`;
            })
        );

        // 3) BFS par couches
        const layers = [];
        const visited = new Set([this.startNode.id]);
        const queue = [{ id: this.startNode.id, depth: 0 }];

        while (queue.length > 0) {
            const { id, depth } = queue.shift();
            const node = this.nodeMap.get(id);
            if (!layers[depth]) layers[depth] = [];
            layers[depth].push(node);

            if (depth >= maxDepth) continue;

            const nextIds = new Set();

            // Voisins ENTRANTS (parents) : parent -> id
            if (direction === 'Entrantes' || direction === 'Entrantes + Sortantes') {
                const parents = this.revAdjList.get(id) || [];
                for (const parentId of parents) {
                    // Respecte le graphe visible : nœud visible + arête visible parent->id
                    if (!visibleNodeIds.has(parentId)) continue;
                    if (!visibleEdgeSet.has(`${parentId}->${id}`)) continue;
                    if (!visited.has(parentId)) nextIds.add(parentId);
                }
            }

            // Voisins SORTANTS (enfants) : id -> child
            if (direction === 'Sortantes' || direction === 'Entrantes + Sortantes') {
                const children = this.adjList.get(id) || [];
                for (const childId of children) {
                    // Respecte le graphe visible : nœud visible + arête visible id->child
                    if (!visibleNodeIds.has(childId)) continue;
                    if (!visibleEdgeSet.has(`${id}->${childId}`)) continue;
                    if (!visited.has(childId)) nextIds.add(childId);
                }
            }

            // Enqueue voisins non visités
            for (const nid of nextIds) {
                visited.add(nid);
                queue.push({ id: nid, depth: depth + 1 });
            }
        }

        // 4) Animation : surligner couche par couche
        for (let d = 0; d < layers.length; d++) {
            const currentLayer = layers[d];
            const previousLayer = d > 0 ? layers[d - 1] : [];
            this.highlightLayer(currentLayer, previousLayer);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    highlightLayer(currentLayerNodes, previousLayerNodes) {
        //Mode d'emploi : 
        // Met en évidence visuellement une couche de nœuds dans l’exploration
        const currentIds = new Set(currentLayerNodes.map(n => n.id));
        const previousIds = new Set(previousLayerNodes.map(n => n.id));

        // Surligner les nœuds de la couche actuelle
        this.svg.selectAll('.nodes circle')
            .filter(d => currentIds.has(d.id))
            .attr('stroke', '#FFD700')
            .attr('stroke-width', 6);

        // Surligner les arêtes entre couches n et n-1
        this.svg.selectAll('.zoom-group .links line')
            .filter(d => {
                const src = typeof d.source === 'object' ? d.source.id : d.source;
                const tgt = typeof d.target === 'object' ? d.target.id : d.target;

                return (
                    (currentIds.has(src) && previousIds.has(tgt)) ||
                    (currentIds.has(tgt) && previousIds.has(src))
                );
            })
            .attr('stroke', '#FFD700')
            .attr('stroke-width', 4);
    }

    resetGraphView() {
        //Mode d'emploi : 
        // Réinitialise l'affichage du graphe et les sélections

        // Réinitialise les nœuds de départ et d'arrivée
        this.startNode = null;
        this.endNode = null;
        this.startNodeInput.value = '';
        this.endNodeInput.value = '';

        // Supprime tous les styles de surlignage (y compris chemins et explorations)
        this.svg.selectAll('.nodes circle')
            .attr('stroke', d => {
                if (d === this.selectedNode) return 'orange'; // si un nœud est sélectionné
                return 'white';
            })
            .attr('stroke-width', d => {
                if (d === this.selectedNode) return 4;
                return 2;
            });

        this.svg.selectAll('.zoom-group .links line')
            .attr('stroke-width', 2);

        this.updateEdgeColors();

        // Réinitialise les chemins trouvés et masque les boutons
        this.allPaths = [];
        this.currentPathIndex = 0;
        document.getElementById('pathNavigationControls').style.display = 'none';

        // Renforce le style du nœud sélectionné uniquement
        this.updateSelectedNodeHighlight();
    }

    findShortestPath() {
        //Mode d'emploi
        //Methode pour trouver le chemin le plus court entre deux noeuds

        if (!this.startNode || !this.endNode) {
            alert("Veuillez sélectionner à la fois un nœud de départ et d'arrivée.");
            return;
        }

        const direction = this.exploreDirectionSelect.value;
        const visibleNodeIds = new Set(this.visibleNodes.map(n => n.id));

        // Construction dynamique du graphe filtré
        const graph = new Map();

        for (const nodeId of visibleNodeIds) {
            const neighbors = new Set();

            if ((direction === 'Sortantes' || direction === 'Entrantes + Sortantes') && this.adjList.has(nodeId)) {
                for (const target of this.adjList.get(nodeId)) {
                    if (visibleNodeIds.has(target)) neighbors.add(target);
                }
            }

            if ((direction === 'Entrantes' || direction === 'Entrantes + Sortantes') && this.revAdjList.has(nodeId)) {
                for (const source of this.revAdjList.get(nodeId)) {
                    if (visibleNodeIds.has(source)) neighbors.add(source);
                }
            }

            graph.set(nodeId, Array.from(neighbors));
        }

        const queue = [[this.startNode.id]];
        const visited = new Set();

        while (queue.length > 0) {
            const path = queue.shift();
            const node = path[path.length - 1];

            if (node === this.endNode.id) {
                this.highlightPath(path);
                return;
            }

            if (!visited.has(node)) {
                visited.add(node);
                for (const neighbor of graph.get(node) || []) {
                    queue.push([...path, neighbor]);
                }
            }
        }

        alert("Aucun chemin visible trouvé entre les deux nœuds.");
    }


    highlightPath(path) {
        //Mode d'emploi : 
        // Affiche les nœuds du chemin en bleu foncé

        this.svg.selectAll('.nodes circle')
            .attr('stroke', d => {
                if (path.includes(d.id)) return '#003366'; // couleur spéciale
                if (d === this.startNode) return 'green';
                if (d === this.endNode) return 'red';
                return 'white';
            })
            .attr('stroke-width', d => path.includes(d.id) ? 6 : 2);

        // Affiche les liens du chemin en épais
        const pathLinks = new Set();
        for (let i = 0; i < path.length - 1; i++) {
            const pair = [path[i], path[i + 1]];
            pathLinks.add(pair.join('->'));
        }

        this.svg.selectAll('.zoom-group .links line')
            .attr('stroke', d => {
                const src = typeof d.source === 'object' ? d.source.id : d.source;
                const tgt = typeof d.target === 'object' ? d.target.id : d.target;
                return pathLinks.has(`${src}->${tgt}`) || pathLinks.has(`${tgt}->${src}`) ? '#003366' : '#9ca3af';
            })
            .attr('stroke-width', d => {
                const src = typeof d.source === 'object' ? d.source.id : d.source;
                const tgt = typeof d.target === 'object' ? d.target.id : d.target;
                return pathLinks.has(`${src}->${tgt}`) || pathLinks.has(`${tgt}->${src}`) ? 4 : 2;
            });
    }

    findAllPaths() {
        //Mode d'emploi
        //Methode pour trouver tous les chemins entre deux noeuds

        if (!this.startNode || !this.endNode) {
            alert("Veuillez sélectionner à la fois un nœud de départ et d'arrivée.");
            return;
        }

        const direction = this.exploreDirectionSelect.value;
        const visibleNodeIds = new Set(this.visibleNodes.map(n => n.id));

        const graph = new Map();

        for (const nodeId of visibleNodeIds) {
            const neighbors = new Set();

            if ((direction === 'Sortantes' || direction === 'Entrantes + Sortantes') && this.adjList.has(nodeId)) {
                for (const target of this.adjList.get(nodeId)) {
                    if (visibleNodeIds.has(target)) neighbors.add(target);
                }
            }

            if ((direction === 'Entrantes' || direction === 'Entrantes + Sortantes') && this.revAdjList.has(nodeId)) {
                for (const source of this.revAdjList.get(nodeId)) {
                    if (visibleNodeIds.has(source)) neighbors.add(source);
                }
            }

            graph.set(nodeId, Array.from(neighbors));
        }

        const paths = [];
        const visited = new Set();

        this.dfs(this.startNode.id, this.endNode.id, [this.startNode.id], graph, visited, paths);

        if (paths.length === 0) {
            alert("Aucun chemin trouvé.");
            document.getElementById('pathNavigationControls').style.display = 'none';
            return;
        }

        this.allPaths = paths;
        this.currentPathIndex = 0;
        this.highlightPath(paths[0]);

        if (paths.length >= 2) {
            document.getElementById('pathNavigationControls').style.display = 'block';
            document.getElementById('pathCounter').textContent = `1 / ${paths.length}`;
        } else {
            document.getElementById('pathNavigationControls').style.display = 'none';
        }
    }


    dfs(current, target, path, graph, visited, paths, maxDepth = 20) {
        //Mode d'emploi : 
        // Algorithme de parcours en profondeur pour trouver tous les chemins entre deux nœuds
        if (path.length > maxDepth) return;
        if (current === target) {
            paths.push([...path]);
            return;
        }

        visited.add(current);

        for (const neighbor of graph.get(current) || []) {
            if (!visited.has(neighbor)) {
                path.push(neighbor);
                this.dfs(neighbor, target, path, graph, visited, paths, maxDepth);
                path.pop();
            }
        }

        visited.delete(current);
    }

    getColorScale() {
        //Mode d'emploi : 
        // Génère une échelle de couleurs selon le type ou le degré des nœuds

        if (this.nodeColorMode === 'type') {
            const types = Array.from(this.globalTypes).sort();
            const scale = d3.scaleOrdinal()
                .domain(types)
                .range(types.map(type => this.typeColorMap.get(type)));
            return scale;
        } else {
            let degreeAccessor;
            if (this.nodeColorMode === 'in') degreeAccessor = d => d.inDegree;
            else if (this.nodeColorMode === 'out') degreeAccessor = d => d.outDegree;
            else degreeAccessor = d => d.inDegree + d.outDegree;

            const maxDegree = d3.max(this.graph.nodes, degreeAccessor);
            return d3.scaleLinear()
                .domain([0, maxDegree])
                .range(["#F1A7A7", "#580E0E"]);
        }
    }

    updateNodeColors() {
        //Mode d'emploi : 
        // Applique la couleur aux nœuds selon l’échelle active

        const colorScale = this.getColorScale();
        this.svg.selectAll('.nodes circle')
            .transition()
            .duration(300)
            .attr('fill', d => {
                if (this.nodeColorMode === 'type') return colorScale(d.type);
                if (this.nodeColorMode === 'in') return colorScale(d.inDegree);
                if (this.nodeColorMode === 'out') return colorScale(d.outDegree);
                return colorScale(d.inDegree + d.outDegree);
            });

        this.updatecolorNodeLegend(colorScale);
    }

    toggleSimulation() {
        //Mode d'emploi : 
        // Démarre ou met en pause la simulation physique du graphe

        if (!this.simulation) return;

        this.simulationPaused = !this.simulationPaused;

        const btn = document.getElementById('toggleSimulationBtn');
        if (this.simulationPaused) {
            this.simulation.stop();
            btn.textContent = '▶️ Reprendre Simulation';
        } else {
            this.simulation.alpha(0.3).restart();
            btn.textContent = '⏸️ Pause Simulation';
        }
    }

    showSubgraph() {
        //Mode d'emploi : 
        //Methode pour afficher un sous graphe à partir du noeud de départ et de la profondeur selectionnée

        if (!this.startNode) {
            alert("Veuillez sélectionner un nœud de départ.");
            return;
        }

        const maxDepth = parseInt(document.getElementById('depthRange').value);
        const direction = this.exploreDirectionSelect.value;

        // 1. On explore TOUT LE GRAPHE (pas de filtre) pour obtenir le sous-graphe brut
        const visited = new Set();
        const queue = [{ node: this.startNode, depth: 0 }];
        visited.add(this.startNode.id);

        while (queue.length > 0) {
            const { node, depth } = queue.shift();
            if (depth >= maxDepth) continue;

            // Utilise bien this.graph.links pour ignorer les filtres
            this.graph.links.forEach(link => {
                const source = typeof link.source === 'object' ? link.source : this.nodeMap.get(link.source);
                const target = typeof link.target === 'object' ? link.target : this.nodeMap.get(link.target);


                if (!source || !target) return;

                const srcId = source.id;
                const tgtId = target.id;

                if ((direction.includes("Entrantes") && tgtId === node.id && !visited.has(srcId))) {
                    visited.add(srcId);
                    queue.push({ node: source, depth: depth + 1 });
                }

                if ((direction.includes("Sortantes") && srcId === node.id && !visited.has(tgtId))) {
                    visited.add(tgtId);
                    queue.push({ node: target, depth: depth + 1 });
                }
            });
        }

        // 2. On stocke le sous-graphe "pur" sans filtre dans deux propriétés
        const newVisibleNodeIds = visited;
        const newVisibleNodes = this.graph.nodes.filter(n => newVisibleNodeIds.has(n.id));
        const newVisibleLinks = this.graph.links.filter(l =>
            newVisibleNodeIds.has(typeof l.source === 'object' ? l.source.id : l.source) &&
            newVisibleNodeIds.has(typeof l.target === 'object' ? l.target.id : l.target)
        );

        // Stockage du sous-graphe BRUT (pour pouvoir filtrer/défiltrer à l'affichage)
        this.subgraphNodes = newVisibleNodes;
        this.subgraphLinks = newVisibleLinks;

        // Active le mode sous-graphe
        this.isSubgraphMode = true;
        this.subgraphRootNode = this.startNode;

        // On déclenche le rendu qui appliquera les filtres d'affichage sur ce sous-graphe
        this.renderGraph();

        // Met à jour le texte du bouton
        document.getElementById('SubGraphBtn').textContent = '🌳 Afficher le graphe entier';
    }

    resetToFullGraph() {
        //Mode d'emploi :
        //Méthode pour passer du sous graphe au graphe entier 

        this.visibleNodes = this.previousVisibleNodes;
        this.visibleLinks = this.previousVisibleLinks;
        this.isSubgraphMode = false;
        this.subgraphRootNode = null;
        this.renderGraph();

        document.getElementById('SubGraphBtn').textContent = '🕸️ Afficher le sous graphe';
    }

    updateEdgeColors() {
        //Mode d'emploi :
        // Méthode pour mettre à jour la couleur des arêtes selon le mode sélectionné

        const linkSelection = this.svg.selectAll('.zoom-group .links line');

        if (this.edgeColorMode === 'predicate') {
            const predicates = Array.from(this.globalPredicates).sort();
            const colorScale = d3.scaleOrdinal()
                .domain(predicates)
                .range(predicates.map(pred => this.predicateColorMap.get(pred)));

            linkSelection
                .transition()
                .duration(300)
                .attr('stroke', d => colorScale(d.predicate));

            this.updateEdgeColorLegend(colorScale);
        } else {
            linkSelection
                .transition()
                .duration(300)
                .attr('stroke', '#9ca3af');

            this.updateEdgeColorLegend(null);
        }
    }


    updateEdgeColorLegend(scale) {
        //Mode d'emploi :
        //Methode pour mettre à jour la légende concernant la couleur des arêtes selon le mode selectionné

        const legendContainer = document.getElementById('colorEdgeLegend');
        legendContainer.innerHTML = '';

        if (!scale) return;

        scale.domain().forEach(pred => {
            const color = scale(pred);
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-color" style="background: ${color};"></div>
                <span>${this.extractLabel(pred)}</span>
            `;
            legendContainer.appendChild(item);
        });
    }

    hideCurrentlyIsolatedNodes() {
        //Mode d'emploi :
        //Methode pour ne plus afficher les noeuds n'ayant aucune arête visible

        const isolatedIds = new Set();

        this.visibleNodes.forEach(n => {
            const hasLink = this.visibleLinks.some(l =>
                (typeof l.source === 'object' ? l.source.id : l.source) === n.id ||
                (typeof l.target === 'object' ? l.target.id : l.target) === n.id
            );
            if (!hasLink) isolatedIds.add(n.id);
        });

        // Masquer les cercles
        this.svg.selectAll('.nodes circle')
            .filter(d => isolatedIds.has(d.id))
            .attr('visibility', 'hidden');

        // Masquer les labels de nœuds s'ils sont activés
        if (this.showNodeLabels) {
            this.svg.selectAll('.nodes text')
                .filter(d => isolatedIds.has(d.id))
                .attr('visibility', 'hidden');
        }

        //mise à jour du compteur en haut à gauche
        const newCount = this.visibleNodes.length - isolatedIds.size;
        const overlay = document.getElementById('graphOverlay');
        overlay.innerHTML = `📊 Graphe: ${newCount} nœuds • ${this.visibleLinks.length} arêtes • <span id="zoom">Zoom : 100%</span>`;
    }

    async runSparqlRequest(query) {
        const endpointInput = document.getElementById('endpointInput');
        const endpointUrl = endpointInput?.value?.trim() || "http://localhost:3030/rdfexplorer/sparql";

        // AbortController
        this.currentAbortController = new AbortController();

        // 1) POST (évite les limites d’URL)
        try {
            const resp = await fetch(endpointUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/sparql-results+json',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: 'query=' + encodeURIComponent(query),
                signal: this.currentAbortController.signal
            });
            if (!resp.ok) throw new Error(await resp.text());
            this.isSparqlGraph = true;
            this.updateExpandButtonState();
            return await resp.json();
        } catch (e) {
            // 2) Fallback GET (certaines configs CORS)
            const fullUrl = endpointUrl + "?query=" + encodeURIComponent(query);
            const resp = await fetch(fullUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/sparql-results+json' },
                signal: this.currentAbortController.signal
            });
            if (!resp.ok) throw new Error(`Erreur SPARQL ${resp.status} :\n${await resp.text()}`);
            this.isSparqlGraph = true;
            this.updateExpandButtonState();
            return await resp.json();
        } finally {
            this.currentAbortController = null;
        }
    }

    convertSparqlResultsToTriples(results, isExpand = false, nodeId = null) {
        //Mode d'emploi : 
        // Convertit les résultats de requête SPARQL en triplets RDF pour le graphe
        const triples = [];

        const variables = results.head.vars;  // récupère la liste des colonnes
        if (variables.length < 3) {
            console.warn("Pas assez de colonnes pour former un triple :", variables);
            return triples;
        }

        const [firstVar, secondVar, thirdVar] = variables;  // ordre garanti

        for (const binding of results.results.bindings) {
            const s = binding[firstVar]?.value || (isExpand ? nodeId : null);
            const p = binding[secondVar]?.value || null;
            const o = binding[thirdVar]?.value || (isExpand ? nodeId : null);
            const oType = binding[thirdVar]?.type === "literal" ? "Literal" : "NamedNode";

            if (s && p && o) {
                triples.push({
                    subject: s,
                    predicate: p,
                    object: o,
                    objectType: oType
                });
            }
        }

        return triples;
    }



    async expandSelectedNode() {
        //Mode d'emploi : 
        //Lance une requete SPARQL pour étendre l'affichage d'un noeud selectionné

        if (!this.isSparqlGraph) {
            alert("Le graphe actuel ne provient pas d'une requête SPARQL. Impossible d'étendre.");
            return;
        }


        if (!this.selectedNode) {
            alert("Veuillez d'abord sélectionner un nœud.");
            return;
        }

        const nodeId = this.selectedNode.id;
        const limitValue = document.getElementById('expandLimitRange').value;

        const query = `
        SELECT ?s ?p ?o WHERE {
            { ?s ?p <${nodeId}> }
            UNION
            { <${nodeId}> ?p ?o }
        } LIMIT ${limitValue}
    `;

        try {
            const results = await this.runSparqlRequest(query);
            const newTriples = this.convertSparqlResultsToTriples(results, true, nodeId);

            if (newTriples.length === 0) {
                alert("Aucun nouveau triplet trouvé pour étendre.");
                return;
            }

            // 🔥 Récupérer les types des nouveaux nœuds
            await this.enrichWithTypes(newTriples);

            // 🔗 Fusionner avec le graphe existant
            this.graph.triples = this.graph.triples.concat(newTriples);
            this.buildGraphFromTriples(this.graph.triples);
            this.extractActivePredicates();
            this.extractActiveTypes();
            this.updateStatistics();
            this.renderGraph();

            alert(`${newTriples.length} triplets ajoutés au graphe.`);
        } catch (e) {
            alert("Erreur lors de l'extension SPARQL : " + e.message);
            console.error(e);
        }
    }

    updateExpandButtonState() {
        //Mode d'emploi : 
        // Active ou désactive les boutons d'extension SPARQL selon le contexte du graphe
        const expandBtn = document.getElementById('expandSparqlBtn');
        const expandFilterBtn = document.getElementById('expandFilterSparqlBtn');
        const addAllNeighborsBtn = document.getElementById('addAllNeighborsSparqlBtn'); // AJOUT

        if (this.isSparqlGraph) {
            expandBtn.disabled = false;
            expandBtn.classList.remove('disabled-button');

            expandFilterBtn.disabled = false;
            expandFilterBtn.classList.remove('disabled-button');

            addAllNeighborsBtn.disabled = false; // AJOUT
            addAllNeighborsBtn.classList.remove('disabled-button'); // AJOUT
        } else {
            expandBtn.disabled = true;
            expandBtn.classList.add('disabled-button');

            expandFilterBtn.disabled = true;
            expandFilterBtn.classList.add('disabled-button');

            addAllNeighborsBtn.disabled = true; // AJOUT
            addAllNeighborsBtn.classList.add('disabled-button'); // AJOUT
        }
    }



    async expandAndFilterSelectedNode() {
        //Mode d'emploi : 
        // Remplace le graphe actuel par les voisins directs du nœud sélectionné
        if (!this.selectedNode) {
            alert("Veuillez d'abord sélectionner un nœud.");
            return;
        }

        const nodeId = this.selectedNode.id;
        const limitValue = document.getElementById('expandLimitRange').value;

        const query = `
        SELECT ?s ?p ?o WHERE {
            { ?s ?p <${nodeId}> }
            UNION
            { <${nodeId}> ?p ?o }
        } LIMIT ${limitValue}
    `;

        try {
            const results = await this.runSparqlRequest(query);
            const newTriples = this.convertSparqlResultsToTriples(results, true, nodeId);

            if (newTriples.length === 0) {
                alert("Aucun nouveau triplet trouvé.");
                return;
            }

            // 🔥 Récupérer les types des nouveaux nœuds
            await this.enrichWithTypes(newTriples);

            // 💥 Remplacer complètement le graphe
            this.deleteGraph();
            this.graph.triples = newTriples;
            this.buildGraphFromTriples(newTriples);
            this.extractActivePredicates();
            this.extractActiveTypes();
            this.updateStatistics();
            this.renderGraph();

            alert(`${newTriples.length} triplets récupérés et affichés.`);
        } catch (e) {
            alert("Erreur lors de l'extension filtrée SPARQL : " + e.message);
            console.error(e);
        }
    }

    async enrichWithTypes(newTriples) {
        //Mode d'emploi : 
        // Enrichit les triplets avec les informations de type RDF des nouveaux nœuds
        const uniqueNodes = new Set();

        newTriples.forEach(t => {
            uniqueNodes.add(t.subject);
            if (t.objectType === 'NamedNode') {
                uniqueNodes.add(t.object);
            }
        });

        if (uniqueNodes.size === 0) return;

        const valuesClause = Array.from(uniqueNodes).map(uri => `<${uri}>`).join(' ');
        const typeQuery = `
            SELECT ?node ?type WHERE {
                VALUES ?node { ${valuesClause} }
                ?node a ?type .
            }
        `;

        try {
            const typeResults = await this.runSparqlRequest(typeQuery);
            const typeTriples = typeResults.results.bindings.map(b => ({
                subject: b.node.value,
                predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                object: b.type.value,
                objectType: 'NamedNode'
            }));

            this.graph.triples = this.graph.triples.concat(typeTriples);
        } catch (e) {
            console.warn("Erreur lors de la récupération des types :", e.message);
        }
    }

    async addAllNeighborsOfSelectedNode() {
        //Mode d'emploi : 
        // Ajoute tous les voisins du nœud sélectionné au graphe actuel via SPARQL
        if (!this.isSparqlGraph) {
            alert("Le graphe actuel ne provient pas d'une requête SPARQL. Impossible d'ajouter des voisins.");
            return;
        }

        if (!this.selectedNode) {
            alert("Veuillez d'abord sélectionner un nœud.");
            return;
        }

        const nodeId = this.selectedNode.id;
        const formattedNodeId = nodeId.startsWith('http') ? `<${nodeId}>` : `"${nodeId}"`;

        const query = `
            SELECT ?s ?p ?o WHERE {
                { ?s ?p ${formattedNodeId} }
                UNION
                { ${formattedNodeId} ?p ?o }
            }
        `;

        try {
            const results = await this.runSparqlRequest(query);
            const newTriples = this.convertSparqlResultsToTriples(results, true, nodeId);

            if (newTriples.length === 0) {
                alert("Aucun nouveau voisin trouvé.");
                return;
            }

            await this.enrichWithTypes(newTriples);

            this.graph.triples = this.graph.triples.concat(newTriples);
            this.buildGraphFromTriples(this.graph.triples);
            this.extractActivePredicates();
            this.extractActiveTypes();
            this.updateStatistics();
            this.renderGraph();

            alert(`${newTriples.length} voisins ajoutés au graphe.`);
        } catch (e) {
            alert("Erreur lors de l'ajout des voisins : " + e.message);
            console.error(e);
        }
    }

    hideNodeInView(nodeId) {
        //Mode d'emploi : 
        // Masque visuellement un nœud et ses arêtes associées dans la vue du graphe
        // Cache le cercle du nœud
        this.svg.selectAll('.nodes circle')
            .filter(n => n.id === nodeId)
            .attr('visibility', 'hidden');

        // Cache le label du nœud s’il est affiché
        this.svg.selectAll('.nodes text')
            .filter(n => n.id === nodeId)
            .attr('visibility', 'hidden');

        // Cache les arêtes associées
        this.svg.selectAll('.zoom-group .links line')
            .filter(l => {
                const src = typeof l.source === 'object' ? l.source.id : l.source;
                const tgt = typeof l.target === 'object' ? l.target.id : l.target;
                return src === nodeId || tgt === nodeId;
            })
            .attr('visibility', 'hidden');

        // Cache les labels des arêtes si activés
        this.svg.selectAll('.zoom-group .links text')
            .filter(l => {
                const src = typeof l.source === 'object' ? l.source.id : l.source;
                const tgt = typeof l.target === 'object' ? l.target.id : l.target;
                return src === nodeId || tgt === nodeId;
            })
            .attr('visibility', 'hidden');

        // Met à jour le compteur affiché
        const remainingNodes = this.visibleNodes.filter(n => !this.hiddenNodes.has(n.id)).length;
        const overlay = document.getElementById('graphOverlay');
        overlay.innerHTML = `📊 Graphe: ${remainingNodes} nœuds • ${this.visibleLinks.length} arêtes • <span id="zoom">Zoom : 100%</span>`;
    }

    updateExampleSelect() {
        //Mode d'emploi : 
        // Met à jour la liste des exemples de requêtes SPARQL selon l'endpoint sélectionné
        const endpoint = document.getElementById('endpointInput').value;
        const examples = this.exampleQueries[endpoint] || [];
        const exampleSelect = document.getElementById('exampleSelect');

        // Nettoyer
        exampleSelect.innerHTML = '';

        // Remplir les nouvelles options
        examples.forEach((ex, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = ex.label;
            exampleSelect.appendChild(option);
        });

        // Remplir automatiquement la zone de texte au changement de sélection
        exampleSelect.addEventListener('change', () => {
            const selected = examples[exampleSelect.value];
            if (selected) {
                document.getElementById('sparqlQueryInput').value = selected.query;
            }
        });

        // Préremplir avec le premier exemple si dispo
        if (examples.length > 0) {
            exampleSelect.selectedIndex = 0;
            document.getElementById('sparqlQueryInput').value = examples[0].query;
        } else {
            document.getElementById('sparqlQueryInput').value = '';
        }
    }

    computeMinimalSpanningTree() {
        //Mode d'emploi : 
        // Calcule un arbre couvrant minimal pour l'affichage hiérarchique en mode arbre
        if (!this.startNode) {
            alert("Veuillez sélectionner un nœud de départ.");
            return [];
        }

        const maxDepth = parseInt(document.getElementById('depthRange').value);
        const direction = this.exploreDirectionSelect.value;

        const filteredNodeIds = new Set(this.graph.nodes
            .filter(n => (this.activeTypes.size === 0 || this.activeTypes.has(n.type)) || n.id === this.startNode.id)
            .filter(n => !this.hiddenNodes.has(n.id))
            .filter(n => (n.inDegree + n.outDegree) >= this.minDegreeFilter || n.id === this.startNode.id)
            .map(n => n.id));

        const filteredLinks = this.graph.links.filter(l => {
            const src = typeof l.source === 'object' ? l.source.id : l.source;
            const tgt = typeof l.target === 'object' ? l.target.id : l.target;
            return filteredNodeIds.has(src) &&
                filteredNodeIds.has(tgt) &&
                this.activePredicates.has(l.predicate);
        });

        const visited = new Set([this.startNode.id]);
        const mstEdges = [];
        const queue = [{ id: this.startNode.id, depth: 0 }];

        while (queue.length > 0) {
            const { id, depth } = queue.shift();
            if (depth >= maxDepth) continue;

            // Entrantes
            if (direction === "Entrantes" || direction === "Entrantes + Sortantes") {
                if (this.revAdjList.has(id)) {
                    for (const neighborId of this.revAdjList.get(id)) {
                        if (!visited.has(neighborId) && filteredNodeIds.has(neighborId)) {
                            const link = filteredLinks.find(l => {
                                const src = typeof l.source === 'object' ? l.source.id : l.source;
                                const tgt = typeof l.target === 'object' ? l.target.id : l.target;
                                return src === neighborId && tgt === id;
                            });
                            if (link) {
                                mstEdges.push(link);
                                visited.add(neighborId);
                                queue.push({ id: neighborId, depth: depth + 1 });
                            }
                        }
                    }
                }
            }

            // Sortantes
            if (direction === "Sortantes" || direction === "Entrantes + Sortantes") {
                if (this.adjList.has(id)) {
                    for (const neighborId of this.adjList.get(id)) {
                        if (!visited.has(neighborId) && filteredNodeIds.has(neighborId)) {
                            const link = filteredLinks.find(l => {
                                const src = typeof l.source === 'object' ? l.source.id : l.source;
                                const tgt = typeof l.target === 'object' ? l.target.id : l.target;
                                return src === id && tgt === neighborId;
                            });
                            if (link) {
                                mstEdges.push(link);
                                visited.add(neighborId);
                                queue.push({ id: neighborId, depth: depth + 1 });
                            }
                        }
                    }
                }
            }
        }

        return mstEdges;
    }


    buildHierarchyFromEdges(edges, rootId) {
        //Mode d'emploi : 
        // Construit une structure hiérarchique d'arbre à partir d'arêtes et d'un nœud racine
        const childMap = new Map();
        const parentMap = new Map();

        edges.forEach(e => {
            const src = typeof e.source === 'object' ? e.source.id : e.source;
            const tgt = typeof e.target === 'object' ? e.target.id : e.target;

            if (!childMap.has(src)) childMap.set(src, []);
            childMap.get(src).push({ id: tgt, predicate: e.predicate });

            if (!parentMap.has(tgt)) parentMap.set(tgt, []);
            parentMap.get(tgt).push({ id: src, predicate: e.predicate });
        });

        const visited = new Set();

        const build = (nodeId) => {
            if (visited.has(nodeId)) return null;
            visited.add(nodeId);

            const children = [];

            // Parcours enfants (sortants)
            if (childMap.has(nodeId)) {
                for (const { id: childId, predicate } of childMap.get(nodeId)) {
                    const childNode = build(childId);
                    if (childNode) {
                        childNode.predicateFromParent = predicate;
                        children.push(childNode);
                    }
                }
            }

            // Parcours parents (entrants)
            if (parentMap.has(nodeId)) {
                for (const { id: parentId, predicate } of parentMap.get(nodeId)) {
                    const parentNode = build(parentId);
                    if (parentNode) {
                        parentNode.predicateFromParent = predicate;
                        children.push(parentNode);
                    }
                }
            }

            const nodeObj = this.nodeMap.get(nodeId);
            return {
                name: this.extractLabel(nodeId),
                id: nodeId,
                type: nodeObj?.type || 'unknown',
                inDegree: nodeObj?.inDegree || 0,
                outDegree: nodeObj?.outDegree || 0,
                children
            };
        };

        return build(rootId);
    }

    buildHierarchyFromStartNodeAll(startNodeId, maxDepth = 3) {
        //Mode d'emploi : 
        // Construit une hiérarchie complète en explorant tous les voisins à partir d'un nœud
        const visited = new Set();

        const recurse = (nodeId, depth) => {
            if (depth > maxDepth || visited.has(nodeId)) return null;
            visited.add(nodeId);

            const outgoing = (this.adjList.get(nodeId) || []);
            const incoming = (this.revAdjList.get(nodeId) || []);
            const neighbors = [...new Set([...outgoing, ...incoming])];

            const children = neighbors
                .map(childId => recurse(childId, depth + 1))
                .filter(child => child !== null);

            const nodeObj = this.nodeMap.get(nodeId);
            return {
                name: this.extractLabel(nodeId),
                id: nodeId,
                type: nodeObj?.type || 'unknown',
                inDegree: nodeObj?.inDegree || 0,
                outDegree: nodeObj?.outDegree || 0,
                children
            };
        };

        return recurse(startNodeId, 0);
    }

    renderTreeWithFilters(hierarchyData) {
        //Mode d'emploi : 
        // Applique les filtres actifs aux données hiérarchiques avant de rendre l'arbre
        const applyFilters = (node) => {
            const isStartNode = node.id === this.startNode?.id;
            const isHidden = this.hiddenNodes.has(node.id);
            const passesType = this.activeTypes.size === 0 || this.activeTypes.has(node.type);

            if (isHidden) {
                return null;
            }

            const filteredChildren = node.children
                .map(child => applyFilters(child))
                .filter(child => child !== null);

            if (isStartNode) {
                return {
                    ...node,
                    children: filteredChildren
                };
            }

            if (!passesType) {
                return null;
            }

            return {
                ...node,
                children: filteredChildren
            };
        };

        const filteredHierarchy = applyFilters(hierarchyData);
        if (!filteredHierarchy) {
            alert("Aucun nœud à afficher avec les filtres actuels.");
            return;
        }

        this.renderTree(filteredHierarchy);
    }

    renderTree(hierarchyData) {
        //Mode d'emploi : 
        // Affiche la visualisation en mode arbre avec D3.js à partir de données hiérarchiques
        d3.select("#graphContainer").selectAll("*").remove();

        const container = document.getElementById('graphContainer');
        const width = container.getBoundingClientRect().width;
        const height = container.getBoundingClientRect().height;

        const root = d3.hierarchy(hierarchyData);
        const nodeCount = root.descendants().length;
        const minSpacing = 40;
        const neededHeight = Math.max(height, nodeCount * minSpacing);

        this.svg = d3.select("#graphContainer")
            .append("svg")
            .attr("width", width)
            .attr("height", neededHeight + 100)
            .call(
                d3.zoom()
                    .scaleExtent([0.05, 5])
                    .on('zoom', (event) => {
                        this.svg.select('g.zoom-group').attr('transform', event.transform);
                        this.updateZoomLabel(event.transform.k);
                        this.updateMiniMap(this.visibleNodes, this.visibleLinks);
                    })
            );

        this.svg.append('g').attr('class', 'zoom-group')
            .attr('transform', 'translate(50,50)');

        const treeLayout = d3.tree().size([neededHeight, width - 100]);
        treeLayout(root);

        const colorScale = this.getColorScale();
        const sizeAccessor = d => {
            if (this.nodeSizeMode === 'fixed') return 1;
            if (this.nodeSizeMode === 'in') return d.inDegree;
            if (this.nodeSizeMode === 'out') return d.outDegree;
            return d.inDegree + d.outDegree;
        };
        const sizeScale = this.nodeSizeMode === 'fixed'
            ? () => 12
            : d3.scaleLinear()
                .domain(d3.extent(this.graph.nodes, sizeAccessor))
                .range([8, 30]);

        // 🔥 Appliquer la couleur par prédicat
        this.svg.select('.zoom-group').selectAll('line')
            .data(root.links())
            .enter()
            .append('line')
            .attr('x1', d => d.source.y)
            .attr('y1', d => d.source.x)
            .attr('x2', d => d.target.y)
            .attr('y2', d => d.target.x)
            .attr('stroke', d => {
                const pred = d.target.data.predicateFromParent;
                return this.predicateColorMap.get(pred) || '#9ca3af';
            })
            .attr('stroke-width', 2);

        this.svg.select('.zoom-group').selectAll('circle')
            .data(root.descendants())
            .enter()
            .append('circle')
            .attr('cx', d => d.y)
            .attr('cy', d => d.x)
            .attr('r', d => sizeScale(sizeAccessor(d.data)))
            .attr('fill', d => {
                if (this.nodeColorMode === 'type') return this.typeColorMap.get(d.data.type) || '#ccc';
                if (this.nodeColorMode === 'in') return colorScale(d.data.inDegree);
                if (this.nodeColorMode === 'out') return colorScale(d.data.outDegree);
                return colorScale(d.data.inDegree + d.data.outDegree);
            })
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        this.svg.select('.zoom-group').selectAll('text')
            .data(root.descendants())
            .enter()
            .append('text')
            .attr('x', d => d.y + 8)
            .attr('y', d => d.x + 4)
            .text(d => d.data.name)
            .attr('font-size', '10px');
    }

    applyClusteringForces(simulation, width, height) {
        // Construire les centres des clusters de manière stable (grille)
        const assignments = this.clusterAssignments; // Map(nodeId -> clusterKey)
        if (!assignments || assignments.size === 0) return;

        const clusters = Array.from(new Set(Array.from(assignments.values())));
        // calcul de centres si absent ou si le set de clusters a changé
        const prevKeys = new Set(this.clusterCenters.keys());
        let needRecompute = clusters.length !== this.clusterCenters.size ||
            clusters.some(k => !prevKeys.has(k));

        if (needRecompute) {
            this.clusterCenters = this.getClusterCenters(clusters, width, height);
        }

        // Force qui attire chaque nœud vers le centre de son cluster
        const strength = 0.15; // pull vers centre (ajuster au besoin)
        simulation
            .force('clusterX', d3.forceX(d => {
                const key = this.clusterAssignments.get(d.id);
                const c = this.clusterCenters.get(key);
                return c ? c.x : width / 2;
            }).strength(strength))
            .force('clusterY', d3.forceY(d => {
                const key = this.clusterAssignments.get(d.id);
                const c = this.clusterCenters.get(key);
                return c ? c.y : height / 2;
            }).strength(strength));
    }

    getClusterCenters(clusters, width, height) {
        const centers = new Map();
        const n = clusters.length;
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);

        const padding = 120;
        const cellW = Math.max(200, (width - padding * 2) / cols);
        const cellH = Math.max(200, (height - padding * 2) / rows);

        clusters.forEach((key, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const x = padding + c * cellW + cellW / 2;
            const y = padding + r * cellH + cellH / 2;
            centers.set(key, { x, y });
        });
        return centers;
    }

    computeClustersByType() {
        const map = new Map();
        this.visibleNodes.forEach(n => {
            const key = n.type || 'unknown';
            map.set(n.id, key);
        });
        return map;
    }

    computeCommunitiesLPA() {
        // Construire un graphe non orienté pondéré (poids = nombre d'arêtes entre deux nœuds visibles)
        const neighbors = new Map(); // nodeId -> Map(neiId -> weight)
        const addEdge = (a, b) => {
            if (!neighbors.has(a)) neighbors.set(a, new Map());
            const m = neighbors.get(a);
            m.set(b, (m.get(b) || 0) + 1);
        };

        const visibleIds = new Set(this.visibleNodes.map(n => n.id));
        this.visibleLinks.forEach(l => {
            const s = (typeof l.source === 'object') ? l.source.id : l.source;
            const t = (typeof l.target === 'object') ? l.target.id : l.target;
            if (visibleIds.has(s) && visibleIds.has(t)) {
                addEdge(s, t);
                addEdge(t, s);
            }
        });

        // Initialisation des labels: chaque nœud = son propre label
        const label = new Map();
        this.visibleNodes.forEach(n => label.set(n.id, n.id));

        // Itérations LPA
        const MAX_IT = 20;
        let changed = true, it = 0;
        while (changed && it < MAX_IT) {
            changed = false;
            it++;

            // itérer les nœuds dans un ordre aléatoire
            const order = this.visibleNodes.map(n => n.id);
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }

            for (const id of order) {
                const neigh = neighbors.get(id);
                if (!neigh || neigh.size === 0) continue;

                // score par label voisin (pondéré)
                const scores = new Map();
                neigh.forEach((w, nb) => {
                    const lab = label.get(nb);
                    scores.set(lab, (scores.get(lab) || 0) + w);
                });

                // label le plus fréquent/pondéré
                let best = label.get(id);
                let bestScore = -Infinity;
                scores.forEach((v, k) => {
                    if (v > bestScore || (v === bestScore && k < best)) {
                        bestScore = v;
                        best = k;
                    }
                });

                if (best !== label.get(id)) {
                    label.set(id, best);
                    changed = true;
                }
            }
        }

        // Normaliser: transformer le label final en clés compactes ("C1","C2",…)
        const uniq = Array.from(new Set(label.values()));
        const mapKey = new Map(uniq.map((k, i) => [k, `C${i + 1}`]));

        const assignment = new Map();
        this.visibleNodes.forEach(n => assignment.set(n.id, mapKey.get(label.get(n.id))));
        return assignment;
    }

}

//Demarrage app
document.addEventListener('DOMContentLoaded', () => {
    //Mode d'emploi : 
    // Lorsque le DOM est prêt, on initialise l'application en créant un explorateur RDF

    new RdfExplorer();
    // === Mode sombre (indépendant) ===
    (function () {
        const root = document.documentElement;
        const THEME_KEY = "rdfexplorer-theme";
        const btn = document.getElementById("toggleThemeBtn");

        function applyTheme(mode) {
            if (mode === "dark") {
                root.classList.add("dark-mode");
            } else {
                root.classList.remove("dark-mode");
            }
            updateBtnLabel();
        }

        function updateBtnLabel() {
            if (!btn) return;
            const isDark = root.classList.contains("dark-mode");
            btn.textContent = isDark ? "☀️ Mode clair" : "🌙 Mode sombre";
        }

        // Charger le thème sauvegardé
        try {
            const saved = localStorage.getItem(THEME_KEY) || "light";
            applyTheme(saved);
        } catch (_) {
            applyTheme("light");
        }

        // Clic bouton
        if (btn) {
            btn.addEventListener("click", () => {
                const isDark = !root.classList.contains("dark-mode");
                applyTheme(isDark ? "dark" : "light");
                try {
                    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
                } catch (_) { }
            });
        }

        // Raccourci clavier Ctrl + J
        document.addEventListener("keydown", (e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (mod && (e.key === "j" || e.key === "J")) {
                e.preventDefault();
                if (btn) btn.click();
            }
        });
    })();

});
