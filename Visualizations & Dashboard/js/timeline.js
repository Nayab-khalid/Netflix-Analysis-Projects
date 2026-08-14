/**
 * TimelineChart - Stacked Area Chart showing content added to Netflix over time
 * Focus + Context pattern with brush for year range selection
 */
class TimelineChart {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.margin = { top: 30, right: 30, bottom: 40, left: 55 };
        this.data = [];
        this.currentFilter = null;

        this.colors = {
            Movie: '#E50914',
            'TV Show': '#46d369'
        };

        this._createSvg();
    }

    _createSvg() {
        this.container.selectAll('svg').remove();
        const containerNode = this.container.node();
        this.width = containerNode.clientWidth - this.margin.left - this.margin.right;
        this.totalHeight = containerNode.clientHeight || 420;
        this.height = this.totalHeight - this.margin.top - this.margin.bottom;

        this.svg = this.container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.totalHeight)
            .style('overflow', 'visible');

        // Focus area (main chart)
        this.focus = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Clip path for focus area
        this.svg.append('defs').append('clipPath')
            .attr('id', 'clip-timeline')
            .append('rect')
            .attr('width', this.width)
            .attr('height', this.height);

        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        // Axes groups
        this.xAxisGroup = this.focus.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`);

        this.yAxisGroup = this.focus.append('g')
            .attr('class', 'y-axis');

        // Grid lines group
        this.gridGroup = this.focus.append('g').attr('class', 'grid-lines');

        // Stacked areas group (clipped)
        this.areaGroup = this.focus.append('g')
            .attr('clip-path', 'url(#clip-timeline)');

        // Overlay for hover
        this.hoverGroup = this.focus.append('g').attr('class', 'hover-group');

        // Overlay for hover
        this.hoverGroup = this.focus.append('g').attr('class', 'hover-group');

        // Legend
        this._drawLegend();

        // Style axes
        this.svg.selectAll('.domain, .tick line').attr('stroke', 'var(--border-light)');
        this.svg.selectAll('.tick text').attr('fill', '#ccc');
    }

    _drawLegend() {
        const legend = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left + this.width - 160}, 8)`);

        const items = [
            { label: 'Movies', color: this.colors.Movie },
            { label: 'TV Shows', color: this.colors['TV Show'] }
        ];

        items.forEach((item, i) => {
            const g = legend.append('g').attr('transform', `translate(${i * 90}, 0)`);
            g.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', item.color);
            g.append('text').attr('x', 16).attr('y', 10).text(item.label)
                .attr('fill', '#ccc').attr('font-size', '11px');
        });
    }

    _processData(data) {
        // Use pre-parsed year_added from data-loader (already cleaned)
        const yearCounts = d3.rollup(
            data.filter(d => d.year_added && d.year_added >= 2008 && d.year_added <= 2021),
            v => ({
                Movie: v.filter(d => d.type === 'Movie').length,
                'TV Show': v.filter(d => d.type === 'TV Show').length
            }),
            d => d.year_added
        );

        const years = Array.from(yearCounts.keys()).sort((a, b) => a - b);

        return years.map(year => ({
            year,
            Movie: yearCounts.get(year)?.Movie || 0,
            'TV Show': yearCounts.get(year)?.['TV Show'] || 0,
            total: (yearCounts.get(year)?.Movie || 0) + (yearCounts.get(year)?.['TV Show'] || 0)
        }));
    }

    init(data) {
        this.allData = data;
        this.data = this._processData(data);
        this._render();
    }

    update(data) {
        this.data = this._processData(data);
        this._render(true);
    }

    _render(animate = false) {
        const data = this.data;
        if (!data.length) return;

        const keys = ['Movie', 'TV Show'];
        const stack = d3.stack().keys(keys);
        const stackedData = stack(data);

        // Update scales
        const yearExtent = d3.extent(data, d => d.year);
        this.xScale.domain(yearExtent);
        const maxY = d3.max(data, d => d.Movie + d['TV Show']);
        this.yScale.domain([0, maxY * 1.05]);

        // Axes
        const dur = animate ? 600 : 0;

        this.xAxisGroup.transition().duration(dur)
            .call(d3.axisBottom(this.xScale).ticks(data.length).tickFormat(d3.format('d')));
        this.yAxisGroup.transition().duration(dur)
            .call(d3.axisLeft(this.yScale).ticks(6));

        // Style axes
        this.svg.selectAll('.domain').attr('stroke', 'var(--border-light)');
        this.svg.selectAll('.tick line').attr('stroke', 'var(--border-subtle)');
        this.svg.selectAll('.tick text').attr('fill', 'var(--text-muted)').attr('font-size', '10px');

        // Grid lines
        this.gridGroup.selectAll('.grid-line').remove();
        const yTicks = this.yScale.ticks(6);
        this.gridGroup.selectAll('.grid-line')
            .data(yTicks)
            .enter().append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0).attr('x2', this.width)
            .attr('y1', d => this.yScale(d))
            .attr('y2', d => this.yScale(d))
            .attr('stroke', 'var(--border-subtle)')
            .attr('stroke-dasharray', '3,3');

        // Area generators
        const areaGen = d3.area()
            .x(d => this.xScale(d.data.year))
            .y0(d => this.yScale(d[0]))
            .y1(d => this.yScale(d[1]))
            .curve(d3.curveMonotoneX);

        // Draw focus areas
        const areas = this.areaGroup.selectAll('.stacked-area').data(stackedData);

        areas.enter()
            .append('path')
            .attr('class', 'stacked-area')
            .attr('fill', (d, i) => this.colors[keys[i]])
            .attr('opacity', 0.85)
            .attr('d', areaGen)
            .merge(areas)
            .transition().duration(dur)
            .attr('d', areaGen)
            .attr('fill', (d, i) => this.colors[keys[i]]);

        areas.exit().remove();

        // Hover overlay
        this._setupHover(data);
    }

    _setupHover(data) {
        this.hoverGroup.selectAll('*').remove();

        const hoverLine = this.hoverGroup.append('line')
            .attr('y1', 0).attr('y2', this.height)
            .attr('stroke', 'var(--border-light)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,4')
            .style('display', 'none');

        const overlay = this.hoverGroup.append('rect')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', 'none')
            .attr('pointer-events', 'all');

        const bisect = d3.bisector(d => d.year).left;
        const self = this;

        overlay.on('mousemove', function (event) {
            const [mx] = d3.pointer(event);
            const x0 = self.xScale.invert(mx);
            const i = bisect(data, x0, 1);
            const d0 = data[i - 1];
            const d1 = data[i];
            if (!d0) return;
            const d = d1 && (x0 - d0.year > d1.year - x0) ? d1 : d0;

            hoverLine
                .attr('x1', self.xScale(d.year))
                .attr('x2', self.xScale(d.year))
                .style('display', null);

            if (window.Tooltip) {
                window.Tooltip.show(`
                    <strong>${d.year}</strong><br/>
                    <span style="color:${self.colors.Movie}">● Movies:</span> ${d.Movie.toLocaleString()}<br/>
                    <span style="color:${self.colors['TV Show']}">● TV Shows:</span> ${d['TV Show'].toLocaleString()}<br/>
                    <strong>Total:</strong> ${d.total.toLocaleString()}
                `, event);
            }
        })
        .on('mouseleave', function () {
            hoverLine.style('display', 'none');
            if (window.Tooltip) window.Tooltip.hide();
        });
    }
}

window.TimelineChart = TimelineChart;
