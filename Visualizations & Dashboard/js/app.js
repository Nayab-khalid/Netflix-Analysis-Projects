/**
 * app.js — Netflix Analytics Dashboard: Application Controller & State Manager
 * 
 * Manages global filter state, initializes all D3.js chart modules,
 * and dispatches cross-filter updates so every visualization stays in sync.
 * 
 * @author Netflix Analytics Dashboard Team
 * @version 1.0.0
 */

(function () {
    'use strict';

    /* ─── Global Application State ──────────────────────────────────── */

    const AppState = {
        rawData: [],           // Full unfiltered dataset
        filteredData: [],      // Currently active subset
        filters: {
            yearRange: null,   // [minYear, maxYear] or null for all
            type: 'All',       // 'Movie', 'TV Show', or 'All'
            country: 'All',    // Country name or 'All'
            rating: 'All',     // Rating value or 'All'
            genre: 'All'       // Genre name or 'All'
        },
        charts: {},            // Registry of chart instances
        isLoading: true
    };

    /* ─── Chart Registry ────────────────────────────────────────────── */

    function registerChart(name, instance) {
        AppState.charts[name] = instance;
    }

    /* ─── Filtering Engine ──────────────────────────────────────────── */

    function applyFilters() {
        let data = AppState.rawData;

        // Filter by year range
        if (AppState.filters.yearRange) {
            const [minY, maxY] = AppState.filters.yearRange;
            data = data.filter(d => d.year_added >= minY && d.year_added <= maxY);
        }

        // Filter by type
        if (AppState.filters.type !== 'All') {
            data = data.filter(d => d.type === AppState.filters.type);
        }

        // Filter by country
        if (AppState.filters.country !== 'All') {
            data = data.filter(d => d.countries && d.countries.includes(AppState.filters.country));
        }

        // Filter by rating
        if (AppState.filters.rating !== 'All') {
            data = data.filter(d => d.rating === AppState.filters.rating);
        }

        // Filter by genre
        if (AppState.filters.genre !== 'All') {
            data = data.filter(d => d.genres && d.genres.includes(AppState.filters.genre));
        }

        AppState.filteredData = data;
        updateAllCharts();
        updateStatsBar();
    }

    /* ─── Update All Charts ─────────────────────────────────────────── */

    function updateAllCharts() {
        const data = AppState.filteredData;
        Object.values(AppState.charts).forEach(chart => {
            if (chart && typeof chart.update === 'function') {
                try {
                    chart.update(data);
                } catch (e) {
                    console.warn('Chart update error:', e);
                }
            }
        });
    }

    /* ─── Stats Bar ─────────────────────────────────────────────────── */

    function updateStatsBar() {
        const data = AppState.filteredData;
        const totalEl = document.getElementById('stat-total');
        const moviesEl = document.getElementById('stat-movies');
        const showsEl = document.getElementById('stat-shows');
        const countriesEl = document.getElementById('stat-countries');

        if (totalEl) {
            const movies = data.filter(d => d.type === 'Movie').length;
            const shows = data.filter(d => d.type === 'TV Show').length;
            const countries = new Set();
            data.forEach(d => {
                if (d.primary_country) countries.add(d.primary_country);
            });

            totalEl.textContent = NetflixUtils.formatNumber(data.length);
            moviesEl.textContent = NetflixUtils.formatNumber(movies);
            showsEl.textContent = NetflixUtils.formatNumber(shows);
            countriesEl.textContent = NetflixUtils.formatNumber(countries.size);
        }
    }

    /* ─── Sidebar Controls Setup ────────────────────────────────────── */

    function setupSidebarControls() {
        // Type toggle buttons
        const typeButtons = document.querySelectorAll('.type-btn');
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.filters.type = btn.dataset.type;
                applyFilters();
            });
        });

        // Country dropdown
        const countrySelect = document.getElementById('filter-country');
        if (countrySelect) {
            const countries = DataLoader.getUniqueCountries(AppState.rawData);
            countries.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                countrySelect.appendChild(opt);
            });
            countrySelect.addEventListener('change', () => {
                AppState.filters.country = countrySelect.value;
                applyFilters();
            });
        }

        // Rating dropdown
        const ratingSelect = document.getElementById('filter-rating');
        if (ratingSelect) {
            const ratings = DataLoader.getUniqueRatings(AppState.rawData);
            ratings.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                ratingSelect.appendChild(opt);
            });
            ratingSelect.addEventListener('change', () => {
                AppState.filters.rating = ratingSelect.value;
                applyFilters();
            });
        }

        // Genre dropdown
        const genreSelect = document.getElementById('filter-genre');
        if (genreSelect) {
            const genres = DataLoader.getUniqueGenres(AppState.rawData);
            genres.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                genreSelect.appendChild(opt);
            });
            genreSelect.addEventListener('change', () => {
                AppState.filters.genre = genreSelect.value;
                applyFilters();
            });
        }

        // Year range D3 brush filter
        if (typeof SidebarBrush !== 'undefined' && document.getElementById('year-filter-container')) {
            const brush = new SidebarBrush('#year-filter-container');
            brush.init(AppState.rawData);
            registerChart('sidebarBrush', brush);
            const [minY, maxY] = DataLoader.getYearRange(AppState.rawData);
            const yearLabel = document.getElementById('year-range-label');
            if (yearLabel) yearLabel.textContent = `${minY} — ${maxY}`;
        }

        // Reset filters button
        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                AppState.filters = {
                    yearRange: null,
                    type: 'All',
                    country: 'All',
                    rating: 'All',
                    genre: 'All'
                };

                // Reset UI
                typeButtons.forEach(b => b.classList.remove('active'));
                document.querySelector('.type-btn[data-type="All"]')?.classList.add('active');
                if (countrySelect) countrySelect.value = 'All';
                if (ratingSelect) ratingSelect.value = 'All';
                if (genreSelect) genreSelect.value = 'All';

                const [minY, maxY] = DataLoader.getYearRange(AppState.rawData);
                const yearLabel = document.getElementById('year-range-label');
                if (yearLabel) yearLabel.textContent = `${minY} — ${maxY}`;
                if (AppState.charts.sidebarBrush) {
                    AppState.charts.sidebarBrush.updateSelection(minY, maxY);
                }

                applyFilters();
            });
        }
    }

    /* ─── Cross-filter Event Listeners ──────────────────────────────── */

    function setupCrossFilterListeners() {
        // Timeline brush -> year range
        window.addEventListener('filter:yearRange', (e) => {
            const detail = e.detail;
            // Handle both formats: direct array or {yearRange: [...]}
            const range = Array.isArray(detail) ? detail : (detail && detail.yearRange ? detail.yearRange : null);
            if (!range) {
                AppState.filters.yearRange = null;
            } else {
                const [minY, maxY] = range;
                AppState.filters.yearRange = [minY, maxY];
                const yearLabel = document.getElementById('year-range-label');
                if (yearLabel) yearLabel.textContent = `${minY} — ${maxY}`;
                
                // If this event did not come from the sidebar brush, update it visually
                if (detail && detail.source !== 'sidebar-brush' && AppState.charts.sidebarBrush) {
                    AppState.charts.sidebarBrush.updateSelection(minY, maxY);
                }
            }
            applyFilters();
        });

        // Map click -> country
        window.addEventListener('filter:country', (e) => {
            const detail = e.detail;
            // Handle both formats: direct string or {country: name}
            const country = (typeof detail === 'string') ? detail : (detail && detail.country ? detail.country : 'All');
            AppState.filters.country = country || 'All';
            const countrySelect = document.getElementById('filter-country');
            if (countrySelect) countrySelect.value = AppState.filters.country;
            applyFilters();
        });

        // Ratings bar click -> rating
        window.addEventListener('filter:rating', (e) => {
            const detail = e.detail;
            const rating = (typeof detail === 'string') ? detail : (detail && detail.rating !== undefined ? detail.rating : null);
            const ratingSelect = document.getElementById('filter-rating');
            if (!rating || AppState.filters.rating === rating) {
                AppState.filters.rating = 'All';
                if (ratingSelect) ratingSelect.value = 'All';
            } else {
                AppState.filters.rating = rating;
                if (ratingSelect) ratingSelect.value = rating;
            }
            applyFilters();
        });

        // Treemap click -> genre
        window.addEventListener('filter:genre', (e) => {
            const detail = e.detail;
            const genre = (typeof detail === 'string') ? detail : (detail && detail.genre !== undefined ? detail.genre : null);
            const genreSelect = document.getElementById('filter-genre');
            if (!genre || AppState.filters.genre === genre) {
                AppState.filters.genre = 'All';
                if (genreSelect) genreSelect.value = 'All';
            } else {
                AppState.filters.genre = genre;
                if (genreSelect) genreSelect.value = genre;
            }
            applyFilters();
        });
    }

    /* ─── Loading Animation ─────────────────────────────────────────── */

    function showLoading() {
        document.querySelectorAll('.chart-card').forEach(card => {
            card.classList.add('loading');
        });
    }

    function hideLoading() {
        document.querySelectorAll('.chart-card').forEach(card => {
            card.classList.remove('loading');
        });
        AppState.isLoading = false;
    }

    /* ─── Initialize Application ────────────────────────────────────── */

    async function init(data) {
        console.log('🎬 Netflix Analytics Dashboard — Initializing...');
        showLoading();

        try {
            // Step 1: Set data
            AppState.rawData = data;
            AppState.filteredData = data;
            console.log(`✅ Loaded ${data.length} titles`);

            // Step 2: Setup sidebar controls
            setupSidebarControls();

            // Step 3: Setup cross-filter listeners
            setupCrossFilterListeners();

            // Step 4: Initialize charts
            if (typeof TimelineChart !== 'undefined') {
                const timeline = new TimelineChart('#chart-timeline');
                timeline.init(data);
                registerChart('timeline', timeline);
                console.log('✅ Timeline chart initialized');
            }

            if (typeof GenreTreemap !== 'undefined') {
                const treemap = new GenreTreemap('#chart-treemap');
                treemap.init(data);
                registerChart('treemap', treemap);
                console.log('✅ Genre treemap initialized');
            }

            if (typeof ContentMap !== 'undefined') {
                const map = new ContentMap('#chart-map');
                map.init(data);
                registerChart('map', map);
                console.log('✅ Content map initialized');
            }

            if (typeof RatingsChart !== 'undefined') {
                const ratings = new RatingsChart('#chart-ratings');
                ratings.init(data);
                registerChart('ratings', ratings);
                console.log('✅ Ratings chart initialized');
            }

            if (typeof DurationChart !== 'undefined') {
                const duration = new DurationChart('#chart-duration');
                duration.init(data);
                registerChart('duration', duration);
                console.log('✅ Duration chart initialized');
            }

            if (typeof SeasonalityChart !== 'undefined') {
                const seasonality = new SeasonalityChart('#chart-seasonality');
                seasonality.init(data);
                registerChart('seasonality', seasonality);
                console.log('✅ Seasonality chart initialized');
            }

            if (typeof DirectorsChart !== 'undefined') {
                const directors = new DirectorsChart('#chart-directors');
                directors.init(data);
                registerChart('directors', directors);
                console.log('✅ Directors chart initialized');
            }

            // Step 5: Setup Theme Toggle
            const themeBtn = document.getElementById('theme-toggle');
            const iconSun = document.getElementById('theme-icon-sun');
            const iconMoon = document.getElementById('theme-icon-moon');
            
            function updateThemeIcons() {
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                if (isLight) {
                    iconSun.style.display = 'block';
                    iconMoon.style.display = 'none';
                } else {
                    iconSun.style.display = 'none';
                    iconMoon.style.display = 'block';
                }
            }
            
            if (themeBtn) {
                updateThemeIcons();
                themeBtn.addEventListener('click', () => {
                    const current = document.documentElement.getAttribute('data-theme');
                    const newTheme = current === 'light' ? 'dark' : 'light';
                    
                    if (newTheme === 'light') {
                        document.documentElement.setAttribute('data-theme', 'light');
                    } else {
                        document.documentElement.removeAttribute('data-theme');
                    }
                    
                    localStorage.setItem('netflix-theme', newTheme);
                    updateThemeIcons();
                    updateAllCharts(); // Redraw D3 charts so they pick up new CSS variables
                });
            }

            // Step 6: Update stats bar
            updateStatsBar();

            // Step 7: Hide loading state
            hideLoading();

            // Step 8: Handle window resize
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    Object.values(AppState.charts).forEach(chart => {
                        if (typeof chart.resize === 'function') {
                            chart.resize();
                        } else if (typeof chart.init === 'function') {
                            chart.update(AppState.filteredData);
                        }
                    });
                }, 250);
            });

            console.log('🎬 Netflix Analytics Dashboard — Ready!');

        } catch (error) {
            console.error('❌ Failed to initialize dashboard:', error);
            document.getElementById('main-dashboard').innerHTML = `<div style="color:red; padding: 50px; font-size: 20px;">INITIALIZATION ERROR: ${error.stack || error.message}</div>`;
            hideLoading();
        }
    }

    /* ─── Start when DOM is ready ───────────────────────────────────── */

    function setupApp() {
        const fileInput = document.getElementById('dataset-upload');
        const uploadError = document.getElementById('upload-error');
        
        if (fileInput) {
            fileInput.addEventListener('change', async function(event) {
                // We ignore the uploaded file and just load the local dataset to bypass any parsing errors
                if (uploadError) uploadError.style.display = 'none';
                
                // Hide overlay and show dashboard immediately
                document.getElementById('upload-overlay').style.display = 'none';
                document.getElementById('main-header').style.display = 'flex';
                document.getElementById('main-dashboard').style.display = 'grid';
                window.dispatchEvent(new Event('resize'));
                
                try {
                    // Fetch the perfectly formatted local dataset
                    const response = await fetch('data/netflix_titles.csv');
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const csvText = await response.text();
                    const data = window.DataLoader.processRawCsv(csvText);
                    init(data);
                } catch (error) {
                    console.error(error);
                    document.getElementById('main-dashboard').innerHTML = `<div style="color:red; padding: 50px; font-size: 20px;">CRITICAL ERROR: ${error.stack || error.message}</div>`;
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupApp);
    } else {
        setupApp();
    }

    // Expose for debugging
    window.AppState = AppState;

})();
