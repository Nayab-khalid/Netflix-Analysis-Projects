/* ============================================================
   Netflix Content Analytics Dashboard — Data Loader
   ============================================================
   Loads netflix_titles.csv via D3, preprocesses every row, and
   exposes aggregation helpers consumed by each chart module.
   ============================================================ */

(function () {
  'use strict';

  const { parseNetflixDate, RATING_ORDER } = window.NetflixUtils;

  /* ── Valid ratings set (for cleaning) ─────────────────────── */
  const VALID_RATINGS = new Set(RATING_ORDER);

  /* ── Main Loader ─────────────────────────────────────────── */

  /**
   * Process and clean the uploaded Netflix dataset CSV string.
   * Filters out rows with no date_added.
   *
   * @param {string} csvText - The raw CSV content
   * @returns {Array<Object>} cleaned data array
   */
  function processRawCsv(csvText) {
    // Strip BOM if present
    let cleanText = csvText.replace(/^\uFEFF/, '');
    
    // Auto-detect delimiter based on first line
    const firstLine = cleanText.split(/[\r\n]+/)[0];
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    
    let raw;
    if (semicolons > commas) {
      raw = d3.dsvFormat(';').parse(cleanText);
    } else {
      raw = d3.csvParse(cleanText);
    }
    
    if (!raw || raw.length === 0) {
      throw new Error(`D3 failed to parse CSV. Detected semicolons: ${semicolons}, commas: ${commas}. Text length: ${cleanText.length}`);
    }

    const cleaned = [];

    for (const row of raw) {
      // Handle potential column name variations (lowercase, whitespace)
      const getVal = (key) => {
          if (row[key] !== undefined) return row[key];
          const lowerKey = key.toLowerCase();
          const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerKey.replace(/[^a-z0-9]/g, ''));
          return found ? row[found] : '';
      };

      const dateAddedStr = getVal('date_added');
      const typeStr = getVal('type');
      const durationStrRaw = getVal('duration');
      const listedInStr = getVal('listed_in');
      const countryStr = getVal('country');
      const ratingStr = getVal('rating');

      /* ─ Parse date_added ─ */
      let dateAdded = parseNetflixDate(dateAddedStr);
      if (!dateAdded) {
          // If date_added is missing or completely unparsable, use a fallback
          // based on release_year or default to 2020 so we don't drop the row entirely!
          const releaseYr = +(getVal('release_year'));
          const yr = (!isNaN(releaseYr) && releaseYr > 1900) ? releaseYr : 2020;
          dateAdded = new Date(yr, 0, 1);
      }

      const yearAdded  = dateAdded.getFullYear();
      const monthAdded = dateAdded.getMonth() + 1; // 1-12

      /* ─ Parse duration ─ */
      let durationNum = null;
      const durStr = (durationStrRaw || '').trim();
      if (typeStr === 'Movie') {
        const match = durStr.match(/^(\d+)\s*min/i);
        durationNum = match ? parseInt(match[1], 10) : null;
      } else if (typeStr === 'TV Show' || typeStr === 'TV Show') {
        const match = durStr.match(/^(\d+)\s*Season/i);
        durationNum = match ? parseInt(match[1], 10) : null;
      }

      /* ─ Split listed_in → genres array ─ */
      const genres = listedInStr
        ? listedInStr.split(',').map(function (g) { return g.trim(); }).filter(Boolean)
        : [];

      /* ─ Split country → countries array ─ */
      const countries = countryStr
        ? countryStr.split(',').map(function (c) { return c.trim(); }).filter(Boolean)
        : [];
      const primaryCountry = countries.length > 0 ? countries[0] : 'Unknown';

      /* ─ Clean rating ─ */
      let rating = (ratingStr || '').trim();
      if (!rating || !VALID_RATINGS.has(rating)) {
        rating = 'NR';
      }

      /* ─ Build cleaned record ─ */
      cleaned.push({
        show_id:         getVal('show_id'),
        type:            typeStr,
        title:           getVal('title'),
        director:        getVal('director'),
        cast:            getVal('cast'),
        country:         countryStr,
        date_added:      dateAdded,
        release_year:    +(getVal('release_year')),
        rating:          rating,
        duration:        durStr,
        duration_num:    durationNum,
        listed_in:       listedInStr,
        description:     getVal('description'),
        year_added:      yearAdded,
        month_added:     monthAdded,
        genres:          genres,
        countries:       countries,
        primary_country: primaryCountry,
      });
    }

    if (cleaned.length === 0) {
        throw new Error(`Parsed ${raw.length} rows, but all were dropped. First row keys: ${Object.keys(raw[0]).join(', ')}`);
    }

    return cleaned;
  }

  /* ── Helper: Year Range ──────────────────────────────────── */

  /**
   * @param {Array} data – cleaned dataset
   * @returns {[number, number]} [minYear, maxYear]
   */
  function getYearRange(data) {
    let min = Infinity;
    let max = -Infinity;
    for (const d of data) {
      if (d.year_added < min) min = d.year_added;
      if (d.year_added > max) max = d.year_added;
    }
    return [min, max];
  }

  /* ── Helper: Unique Countries (primary) ──────────────────── */

  /**
   * @param {Array} data
   * @returns {string[]} sorted unique primary countries
   */
  function getUniqueCountries(data) {
    const set = new Set();
    for (const d of data) {
      if (d.primary_country && d.primary_country !== 'Unknown') {
        set.add(d.primary_country);
      }
    }
    return Array.from(set).sort();
  }

  /* ── Helper: Unique Genres ───────────────────────────────── */

  /**
   * @param {Array} data
   * @returns {string[]} sorted unique genres
   */
  function getUniqueGenres(data) {
    const set = new Set();
    for (const d of data) {
      for (const g of d.genres) {
        set.add(g);
      }
    }
    return Array.from(set).sort();
  }

  /* ── Helper: Unique Ratings (in RATING_ORDER) ────────────── */

  /**
   * Returns ratings present in data, sorted by RATING_ORDER.
   * @param {Array} data
   * @returns {string[]}
   */
  function getUniqueRatings(data) {
    const set = new Set();
    for (const d of data) {
      set.add(d.rating);
    }
    return RATING_ORDER.filter(function (r) { return set.has(r); });
  }

  /* ── Aggregation: By Year (for timeline stacked area) ────── */

  /**
   * Returns an array of { year, Movie, 'TV Show' } objects,
   * sorted by year ascending.
   *
   * @param {Array} data
   * @returns {Array<{year:number, Movie:number, 'TV Show':number}>}
   */
  function aggregateByYear(data) {
    const map = new Map();

    for (const d of data) {
      const y = d.year_added;
      if (!map.has(y)) {
        map.set(y, { year: y, Movie: 0, 'TV Show': 0 });
      }
      const entry = map.get(y);
      if (d.type === 'Movie') {
        entry.Movie += 1;
      } else if (d.type === 'TV Show') {
        entry['TV Show'] += 1;
      }
    }

    return Array.from(map.values()).sort(function (a, b) { return a.year - b.year; });
  }

  /* ── Aggregation: By Country ─────────────────────────────── */

  /**
   * Returns a Map of country → count.
   * Counts each country in the countries array (not just primary).
   *
   * @param {Array} data
   * @returns {Map<string, number>}
   */
  function aggregateByCountry(data) {
    const map = new Map();
    for (const d of data) {
      for (const c of d.countries) {
        if (!c) continue;
        map.set(c, (map.get(c) || 0) + 1);
      }
    }
    return map;
  }

  /* ── Aggregation: By Genre ───────────────────────────────── */

  /**
   * Returns an array of { genre, count }, sorted descending by count.
   *
   * @param {Array} data
   * @returns {Array<{genre:string, count:number}>}
   */
  function aggregateByGenre(data) {
    const map = new Map();
    for (const d of data) {
      for (const g of d.genres) {
        map.set(g, (map.get(g) || 0) + 1);
      }
    }

    const arr = [];
    for (const [genre, count] of map) {
      arr.push({ genre, count });
    }

    arr.sort(function (a, b) { return b.count - a.count; });
    return arr;
  }

  /* ── Aggregation: By Rating ──────────────────────────────── */

  /**
   * Returns an array of { rating, Movie, 'TV Show' },
   * ordered by RATING_ORDER.
   *
   * @param {Array} data
   * @returns {Array<{rating:string, Movie:number, 'TV Show':number}>}
   */
  function aggregateByRating(data) {
    const map = new Map();

    for (const d of data) {
      const r = d.rating;
      if (!map.has(r)) {
        map.set(r, { rating: r, Movie: 0, 'TV Show': 0 });
      }
      const entry = map.get(r);
      if (d.type === 'Movie') {
        entry.Movie += 1;
      } else if (d.type === 'TV Show') {
        entry['TV Show'] += 1;
      }
    }

    // Sort by RATING_ORDER
    const orderIndex = new Map();
    RATING_ORDER.forEach(function (r, i) { orderIndex.set(r, i); });

    return Array.from(map.values()).sort(function (a, b) {
      const ia = orderIndex.has(a.rating) ? orderIndex.get(a.rating) : 999;
      const ib = orderIndex.has(b.rating) ? orderIndex.get(b.rating) : 999;
      return ia - ib;
    });
  }

  /* ── Aggregation: By Month (for Seasonality) ─────────────── */

  /**
   * Returns an array of 12 elements (Jan-Dec) with counts.
   */
  function aggregateByMonth(data) {
    // month_added is 1-12
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const arr = months.map(function(m, i) { return { month: m, monthNum: i + 1, count: 0 }; });
    
    for (const d of data) {
      if (d.month_added >= 1 && d.month_added <= 12) {
        arr[d.month_added - 1].count += 1;
      }
    }
    return arr;
  }

  /* ── Aggregation: By Director (for Lollipop) ─────────────── */

  /**
   * Returns top N directors.
   */
  function aggregateByDirector(data, topN = 10) {
    const map = new Map();
    for (const d of data) {
      if (!d.director || d.director === 'Unknown') continue;
      // Some titles have multiple directors separated by comma
      const dirs = d.director.split(',').map(function(x) { return x.trim(); }).filter(Boolean);
      for (const dir of dirs) {
        map.set(dir, (map.get(dir) || 0) + 1);
      }
    }
    const arr = [];
    for (const [director, count] of map) {
      arr.push({ director, count });
    }
    arr.sort(function(a, b) { return b.count - a.count; });
    return arr.slice(0, topN);
  }

  /* ── Export ──────────────────────────────────────────────── */

  window.DataLoader = {
    processRawCsv: processRawCsv,
    getYearRange,
    getUniqueCountries,
    getUniqueGenres,
    getUniqueRatings,
    aggregateByYear,
    aggregateByCountry,
    aggregateByGenre,
    aggregateByRating,
    aggregateByMonth,
    aggregateByDirector
  };
})();
