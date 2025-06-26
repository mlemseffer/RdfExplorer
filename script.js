class RdfExplorer {
    constructor() {
        this.graph = {
            nodes: [],
            links: [],
            triples: []
        };
        this.svg = null;
        this.simulation = null;
        this.activePredicates = new Set();
        this.activeTypes = new Set();
        this.hideIsolatedNodes = false;
        this.showEdgeLabels = false;
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
        

        document.getElementById('exportSVGBtn').addEventListener('click', () => {
            this.exportSVG();
        });

        document.getElementById('showEdgeLabels').addEventListener('change', (e) => {
            this.showEdgeLabels = e.target.checked;
            this.renderGraph();
        });        

        document.getElementById('hideIsolatedNodes').addEventListener('change', (e) => {
            this.hideIsolatedNodes = e.target.checked;
            this.renderGraph(); // met à jour le rendu avec le filtre
        });

        const rangeInput = document.querySelector('.range-input');
        rangeInput.addEventListener('input', (e) => {
            this.minDegreeFilter = parseInt(e.target.value);
            document.getElementById('minDegreeValue').textContent = e.target.value;
            this.renderGraph();
        });

        const sizeSelect = document.querySelectorAll('.form-group select')[1]; // 2e select
        sizeSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value.includes('entrant')) this.nodeSizeMode = 'in';
            else if (value.includes('sortant')) this.nodeSizeMode = 'out';
            else this.nodeSizeMode = 'total';
            this.renderGraph();
        });

        const colorSelect = document.querySelector('#nodeColorModeSelect');
        colorSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value.includes('entrant')) this.nodeColorMode = 'in';
            else if (value.includes('sortant')) this.nodeColorMode = 'out';
            else if (value.includes('total')) this.nodeColorMode = 'total';
            else this.nodeColorMode = 'type';
            this.renderGraph();
        });

        const depthRangeInput = document.getElementById('depthRange');
        depthRangeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('depthValue').textContent = value;
            // Optionnel : ici tu peux appeler une méthode d’exploration à profondeur limitée
            // this.applyDepthLimit(value);
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
            this.exploreFromStartNode(maxDepth, 1000); // 1 seconde
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
                this.renderGraph(); // Refresh graph with filter
            });
        });

        // Ajout de la checkbox pour masquer les nœuds isolés
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
    
        container.innerHTML = ''; // Réinitialiser
    
        typeSet.forEach(type => {
            const id = `type-${type.replace(/[^a-zA-Z0-9]/g, '')}`;
            this.activeTypes.add(type);
    
            const div = document.createElement('div');
            div.classList.add('checkbox-item');
            div.innerHTML = `
                <input type="checkbox" id="${id}" checked>
                <label for="${id}">${type}</label>
            `;
            container.appendChild(div);
    
            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.activeTypes.add(type);
                } else {
                    this.activeTypes.delete(type);
                }
                this.renderGraph(); // Redessine
            });
        });
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
    }

    updateZoomLabel(k) {
        const percent = Math.round(k * 100);
        const zoomLabel = document.getElementById('zoom');
        if (zoomLabel) {
            zoomLabel.textContent = `Zoom : ${percent}%`;
        }
    }

    renderGraph() {
        if (!this.svg || this.graph.nodes.length === 0) return;
    
        const width = this.svg.node().getBoundingClientRect().width;
        const height = this.svg.node().getBoundingClientRect().height;
    
        // Définir la palette de couleurs selon le mode sélectionné
        let colorScale;
        if (this.nodeColorMode === 'type') {
            const types = Array.from(new Set(this.graph.nodes.map(n => n.type))).sort();
            const colorPalette = d3.schemeCategory10.concat(d3.schemeSet3);
            colorScale = d3.scaleOrdinal()
                .domain(types)
                .range(colorPalette.slice(0, types.length));
            this.updateColorLegend(colorScale);
        } else {
            let degreeAccessor;
            if (this.nodeColorMode === 'in') degreeAccessor = d => d.inDegree;
            else if (this.nodeColorMode === 'out') degreeAccessor = d => d.outDegree;
            else degreeAccessor = d => d.inDegree + d.outDegree;
    
            const maxDegree = d3.max(this.graph.nodes, degreeAccessor);
            colorScale = d3.scaleLinear()
                .domain([0, maxDegree])
                .range(["#F1A7A7", "#580E0E"]);
            this.updateColorLegend(null);
        }
    
        // Taille des nœuds
        const sizeAccessor = d => {
            if (this.nodeSizeMode === 'in') return d.inDegree;
            if (this.nodeSizeMode === 'out') return d.outDegree;
            return d.inDegree + d.outDegree;
        };
        const sizeScale = d3.scaleLinear()
            .domain(d3.extent(this.graph.nodes, sizeAccessor))
            .range([8, 30]);
    
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

        // Vérifie si le noeud de départ est toujours visible, sinon le réinitialiser
        if (this.startNode && !visibleNodeIds.has(this.startNode.id)) {
            this.startNode = null;
            this.startNodeInput.value = '';
        }

        // Vérifie si le noeud d’arrivée est toujours visible, sinon le réinitialiser
        if (this.endNode && !visibleNodeIds.has(this.endNode.id)) {
            this.endNode = null;
            this.endNodeInput.value = '';
}

    
        this.simulation = d3.forceSimulation(visibleNodes)
            .force('link', d3.forceLink(visibleLinks).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2));
    
        this.svg.selectAll('.links > *').remove();
        this.svg.selectAll('.nodes > *').remove();
    
        const link = this.svg.select('.zoom-group .links')
            .selectAll('line')
            .data(visibleLinks)
            .enter().append('line')
            .attr('stroke', '#9ca3af')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.7);
    
        const linkLabelSelection = this.svg.select('.zoom-group .links').selectAll('text');
        linkLabelSelection.remove();
    
        let linkLabels = null;
        if (this.showEdgeLabels) {
            linkLabels = this.svg.select('.zoom-group .links')
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
            .attr('r', d => sizeScale(sizeAccessor(d)))
            .attr('fill', d => {
                if (this.nodeColorMode === 'type') return colorScale(d.type);
                if (this.nodeColorMode === 'in') return colorScale(d.inDegree);
                if (this.nodeColorMode === 'out') return colorScale(d.outDegree);
                return colorScale(d.inDegree + d.outDegree);
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
                
                
    
        const labels = this.svg.select('.zoom-group .nodes')
            .selectAll('text')
            .data(visibleNodes)
            .enter().append('text')
            .text(d => d.label)
            .attr('font-size', '12px')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .style('pointer-events', 'none')
            .style('fill', 'white')
            .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.7)');
    
        node.on('click', (event, d) => this.selectNode(d));
    
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
    
            if (linkLabels) {
                linkLabels
                    .attr('x', d => (d.source.x + d.target.x) / 2)
                    .attr('y', d => (d.source.y + d.target.y) / 2);
            }
    
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
    
            labels
                .attr('x', d => d.x)
                .attr('y', d => d.y);
    
            this.updateMiniMap(visibleNodes, visibleLinks);
        });
    
        const overlay = document.querySelector('.graph-overlay');
        overlay.innerHTML = `📊 Graphe: ${visibleNodes.length} nœuds • ${visibleLinks.length} arêtes • <span id="zoom">Zoom : 100%</span>`;
        
        const nbVisible = this.visibleNodes.length;
        this.updateDepthSlider(nbVisible - 1);

    }            

    selectNode(node) {
        this.selectedNode = node;
        const nodeInfo = document.querySelector('.toolbar .panel:first-child .panel-content');
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
        this.graph = {
            nodes: [],
            links: [],
            triples: []
        };
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
    
        const overlay = document.querySelector('.graph-overlay');
        overlay.innerHTML = `📊 Graphe: 0 nœuds • 0 arêtes • <span id="zoom">Zoom : 100%</span>`;
    }
    

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
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

    updateColorLegend(colorScale) {
        const legendContainer = document.getElementById('colorLegend');
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
        const miniSvg = d3.select("#miniMapSvg");
        miniSvg.selectAll("*").remove();
    
        const width = miniSvg.node().clientWidth;
        const height = miniSvg.node().clientHeight;
    
        // Étendue des coordonnées réelles
        const xExtent = d3.extent(nodes, d => d.x);
        const yExtent = d3.extent(nodes, d => d.y);
    
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
    
        // Taille de la zone visible dans le graphe principal (après zoom)
        const mainW = this.svg.node().clientWidth;
        const mainH = this.svg.node().clientHeight;
    
        const visibleX1 = -zoomTransform.x / zoomTransform.k;
        const visibleY1 = -zoomTransform.y / zoomTransform.k;
        const visibleX2 = visibleX1 + mainW / zoomTransform.k;
        const visibleY2 = visibleY1 + mainH / zoomTransform.k;
    
        // Tracer la vue projetée dans la minimap
        group.append("rect")
            .attr("x", xScale(visibleX1))
            .attr("y", yScale(visibleY1))
            .attr("width", xScale(visibleX2) - xScale(visibleX1))
            .attr("height", yScale(visibleY2) - yScale(visibleY1))
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 2");
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
            showEdgeLabels: this.showEdgeLabels
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
    
            // Appliquer les réglages UI
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
    
            document.querySelectorAll('.form-group select')[1].value = {
                'in': 'Par degré entrant',
                'out': 'Par degré sortant',
                'total': 'Par degré total'
            }[this.nodeSizeMode];
    
            // Re-render après application config
            this.renderGraph();
        } catch (e) {
            console.error('Erreur lors du chargement de la configuration:', e);
            alert('Erreur lors du chargement du fichier de configuration.');
        }
    }

    updateDepthSlider(maxDepth) {
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
        const input = inputElement.value.trim().toLowerCase();
        const container = inputElement.parentElement;
    
        const old = container.querySelector('.autocomplete');
        if (old) old.remove();
    
        if (!input) return;
    
        const matches = this.graph.nodes
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
        this.updateNodeStyles();
    }

    setEndNode(node) {
        this.endNode = node;
        this.endNodeInput.value = node.label;
        this.updateNodeStyles();
    }    
    
    updateNodeStyles() {
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
        if (!this.startNode) {
            alert("Veuillez sélectionner un nœud de départ.");
            return;
        }
    
        const direction = this.exploreDirectionSelect.value; // récupère la direction sélectionnée
        const visited = new Set();
        const layers = [];
        const queue = [{ node: this.startNode, depth: 0 }];
        visited.add(this.startNode.id);
    
        while (queue.length > 0) {
            const { node, depth } = queue.shift();
            if (!layers[depth]) layers[depth] = [];
            layers[depth].push(node);
    
            if (depth < maxDepth) {
                const neighbors = this.graph.links.flatMap(link => {
                    let neighbors = [];
    
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
                    const sourceNode = typeof link.source === 'object' ? link.source : this.graph.nodes.find(n => n.id === link.source);
                    const targetNode = typeof link.target === 'object' ? link.target : this.graph.nodes.find(n => n.id === link.target);
    
                    if (direction === 'Entrantes' || direction === 'Entrantes + Sortantes') {
                        if (targetId === node.id && !visited.has(sourceId)) {
                            neighbors.push(sourceNode);
                        }
                    }
    
                    if (direction === 'Sortantes' || direction === 'Entrantes + Sortantes') {
                        if (sourceId === node.id && !visited.has(targetId)) {
                            neighbors.push(targetNode);
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
    
        for (let d = 0; d < layers.length; d++) {
            const layer = layers[d];
            this.highlightLayer(layer);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }    

    highlightLayer(nodes) {
        this.svg.selectAll('.nodes circle')
            .filter(d => nodes.includes(d))
            .transition()
            .duration(300)
            .attr('stroke', '#FFD700') // Jaune pétant
            .attr('stroke-width', 6);
    }

    resetGraphView() {
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
            .attr('stroke', '#9ca3af')
            .attr('stroke-width', 2);
    
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

        const graph = new Map();
        const visibleNodeIds = new Set(this.visibleNodes.map(n => n.id));

        // Construire un graphe orienté uniquement avec les liens visibles
        for (const link of this.visibleLinks) {
            const src = typeof link.source === 'object' ? link.source.id : link.source;
            const tgt = typeof link.target === 'object' ? link.target.id : link.target;

            //Graphe orienté
            if (!graph.has(src)) graph.set(src, []);
            graph.get(src).push(tgt);

            // 👉 Si vous voulez un graphe NON orienté, ajoutez cette ligne :
            if (!graph.has(tgt)) graph.set(tgt, []);
            graph.get(tgt).push(src);
        }

        // BFS sur les nœuds visibles uniquement
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
                const neighbors = (graph.get(node) || []).filter(n => visibleNodeIds.has(n));
                for (const neighbor of neighbors) {
                    queue.push([...path, neighbor]);
                }
            }
        }

        alert("Aucun chemin visible trouvé entre les deux nœuds.");
    }

    highlightPath(path) {
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
    
        const graph = new Map();
        const visibleNodeIds = new Set(this.visibleNodes.map(n => n.id));
    
        for (const link of this.visibleLinks) {
            const src = typeof link.source === 'object' ? link.source.id : link.source;
            const tgt = typeof link.target === 'object' ? link.target.id : link.target;
    
            if (!graph.has(src)) graph.set(src, []);
            graph.get(src).push(tgt);
    
            if (!graph.has(tgt)) graph.set(tgt, []);
            graph.get(tgt).push(src);
        }
    
        const paths = [];
        const visited = new Set();
    
        const dfs = (current, target, path) => {
            if (path.length > 20) return; // Limite de profondeur pour éviter les boucles
            if (current === target) {
                paths.push([...path]);
                return;
            }
    
            visited.add(current);
    
            for (const neighbor of graph.get(current) || []) {
                if (!visited.has(neighbor)) {
                    path.push(neighbor);
                    dfs(neighbor, target, path);
                    path.pop();
                }
            }
    
            visited.delete(current);
        };
    
        dfs(this.startNode.id, this.endNode.id, [this.startNode.id]);
    
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
    
}

//Demarrage app
document.addEventListener('DOMContentLoaded', () => {
    new RdfExplorer();
});
