(function () {
  'use strict';

  class SidebarBrush {
    constructor(containerId) {
      this.container = d3.select(containerId);
      if (this.container.empty()) return;
      
      this.width = this.container.node().getBoundingClientRect().width;
      this.height = 50;
      this.margin = { top: 5, right: 10, bottom: 20, left: 10 };
      
      this.svg = this.container.append('svg')
        .attr('width', '100%')
        .attr('height', this.height)
        .attr('viewBox', `0 0 ${this.width} ${this.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
        
      this.g = this.svg.append('g')
        .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
      this.innerWidth = this.width - this.margin.left - this.margin.right;
      this.innerHeight = this.height - this.margin.top - this.margin.bottom;
      
      this.xScale = d3.scaleLinear().range([0, this.innerWidth]);
      this.yScale = d3.scaleLinear().range([this.innerHeight, 0]);
      
      // Brush
      this.brush = d3.brushX()
        .extent([[0, 0], [this.innerWidth, this.innerHeight]])
        .on('brush end', this.brushed.bind(this));
        
      this.brushGroup = this.g.append('g')
        .attr('class', 'brush');
        
      this.xAxisGroup = this.g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${this.innerHeight})`);
        
      this.barGroup = this.g.insert('g', '.brush').attr('class', 'bars');
      
      this.currentSelection = null;
      
      // Window resize listener
      window.addEventListener('resize', window.NetflixUtils.debounce(() => {
        const newWidth = this.container.node().getBoundingClientRect().width;
        if (newWidth && newWidth !== this.width) {
          this.width = newWidth;
          this.innerWidth = this.width - this.margin.left - this.margin.right;
          this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
          this.xScale.range([0, this.innerWidth]);
          this.brush.extent([[0, 0], [this.innerWidth, this.innerHeight]]);
          this.renderBars();
          this.brushGroup.call(this.brush);
          if (this.currentSelection) {
            const [min, max] = this.currentSelection;
            this.brushGroup.call(this.brush.move, [this.xScale(min), this.xScale(max)]);
          }
        }
      }, 200));
    }

    init(data) {
      if (this.container.empty()) return;
      this.fullData = data;
      this.yearData = window.DataLoader.aggregateByYear(data);
      
      // Pad year range slightly to show bars properly
      const minYear = d3.min(this.yearData, d => d.year);
      const maxYear = d3.max(this.yearData, d => d.year);
      
      // xScale uses domain -0.5 to +0.5 so bars fit inside
      this.xScale.domain([minYear - 0.5, maxYear + 0.5]);
      this.yScale.domain([0, d3.max(this.yearData, d => d.Movie + d['TV Show'])]);
      
      this.renderBars();
      
      const xAxis = d3.axisBottom(this.xScale)
        .ticks(5)
        .tickFormat(d3.format('d'))
        .tickSizeOuter(0);
        
      this.xAxisGroup.call(xAxis);
      this.xAxisGroup.selectAll('text').style('fill', 'var(--text-muted)');
      this.xAxisGroup.selectAll('path, line').style('stroke', 'var(--border-subtle)');
      
      this.brushGroup.call(this.brush);
      
      // Set initial brush to full extent
      this.currentSelection = [minYear, maxYear];
      this.brushGroup.call(this.brush.move, [this.xScale(minYear - 0.5), this.xScale(maxYear + 0.5)]);
    }

    renderBars() {
      const bars = this.barGroup.selectAll('.brush-bar')
        .data(this.yearData, d => d.year);
        
      bars.join('rect')
        .attr('class', 'brush-bar')
        .attr('x', d => this.xScale(d.year - 0.4))
        .attr('y', d => this.yScale(d.Movie + d['TV Show']))
        .attr('width', Math.max(1, this.xScale(1) - this.xScale(0.2)))
        .attr('height', d => this.innerHeight - this.yScale(d.Movie + d['TV Show']));
    }

    brushed(event) {
      const selection = event.selection;
      if (!selection) return; // ignore empty selection for now

      // Convert pixel selection back to years
      let minYear = Math.round(this.xScale.invert(selection[0]));
      let maxYear = Math.round(this.xScale.invert(selection[1]));
      
      // Highlight bars in range
      this.barGroup.selectAll('.brush-bar')
        .classed('in-range', d => d.year >= minYear && d.year <= maxYear);

      // Only dispatch if changed or if it's the end of a drag
      if (event.type === 'end' || event.type === 'brush') {
         if (!this.currentSelection || this.currentSelection[0] !== minYear || this.currentSelection[1] !== maxYear) {
             this.currentSelection = [minYear, maxYear];
             window.dispatchEvent(new CustomEvent('filter:yearRange', {
               detail: { min: minYear, max: maxYear, source: 'sidebar-brush' }
             }));
         }
      }
    }
    
    // Allow external updates (e.g. if the main timeline brush is moved)
    updateSelection(minYear, maxYear) {
      if (this.currentSelection && this.currentSelection[0] === minYear && this.currentSelection[1] === maxYear) return;
      this.currentSelection = [minYear, maxYear];
      
      // Temporarily disable brush events so we don't infinite loop
      this.brush.on('brush end', null);
      this.brushGroup.call(this.brush.move, [this.xScale(minYear - 0.5), this.xScale(maxYear + 0.5)]);
      this.brush.on('brush end', this.brushed.bind(this));
      
      this.barGroup.selectAll('.brush-bar')
        .classed('in-range', d => d.year >= minYear && d.year <= maxYear);
    }
  }

  window.SidebarBrush = SidebarBrush;
})();
