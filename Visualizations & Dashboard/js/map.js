/**
 * ContentMap - Choropleth World Map showing content production by country
 * Loads TopoJSON, colors by Netflix title count, supports zoom/pan and click filtering
 */
class ContentMap {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.margin = { top: 10, right: 10, bottom: 30, left: 10 };
        this.data = [];
        this.selectedCountry = null;
        this.worldData = null;
        this.countryCounts = new Map();

        // Country name to TopoJSON numeric ID mapping (ISO 3166-1 numeric)
        this.countryNameToId = {
            'United States': '840', 'India': '356', 'United Kingdom': '826',
            'Canada': '124', 'France': '250', 'Japan': '392', 'South Korea': '410',
            'Spain': '724', 'Mexico': '484', 'Australia': '036', 'Germany': '276',
            'Turkey': '792', 'Egypt': '818', 'Nigeria': '566', 'Brazil': '076',
            'China': '156', 'Argentina': '032', 'Taiwan': '158', 'Indonesia': '360',
            'Thailand': '764', 'Philippines': '608', 'Colombia': '170', 'Italy': '380',
            'Poland': '616', 'Belgium': '056', 'Sweden': '752', 'Norway': '578',
            'Denmark': '208', 'Hong Kong': '344', 'Singapore': '702', 'South Africa': '710',
            'Switzerland': '756', 'Netherlands': '528', 'Ireland': '372', 'Pakistan': '586',
            'Israel': '376', 'New Zealand': '554', 'Malaysia': '458', 'Chile': '152',
            'Russia': '643', 'Portugal': '620', 'Czech Republic': '203', 'Austria': '040',
            'Romania': '642', 'Greece': '300', 'Peru': '604', 'Uruguay': '858',
            'Bangladesh': '050', 'Ghana': '288', 'Kenya': '404', 'Vietnam': '704',
            'Jordan': '400', 'Lebanon': '422', 'Saudi Arabia': '682', 'Morocco': '504',
            'United Arab Emirates': '784', 'Iceland': '352', 'Finland': '246',
            'Hungary': '348', 'Croatia': '191', 'Bulgaria': '100', 'Ukraine': '804',
            'Iran': '364', 'Iraq': '368', 'Cuba': '192', 'Venezuela': '862',
            'Luxembourg': '442', 'Senegal': '686', 'Cambodia': '116', 'Nepal': '524',
            'Sri Lanka': '144', 'Georgia': '268', 'Slovakia': '703', 'Slovenia': '705',
            'Lithuania': '440', 'Latvia': '428', 'Estonia': '233', 'Serbia': '688',
            'Montenegro': '499', 'West Germany': '276', 'Soviet Union': '643',
            'Puerto Rico': '630', 'Czechoslovakia': '203', 'Zimbabwe': '716',
            'Tanzania': '834', 'Ethiopia': '231', 'Uganda': '800', 'Namibia': '516',
            'Bermuda': '060', 'Somalia': '706', 'Mauritius': '480', 'Qatar': '634',
            'Algeria': '012', 'Tunisia': '788', 'Syria': '760', 'Kuwait': '414',
            'Bahrain': '048', 'Oman': '512', 'Dominican Republic': '214',
            'Guatemala': '320', 'Panama': '591', 'Costa Rica': '188',
            'Ecuador': '218', 'Bolivia': '068', 'Paraguay': '600', 'Jamaica': '388'
        };

        // Reverse mapping: id -> name
        this.idToCountryName = {};
        for (const [name, id] of Object.entries(this.countryNameToId)) {
            this.idToCountryName[id] = name;
        }

        this._createSvg();
    }

    _createSvg() {
        this.container.selectAll('svg').remove();
        const containerNode = this.container.node();
        this.width = containerNode.clientWidth - this.margin.left - this.margin.right;
        this.height = (containerNode.clientHeight || 420) - this.margin.top - this.margin.bottom;

        this.svg = this.container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        // Ocean background
        this.svg.append('rect')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .attr('fill', 'transparent')
            .attr('rx', 4);

        this.mapGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Projection
        this.projection = d3.geoNaturalEarth1()
            .scale(this.width / 5.5)
            .translate([this.width / 2, this.height / 2]);

        this.path = d3.geoPath().projection(this.projection);

        // Color scale
        this.colorScale = d3.scaleSequentialLog()
            .interpolator(d3.interpolateRgbBasis(['#0d3b4f', '#1a6b5a', '#f5a623', '#E50914']))
            .domain([1, 1000]);

        // Graticule
        this.mapGroup.append('path')
            .datum(d3.geoGraticule()())
            .attr('d', this.path)
            .attr('fill', 'none')
            .attr('stroke', 'var(--border-subtle)')
            .attr('stroke-width', 0.5);

        // Countries group
        this.countriesGroup = this.mapGroup.append('g').attr('class', 'countries');

        // Zoom
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .translateExtent([[0, 0], [this.width, this.height]])
            .on('zoom', (event) => {
                this.mapGroup.attr('transform',
                    `translate(${this.margin.left + event.transform.x},${this.margin.top + event.transform.y}) scale(${event.transform.k})`);
            });

        this.svg.call(zoom);
    }

    async init(data) {
        this.allData = data;
        this._processData(data);

        // Load world TopoJSON
        try {
            const worldRaw = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            this.worldData = topojson.feature(worldRaw, worldRaw.objects.countries);
            this._renderMap();
            this._drawLegend();
        } catch (err) {
            console.error('Failed to load world map data:', err);
        }
    }

    update(data) {
        this._processData(data);
        if (this.worldData) {
            this._renderMap(true);
        }
    }

    _processData(data) {
        this.countryCounts = new Map();

        data.forEach(d => {
            // Use pre-parsed countries array from data-loader
            const countries = d.countries || [];
            countries.forEach(country => {
                if (!country) return;
                this.countryCounts.set(country, (this.countryCounts.get(country) || 0) + 1);
            });
        });

        // Update color scale domain
        const maxCount = d3.max(Array.from(this.countryCounts.values())) || 1;
        this.colorScale.domain([1, Math.max(maxCount, 2)]);
    }

    _getCountryCount(feature) {
        const id = feature.id;
        const name = this.idToCountryName[id];
        if (name && this.countryCounts.has(name)) {
            return this.countryCounts.get(name);
        }
        // Try matching by iterating country names
        for (const [cName, cId] of Object.entries(this.countryNameToId)) {
            if (cId === id && this.countryCounts.has(cName)) {
                return this.countryCounts.get(cName);
            }
        }
        return 0;
    }

    _getCountryName(feature) {
        const id = feature.id;
        return this.idToCountryName[id] || `Country ${id}`;
    }

    _renderMap(animate = false) {
        const self = this;
        const duration = animate ? 400 : 0;
        const features = this.worldData.features;

        const paths = this.countriesGroup.selectAll('.country')
            .data(features, d => d.id);

        const pathsEnter = paths.enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', this.path)
            .attr('stroke', 'var(--border-light)')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer');

        const pathsMerged = pathsEnter.merge(paths);

        pathsMerged.transition().duration(duration)
            .attr('fill', d => {
                const count = this._getCountryCount(d);
                return count > 0 ? this.colorScale(count) : 'var(--bg-tertiary)';
            });

        pathsMerged
            .on('mouseenter', function (event, d) {
                d3.select(this)
                    .attr('stroke', 'var(--text-primary)')
                    .attr('stroke-width', 1.5)
                    .raise();

                const count = self._getCountryCount(d);
                const name = self._getCountryName(d);

                if (window.Tooltip) {
                    window.Tooltip.show(`
                        <strong>${name}</strong><br/>
                        Titles: ${count > 0 ? count.toLocaleString() : 'No data'}
                    `, event);
                }
            })
            .on('mousemove', function (event) {
                if (window.Tooltip) window.Tooltip.move(event);
            })
            .on('mouseleave', function () {
                const isSelected = self.selectedCountry && self._getCountryName(d3.select(this).datum()) === self.selectedCountry;
                d3.select(this)
                    .attr('stroke', isSelected ? 'var(--text-primary)' : 'var(--border-light)')
                    .attr('stroke-width', isSelected ? 2 : 0.5);
                if (window.Tooltip) window.Tooltip.hide();
            })
            .on('click', function (event, d) {
                const name = self._getCountryName(d);
                const count = self._getCountryCount(d);
                if (count === 0) return;

                self.selectedCountry = self.selectedCountry === name ? null : name;

                // Highlight selected
                pathsMerged
                    .attr('stroke', dd => {
                        const n = self._getCountryName(dd);
                        return n === self.selectedCountry ? 'var(--text-primary)' : 'var(--border-light)';
                    })
                    .attr('stroke-width', dd => {
                        const n = self._getCountryName(dd);
                        return n === self.selectedCountry ? 2 : 0.5;
                    });

                window.dispatchEvent(new CustomEvent('filter:country', {
                    detail: { country: self.selectedCountry }
                }));
            });
    }

    _drawLegend() {
        const legendWidth = 200;
        const legendHeight = 10;
        const legendX = this.width - legendWidth - 20;
        const legendY = this.height - 15;

        const legendGroup = this.mapGroup.append('g')
            .attr('transform', `translate(${legendX},${legendY})`);

        // Gradient
        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'map-legend-gradient');

        const stops = [0, 0.25, 0.5, 0.75, 1];
        const domain = this.colorScale.domain();
        stops.forEach(t => {
            const val = domain[0] * Math.pow(domain[1] / domain[0], t);
            gradient.append('stop')
                .attr('offset', `${t * 100}%`)
                .attr('stop-color', this.colorScale(val));
        });

        legendGroup.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('rx', 3)
            .style('fill', 'url(#map-legend-gradient)');

        // Tick labels
        const tickVals = [1, 10, 100, 1000];
        const legendScale = d3.scaleLog().domain(this.colorScale.domain()).range([0, legendWidth]);

        tickVals.forEach(v => {
            if (v > this.colorScale.domain()[1]) return;
            legendGroup.append('text')
                .attr('x', legendScale(v))
                .attr('y', legendHeight + 12)
                .attr('text-anchor', 'middle')
                .attr('fill', 'var(--text-muted)')
                .attr('font-size', '9px')
                .text(v >= 1000 ? `${v / 1000}k` : v);
        });

        legendGroup.append('text')
            .attr('x', legendWidth / 2)
            .attr('y', -4)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-muted)')
            .attr('font-size', '9px')
            .text('Number of Titles');
    }
}

window.ContentMap = ContentMap;
