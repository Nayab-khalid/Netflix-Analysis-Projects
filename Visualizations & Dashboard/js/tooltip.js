/* ============================================================
   Netflix Content Analytics Dashboard — Shared Tooltip
   ============================================================
   Creates a single #tooltip element and exposes show / hide / move
   methods. Positions intelligently to stay within the viewport.
   ============================================================ */

(function () {
  'use strict';

  /* ── Constants ───────────────────────────────────────────── */
  const OFFSET_X = 16;   // horizontal gap from cursor
  const OFFSET_Y = 16;   // vertical gap from cursor
  const VIEWPORT_PAD = 12; // minimum distance from viewport edge

  /* ── Create Tooltip Element ──────────────────────────────── */
  let tooltipEl = document.getElementById('tooltip');

  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tooltipEl);
  }

  /* ── Position Calculator ─────────────────────────────────── */

  /**
   * Compute left/top so the tooltip stays fully within the viewport.
   * Flips horizontally or vertically when near an edge.
   *
   * @param {MouseEvent} event
   */
  function positionTooltip(event) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = tooltipEl.getBoundingClientRect();
    const tw = rect.width;
    const th = rect.height;

    let x = event.clientX + OFFSET_X;
    let y = event.clientY + OFFSET_Y;

    // Flip right → left if overflowing right edge
    if (x + tw + VIEWPORT_PAD > vw) {
      x = event.clientX - tw - OFFSET_X;
    }

    // Clamp to left edge
    if (x < VIEWPORT_PAD) {
      x = VIEWPORT_PAD;
    }

    // Flip below → above if overflowing bottom edge
    if (y + th + VIEWPORT_PAD > vh) {
      y = event.clientY - th - OFFSET_Y;
    }

    // Clamp to top edge
    if (y < VIEWPORT_PAD) {
      y = VIEWPORT_PAD;
    }

    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top  = y + 'px';
  }

  /* ── Public API ──────────────────────────────────────────── */

  /**
   * Show the tooltip with the given HTML content, positioned
   * near the mouse event.
   *
   * @param {string}     html  – innerHTML for the tooltip
   * @param {MouseEvent} event – mouse event for positioning
   */
  function show(html, event) {
    tooltipEl.innerHTML = html;
    tooltipEl.setAttribute('aria-hidden', 'false');

    // Make visible (opacity handled by CSS class)
    tooltipEl.classList.add('visible');

    // Position after content is set so dimensions are correct.
    // Use requestAnimationFrame to let the browser lay out first.
    if (event) {
      // Set initial position immediately so there's no flicker
      positionTooltip(event);

      // Re-position after layout in case content caused a resize
      requestAnimationFrame(() => positionTooltip(event));
    }
  }

  /**
   * Hide the tooltip.
   */
  function hide() {
    tooltipEl.classList.remove('visible');
    tooltipEl.setAttribute('aria-hidden', 'true');
  }

  /**
   * Update the tooltip position as the mouse moves.
   * Call this from a mousemove handler.
   *
   * @param {MouseEvent} event
   */
  function move(event) {
    positionTooltip(event);
  }

  /* ── Export ──────────────────────────────────────────────── */

  window.Tooltip = {
    show,
    hide,
    move,
  };
})();
