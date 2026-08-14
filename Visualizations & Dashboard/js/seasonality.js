(function () {
  'use strict';

  class SeasonalityChart {
    constructor(containerId) {
      this.container = d3.select(containerId);
      if (this.container.empty()) return;
      
      this.svg = this.container.append('svg');
      this.g = this.svg.append('g');
      
      this.gridGroup = this.g.append('g').attr('class', 'season-grid');
      this.barsGroup = this.g.append('g').attr('class', 'season-bars');
      this.labelsGroup = this.g.append('g').attr('class', 'season-labels');
      
      this.margin = 45;
      this.width = 0;
      this.height = 0;
      this.radius = 0;
      this.innerRadius = 20; // empty space in center
      
      this.xScale = d3.scaleBand()
        .range([0, 2 * Math.PI])
        .align(0);
        
      this.yScale = d3.scaleRadial();
      
      this.colorScale = d3.scaleSequential(d3.interpolateSpectral);
      
      window.addEventListener('resize', window.NetflixUtils.debounce(this.resize.bind(this), 200));
    }
    
    resize() {
      if (this.container.empty() || !this.data) return;
      const rect = this.container.node().getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
      this.radius = Math.min(this.width, this.height) / 2 - this.margin;
      
      this.svg
        .attr('width', this.width)
        .attr('height', this.height);
        
      this.g.attr('transform', `translate(${this.width / 2},${this.height / 2})`);
      
      this.yScale.range([this.innerRadius, this.radius]);
      this.render();
    }

    init(data) {
      if (this.container.empty()) return;
      this.fullData = data;
      this.update(data);
    }
    
    update(data) {
      this.data = window.DataLoader.aggregateByMonth(data);
      
      const maxVal = d3.max(this.data, d => d.count);
      this.yScale.domain([0, maxVal || 1]);
      
      this.xScale.domain(this.data.map(d => d.month));
      this.colorScale.domain([0, 11]); // 12 months
      
      if (this.width === 0) {
        this.resize();
      } else {
        this.render();
      }
    }
    
    render() {
      const self = this;
      
      // Arc generator
      const arc = d3.arc()
        .innerRadius(this.innerRadius)
        .outerRadius(d => this.yScale(d.count))
        .startAngle(d => this.xScale(d.month))
        .endAngle(d => this.xScale(d.month) + this.xScale.bandwidth())
        .padAngle(0.05)
        .padRadius(this.innerRadius);
        
      // Grid circles
      const yTicks = this.yScale.ticks(4).slice(1);
      const gridCircles = this.gridGroup.selectAll('circle').data(yTicks);
      gridCircles.join('circle')
        .attr('r', this.yScale);
        
      const gridLabels = this.gridGroup.selectAll('text').data(yTicks);
      gridLabels.join('text')
        .attr('y', d => -this.yScale(d))
        .attr('dy', '-0.2em')
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--text-muted)')
        .style('font-size', '9px')
        .text(d => window.NetflixUtils.formatNumber(d));

      // Draw bars
      const paths = this.barsGroup.selectAll('path')
        .data(this.data, d => d.month);
        
      paths.join(
        enter => enter.append('path')
          .attr('class', 'season-arc')
          .attr('fill', (d, i) => this.colorScale(i))
          .attr('d', arc)
          .each(function(d) { this._current = d; }),
        update => update.transition().duration(600)
          .attrTween('d', function(d) {
            const i = d3.interpolate(this._current, d);
            this._current = i(1);
            return t => arc(i(t));
          }),
        exit => exit.remove()
      )
      .on('mouseover', function (event, d) {
        d3.select(this).style('opacity', 1).style('stroke', 'var(--text-primary)');
        const html = `
          <div class="tooltip-title">${d.month} Releases</div>
          <div class="tooltip-row">
            <span class="tooltip-label">Total Titles:</span>
            <span class="tooltip-value">${window.NetflixUtils.formatNumber(d.count)}</span>
          </div>
        `;
        window.Tooltip.show(html, event);
      })
      .on('mousemove', (event) => window.Tooltip.move(event))
      .on('mouseout', function () {
        d3.select(this).style('opacity', '').style('stroke', '');
        window.Tooltip.hide();
      });

      // Labels
      const labels = this.labelsGroup.selectAll('text')
        .data(this.data, d => d.month);
        
      labels.join('text')
        .attr('class', 'season-label')
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('transform', d => {
          const angle = this.xScale(d.month) + this.xScale.bandwidth() / 2;
          const r = this.radius + 15;
          const x = Math.sin(angle) * r;
          const y = -Math.cos(angle) * r;
          return `translate(${x},${y})`;
        })
        .text(d => d.month);
    }
  }

  window.SeasonalityChart = SeasonalityChart;
})();
