/* ============================================================
   Netflix Content Analytics Dashboard — Utilities
   ============================================================ */

(function () {
  'use strict';

  /* ── Genre Colors ────────────────────────────────────────
     Curated palette: vibrant, high contrast on dark backgrounds,
     harmonious when displayed together in treemaps / legends.
  ──────────────────────────────────────────────────────────── */
  const GENRE_COLORS = new Map([
    ['International Movies',        '#E50914'],
    ['International TV Shows',      '#ff4d58'],
    ['Dramas',                      '#00b4d8'],
    ['Comedies',                    '#f5a623'],
    ['Action & Adventure',          '#ff6b35'],
    ['Documentaries',               '#46d369'],
    ['Children & Family Movies',    '#ffd166'],
    ['Romantic Movies',             '#ff79c6'],
    ['Romantic TV Shows',           '#f472b6'],
    ['Horror Movies',               '#9b2335'],
    ['Thrillers',                   '#a855f7'],
    ['Stand-Up Comedy',             '#fbbf24'],
    ['TV Dramas',                   '#38bdf8'],
    ['TV Comedies',                 '#fb923c'],
    ['TV Action & Adventure',       '#ef4444'],
    ['Crime TV Shows',              '#8b5cf6'],
    ['Kids\' TV',                   '#4ade80'],
    ['Sci-Fi & Fantasy',            '#22d3ee'],
    ['Music & Musicals',            '#c084fc'],
    ['Anime Features',              '#f43f5e'],
    ['Anime Series',                '#fb7185'],
    ['Docuseries',                  '#34d399'],
    ['Reality TV',                  '#fca5a5'],
    ['Independent Movies',          '#67e8f9'],
    ['Classic Movies',              '#d4a574'],
    ['British TV Shows',            '#93c5fd'],
    ['Spanish-Language TV Shows',   '#fdba74'],
    ['Korean TV Shows',             '#a78bfa'],
    ['Teen TV Shows',               '#f9a8d4'],
    ['Stand-Up Comedy & Talk Shows','#fde68a'],
    ['Faith & Spirituality',        '#86efac'],
    ['LGBTQ Movies',                '#e879f9'],
    ['Sports Movies',               '#6ee7b7'],
    ['Science & Nature TV',         '#5eead4'],
    ['TV Mysteries',                '#c4b5fd'],
    ['TV Sci-Fi & Fantasy',         '#7dd3fc'],
    ['TV Horror',                   '#fca5a5'],
    ['TV Thrillers',                '#d8b4fe'],
    ['Classic & Cult TV',           '#fcd34d'],
    ['Movies',                      '#60a5fa'],
    ['TV Shows',                    '#a78bfa'],
  ]);

  /* ── Type Colors ─────────────────────────────────────────── */
  const TYPE_COLORS = {
    Movie:    '#E50914',
    'TV Show': '#46d369',
  };

  /* ── Rating Order (child-safe → mature) ──────────────────── */
  const RATING_ORDER = [
    'TV-Y',
    'TV-Y7',
    'TV-Y7-FV',
    'TV-G',
    'G',
    'TV-PG',
    'PG',
    'PG-13',
    'TV-14',
    'R',
    'TV-MA',
    'NC-17',
    'NR',
    'UR',
  ];

  /* ── Rating Colors (green → yellow → red gradient) ───────── */
  const RATING_COLORS = new Map([
    ['TV-Y',     '#4ade80'],
    ['TV-Y7',    '#86efac'],
    ['TV-Y7-FV', '#a3e635'],
    ['TV-G',     '#34d399'],
    ['G',        '#22c55e'],
    ['TV-PG',    '#fbbf24'],
    ['PG',       '#f59e0b'],
    ['PG-13',    '#f97316'],
    ['TV-14',    '#fb923c'],
    ['R',        '#ef4444'],
    ['TV-MA',    '#dc2626'],
    ['NC-17',    '#b91c1c'],
    ['NR',       '#6b7280'],
    ['UR',       '#9ca3af'],
  ]);

  /* ── Formatting Helpers ──────────────────────────────────── */

  /**
   * Format a number with locale-aware comma separators.
   * @param {number} n
   * @returns {string}
   */
  function formatNumber(n) {
    if (n == null || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-US');
  }

  /**
   * Return a formatted percentage string (1 decimal place).
   * @param {number} n   – numerator
   * @param {number} total – denominator
   * @returns {string}    e.g. "42.7%"
   */
  function formatPercent(n, total) {
    if (!total || total === 0) return '0%';
    return ((n / total) * 100).toFixed(1) + '%';
  }

  /* ── Date Parser ─────────────────────────────────────────── */

  const MONTH_MAP = {
    January: 0, February: 1, March: 2, April: 3,
    May: 4, June: 5, July: 6, August: 7,
    September: 8, October: 9, November: 10, December: 11,
  };

  /**
   * Parse Netflix date format "September 25, 2021" → Date object.
   * Falls back to standard Date parsing if custom regex fails.
   * Returns null for empty / unparsable strings.
   * @param {string} str
   * @returns {Date|null}
   */
  function parseNetflixDate(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (trimmed === '') return null;

    // Expected format: "Month Day, Year"
    const parts = trimmed.match(/^(\w+)\s+(\d{1,2}),\s*(\d{4})$/);
    if (parts) {
      const month = MONTH_MAP[parts[1]];
      if (month !== undefined) {
        const day = parseInt(parts[2], 10);
        const year = parseInt(parts[3], 10);
        return new Date(year, month, day);
      }
    }
    
    // Fallback to standard JS parsing (handles Excel formats like m/d/yyyy)
    const fallbackDate = new Date(trimmed);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }

    // Fallback for DD/MM/YYYY (European format exported by Excel)
    const eurMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (eurMatch) {
      const day = parseInt(eurMatch[1], 10);
      const month = parseInt(eurMatch[2], 10) - 1; // 0-based month
      const year = parseInt(eurMatch[3], 10);
      
      // If the first part is > 12, it must be DD/MM.
      // If it's a valid date, we'll return it.
      const eurDate = new Date(year, month, day);
      if (!isNaN(eurDate.getTime())) {
        return eurDate;
      }
    }

    return null;
  }

  /* ── Text Helpers ────────────────────────────────────────── */

  /**
   * Truncate a string to maxLen characters, appending '…' if trimmed.
   * @param {string} str
   * @param {number} maxLen
   * @returns {string}
   */
  function truncateText(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1).trimEnd() + '…';
  }

  /* ── Debounce ────────────────────────────────────────────── */

  /**
   * Standard debounce: delays invoking fn until after `delay` ms
   * of silence since the last call.
   * @param {Function} fn
   * @param {number}   delay – milliseconds
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /* ── Export ──────────────────────────────────────────────── */

  window.NetflixUtils = {
    GENRE_COLORS,
    TYPE_COLORS,
    RATING_ORDER,
    RATING_COLORS,
    formatNumber,
    formatPercent,
    parseNetflixDate,
    truncateText,
    debounce,
  };
})();
