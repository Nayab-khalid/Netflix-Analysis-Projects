(function () {
  'use strict';

  class DirectorsChart {
    constructor(containerId) {
      this.container = d3.select(containerId);
      if (this.container.empty()) return;

      this.svg = this.container.append('svg');
      this.g = this.svg.append('g');

      this.xAxisGroup = this.g.append('g').attr('class', 'x-axis');
      this.yAxisGroup = this.g.append('g').attr('class', 'y-axis');
      this.lollipopGroup = this.g.append('g').attr('class', 'lollipops');

      this.margin = { top: 20, right: 30, bottom: 30, left: 120 };
      this.width = 0;
      this.height = 0;

      this.xScale = d3.scaleLinear();
      this.yScale = d3.scaleBand().padding(1); // padding=1 makes it a line

      window.addEventListener('resize', window.NetflixUtils.debounce(this.resize.bind(this), 200));
    }

    resize() {
      if (this.container.empty() || !this.data) return;
      const rect = this.container.node().getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;

      this.svg.attr('width', this.width).attr('height', this.height);
      this.g.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

      const innerWidth = this.width - this.margin.left - this.margin.right;
      const innerHeight = this.height - this.margin.top - this.margin.bottom;

      this.xScale.range([0, innerWidth]);
      this.yScale.range([0, innerHeight]);

      this.render();
    }

    init(data) {
      if (this.container.empty()) return;
      this.update(data);
    }

    update(data) {
      this.data = window.DataLoader.aggregateByDirector(data, 10);

      this.xScale.domain([0, d3.max(this.data, d => d.count) || 1]);
      this.yScale.domain(this.data.map(d => d.director));

      if (this.width === 0) {
        this.resize();
      } else {
        this.render();
      }
    }

    render() {
      const self = this;
      const t = d3.transition().duration(600);

      // Axes
      const xAxis = d3.axisBottom(this.xScale).ticks(5).tickSizeOuter(0);
      this.xAxisGroup
        .attr('transform', `translate(0,${this.yScale.range()[1]})`)
        .transition(t).call(xAxis);

      const yAxis = d3.axisLeft(this.yScale).tickSize(0);
      this.yAxisGroup
        .transition(t).call(yAxis)
        .selectAll('text')
        .attr('dx', '-10px')
        .style('fill', 'var(--text-secondary)')
        .style('font-size', '11px')
        .text(d => window.NetflixUtils.truncateText(d, 18));
        
      this.yAxisGroup.select('.domain').remove(); // remove y-axis line

      // Lines
      const lines = this.lollipopGroup.selectAll('.lollipop-line')
        .data(this.data, d => d.director);

      lines.join(
        enter => enter.append('line')
          .attr('class', 'lollipop-line')
          .attr('x1', 0)
          .attr('x2', 0)
          .attr('y1', d => this.yScale(d.director))
          .attr('y2', d => this.yScale(d.director))
          .call(enter => enter.transition(t)
            .attr('x2', d => this.xScale(d.count))
          ),
        update => update.call(update => update.transition(t)
          .attr('x2', d => this.xScale(d.count))
          .attr('y1', d => this.yScale(d.director))
          .attr('y2', d => this.yScale(d.director))
        ),
        exit => exit.call(exit => exit.transition(t)
          .attr('x2', 0)
          .remove()
        )
      );

      // Circles
      const circles = this.lollipopGroup.selectAll('.lollipop-circle')
        .data(this.data, d => d.director);

      circles.join(
        enter => enter.append('circle')
          .attr('class', 'lollipop-circle')
          .attr('cx', 0)
          .attr('cy', d => this.yScale(d.director))
          .attr('r', 0)
          .call(enter => enter.transition(t)
            .attr('cx', d => this.xScale(d.count))
            .attr('r', 6)
          ),
        update => update.call(update => update.transition(t)
          .attr('cx', d => this.xScale(d.count))
          .attr('cy', d => this.yScale(d.director))
        ),
        exit => exit.call(exit => exit.transition(t)
          .attr('r', 0)
          .remove()
        )
      )
      .on('mouseover', function (event, d) {
        const html = `
          <div class="tooltip-title">${d.director}</div>
          <div class="tooltip-row">
            <span class="tooltip-label">Titles Directed:</span>
            <span class="tooltip-value">${window.NetflixUtils.formatNumber(d.count)}</span>
          </div>
        `;
        window.Tooltip.show(html, event);
      })
      .on('mousemove', (event) => window.Tooltip.move(event))
      .on('mouseout', () => window.Tooltip.hide());

      // Values (text on the right of circle)
      const values = this.lollipopGroup.selectAll('.lollipop-value')
        .data(this.data, d => d.director);

      values.join(
        enter => enter.append('text')
          .attr('class', 'lollipop-value')
          .attr('x', 0)
          .attr('y', d => this.yScale(d.director))
          .attr('opacity', 0)
          .text(d => d.count)
          .call(enter => enter.transition(t)
            .attr('x', d => this.xScale(d.count) + 12)
            .attr('opacity', 1)
          ),
        update => update.call(update => update.transition(t)
          .text(d => d.count)
          .attr('x', d => this.xScale(d.count) + 12)
          .attr('y', d => this.yScale(d.director))
        ),
        exit => exit.call(exit => exit.transition(t)
          .attr('opacity', 0)
          .remove()
        )
      );
    }
  }

  window.DirectorsChart = DirectorsChart;
})();
