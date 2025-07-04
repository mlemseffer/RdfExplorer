class RdfExplorer {
    constructor() {
        //Regler le pb des unknown
        //Regarder ldViz
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

        //Attributs de l'exploration
        this.startNodeInput = document.getElementById('startNodeInput');
        this.startNode = null;        
        this.endNodeInput = document.getElementById('endNodeInput');    
        this.endNode = null;
        this.allPaths = [];
        this.currentPathIndex = 0;

        //Pause
        this.simulationPaused = false;
        
        this.isSubgraphMode = false;
        this.previousVisibleNodes = [];
        this.previousVisibleLinks = [];

        this.subgraphNodes = [];
        this.subgraphLinks = [];

        //Optimisation

        this.nodeMap = new Map();      // id => node
        this.adjList = new Map();      // id => [voisins sortants]
        this.revAdjList = new Map();   // id => [voisins entrants]
        this.labelMap = new Map();


        this.init();
    }

    init() {
        this.setupEventListeners();
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
            else this.nodeSizeMode = 'total';
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

        document.getElementById('SubGraphBtn').addEventListener('click', () => {
            if (this.isSubgraphMode) {
                this.resetToFullGraph();
            } else {
                this.showSubgraph();
            }
        });
        
        const edgeColorSelect = document.getElementById('edgeColorModeSelect');
        edgeColorSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            this.edgeColorMode = value.includes('prédicats') ? 'predicate' : 'none';
            this.updateEdgeColors(); // appliquer sans relancer tout renderGraph
        });

    }

    async loadRDFFile(file) {
        //Mode d'emploi : 
            // Charge un fichier RDF (.ttl), l’analyse et construit le graphe

        try {
            this.deleteGraph();
            const content = await this.readFileContent(file);
            const triples = await this.parseWithN3(content);
            this.graph.triples = triples;
            this.buildGraphFromTriples(triples);
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
                if (node.id.includes('xmlns.com/foaf/0.1/')||node.id.includes('schema.org')) {
                    // Cas spécial foaf : on considère directement comme une classe
                    node.type = "Class"; 
                } else {
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
            // Récupère tous les prédicats et génère leurs filtres dans l’interface

        const predicateSet = new Set(this.graph.triples.map(t => t.predicate));
        const container = document.getElementById('predicatePanelContent');

        const group = document.getElementById('predicateCheckboxes');
        group.innerHTML = ''; // on le vide proprement

        predicateSet.forEach(pred => {
            const id = `pred-${this.extractLabel(pred).replace(/[^a-zA-Z0-9]/g, '')}`;
            const checked = true;
            this.activePredicates.add(pred);

            const div = document.createElement('div');
            div.classList.add('checkbox-item');
            div.innerHTML = `
                <input type="checkbox" id="${id}" checked>
                <label for="${id}">${this.extractLabel(pred)}</label>
            `;
            group.appendChild(div);

            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activePredicates.add(pred);
                } else {
                    this.activePredicates.delete(pred);
                }
                this.renderGraph(); // Refresh graph with filter
            });
        });
    }

    extractActiveTypes() {
        //Mode d'emploi : 
            // Récupère tous les types de nœuds et génère les filtres associés

        const typeSet = new Set(this.graph.nodes.map(n => n.type));
        const container = document.getElementById('rdfTypesCheckboxes');
    
        container.innerHTML = ''; // Réinitialiser
    
        typeSet.forEach(type => {
            const id = `type-${type.replace(/[^a-zA-Z0-9]/g, '')}`;
            
            const div = document.createElement('div');
            div.classList.add('checkbox-item');
            div.innerHTML = `
                <input type="checkbox" id="${id}">
                <label for="${id}">${type}</label>
            `;
            container.appendChild(div);
    
            // Écouteur : ajouter/supprimer dynamiquement
            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activeTypes.add(type);
                } else {
                    this.activeTypes.delete(type);
                }
                this.renderGraph(); // Redessiner
            });
        });
    
        // Réinitialiser le Set (vide par défaut)
        this.activeTypes.clear();
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
        return label || 'unknown';
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
    
        // 1. Source de données selon le mode (entier ou sous-graphe)
        let sourceNodes, sourceLinks;
        if (this.isSubgraphMode) {
            sourceNodes = this.subgraphNodes;
            sourceLinks = this.subgraphLinks;
        } else {
            sourceNodes = this.graph.nodes;
            sourceLinks = this.graph.links;
        }
    
        // 2. Application des filtres de prédicats
        const predicateFilteredLinks = sourceLinks.filter(l => this.activePredicates.has(l.predicate));
    
        // 3. Première passe : nœuds qui respectent type + degré
        const nodeCandidates = sourceNodes.filter(n => {
            const totalDegree = n.inDegree + n.outDegree;
            const passesDegree = totalDegree >= this.minDegreeFilter;
            const isVisibleType = this.activeTypes ? this.activeTypes.has(n.type) : true;
            return passesDegree && isVisibleType;
        });
    
        const candidateNodeIds = new Set(nodeCandidates.map(n => n.id));
    
        // 4. Filtres finaux des arêtes entre nœuds candidats
        const visibleLinks = predicateFilteredLinks.filter(l => {
            const src = typeof l.source === 'object' ? l.source.id : l.source;
            const tgt = typeof l.target === 'object' ? l.target.id : l.target;
            return candidateNodeIds.has(src) && candidateNodeIds.has(tgt);
        });
    
        // 5. Ensemble des nœuds effectivement connectés à une arête visible
        const usedNodeIds = new Set();
        visibleLinks.forEach(link => {
            const src = typeof link.source === 'object' ? link.source.id : link.source;
            const tgt = typeof link.target === 'object' ? link.target.id : link.target;
            usedNodeIds.add(src);
            usedNodeIds.add(tgt);
        });
    
        // 6. Filtrage final : masquer les nœuds isolés (non connectés à une arête visible)
        const visibleNodes = nodeCandidates.filter(n => {
            return !this.hideIsolatedNodes || usedNodeIds.has(n.id);
        });
    
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    
        // 7. Simulation D3 et rendu
        this.visibleNodes = visibleNodes;
        this.visibleLinks = visibleLinks;
    
        const width = this.svg.node().getBoundingClientRect().width;
        const height = this.svg.node().getBoundingClientRect().height;
    
        const sizeAccessor = d => {
            if (this.nodeSizeMode === 'in') return d.inDegree;
            if (this.nodeSizeMode === 'out') return d.outDegree;
            return d.inDegree + d.outDegree;
        };
    
        const sizeScale = d3.scaleLinear()
            .domain(d3.extent(sourceNodes, sizeAccessor))
            .range([8, 30]);
    
        this.simulation = d3.forceSimulation(visibleNodes)
            .force('link', d3.forceLink(visibleLinks).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(this.gravityForce))
            .force('center', d3.forceCenter(width / 2, height / 2));
    
        const pauseBtn = document.getElementById('toggleSimulationBtn');
        if (this.simulationPaused) {
            this.simulation.stop();
            if (pauseBtn) pauseBtn.textContent = '▶️ Reprendre Simulation';
        } else {
            this.simulation.alpha(0.3).restart();
            if (pauseBtn) pauseBtn.textContent = '⏸️ Pause Simulation';
        }
    
        // Efface anciens éléments SVG
        this.svg.selectAll('.links > *').remove();
        this.svg.selectAll('.nodes > *').remove();
    
        // Liens
        const link = this.svg.select('.zoom-group .links')
            .selectAll('line')
            .data(visibleLinks)
            .enter().append('line')
            .attr('stroke', '#9ca3af')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.7);
    
        // Labels d’arêtes (option)
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
    
        // Nœuds
        const node = this.svg.select('.zoom-group .nodes')
            .selectAll('circle')
            .data(visibleNodes)
            .enter().append('circle')
            .attr('r', d => sizeScale(sizeAccessor(d)))
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
            });
    
        // Labels de nœuds (option)
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
    
        // Clic sur nœud
        node.on('click', (event, d) => this.selectNode(d));
    
        // Tick simulation
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
    
        // Mise à jour statistiques et légendes
        const overlay = document.getElementById('graphOverlay');
        overlay.innerHTML = `📊 Graphe: ${visibleNodes.length} nœuds • ${visibleLinks.length} arêtes • <span id="zoom">Zoom : 100%</span>`;
    
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

        //On remet à 0 les prédicats actifs
        this.activePredicates = new Set();

        // Supprime l'affichage SVG
        if (this.svg) {
            this.svg.selectAll('*').remove();
            this.svg.append('g').attr('class', 'zoom-group');
            this.svg.select('.zoom-group').append('g').attr('class', 'links');
            this.svg.select('.zoom-group').append('g').attr('class', 'nodes');
        }

        this.updateStatistics();
        document.getElementById('fileInput').value = '';

        // Réinitialise les états de chemin et navigation
        this.allPaths = [];
        this.currentPathIndex = 0;
        this.startNode = null;
        this.endNode = null;
        this.startNodeInput.value = '';
        this.endNodeInput.value = '';
        document.getElementById('pathNavigationControls').style.display = 'none';

        const overlay = document.getElementById('graphOverlay');
        overlay.innerHTML = `📊 Graphe: 0 nœuds • 0 arêtes • <span id="zoom">Zoom : 100%</span>`;
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
        // 🔍 Préparation des IDs visibles (nœuds dans le graphe affiché)
        const visibleNodeIds = new Set(this.visibleNodes.map(n => n.id));
    
        // ✅ Triplets à exporter : 
        // - ceux dont le sujet ET l’objet sont visibles
        // - ou ceux dont le prédicat est rdf:type (même si l’objet est hors sous-graphe)
        const visibleTriples = this.graph.triples.filter(t => {
            const isSubjectVisible = visibleNodeIds.has(t.subject);
            const isObjectVisible = visibleNodeIds.has(t.object);
            const isRDFType = t.predicate.includes('rdf-syntax-ns#type') || t.predicate.endsWith('#type');
            return (isSubjectVisible && isObjectVisible) || (isSubjectVisible && isRDFType);
        });
    
        // 📄 Génération du contenu Turtle (.ttl)
        let ttlContent = '';
        visibleTriples.forEach(t => {
            const subject = `<${t.subject}>`;
            const predicate = `<${t.predicate}>`;
            const object = t.objectType === 'Literal' ? `"${t.object}"` : `<${t.object}>`;
            ttlContent += `${subject} ${predicate} ${object} .\n`;
        });
    
        // ⚙️ Génération du contenu Config (.json)
        const config = {
            activePredicates: Array.from(this.activePredicates),
            activeTypes: Array.from(this.activeTypes),
            hideIsolatedNodes: this.hideIsolatedNodes,
            minDegreeFilter: this.minDegreeFilter,
            nodeColorMode: this.nodeColorMode,
            nodeSizeMode: this.nodeSizeMode,
            showEdgeLabels: this.showEdgeLabels,
            simulationPaused: this.simulationPaused
        };
    
        const configContent = JSON.stringify(config, null, 2);
    
        // 📤 Fonction de téléchargement
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
    
        // 🚀 Déclenche les téléchargements
        download("export.ttl", ttlContent, "text/turtle");
        download("config.json", configContent, "application/json");
    }
    

    async loadConfigFile(file) {
        //Mode d'emploi
            // Exporte les triplets visibles et la configuration courante
        try {
            const content = await file.text();
            const config = JSON.parse(content);
    
            // Restaurer les options
            this.activePredicates = new Set(config.activePredicates || []);
            this.activeTypes = new Set(config.activeTypes || []);
            this.hideIsolatedNodes = !!config.hideIsolatedNodes;
            this.minDegreeFilter = config.minDegreeFilter ?? 0;
            this.nodeColorMode = config.nodeColorMode || 'type';
            this.nodeSizeMode = config.nodeSizeMode || 'total';
            this.showEdgeLabels = !!config.showEdgeLabels;
            this.simulationPaused = !!config.simulationPaused;
    
            // Appliquer les réglages UI
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
                'total': 'Par degré total'
            }[this.nodeSizeMode];            
    
            // Re-render après application config
            this.renderGraph();
    
            // Appliquer l'état de pause
            const toggle = document.getElementById('toggleSimulationBtn');
            if (this.simulationPaused) {
                // On stoppe explicitement sans relancer quoi que ce soit
                this.simulation.stop();
                if (toggle) toggle.textContent = '▶️ Reprendre Simulation';
            } else {
                // Ne redémarrer que si nécessaire
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
                if (d === this.startNode) return 'green';
                if (d === this.endNode) return 'red';
                return 'white';
            })
            .attr('stroke-width', d => {
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
        // Vérifie que le nœud de départ est défini
        if (!this.startNode) {
            alert("Veuillez sélectionner un nœud de départ.");
            return;
        }
    
        const direction = this.exploreDirectionSelect.value; // "Entrantes", "Sortantes", ou "Entrantes + Sortantes"
        const visited = new Set();
        const layers = [];
        const queue = [{ node: this.startNode, depth: 0 }];
        visited.add(this.startNode.id);
    
        while (queue.length > 0) {
            const { node, depth } = queue.shift();
            if (!layers[depth]) layers[depth] = [];
            layers[depth].push(node);
    
            if (depth < maxDepth) {
                const neighbors = this.visibleLinks.flatMap(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
                    const targetNode = typeof link.target === 'object' ? link.target : this.nodeMap.get(targetId);

    
                    const neighbors = [];

                    if ((direction === 'Entrantes' || direction === 'Entrantes + Sortantes') && this.revAdjList.has(node.id)) {
                        for (const parent of this.revAdjList.get(node.id)) {
                            if (!visited.has(parent)) neighbors.push(this.nodeMap.get(parent));
                        }
                    }
                    if ((direction === 'Sortantes' || direction === 'Entrantes + Sortantes') && this.adjList.has(node.id)) {
                        for (const child of this.adjList.get(node.id)) {
                            if (!visited.has(child)) neighbors.push(this.nodeMap.get(child));
                        }
                    }

    
                    return neighbors;
                });
    
                neighbors.forEach(n => {
                    if (!visited.has(n.id)) {
                        visited.add(n.id);
                        queue.push({ node: n, depth: depth + 1 });
                    }
                });
            }
        }
    
        // Affiche visuellement chaque couche avec délai
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
            const types = Array.from(new Set(this.graph.nodes.map(n => n.type))).sort();
            const colorPalette = d3.schemeCategory10.concat(d3.schemeSet3);
            const scale = d3.scaleOrdinal()
                .domain(types)
                .range(colorPalette.slice(0, types.length));
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
    
        // On déclenche le rendu qui appliquera les filtres d'affichage sur ce sous-graphe
        this.renderGraph();
    
        // Met à jour le texte du bouton
        document.getElementById('SubGraphBtn').textContent = '🌳 Afficher le graphe entier';
    }    
    
    resetToFullGraph() {
        this.visibleNodes = this.previousVisibleNodes;
        this.visibleLinks = this.previousVisibleLinks;
        this.isSubgraphMode = false;
        this.renderGraph();
    
        document.getElementById('SubGraphBtn').textContent = '🕸️ Afficher le sous graphe';
    }

    updateEdgeColors() {
        const linkSelection = this.svg.selectAll('.zoom-group .links line');
    
        if (this.edgeColorMode === 'predicate') {
            const predicates = Array.from(new Set(this.graph.links.map(l => l.predicate))).sort();
            const colorPalette = d3.schemeTableau10.concat(d3.schemeSet3);
            const colorScale = d3.scaleOrdinal()
                .domain(predicates)
                .range(colorPalette.slice(0, predicates.length));
    
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
    
        // Facultatif : mise à jour du compteur en haut à gauche
        const newCount = this.visibleNodes.length - isolatedIds.size;
        const overlay = document.getElementById('graphOverlay');
        overlay.innerHTML = `📊 Graphe: ${newCount} nœuds • ${this.visibleLinks.length} arêtes • <span id="zoom">Zoom : 100%</span>`;
    }
    

}

//Demarrage app
document.addEventListener('DOMContentLoaded', () => {
    //Mode d'emploi : 
        // Lorsque le DOM est prêt, on initialise l'application en créant un explorateur RDF

    new RdfExplorer();
});
