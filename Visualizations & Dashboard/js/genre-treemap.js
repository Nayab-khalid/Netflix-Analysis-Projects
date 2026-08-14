/**
 * GenreTreemap - Zoomable Treemap showing genre distribution
 * Click to zoom into genres, breadcrumb navigation, cross-filter support
 */
class GenreTreemap {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.margin = { top: 35, right: 5, bottom: 5, left: 5 };
        this.data = [];
        this.currentRoot = null;
        this.selectedGenre = null;

        this.genreColors = (window.NetflixUtils && window.NetflixUtils.GENRE_COLORS) || {};
        this.defaultColors = d3.scaleOrdinal(d3.schemeTableau10);

        this._createSvg();
    }

    _getColor(genre) {
        if (this.genreColors[genre]) return this.genreColors[genre];
        return this.defaultColors(genre);
    }

    _createSvg() {
        this.container.selectAll('svg').remove();
        this.container.selectAll('.treemap-breadcrumb').remove();

        const containerNode = this.container.node();
        this.fullWidth = containerNode.clientWidth;
        this.fullHeight = containerNode.clientHeight || 400;
        this.width = this.fullWidth - this.margin.left - this.margin.right;
        this.height = this.fullHeight - this.margin.top - this.margin.bottom;

        // Breadcrumb bar
        this.breadcrumb = this.container.insert('div', ':first-child')
            .attr('class', 'treemap-breadcrumb')
            .style('color', '#ccc')
            .style('font-size', '12px')
            .style('padding', '4px 8px')
            .style('cursor', 'pointer')
            .style('height', '20px')
            .style('line-height', '20px');

        this.svg = this.container.append('svg')
            .attr('width', this.fullWidth)
            .attr('height', this.fullHeight - 25);

        this.chartGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top - 25})`);
    }

    _processData(data) {
        const genreCounts = new Map();

        data.forEach(d => {
            if (!d.listed_in) return;
            const genres = d.listed_in.split(',').map(g => g.trim());
            genres.forEach(genre => {
                if (!genre) return;
                genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
            });
        });

        const children = Array.from(genreCounts.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return { name: 'All Genres', children };
    }

    init(data) {
        this.allData = data;
        const hierarchyData = this._processData(data);
        this._buildAndRender(hierarchyData);
    }

    update(data) {
        const hierarchyData = this._processData(data);
        this._buildAndRender(hierarchyData, true);
    }

    _buildAndRender(hierarchyData, animate = false) {
        this.root = d3.hierarchy(hierarchyData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        d3.treemap()
            .size([this.width, this.height])
            .paddingInner(2)
            .paddingOuter(3)
            .round(true)
            .tile(d3.treemapSquarify)(this.root);

        this.currentRoot = this.root;
        this._renderTreemap(this.root, animate);
        this._updateBreadcrumb([this.root]);
    }

    _renderTreemap(node, animate = false) {
        const self = this;
        const duration = animate ? 500 : 0;
        const leaves = node.children || [];
        const totalValue = d3.sum(leaves, d => d.value);

        // Data join
        const cells = this.chartGroup.selectAll('.treemap-cell')
            .data(leaves, d => d.data.name);

        // Exit
        cells.exit()
            .transition().duration(duration)
            .attr('opacity', 0)
            .remove();

        // Enter
        const cellsEnter = cells.enter()
            .append('g')
            .attr('class', 'treemap-cell')
            .attr('transform', d => `translate(${d.x0},${d.y0})`)
            .attr('opacity', 0)
            .style('cursor', 'pointer');

        cellsEnter.append('rect')
            .attr('class', 'cell-rect')
            .attr('width', d => Math.max(0, d.x1 - d.x0))
            .attr('height', d => Math.max(0, d.y1 - d.y0))
            .attr('rx', 3)
            .attr('fill', d => this._getColor(d.data.name))
            .attr('stroke', 'rgba(0,0,0,0.3)')
            .attr('stroke-width', 1);

        cellsEnter.append('text')
            .attr('class', 'cell-name')
            .attr('x', 6)
            .attr('y', 16)
            .attr('fill', '#ffffff')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('pointer-events', 'none');

        cellsEnter.append('text')
            .attr('class', 'cell-count')
            .attr('x', 6)
            .attr('y', 30)
            .attr('fill', 'rgba(255,255,255,0.8)')
            .attr('font-size', '10px')
            .attr('pointer-events', 'none');

        // Merge enter + update
        const cellsMerged = cellsEnter.merge(cells);

        cellsMerged.transition().duration(duration)
            .attr('transform', d => `translate(${d.x0},${d.y0})`)
            .attr('opacity', 1);

        cellsMerged.select('.cell-rect')
            .transition().duration(duration)
            .attr('width', d => Math.max(0, d.x1 - d.x0))
            .attr('height', d => Math.max(0, d.y1 - d.y0))
            .attr('fill', d => this._getColor(d.data.name));

        cellsMerged.select('.cell-name')
            .text(d => {
                const w = d.x1 - d.x0;
                const h = d.y1 - d.y0;
                if (w < 50 || h < 25) return '';
                const name = d.data.name;
                const maxChars = Math.floor(w / 7);
                return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
            });

        cellsMerged.select('.cell-count')
            .text(d => {
                const w = d.x1 - d.x0;
                const h = d.y1 - d.y0;
                if (w < 40 || h < 38) return '';
                return d.value.toLocaleString();
            });

        // Events
        cellsMerged
            .on('mouseenter', function (event, d) {
                d3.select(this).select('.cell-rect')
                    .attr('stroke', '#ffffff')
                    .attr('stroke-width', 2);

                const pct = ((d.value / totalValue) * 100).toFixed(1);
                if (window.Tooltip) {
                    window.Tooltip.show(`
                        <strong>${d.data.name}</strong><br/>
                        Count: ${d.value.toLocaleString()}<br/>
                        Percentage: ${pct}%
                    `, event);
                }
            })
            .on('mousemove', function (event) {
                if (window.Tooltip) window.Tooltip.move(event);
            })
            .on('mouseleave', function () {
                d3.select(this).select('.cell-rect')
                    .attr('stroke', 'rgba(0,0,0,0.3)')
                    .attr('stroke-width', 1);
                if (window.Tooltip) window.Tooltip.hide();
            })
            .on('click', function (event, d) {
                event.stopPropagation();
                self.selectedGenre = self.selectedGenre === d.data.name ? null : d.data.name;
                window.dispatchEvent(new CustomEvent('filter:genre', {
                    detail: { genre: self.selectedGenre }
                }));

                // Highlight selected
                cellsMerged.select('.cell-rect')
                    .attr('opacity', dd => {
                        if (!self.selectedGenre) return 1;
                        return dd.data.name === self.selectedGenre ? 1 : 0.4;
                    });
            });
    }

    _updateBreadcrumb(path) {
        const self = this;
        this.breadcrumb.html('');

        path.forEach((node, i) => {
            if (i > 0) {
                this.breadcrumb.append('span').text(' › ').style('color', '#666');
            }
            const label = node.data.name;
            const span = this.breadcrumb.append('span')
                .text(label)
                .style('color', i === path.length - 1 ? 'var(--text-primary)' : '#E50914')
                .style('cursor', 'pointer')
                .on('click', function () {
                    if (node === self.root) {
                        self.selectedGenre = null;
                        window.dispatchEvent(new CustomEvent('filter:genre', {
                            detail: { genre: null }
                        }));
                        self._renderTreemap(self.root, true);
                        self._updateBreadcrumb([self.root]);
                    }
                });
        });
    }
}

window.GenreTreemap = GenreTreemap;
