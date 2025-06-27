class RdfExplorer {
    constructor() {
        this.graph = {
            nodes: [],
            links: [],
            triples: []
        };
        this.canvas = null;
        this.context = null;
        this.simulation = null;
        this.activePredicates = new Set();
        this.activeTypes = new Set();
        this.hideIsolatedNodes = false;
        this.showEdgeLabels = false;
        this.showNodeLabels = false;
        this.minDegreeFilter = 0;
        this.nodeSizeMode = 'in';
        this.nodeColorMode = 'type';
        this.visibleNodes = [];
        this.visibleLinks = [];

        this.startNodeInput = document.querySelector('.panel-content input.form-control[placeholder^="ex"]');
        this.startNode = null;

        this.endNodeInput = document.querySelector('.form-group input.form-control[placeholder="Nœud d\'arrivée"]');
        this.endNode = null;

        this.allPaths = [];
        this.currentPathIndex = 0;

        this.simulationPaused = false;

        // Variables pour la gestion du canvas
        this.transform = d3.zoomIdentity;
        this.width = 0;
        this.height = 0;
        this.selectedNode = null;
        this.hoveredNode = null;
        this.isDragging = false;
        this.dragNode = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeGraph();
    }

    setupEventListeners() {
        document.getElementById('importRDFBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('exportRDFConfigBtn').addEventListener('click', () => {
            this.exportVisibleRDFandConfig();
        });

        document.getElementById('importConfigBtn').addEventListener('click', () => {
            document.getElementById('configInput').click();
        });

        document.getElementById('configInput').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.json')) {
                this.loadConfigFile(file);
            } else {
                alert('Veuillez sélectionner un fichier .json');
            }
        });

        document.getElementById('fileInput').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.ttl')) {
                this.loadRDFFile(file);
            } else {
                alert('Veuillez sélectionner un fichier .ttl');
            }
        });

        document.getElementById('deleteGraphBtn').addEventListener('click', () => {
            this.deleteGraph();
        });

        document.getElementById('resetGraphBtn').addEventListener('click', () => {
            this.resetGraphView();
        });

        document.getElementById('exportPNGBtn').addEventListener('click', () => {
            this.exportCanvas();
        });

        document.getElementById('showEdgeLabels').addEventListener('change', (e) => {
            this.showEdgeLabels = e.target.checked;
            this.redraw();
        });

        document.getElementById('showNodeLabels').addEventListener('change', (e) => {
            this.showNodeLabels = e.target.checked;
            this.redraw();
        });

        document.getElementById('hideIsolatedNodes').addEventListener('change', (e) => {
            this.hideIsolatedNodes = e.target.checked;
            this.renderGraph();
        });

        const rangeInput = document.querySelector('.range-input');
        rangeInput.addEventListener('input', (e) => {
            this.minDegreeFilter = parseInt(e.target.value);
            document.getElementById('minDegreeValue').textContent = e.target.value;
            this.renderGraph();
        });

        const sizeSelect = document.getElementById('nodeSizeModeSelect');
        sizeSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value.includes('entrant')) this.nodeSizeMode = 'in';
            else if (value.includes('sortant')) this.nodeSizeMode = 'out';
            else this.nodeSizeMode = 'total';
            this.redraw();
        });

        const colorSelect = document.querySelector('#nodeColorModeSelect');
        colorSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value.includes('entrant')) this.nodeColorMode = 'in';
            else if (value.includes('sortant')) this.nodeColorMode = 'out';
            else if (value.includes('total')) this.nodeColorMode = 'total';
            else this.nodeColorMode = 'type';
            this.updateNodeColors();
        });

        const depthRangeInput = document.getElementById('depthRange');
        depthRangeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('depthValue').textContent = value;
        });

        // Autocomplétion dans le champ "nœud de départ"
        this.startNodeInput.addEventListener('input', () => this.showAutocomplete());
        this.startNodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.selectNodeFromInput(this.startNodeInput.value);
        });

        document.getElementById('startNodeBtn').addEventListener('click', () => {
            const value = this.startNodeInput.value.trim();
            if (value === '' && this.selectedNode) {
                this.setStartNode(this.selectedNode);
            } else {
                this.selectNodeFromInput(value);
            }
        });

        this.endNodeInput.addEventListener('input', () => this.showAutocomplete(this.endNodeInput, 'end'));
        this.endNodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.selectNodeFromInput(this.endNodeInput.value, 'end');
        });

        document.getElementById('endNodeBtn').addEventListener('click', () => {
            const value = this.endNodeInput.value.trim();
            if (value === '' && this.selectedNode) {
                this.setEndNode(this.selectedNode);
            } else {
                this.selectNodeFromInput(value, 'end');
            }
        });

        this.exploreDirectionSelect = document.getElementById('edgeDirectionSelect');
        document.getElementById('depthExploreBtn').addEventListener('click', () => {
            const maxDepth = parseInt(document.getElementById('depthRange').value);
            this.exploreFromStartNode(maxDepth, 1000);
        });

        document.getElementById('shortestPathBtn').addEventListener('click', () => {
            this.findShortestPath();
        });

        document.getElementById('allPathsBtn').addEventListener('click', () => {
            this.findAllPaths();
        });

        document.getElementById('prevPathBtn').addEventListener('click', () => {
            if (this.allPaths.length < 2) return;
            this.currentPathIndex = (this.currentPathIndex - 1 + this.allPaths.length) % this.allPaths.length;
            this.highlightPath(this.allPaths[this.currentPathIndex]);
            document.getElementById('pathCounter').textContent = `${this.currentPathIndex + 1} / ${this.allPaths.length}`;
        });

        document.getElementById('nextPathBtn').addEventListener('click', () => {
            if (this.allPaths.length < 2) return;
            this.currentPathIndex = (this.currentPathIndex + 1) % this.allPaths.length;
            this.highlightPath(this.allPaths[this.currentPathIndex]);
            document.getElementById('pathCounter').textContent = `${this.currentPathIndex + 1} / ${this.allPaths.length}`;
        });

        document.getElementById('toggleSimulationBtn').addEventListener('click', () => {
            this.toggleSimulation();
        });
    }

    async loadRDFFile(file) {
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
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    async parseWithN3(content) {
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

        triples.forEach(triple => {
            if (!nodeMap.has(triple.subject)) {
                nodeMap.set(triple.subject, {
                    id: triple.subject,
                    label: this.extractLabel(triple.subject),
                    type: 'unknown',
                    inDegree: 0,
                    outDegree: 0
                });
            }

            if (!nodeMap.has(triple.object)) {
                const label = triple.objectType === 'Literal' ? triple.object : this.extractLabel(triple.object);
                const type = triple.objectType === 'Literal'
                    ? this.inferLiteralType(triple.predicate)
                    : 'unknown';

                nodeMap.set(triple.object, {
                    id: triple.object,
                    label: label,
                    type: type,
                    inDegree: 0,
                    outDegree: 0
                });
            }

            links.push({
                source: triple.subject,
                target: triple.object,
                predicate: triple.predicate,
                label: this.extractLabel(triple.predicate)
            });

            nodeMap.get(triple.subject).outDegree++;
            nodeMap.get(triple.object).inDegree++;
        });

        triples.forEach(triple => {
            if (triple.predicate.includes('type') || triple.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
                if (nodeMap.has(triple.subject)) {
                    nodeMap.get(triple.subject).type = this.categorizeType(triple.object);
                }
            }
        });

        this.graph.nodes = Array.from(nodeMap.values());
        this.graph.links = links;
        this.updateDegreeSlider();
    }

    extractActivePredicates() {
        const predicateSet = new Set(this.graph.triples.map(t => t.predicate));
        const container = document.querySelectorAll('.toolbar .panel')[3].querySelector('.panel-content');

        container.innerHTML = '<div class="checkbox-group"></div>';
        const group = container.querySelector('.checkbox-group');

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
                this.renderGraph();
            });
        });

        const hideId = 'hideIsolatedNodes';
        const hideDiv = document.createElement('div');
        hideDiv.classList.add('checkbox-item');
        hideDiv.innerHTML = `
            <input type="checkbox" id="${hideId}">
            <label for="${hideId}">Masquer les nœuds isolés</label>
        `;
        group.appendChild(hideDiv);

        document.getElementById(hideId).addEventListener('change', (e) => {
            this.hideIsolatedNodes = e.target.checked;
            this.renderGraph();
        });
    }

    extractActiveTypes() {
        const typeSet = new Set(this.graph.nodes.map(n => n.type));
        const container = document.querySelector('.sidebar .panel .checkbox-group');
    
        container.innerHTML = '';
    
        typeSet.forEach(type => {
            const id = `type-${type.replace(/[^a-zA-Z0-9]/g, '')}`;
            
            const div = document.createElement('div');
            div.classList.add('checkbox-item');
            div.innerHTML = `
                <input type="checkbox" id="${id}">
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
            });
        });
    
        this.activeTypes.clear();
    }

    extractLabel(uri) {
        if (uri.includes('#')) return uri.split('#').pop();
        if (uri.includes('/')) return uri.split('/').pop();
        return uri;
    }

    categorizeType(typeUri) {
        if (!typeUri || typeof typeUri !== 'string') return 'unknown';
        const label = this.extractLabel(typeUri);
        return label || 'unknown';
    }

    inferLiteralType(predicate) {
        return this.extractLabel(predicate);
    }

    initializeGraph() {
        const container = document.querySelector('.graph-container');
        const mockGraph = container.querySelector('.mock-graph');
        if (mockGraph) mockGraph.remove();

        // Supprimer l'ancien canvas s'il existe
        const oldCanvas = container.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();

        // Créer le nouveau canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.background = 'radial-gradient(circle at 50% 50%, #fafbfc 0%, #f4f6f8 100%)';
        container.appendChild(this.canvas);

        this.context = this.canvas.getContext('2d');
        
        // Configurer la taille du canvas
        this.resizeCanvas();
        
        // Événements de redimensionnement
        window.addEventListener('resize', () => this.resizeCanvas());

        // Événements de souris et interaction
        this.setupCanvasInteractions();

        // Zoom avec D3
        const zoom = d3.zoom()
            .scaleExtent([0.05, 5])
            .on('zoom', (event) => {
                this.transform = event.transform;
                this.updateZoomLabel(event.transform.k);
                this.redraw();
                this.updateMiniMap(this.visibleNodes, this.visibleLinks);
            });

        d3.select(this.canvas).call(zoom);
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.width = rect.width;
        this.height = rect.height;
        
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        
        this.context.scale(dpr, dpr);
        this.redraw();
    }

    setupCanvasInteractions() {
        this.canvas.addEventListener('mousemove', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Transformer les coordonnées selon le zoom
            const transformedX = (x - this.transform.x) / this.transform.k;
            const transformedY = (y - this.transform.y) / this.transform.k;
            
            // Trouver le nœud sous la souris
            const hoveredNode = this.findNodeAt(transformedX, transformedY);
            
            if (hoveredNode !== this.hoveredNode) {
                this.hoveredNode = hoveredNode;
                this.canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
                this.redraw();
            }

            // Gestion du drag
            if (this.isDragging && this.dragNode) {
                this.dragNode.fx = transformedX;
                this.dragNode.fy = transformedY;
            }
        });

        this.canvas.addEventListener('mousedown', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const transformedX = (x - this.transform.x) / this.transform.k;
            const transformedY = (y - this.transform.y) / this.transform.k;
            
            const clickedNode = this.findNodeAt(transformedX, transformedY);
            
            if (clickedNode) {
                event.stopPropagation();
                this.isDragging = true;
                this.dragNode = clickedNode;
                
                if (this.simulation) {
                    this.simulation.alphaTarget(0.3).restart();
                }
                
                clickedNode.fx = clickedNode.x;
                clickedNode.fy = clickedNode.y;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            if (this.isDragging && this.dragNode) {
                if (this.simulation) {
                    this.simulation.alphaTarget(0);
                }
                this.dragNode.fx = null;
                this.dragNode.fy = null;
            }
            this.isDragging = false;
            this.dragNode = null;
        });

        this.canvas.addEventListener('click', (event) => {
            if (this.isDragging) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const transformedX = (x - this.transform.x) / this.transform.k;
            const transformedY = (y - this.transform.y) / this.transform.k;
            
            const clickedNode = this.findNodeAt(transformedX, transformedY);
            
            if (clickedNode) {
                this.selectNode(clickedNode);
            }
        });
    }

    findNodeAt(x, y) {
        for (const node of this.visibleNodes) {
            const radius = this.getNodeRadius(node);
            const dx = x - node.x;
            const dy = y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                return node;
            }
        }
        return null;
    }

    getNodeRadius(node) {
        const sizeAccessor = d => {
            if (this.nodeSizeMode === 'in') return d.inDegree;
            if (this.nodeSizeMode === 'out') return d.outDegree;
            return d.inDegree + d.outDegree;
        };

        const sizeScale = d3.scaleLinear()
            .domain(d3.extent(this.graph.nodes, sizeAccessor))
            .range([8, 30]);

        return sizeScale(sizeAccessor(node));
    }

    updateZoomLabel(k) {
        const percent = Math.round(k * 100);
        const zoomLabel = document.getElementById('zoom');
        if (zoomLabel) {
            zoomLabel.textContent = `Zoom : ${percent}%`;
        }
    }

    renderGraph() {
        if (!this.canvas || this.graph.nodes.length === 0) return;
    
        const sizeAccessor = d => {
            if (this.nodeSizeMode === 'in') return d.inDegree;
            if (this.nodeSizeMode === 'out') return d.outDegree;
            return d.inDegree + d.outDegree;
        };
    
        
        const predicateFilteredLinks = this.graph.links.filter(l => this.activePredicates.has(l.predicate));
    
        const usedNodeIds = new Set();
        predicateFilteredLinks.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            usedNodeIds.add(sourceId);
            usedNodeIds.add(targetId);
        });
    
        const visibleNodes = this.graph.nodes.filter(n => {
            const totalDegree = n.inDegree + n.outDegree;
            const passesDegree = totalDegree >= this.minDegreeFilter;
            const isConnected = !this.hideIsolatedNodes || usedNodeIds.has(n.id);
            const isVisibleType = this.activeTypes ? this.activeTypes.has(n.type) : true;
            return passesDegree && isConnected && isVisibleType;
        });
    
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        const visibleLinks = predicateFilteredLinks.filter(l =>
            visibleNodeIds.has(typeof l.source === 'object' ? l.source.id : l.source) &&
            visibleNodeIds.has(typeof l.target === 'object' ? l.target.id : l.target)
        );
    
        this.visibleNodes = visibleNodes;
        this.visibleLinks = visibleLinks;
    
        if (this.startNode && !visibleNodeIds.has(this.startNode.id)) {
            this.startNode = null;
            this.startNodeInput.value = '';
        }
        if (this.endNode && !visibleNodeIds.has(this.endNode.id)) {
            this.endNode = null;
            this.endNodeInput.value = '';
        }
    
        this.simulation = d3.forceSimulation(visibleNodes)
            .force('link', d3.forceLink(visibleLinks).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-50))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2));
    
        const pauseBtn = document.getElementById('toggleSimulationBtn');
        if (this.simulationPaused) {
            this.simulation.stop();
            if (pauseBtn) pauseBtn.textContent = '▶️ Reprendre Simulation';
        } else {
            this.simulation.alpha(0.3).restart();
            if (pauseBtn) pauseBtn.textContent = '⏸️ Pause Simulation';
        }

        this.simulation.on('tick', () => {
            this.redraw();
            this.updateMiniMap(this.visibleNodes, this.visibleLinks);
        });
        
    
        const overlay = document.querySelector('.graph-overlay');
        overlay.innerHTML = `📊 Graphe: ${visibleNodes.length} nœuds • ${visibleLinks.length} arêtes • <span id="zoom">Zoom : 100%</span>`;
    
        this.updateDepthSlider(this.visibleNodes.length - 1);
        this.updateNodeColors();
        this.redraw();
    }

    redraw() {
        if (!this.context || !this.visibleNodes) return;

        // Effacer le canvas
        this.context.save();
        this.context.clearRect(0, 0, this.width, this.height);

        // Appliquer la transformation de zoom
        this.context.translate(this.transform.x, this.transform.y);
        this.context.scale(this.transform.k, this.transform.k);

        // Dessiner les liens
        this.drawLinks();

        // Dessiner les nœuds
        this.drawNodes();

        // Dessiner les labels si activés
        if (this.showNodeLabels) {
            this.drawNodeLabels();
        }

        if (this.showEdgeLabels) {
            this.drawEdgeLabels();
        }

        this.context.restore();
    }

    drawLinks() {
        this.context.strokeStyle = '#9ca3af';
        this.context.lineWidth = 2;
        this.context.globalAlpha = 0.7;

        for (const link of this.visibleLinks) {
            // Vérifier si ce lien fait partie d'un chemin surligné
            const isHighlighted = this.isLinkHighlighted(link);
            
            if (isHighlighted) {
                this.context.strokeStyle = '#003366';
                this.context.lineWidth = 4;
            } else {
                this.context.strokeStyle = '#9ca3af';
                this.context.lineWidth = 2;
            }

            this.context.beginPath();
            this.context.moveTo(link.source.x, link.source.y);
            this.context.lineTo(link.target.x, link.target.y);
            this.context.stroke();
        }

        this.context.globalAlpha = 1;
    }

    drawNodes() {
        const colorScale = this.getColorScale();
        
        for (const node of this.visibleNodes) {
            const radius = this.getNodeRadius(node);
            
            // Couleur de remplissage
            if (this.nodeColorMode === 'type') {
                this.context.fillStyle = colorScale(node.type);
            } else if (this.nodeColorMode === 'in') {
                this.context.fillStyle = colorScale(node.inDegree);
            } else if (this.nodeColorMode === 'out') {
                this.context.fillStyle = colorScale(node.outDegree);
            } else {
                this.context.fillStyle = colorScale(node.inDegree + node.outDegree);
            }

            // Dessiner le cercle
            this.context.beginPath();
            this.context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            this.context.fill();

            // Bordure
            let strokeColor = 'white';
            let strokeWidth = 2;

            if (node === this.startNode) {
                strokeColor = 'green';
                strokeWidth = 4;
            } else if (node === this.endNode) {
                strokeColor = 'red';
                strokeWidth = 4;
            } else if (node === this.selectedNode) {
                strokeColor = 'orange';
                strokeWidth = 4;
            } else if (node === this.hoveredNode) {
                strokeColor = '#FFD700';
                strokeWidth = 3;
            } else if (this.isNodeHighlighted(node)) {
                strokeColor = '#003366';
                strokeWidth = 6;
            }

            this.context.strokeStyle = strokeColor;
            this.context.lineWidth = strokeWidth;
            this.context.stroke();
        }
    }

    drawNodeLabels() {
        this.context.fillStyle = 'white';
        this.context.strokeStyle = 'rgba(0,0,0,0.7)';
        this.context.lineWidth = 3;
        this.context.font = '12px Arial';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        for (const node of this.visibleNodes) {
            // Contour du texte
            this.context.strokeText(node.label, node.x, node.y);
            // Texte
            this.context.fillText(node.label, node.x, node.y);
        }
    }

    drawEdgeLabels() {
        this.context.fillStyle = '#666';
        this.context.font = '12px Arial';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
    
        for (const link of this.visibleLinks) {
            const x = (link.source.x + link.target.x) / 2;
            const y = (link.source.y + link.target.y) / 2;
            this.context.fillText(this.extractLabel(link.predicate), x, y);
        }
    }
    
    isNodeHighlighted(node) {
        if (this.allPaths.length > 0 && this.currentPathIndex < this.allPaths.length) {
            const currentPath = this.allPaths[this.currentPathIndex];
            return currentPath.includes(node.id);
        }
        return false;
    }
    
    isLinkHighlighted(link) {
        if (this.allPaths.length > 0 && this.currentPathIndex < this.allPaths.length) {
            const currentPath = this.allPaths[this.currentPathIndex];
            const srcId = typeof link.source === 'object' ? link.source.id : link.source;
            const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
    
            for (let i = 0; i < currentPath.length - 1; i++) {
                if ((currentPath[i] === srcId && currentPath[i + 1] === tgtId) || (currentPath[i] === tgtId && currentPath[i + 1] === srcId)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    updateMiniMap(nodes, links) {
        // You could similarly implement minimap drawing logic here if needed
    }
    
    exportCanvas() {
        const url = this.canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graphe_rdf.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    initializeGraph() {
        const container = document.querySelector('.graph-container');
        const oldCanvas = container.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();
    
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.canvas.style.background = 'radial-gradient(circle at 50% 50%, #fafbfc 0%, #f4f6f8 100%)';
        container.appendChild(this.canvas);
    
        this.context = this.canvas.getContext('2d');
    
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    
        const zoom = d3.zoom()
            .scaleExtent([0.05, 5])
            .on('zoom', (event) => {
                this.transform = event.transform;
                this.redraw();
            });
    
        d3.select(this.canvas).call(zoom);
    
        this.renderGraph();
    }

    updateMiniMap(nodes, links) {
        const miniCanvas = document.getElementById('miniMapCanvas');
        if (!miniCanvas) return;
    
        const ctx = miniCanvas.getContext('2d');
        ctx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
    
        const padding = 10;
        const miniWidth = miniCanvas.width - 2 * padding;
        const miniHeight = miniCanvas.height - 2 * padding;
    
        const xExtent = d3.extent(nodes, d => d.x);
        const yExtent = d3.extent(nodes, d => d.y);
    
        const xScale = d3.scaleLinear().domain(xExtent).range([padding, padding + miniWidth]);
        const yScale = d3.scaleLinear().domain(yExtent).range([padding, padding + miniHeight]);
    
        // Dessiner les liens
        ctx.strokeStyle = "#ccc";
        links.forEach(link => {
            ctx.beginPath();
            ctx.moveTo(xScale(link.source.x), yScale(link.source.y));
            ctx.lineTo(xScale(link.target.x), yScale(link.target.y));
            ctx.stroke();
        });
    
        // Dessiner les nœuds
        ctx.fillStyle = "#555";
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(xScale(node.x), yScale(node.y), 2, 0, 2 * Math.PI);
            ctx.fill();
        });
    
        // Rectangle indiquant la vue actuelle du graphe principal
        const visibleRect = {
            x: (-this.transform.x) / this.transform.k,
            y: (-this.transform.y) / this.transform.k,
            width: this.canvas.width / this.transform.k,
            height: this.canvas.height / this.transform.k,
        };
    
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(
            xScale(visibleRect.x),
            yScale(visibleRect.y),
            visibleRect.width * miniWidth / (xExtent[1] - xExtent[0]),
            visibleRect.height * miniHeight / (yExtent[1] - yExtent[0])
        );
        ctx.setLineDash([]);
    }

    exportCanvas() {
        const url = this.canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graphe_rdf.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async loadConfigFile(file) {
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
    
            // UI updates
            document.getElementById('showEdgeLabels').checked = this.showEdgeLabels;
            document.getElementById('hideIsolatedNodes').checked = this.hideIsolatedNodes;
    
            const rangeInput = document.querySelector('.range-input');
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
    
            // Relancer le rendu
            this.renderGraph();
    
        } catch (e) {
            console.error('Erreur lors du chargement de la configuration:', e);
            alert('Erreur lors du chargement du fichier de configuration.');
        }
    }

    exportVisibleRDFandConfig() {
        const visibleNodeIds = new Set(this.visibleNodes.map(n => n.id));
        const visibleTriples = this.graph.triples.filter(t =>
            visibleNodeIds.has(t.subject) && visibleNodeIds.has(t.object)
        );
    
        let ttlContent = '';
        visibleTriples.forEach(t => {
            const subject = `<${t.subject}>`;
            const predicate = `<${t.predicate}>`;
            const object = t.objectType === 'Literal'
                ? `"${t.object}"`
                : `<${t.object}>`;
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
            simulationPaused: this.simulationPaused
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

    selectNodeFromInput(label, type = 'start') {
        const node = this.graph.nodes.find(n => n.label === label);
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
        this.startNode = node;
        this.startNodeInput.value = node.label;
        this.redraw();
    }
    
    setEndNode(node) {
        this.endNode = node;
        this.endNodeInput.value = node.label;
        this.redraw();
    }

    updateStatistics() {
        const stats = {
            totalTriples: this.graph.triples.length,
            uniqueNodes: this.graph.nodes.length,
            uniquePredicates: [...new Set(this.graph.triples.map(t => t.predicate))].length,
            isolatedNodes: this.graph.nodes.filter(n => n.inDegree === 0 && n.outDegree === 0).length
        };
    
        const typeCount = {};
        this.graph.nodes.forEach(node => {
            typeCount[node.type] = (typeCount[node.type] || 0) + 1;
        });
    
        const statsPanel = document.querySelectorAll('.toolbar .panel')[1].querySelector('.panel-content');
        statsPanel.innerHTML = `
            <div class="stats-item"><span>Triplets totaux:</span><span class="stats-value">${stats.totalTriples}</span></div>
            <div class="stats-item"><span>Nœuds uniques:</span><span class="stats-value">${stats.uniqueNodes}</span></div>
            <div class="stats-item"><span>Prédicats uniques:</span><span class="stats-value">${stats.uniquePredicates}</span></div>
            <div class="stats-item"><span>Nœuds isolés:</span><span class="stats-value">${stats.isolatedNodes}</span></div>
            <div style="margin-top: 15px;">
                <label style="font-size: 13px; font-weight: 600;">Distribution par type:</label>
                ${Object.entries(typeCount).map(([type, count]) => `
                    <div class="stats-item"><span>${type}</span><span class="stats-value">${count}</span></div>
                `).join('')}
            </div>
        `;
    }

    updateDegreeSlider() {
        const degrees = this.graph.nodes.map(n => n.inDegree + n.outDegree);
        if (degrees.length === 0) return;
    
        const min = 0;
        const max = Math.max(...degrees);
        const median = Math.round((min + max) / 2);
    
        const rangeInput = document.querySelector('.range-input');
        const labels = document.querySelector('.range-labels').children;
    
        rangeInput.min = min;
        rangeInput.max = max;
        rangeInput.value = min;
        this.minDegreeFilter = min;
    
        labels[0].textContent = min;
        labels[1].textContent = median;
        labels[2].textContent = max;
    
        document.getElementById('minDegreeValue').textContent = min;
    }
    
    updateDepthSlider(maxDepth) {
        const rangeInput = document.getElementById('depthRange');
        const labels = document.getElementById('depthRangeLabels').children;
    
        const min = 1;
        const max = Math.max(1, maxDepth);
        const median = Math.floor((min + max) / 2);
    
        rangeInput.min = min;
        rangeInput.max = max;
        rangeInput.value = min;
    
        labels[0].textContent = min;
        labels[1].textContent = median;
        labels[2].textContent = max;
    
        document.getElementById('depthValue').textContent = min;
    }
    
    deleteGraph() {
        this.graph = {
            nodes: [],
            links: [],
            triples: []
        };
        this.visibleNodes = [];
        this.visibleLinks = [];
        this.startNode = null;
        this.endNode = null;
        this.selectedNode = null;
        this.allPaths = [];
        this.currentPathIndex = 0;
    
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
    
        const overlay = document.querySelector('.graph-overlay');
        if (overlay) {
            overlay.innerHTML = `📊 Graphe: 0 nœuds • 0 arêtes • <span id="zoom">Zoom : 100%</span>`;
        }
    
        this.updateMiniMap([], []);
        this.redraw();
    
        // Réinitialise les champs input
        if (this.startNodeInput) this.startNodeInput.value = '';
        if (this.endNodeInput) this.endNodeInput.value = '';
        const pathControls = document.getElementById('pathNavigationControls');
        if (pathControls) pathControls.style.display = 'none';
    }

    getColorScale() {
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
        if (!this.visibleNodes || this.visibleNodes.length === 0) return;
    
        const colorScale = this.getColorScale();
    
        // Mettre à jour la couleur dans redraw
        this.visibleNodes.forEach(node => {
            if (this.nodeColorMode === 'type') {
                node._color = colorScale(node.type);
            } else if (this.nodeColorMode === 'in') {
                node._color = colorScale(node.inDegree);
            } else if (this.nodeColorMode === 'out') {
                node._color = colorScale(node.outDegree);
            } else {
                node._color = colorScale(node.inDegree + node.outDegree);
            }
        });
    
        this.redraw();
    
        // Mise à jour de la légende si applicable
        this.updateColorLegend(colorScale);
    }
    
    
}

//Demarrage app
document.addEventListener('DOMContentLoaded', () => {
    new RdfExplorer();
});
