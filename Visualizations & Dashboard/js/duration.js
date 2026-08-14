/**
 * DurationChart - Histogram showing duration distribution
 * Toggle between Movie (minutes) and TV Show (seasons)
 * Includes overlaid box plot with median, quartiles, whiskers, and outliers
 */
class DurationChart {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.margin = { top: 45, right: 25, bottom: 45, left: 55 };
        this.data = [];
        this.mode = 'Movie'; // 'Movie' or 'TV Show'

        this._createSvg();
    }

    _createSvg() {
        this.container.selectAll('svg').remove();
        this.container.selectAll('.duration-toggle').remove();

        const containerNode = this.container.node();
        this.width = containerNode.clientWidth - this.margin.left - this.margin.right;
        this.height = (containerNode.clientHeight || 370) - this.margin.top - this.margin.bottom;

        // Toggle button
        this.toggleContainer = this.container.insert('div', ':first-child')
            .attr('class', 'duration-toggle')
            .style('display', 'flex')
            .style('gap', '6px')
            .style('padding', '4px 8px')
            .style('position', 'absolute')
            .style('top', '8px')
            .style('right', '12px')
            .style('z-index', '10');

        const self = this;
        ['Movie', 'TV Show'].forEach(mode => {
            this.toggleContainer.append('button')
                .text(mode === 'Movie' ? 'Movies (min)' : 'TV Shows (seasons)')
                .attr('class', `toggle-btn toggle-${mode.replace(/\s/g, '')}`)
                .style('padding', '3px 10px')
                .style('border', 'none')
                .style('border-radius', '4px')
                .style('font-size', '11px')
                .style('cursor', 'pointer')
                .style('background', mode === self.mode ? '#E50914' : 'var(--bg-tertiary)')
                .style('color', 'var(--text-primary)')
                .on('click', function () {
                    self.mode = mode;
                    self.toggleContainer.selectAll('button')
                        .style('background', 'var(--bg-tertiary)');
                    d3.select(this).style('background', '#E50914');
                    self._render(true);
                });
        });

        this.svg = this.container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        this.chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Scales
        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        // Axis groups
        this.xAxisGroup = this.chart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`);

        this.yAxisGroup = this.chart.append('g')
            .attr('class', 'y-axis');

        // Grid group
        this.gridGroup = this.chart.append('g').attr('class', 'grid-lines');

        // Bars group
        this.barsGroup = this.chart.append('g').attr('class', 'bars');

        // Box plot group
        this.boxGroup = this.chart.append('g').attr('class', 'box-plot');

        // Stats group (mean/median lines)
        this.statsGroup = this.chart.append('g').attr('class', 'stats');

        // X-axis label
        this.xLabel = this.svg.append('text')
            .attr('x', this.margin.left + this.width / 2)
            .attr('y', this.height + this.margin.top + 38)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-muted)')
            .attr('font-size', '11px');

        // Y-axis label
        this.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(this.margin.top + this.height / 2))
            .attr('y', 15)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-muted)')
            .attr('font-size', '11px')
            .text('Frequency');
    }

    _parseDuration(d) {
        if (!d.duration) return null;
        const str = d.duration.trim();
        if (d.type === 'Movie') {
            const match = str.match(/(\d+)\s*min/i);
            return match ? +match[1] : null;
        } else {
            const match = str.match(/(\d+)\s*[Ss]eason/i);
            return match ? +match[1] : null;
        }
    }

    _processData(data) {
        const filtered = data.filter(d => d.type === this.mode);
        const values = filtered.map(d => this._parseDuration(d)).filter(v => v !== null && v > 0);
        return values.sort((a, b) => a - b);
    }

    _computeStats(values) {
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const n = sorted.length;
        const q1 = d3.quantile(sorted, 0.25);
        const median = d3.quantile(sorted, 0.5);
        const q3 = d3.quantile(sorted, 0.75);
        const iqr = q3 - q1;
        const mean = d3.mean(sorted);
        const whiskerLow = Math.max(d3.min(sorted), q1 - 1.5 * iqr);
        const whiskerHigh = Math.min(d3.max(sorted), q3 + 1.5 * iqr);
        const outliers = sorted.filter(v => v < whiskerLow || v > whiskerHigh);

        return { q1, median, q3, iqr, mean, whiskerLow, whiskerHigh, outliers, min: sorted[0], max: sorted[n - 1] };
    }

    init(data) {
        this.allData = data;
        this._renderFromData(data);
    }

    update(data) {
        this._renderFromData(data, true);
    }

    _renderFromData(data, animate = false) {
        this.currentData = data;
        this._render(animate);
    }

    _render(animate = false) {
        const data = this.currentData || this.allData;
        if (!data) return;

        const values = this._processData(data);
        const stats = this._computeStats(values);
        const duration = animate ? 500 : 0;

        if (this.mode === 'Movie') {
            this._renderHistogram(values, stats, duration, 0, 250, 10, 'Duration (minutes)');
        } else {
            this._renderDiscrete(values, stats, duration, 'Number of Seasons');
        }
    }

    _renderHistogram(values, stats, duration, minVal, maxVal, binWidth, label) {
        // X scale
        this.xScale.domain([minVal, maxVal]);

        // Create histogram bins
        const histogram = d3.bin()
            .domain([minVal, maxVal])
            .thresholds(d3.range(minVal, maxVal + binWidth, binWidth));

        const bins = histogram(values);
        const maxCount = d3.max(bins, d => d.length) || 1;
        this.yScale.domain([0, maxCount * 1.15]);

        // Color scale for gradient bars
        const colorScale = d3.scaleSequential()
            .domain([0, maxCount])
            .interpolator(d3.interpolateRgbBasis(['#4a1518', '#E50914', '#ff6b6b']));

        // Axes
        this.xAxisGroup.transition().duration(duration)
            .call(d3.axisBottom(this.xScale).ticks(10));
        this.yAxisGroup.transition().duration(duration)
            .call(d3.axisLeft(this.yScale).ticks(6));
        this.xLabel.text(label);

        this._styleAxes();
        this._drawGrid(duration);

        // Bars
        const bars = this.barsGroup.selectAll('.hist-bar')
            .data(bins, d => d.x0);

        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'hist-bar')
            .attr('x', d => this.xScale(d.x0) + 1)
            .attr('width', d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 2))
            .attr('y', this.height)
            .attr('height', 0)
            .attr('rx', 2)
            .style('cursor', 'pointer');

        barsEnter.merge(bars)
            .on('mouseenter', function (event, d) {
                d3.select(this).attr('opacity', 0.8);
                if (window.Tooltip) {
                    window.Tooltip.show(`
                        <strong>${d.x0} - ${d.x1} min</strong><br/>
                        Count: ${d.length.toLocaleString()}
                    `, event);
                }
            })
            .on('mousemove', function (event) {
                if (window.Tooltip) window.Tooltip.move(event);
            })
            .on('mouseleave', function () {
                d3.select(this).attr('opacity', 1);
                if (window.Tooltip) window.Tooltip.hide();
            })
            .transition().duration(duration)
            .attr('x', d => this.xScale(d.x0) + 1)
            .attr('width', d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 2))
            .attr('y', d => this.yScale(d.length))
            .attr('height', d => this.height - this.yScale(d.length))
            .attr('fill', d => colorScale(d.length));

        bars.exit().transition().duration(duration)
            .attr('y', this.height).attr('height', 0).remove();

        // Draw stats and box plot
        this._drawStatsLines(stats, duration);
        this._drawBoxPlot(stats, duration);
    }

    _renderDiscrete(values, stats, duration, label) {
        const maxSeason = Math.max(17, d3.max(values) || 1);
        const seasonCounts = d3.rollup(values, v => v.length, d => d);

        const bins = d3.range(1, maxSeason + 1).map(s => ({
            season: s,
            count: seasonCounts.get(s) || 0
        }));

        // X scale for discrete
        const xBand = d3.scaleBand()
            .domain(bins.map(d => d.season))
            .range([0, this.width])
            .padding(0.2);

        this.xScale.domain([0.5, maxSeason + 0.5]);

        const maxCount = d3.max(bins, d => d.count) || 1;
        this.yScale.domain([0, maxCount * 1.15]);

        const colorScale = d3.scaleSequential()
            .domain([0, maxCount])
            .interpolator(d3.interpolateRgbBasis(['#0d3320', '#46d369', '#8fff8f']));

        // Axes
        this.xAxisGroup.transition().duration(duration)
            .call(d3.axisBottom(xBand).tickFormat(d => d));
        this.yAxisGroup.transition().duration(duration)
            .call(d3.axisLeft(this.yScale).ticks(6));
        this.xLabel.text(label);

        this._styleAxes();
        this._drawGrid(duration);

        // Bars
        const bars = this.barsGroup.selectAll('.hist-bar')
            .data(bins, d => d.season);

        const barsEnter = bars.enter()
            .append('rect')
            .attr('class', 'hist-bar')
            .attr('x', d => xBand(d.season))
            .attr('width', xBand.bandwidth())
            .attr('y', this.height)
            .attr('height', 0)
            .attr('rx', 2)
            .style('cursor', 'pointer');

        barsEnter.merge(bars)
            .on('mouseenter', function (event, d) {
                d3.select(this).attr('opacity', 0.8);
                if (window.Tooltip) {
                    window.Tooltip.show(`
                        <strong>${d.season} Season${d.season > 1 ? 's' : ''}</strong><br/>
                        Count: ${d.count.toLocaleString()}
                    `, event);
                }
            })
            .on('mousemove', function (event) {
                if (window.Tooltip) window.Tooltip.move(event);
            })
            .on('mouseleave', function () {
                d3.select(this).attr('opacity', 1);
                if (window.Tooltip) window.Tooltip.hide();
            })
            .transition().duration(duration)
            .attr('x', d => xBand(d.season))
            .attr('width', xBand.bandwidth())
            .attr('y', d => this.yScale(d.count))
            .attr('height', d => this.height - this.yScale(d.count))
            .attr('fill', d => colorScale(d.count));

        bars.exit().transition().duration(duration)
            .attr('y', this.height).attr('height', 0).remove();

        // Box plot and stats using x linear scale for positioning
        if (stats) {
            // Remap stats to xBand positions for discrete mode
            const discreteStats = { ...stats };
            this._drawStatsLinesDiscrete(discreteStats, duration, bins, xBand);
            this._drawBoxPlotDiscrete(discreteStats, duration, bins, xBand);
        }
    }

    _drawStatsLines(stats, duration) {
        this.statsGroup.selectAll('*').remove();
        if (!stats) return;

        // Mean line
        const meanX = this.xScale(stats.mean);
        this.statsGroup.append('line')
            .attr('x1', meanX).attr('x2', meanX)
            .attr('y1', 0).attr('y2', this.height)
            .attr('stroke', '#f5a623')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,3')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.8);

        this.statsGroup.append('text')
            .attr('x', meanX + 4).attr('y', 12)
            .text(`Mean: ${stats.mean.toFixed(1)}`)
            .attr('fill', '#f5a623')
            .attr('font-size', '10px')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 1);

        // Median line
        const medianX = this.xScale(stats.median);
        this.statsGroup.append('line')
            .attr('x1', medianX).attr('x2', medianX)
            .attr('y1', 0).attr('y2', this.height)
            .attr('stroke', '#00b4d8')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,3')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.8);

        this.statsGroup.append('text')
            .attr('x', medianX + 4).attr('y', 26)
            .text(`Median: ${stats.median.toFixed(1)}`)
            .attr('fill', '#00b4d8')
            .attr('font-size', '10px')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 1);
    }

    _drawStatsLinesDiscrete(stats, duration, bins, xBand) {
        this.statsGroup.selectAll('*').remove();
        if (!stats) return;

        const meanX = this._discreteToX(stats.mean, xBand);
        this.statsGroup.append('line')
            .attr('x1', meanX).attr('x2', meanX)
            .attr('y1', 0).attr('y2', this.height)
            .attr('stroke', '#f5a623')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,3')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.8);

        this.statsGroup.append('text')
            .attr('x', meanX + 4).attr('y', 12)
            .text(`Mean: ${stats.mean.toFixed(1)}`)
            .attr('fill', '#f5a623')
            .attr('font-size', '10px')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 1);

        const medianX = this._discreteToX(stats.median, xBand);
        this.statsGroup.append('line')
            .attr('x1', medianX).attr('x2', medianX)
            .attr('y1', 0).attr('y2', this.height)
            .attr('stroke', '#00b4d8')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,3')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.8);

        this.statsGroup.append('text')
            .attr('x', medianX + 4).attr('y', 26)
            .text(`Median: ${stats.median.toFixed(1)}`)
            .attr('fill', '#00b4d8')
            .attr('font-size', '10px')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 1);
    }

    _discreteToX(val, xBand) {
        const domain = xBand.domain();
        const step = xBand.step();
        const offset = xBand.paddingOuter() * step;
        return offset + (val - domain[0]) * step + xBand.bandwidth() / 2;
    }

    _drawBoxPlot(stats, duration) {
        this.boxGroup.selectAll('*').remove();
        if (!stats) return;

        const boxY = this.height * 0.08;
        const boxH = 14;

        // Whisker line
        this.boxGroup.append('line')
            .attr('x1', this.xScale(stats.whiskerLow))
            .attr('x2', this.xScale(stats.whiskerHigh))
            .attr('y1', boxY + boxH / 2)
            .attr('y2', boxY + boxH / 2)
            .attr('stroke', 'var(--text-primary)')
            .attr('stroke-width', 1)
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.6);

        // Whisker caps
        [stats.whiskerLow, stats.whiskerHigh].forEach(val => {
            this.boxGroup.append('line')
                .attr('x1', this.xScale(val))
                .attr('x2', this.xScale(val))
                .attr('y1', boxY + 2)
                .attr('y2', boxY + boxH - 2)
                .attr('stroke', 'var(--text-primary)')
                .attr('stroke-width', 1.5)
                .attr('opacity', 0)
                .transition().duration(duration)
                .attr('opacity', 0.6);
        });

        // IQR box
        this.boxGroup.append('rect')
            .attr('x', this.xScale(stats.q1))
            .attr('y', boxY)
            .attr('width', this.xScale(stats.q3) - this.xScale(stats.q1))
            .attr('height', boxH)
            .attr('rx', 3)
            .attr('fill', 'var(--border-light)')
            .attr('stroke', 'var(--text-primary)')
            .attr('stroke-width', 1)
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.6);

        // Median line in box
        this.boxGroup.append('line')
            .attr('x1', this.xScale(stats.median))
            .attr('x2', this.xScale(stats.median))
            .attr('y1', boxY)
            .attr('y2', boxY + boxH)
            .attr('stroke', '#00b4d8')
            .attr('stroke-width', 2)
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.8);

        // Outlier dots
        const outlierSample = stats.outliers.length > 30
            ? stats.outliers.filter((_, i) => i % Math.ceil(stats.outliers.length / 30) === 0)
            : stats.outliers;

        this.boxGroup.selectAll('.outlier')
            .data(outlierSample)
            .enter().append('circle')
            .attr('class', 'outlier')
            .attr('cx', d => this.xScale(d))
            .attr('cy', boxY + boxH / 2)
            .attr('r', 2.5)
            .attr('fill', '#E50914')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.5);
    }

    _drawBoxPlotDiscrete(stats, duration, bins, xBand) {
        this.boxGroup.selectAll('*').remove();
        if (!stats) return;

        const boxY = this.height * 0.08;
        const boxH = 14;

        const toX = val => this._discreteToX(val, xBand);

        // Whisker line
        this.boxGroup.append('line')
            .attr('x1', toX(stats.whiskerLow))
            .attr('x2', toX(stats.whiskerHigh))
            .attr('y1', boxY + boxH / 2)
            .attr('y2', boxY + boxH / 2)
            .attr('stroke', 'var(--text-primary)')
            .attr('stroke-width', 1)
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.6);

        // Whisker caps
        [stats.whiskerLow, stats.whiskerHigh].forEach(val => {
            this.boxGroup.append('line')
                .attr('x1', toX(val))
                .attr('x2', toX(val))
                .attr('y1', boxY + 2)
                .attr('y2', boxY + boxH - 2)
                .attr('stroke', 'var(--text-primary)')
                .attr('stroke-width', 1.5)
                .attr('opacity', 0)
                .transition().duration(duration)
                .attr('opacity', 0.6);
        });

        // IQR box
        this.boxGroup.append('rect')
            .attr('x', toX(stats.q1))
            .attr('y', boxY)
            .attr('width', Math.max(0, toX(stats.q3) - toX(stats.q1)))
            .attr('height', boxH)
            .attr('rx', 3)
            .attr('fill', 'var(--border-light)')
            .attr('stroke', 'var(--text-primary)')
            .attr('stroke-width', 1)
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.6);

        // Median line
        this.boxGroup.append('line')
            .attr('x1', toX(stats.median))
            .attr('x2', toX(stats.median))
            .attr('y1', boxY)
            .attr('y2', boxY + boxH)
            .attr('stroke', '#00b4d8')
            .attr('stroke-width', 2)
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.8);

        // Outlier dots
        const outlierSample = stats.outliers.length > 20
            ? stats.outliers.filter((_, i) => i % Math.ceil(stats.outliers.length / 20) === 0)
            : stats.outliers;

        this.boxGroup.selectAll('.outlier')
            .data(outlierSample)
            .enter().append('circle')
            .attr('class', 'outlier')
            .attr('cx', d => toX(d))
            .attr('cy', boxY + boxH / 2)
            .attr('r', 2.5)
            .attr('fill', '#46d369')
            .attr('opacity', 0)
            .transition().duration(duration)
            .attr('opacity', 0.5);
    }

    _styleAxes() {
        this.svg.selectAll('.domain').attr('stroke', 'var(--border-light)');
        this.svg.selectAll('.tick line').attr('stroke', 'var(--border-subtle)');
        this.svg.selectAll('.tick text').attr('fill', 'var(--text-muted)').attr('font-size', '10px');
    }

    _drawGrid(duration) {
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
    }
}

window.DurationChart = DurationChart;
