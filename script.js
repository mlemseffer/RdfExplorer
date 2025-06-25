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
        this.minDegreeFilter = 0;
        this.nodeSizeMode = 'in'; // 'in', 'out', 'total'
        this.nodeColorMode = 'type'; // 'type' or 'degree'
        this.visibleNodes = [];
        this.visibleLinks = [];
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

        document.getElementById('fileInput').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.ttl')) {
                this.loadRDFFile(file);
            } else {
                alert('Veuillez sélectionner un fichier .ttl');
            }
        });

        document.getElementById('resetGraphBtn').addEventListener('click', () => {
            this.resetGraph();
        });

        document.getElementById('exportSVGBtn').addEventListener('click', () => {
            this.exportSVG();
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

    }

    async loadRDFFile(file) {
        try {
            this.resetGraph();

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
        const container = document.querySelectorAll('.toolbar .panel')[2].querySelector('.panel-content');

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
                    .scaleExtent([0.1, 5])
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
    
        const linkLabels = this.svg.select('.zoom-group .links')
            .selectAll('text')
            .data(visibleLinks)
            .enter().append('text')
            .text(d => this.extractLabel(d.predicate))
            .attr('font-size', '12px')
            .attr('text-anchor', 'middle')
            .style('fill', '#666')
            .style('pointer-events', 'none');
    
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
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (event, d) => this.dragstarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragended(event, d)));
    
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
    
            linkLabels
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);
    
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
    }        

    selectNode(node) {
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

    resetGraph() {
        this.graph = {
            nodes: [],
            links: [],
            triples: []
        };
        this.activePredicates = new Set(); // reset predicate filters

        if (this.svg) {
            this.svg.selectAll('*').remove();
            this.svg.append('g').attr('class', 'zoom-group');
            this.svg.select('.zoom-group').append('g').attr('class', 'links');
            this.svg.select('.zoom-group').append('g').attr('class', 'nodes');
        }

        this.updateStatistics();
        document.getElementById('fileInput').value = '';

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
        
}

//Demarrage app
document.addEventListener('DOMContentLoaded', () => {
    new RdfExplorer();
});
