/**
 * RatingsChart - Grouped Bar Chart showing content rating distribution
 * Two bars per rating (Movie/TV Show), click to filter, animated transitions
 */
class RatingsChart {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.margin = { top: 30, right: 20, bottom: 45, left: 55 };
        this.data = [];
        this.selectedRating = null;

        this.ratingOrder = (window.NetflixUtils && window.NetflixUtils.RATING_ORDER) || [
            'TV-Y', 'TV-Y7', 'TV-Y7-FV', 'G', 'TV-G', 'PG', 'TV-PG',
            'PG-13', 'TV-14', 'R', 'TV-MA', 'NC-17', 'NR', 'UR'
        ];

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
        this.height = (containerNode.clientHeight || 350) - this.margin.top - this.margin.bottom;

        this.svg = this.container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        this.chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Scales
        this.xScale = d3.scaleBand().range([0, this.width]).padding(0.3);
        this.xSubScale = d3.scaleBand().padding(0.08);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        // Axis groups
        this.xAxisGroup = this.chart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`);

        this.yAxisGroup = this.chart.append('g')
            .attr('class', 'y-axis');

        // Grid lines group
        this.gridGroup = this.chart.append('g').attr('class', 'grid-lines');

        // Bars group
        this.barsGroup = this.chart.append('g').attr('class', 'bars');

        // Legend
        this._drawLegend();
    }

    _drawLegend() {
        const legend = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left + this.width - 160}, 10)`);

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
        const ratingCounts = d3.rollup(
            data.filter(d => d.rating && d.rating.trim() !== ''),
            v => ({
                Movie: v.filter(d => d.type === 'Movie').length,
                'TV Show': v.filter(d => d.type === 'TV Show').length,
                total: v.length
            }),
            d => d.rating
        );

        // Filter to only ratings that exist in the data and are in ratingOrder
        const activeRatings = this.ratingOrder.filter(r => ratingCounts.has(r));

        return activeRatings.map(rating => ({
            rating,
            Movie: ratingCounts.get(rating)?.Movie || 0,
            'TV Show': ratingCounts.get(rating)?.['TV Show'] || 0,
            total: ratingCounts.get(rating)?.total || 0
        }));
    }

    init(data) {
        this.allData = data;
        this.totalCount = data.length;
        this.data = this._processData(data);
        this._render(true);
    }

    update(data) {
        this.data = this._processData(data);
        this.totalCount = data.length;
        this._render(true);
    }

    _render(animate = false) {
        const data = this.data;
        const keys = ['Movie', 'TV Show'];
        const duration = animate ? 600 : 0;

        // Update scales
        this.xScale.domain(data.map(d => d.rating));
        this.xSubScale.domain(keys).range([0, this.xScale.bandwidth()]);
        const maxY = d3.max(data, d => Math.max(d.Movie, d['TV Show']));
        this.yScale.domain([0, (maxY || 1) * 1.1]);

        // Axes
        this.xAxisGroup.transition().duration(duration)
            .call(d3.axisBottom(this.xScale));
        this.yAxisGroup.transition().duration(duration)
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

        // Bar groups
        const barGroups = this.barsGroup.selectAll('.bar-group')
            .data(data, d => d.rating);

        const barGroupsEnter = barGroups.enter()
            .append('g')
            .attr('class', 'bar-group');

        const barGroupsMerged = barGroupsEnter.merge(barGroups);

        barGroupsMerged.transition().duration(duration)
            .attr('transform', d => `translate(${this.xScale(d.rating)},0)`);

        barGroups.exit().transition().duration(duration).attr('opacity', 0).remove();

        const self = this;

        // Draw bars for each type
        keys.forEach(key => {
            const bars = barGroupsMerged.selectAll(`.bar-${key.replace(/\s/g, '')}`)
                .data(d => [{ key, value: d[key], rating: d.rating, total: d.total }],
                    d => d.key);

            const barsEnter = bars.enter()
                .append('rect')
                .attr('class', `bar-${key.replace(/\s/g, '')}`)
                .attr('x', d => this.xSubScale(d.key))
                .attr('width', this.xSubScale.bandwidth())
                .attr('y', this.height)
                .attr('height', 0)
                .attr('rx', 2)
                .attr('fill', this.colors[key])
                .style('cursor', 'pointer');

            barsEnter.merge(bars)
                .on('mouseenter', function (event, d) {
                    d3.select(this).attr('fill', d3.color(self.colors[d.key]).brighter(0.5));
                    const pct = self.totalCount > 0 ? ((d.value / self.totalCount) * 100).toFixed(1) : 0;
                    if (window.Tooltip) {
                        window.Tooltip.show(`
                            <strong>${d.rating}</strong><br/>
                            Type: ${d.key}<br/>
                            Count: ${d.value.toLocaleString()}<br/>
                            Percentage: ${pct}%
                        `, event);
                    }
                })
                .on('mousemove', function (event) {
                    if (window.Tooltip) window.Tooltip.move(event);
                })
                .on('mouseleave', function (event, d) {
                    const dimmed = self.selectedRating && d.rating !== self.selectedRating;
                    d3.select(this).attr('fill', dimmed
                        ? d3.color(self.colors[d.key]).darker(1.5)
                        : self.colors[d.key]);
                    if (window.Tooltip) window.Tooltip.hide();
                })
                .on('click', function (event, d) {
                    self.selectedRating = self.selectedRating === d.rating ? null : d.rating;

                    // Update all bar visuals
                    self.barsGroup.selectAll('rect')
                        .attr('fill', function () {
                            const bd = d3.select(this).datum();
                            if (!self.selectedRating) return self.colors[bd.key];
                            return bd.rating === self.selectedRating
                                ? d3.color(self.colors[bd.key]).brighter(0.3)
                                : d3.color(self.colors[bd.key]).darker(1.5);
                        });

                    window.dispatchEvent(new CustomEvent('filter:rating', {
                        detail: { rating: self.selectedRating }
                    }));
                })
                .transition().duration(duration)
                .attr('x', d => this.xSubScale(d.key))
                .attr('width', this.xSubScale.bandwidth())
                .attr('y', d => this.yScale(d.value))
                .attr('height', d => this.height - this.yScale(d.value))
                .attr('fill', d => {
                    if (!this.selectedRating) return this.colors[d.key];
                    return d.rating === this.selectedRating
                        ? d3.color(this.colors[d.key]).brighter(0.3)
                        : d3.color(this.colors[d.key]).darker(1.5);
                });

            bars.exit().transition().duration(duration)
                .attr('y', this.height)
                .attr('height', 0)
                .remove();
        });
    }
}

window.RatingsChart = RatingsChart;
