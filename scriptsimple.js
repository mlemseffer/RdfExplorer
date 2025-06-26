class RdfExplorer {
    constructor() {
        this.graph = { nodes: [], links: [], triples: [] };
        this.svg = null;
        this.simulation = null;

        // Propriétés nécessaires pour la visualisation
        this.nodeColorMode = 'type';
        this.nodeSizeMode = 'total';
        this.hideIsolatedNodes = false;
        this.minDegreeFilter = 0;

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

        const colorSelect = document.getElementById('nodeColorModeSelect');
        if (colorSelect) {
            colorSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val.includes("entrant")) this.nodeColorMode = 'in';
                else if (val.includes("sortant")) this.nodeColorMode = 'out';
                else if (val.includes("total")) this.nodeColorMode = 'total';
                else this.nodeColorMode = 'type';
                this.renderGraph();
            });
        }

        const sizeSelect = document.getElementById('nodeSizeModeSelect');
        if (sizeSelect) {
            sizeSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val.includes("entrant")) this.nodeSizeMode = 'in';
                else if (val.includes("sortant")) this.nodeSizeMode = 'out';
                else this.nodeSizeMode = 'total';
                this.renderGraph();
            });
        }

        const hideCheckbox = document.getElementById('hideIsolatedNodes');
        if (hideCheckbox) {
            hideCheckbox.addEventListener('change', (e) => {
                this.hideIsolatedNodes = e.target.checked;
                this.renderGraph();
            });
        }

        const rangeInput = document.querySelector('input[type="range"]');
        const minDegreeValue = document.getElementById('minDegreeValue');
        if (rangeInput && minDegreeValue) {
            rangeInput.addEventListener('input', (e) => {
                this.minDegreeFilter = parseInt(e.target.value);
                minDegreeValue.textContent = this.minDegreeFilter;
                this.renderGraph();
            });
        }
    }

    async loadRDFFile(file) {
        try {
            const content = await this.readFileContent(file);
            const triples = await this.parseWithN3(content);
            this.graph.triples = triples;
            this.buildGraphFromTriples(triples);
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
                    type: 'unknown',
                    inDegree: 0,
                    outDegree: 0
                });
            }

            if (!nodeMap.has(triple.object)) {
                nodeMap.set(triple.object, {
                    id: triple.object,
                    type: 'unknown',
                    inDegree: 0,
                    outDegree: 0
                });
            }

            links.push({
                source: triple.subject,
                target: triple.object,
                predicate: triple.predicate,
            });

            nodeMap.get(triple.subject).outDegree++;
            nodeMap.get(triple.object).inDegree++;
        });

        triples.forEach(triple => {
            if (triple.predicate.includes('type') ||
                triple.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
                if (nodeMap.has(triple.subject)) {
                    nodeMap.get(triple.subject).type = this.extractLabel(triple.object);
                }
            }
        });

        this.graph.nodes = Array.from(nodeMap.values());
        this.graph.links = links;
    }

    extractLabel(uri) {
        if (uri.includes('#')) return uri.split('#').pop();
        if (uri.includes('/')) return uri.split('/').pop();
        return uri;
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

        let colorScale;
        if (this.nodeColorMode === 'type') {
            const types = Array.from(new Set(this.graph.nodes.map(n => n.type))).sort();
            const colorPalette = d3.schemeCategory10.concat(d3.schemeSet3);
            colorScale = d3.scaleOrdinal()
                .domain(types)
                .range(colorPalette.slice(0, types.length));
        } else {
            let degreeAccessor = this.nodeColorMode === 'in'
                ? d => d.inDegree
                : this.nodeColorMode === 'out'
                    ? d => d.outDegree
                    : d => d.inDegree + d.outDegree;

            const maxDegree = d3.max(this.graph.nodes, degreeAccessor);
            colorScale = d3.scaleLinear()
                .domain([0, maxDegree])
                .range(["#F1A7A7", "#580E0E"]);
        }

        const sizeAccessor = this.nodeSizeMode === 'in'
            ? d => d.inDegree
            : this.nodeSizeMode === 'out'
                ? d => d.outDegree
                : d => d.inDegree + d.outDegree;

        const sizeScale = d3.scaleLinear()
            .domain(d3.extent(this.graph.nodes, sizeAccessor))
            .range([8, 30]);

        const nodes = this.graph.nodes.filter(n => {
            const totalDegree = n.inDegree + n.outDegree;
            if (this.hideIsolatedNodes && totalDegree === 0) return false;
            return totalDegree >= this.minDegreeFilter;
        });

        const links = this.graph.links.filter(link => 
            nodes.find(n => n.id === link.source) && 
            nodes.find(n => n.id === link.target)
        );

        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2));

        this.svg.selectAll('.links > *').remove();
        this.svg.selectAll('.nodes > *').remove();

        const link = this.svg.select('.zoom-group .links')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', '#9ca3af')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.7);

        const node = this.svg.select('.zoom-group .nodes')
            .selectAll('circle')
            .data(nodes)
            .enter().append('circle')
            .attr('r', d => sizeScale(sizeAccessor(d)))
            .attr('fill', d => colorScale(this.nodeColorMode === 'type' ? d.type : sizeAccessor(d)))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', (event, d) => this.dragstarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragended(event, d)));

        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        });

        const overlay = document.querySelector('.graph-overlay');
        overlay.innerHTML = `📊 Graphe: ${nodes.length} nœuds • ${links.length} arêtes • <span id="zoom">Zoom : 100%</span>`;
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

    updateStatistics() {
        // TODO: Implémenter la mise à jour des statistiques UI (triplets, noeuds, prédicats, etc.)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RdfExplorer();
});
