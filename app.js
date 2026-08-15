/* ============================================================================
   Marketing Budget Dashboard — behaviour
   No dependencies, no build step. Reads DASHBOARD_DATA from data.js.
   ========================================================================= */
(function () {
  'use strict';

  var D    = window.DASHBOARD_DATA;
  var meta = D.meta;

  /* -- Formatting --------------------------------------------------------- */

  var money = new Intl.NumberFormat(meta.locale, {
    style: 'currency', currency: meta.currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });

  var moneyShort = new Intl.NumberFormat(meta.locale, {
    style: 'currency', currency: meta.currency,
    notation: 'compact', maximumFractionDigits: 1
  });

  function fmt(n)      { return money.format(Math.round(n)); }
  function fmtShort(n) { return moneyShort.format(n); }
  function fmtSigned(n) {
    return (n >= 0 ? '+' : '−') + fmt(Math.abs(n));
  }
  function pct(n, dp) {
    return n.toFixed(dp === undefined ? 1 : dp) + '%';
  }

  /* -- Derived figures ----------------------------------------------------- */

  var channels = D.channels.map(function (c) {
    var remaining = c.budget - c.spent;
    return {
      name: c.name,
      budget: c.budget,
      spent: c.spent,
      remaining: remaining,
      used: c.budget > 0 ? (c.spent / c.budget) * 100 : 0,
      over: remaining < 0
    };
  });

  function sum(arr, key) {
    return arr.reduce(function (t, x) { return t + (x[key] || 0); }, 0);
  }

  var totalBudget = sum(channels, 'budget');
  var totalSpent  = sum(channels, 'spent');
  var totalLeft   = totalBudget - totalSpent;
  var totalUsed   = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Cumulative series for the pacing chart.
  var cumBudget = [], cumSpent = [], runB = 0, runS = 0, spendEnds = -1;
  D.months.forEach(function (m, i) {
    runB += m.budget || 0;
    cumBudget.push(runB);
    if (m.spent === null || m.spent === undefined) {
      cumSpent.push(null);
    } else {
      runS += m.spent;
      cumSpent.push(runS);
      spendEnds = i;
    }
  });

  var monthBudgetTotal = runB;
  var monthSpentTotal  = runS;

  /* Expected spend by now, phased against the monthly budget rather than a
     flat run rate — a seasonal budget makes "elapsed time × total" wrong. */
  var elapsed  = Math.max(0, Math.min(meta.periodElapsed, meta.periodTotal));
  var whole    = Math.floor(elapsed);
  var fraction = elapsed - whole;
  var expectedSpend = 0;
  for (var i = 0; i < whole && i < D.months.length; i++) {
    expectedSpend += D.months[i].budget || 0;
  }
  if (fraction > 0 && whole < D.months.length) {
    expectedSpend += (D.months[whole].budget || 0) * fraction;
  }
  var expectedPct = totalBudget > 0 ? (expectedSpend / totalBudget) * 100 : 0;
  var variance    = totalSpent - expectedSpend;
  var variancePct = expectedSpend > 0 ? (variance / expectedSpend) * 100 : 0;

  /* -- Small helpers ------------------------------------------------------- */

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function css(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
  }

  /* -- Header and notices --------------------------------------------------- */

  el('period-label').textContent = meta.periodLabel;
  el('as-of-label').textContent  = meta.asOfLabel;

  if (meta.isPlaceholder) el('placeholder-notice').hidden = false;

  // Sanity check: monthly figures should reconcile to the channel figures.
  var mismatches = [];
  if (Math.round(monthBudgetTotal) !== Math.round(totalBudget)) {
    mismatches.push('budgets (' + fmt(monthBudgetTotal) + ' by month vs ' +
                    fmt(totalBudget) + ' by channel)');
  }
  if (Math.round(monthSpentTotal) !== Math.round(totalSpent)) {
    mismatches.push('spend (' + fmt(monthSpentTotal) + ' by month vs ' +
                    fmt(totalSpent) + ' by channel)');
  }
  if (mismatches.length) {
    el('reconcile-notice').hidden = false;
    el('reconcile-text').innerHTML =
      '<strong>Figures do not reconcile.</strong> The monthly and channel ' +
      'breakdowns in <code>data.js</code> disagree on ' +
      esc(mismatches.join(' and ')) +
      '. The headline numbers below are taken from the channel figures.';
  }

  /* -- Headline ------------------------------------------------------------- */

  el('hero-figure').textContent = pct(totalUsed);
  el('hero-sub').textContent =
    fmt(totalSpent) + ' spent of a ' + fmt(totalBudget) + ' budget · ' +
    (totalLeft >= 0 ? fmt(totalLeft) + ' left' : fmt(-totalLeft) + ' overspent');

  var ahead = variance > 0;
  var verdictColour = Math.abs(variancePct) < 5
    ? css('--status-good')
    : (ahead ? css('--status-warning') : css('--status-good'));

  el('hero-verdict').innerHTML =
    '<span class="dot" style="background:' + verdictColour + '"></span>' +
    (Math.abs(variancePct) < 0.05
      ? 'On plan for this point in the year'
      : (ahead ? 'Ahead of plan by ' : 'Behind plan by ') +
        fmt(Math.abs(variance)) + ' (' + pct(Math.abs(variancePct)) + ')');

  var fillPct = Math.max(0, Math.min(totalUsed, 100));
  var overall = el('overall-fill');
  overall.style.width = fillPct + '%';
  if (totalUsed >= 100) overall.classList.add('is-full');
  if (totalUsed > 100)  overall.classList.add('is-over');

  var gap = el('overall-gap');
  if (fillPct <= 0 || fillPct >= 100) {
    gap.hidden = true;
  } else {
    gap.style.left = 'calc(' + fillPct + '% - 1px)';
  }

  var pacePos = Math.max(0, Math.min(expectedPct, 100));
  el('overall-pace').style.left = 'calc(' + pacePos + '% - 1px)';

  var paceNote = el('pace-note');
  paceNote.textContent = 'Planned by now: ' + pct(expectedPct, 0);
  paceNote.style.left = pacePos + '%';
  paceNote.style.transform =
    pacePos < 12 ? 'none' : (pacePos > 88 ? 'translateX(-100%)' : 'translateX(-50%)');

  /* -- KPI row -------------------------------------------------------------- */

  var overspentChannels = channels.filter(function (c) { return c.over; });

  var kpis = [
    {
      label: 'Total budget',
      value: fmt(totalBudget),
      note: meta.periodLabel,
      key: null
    },
    {
      label: 'Spent to date',
      value: fmt(totalSpent),
      note: pct(totalUsed) + ' of budget',
      key: 'var(--series-spent)'
    },
    {
      label: totalLeft >= 0 ? 'Remaining' : 'Overspent',
      value: fmt(Math.abs(totalLeft)),
      note: pct(Math.abs(100 - totalUsed)) + (totalLeft >= 0 ? ' of budget unspent' : ' over budget'),
      key: totalLeft >= 0 ? 'var(--track)' : 'var(--status-critical)'
    },
    {
      label: 'Against plan',
      value: fmtSigned(variance),
      note: 'vs ' + fmt(expectedSpend) + ' planned by now',
      key: null
    }
  ];

  el('kpi-row').innerHTML = kpis.map(function (k) {
    return '<div class="kpi">' +
      '<div class="kpi-label">' +
        (k.key ? '<span class="kpi-key" style="background:' + k.key + '"></span>' : '') +
        esc(k.label) +
      '</div>' +
      '<div class="kpi-value">' + esc(k.value) + '</div>' +
      '<div class="kpi-note">' + esc(k.note) + '</div>' +
    '</div>';
  }).join('');

  /* -- Channel rows --------------------------------------------------------- */

  var sorted = channels.slice().sort(function (a, b) { return b.budget - a.budget; });

  el('channels-sub').textContent =
    "Each bar is one channel's own budget. The filled part is spent, the " +
    'remainder is what is left to commit. ' +
    (overspentChannels.length
      ? overspentChannels.length + (overspentChannels.length === 1
          ? ' channel has gone over: ' : ' channels have gone over: ') +
        overspentChannels.map(function (c) { return c.name; }).join(', ') + '.'
      : 'No channel has gone over its budget.');

  el('channel-grid').innerHTML = sorted.map(function (c) {
    var w   = Math.max(0, Math.min(c.used, 100));
    var cls = 'meter-fill' +
              (c.used >= 100 ? ' is-full' : '') +
              (c.over ? ' is-over' : '');

    var flag = c.over
      ? '<span class="flag"><span class="dot" style="background:var(--status-critical)"></span>' +
        'Over by ' + esc(fmt(-c.remaining)) + '</span>'
      : '';

    var tail = c.over
      ? 'Budget ' + esc(fmt(c.budget))
      : esc(fmt(c.remaining)) + ' left of ' + esc(fmt(c.budget));

    return '<div class="channel">' +
      '<div class="channel-top">' +
        '<span class="channel-name">' + esc(c.name) + flag + '</span>' +
        '<span class="channel-pct">' + esc(pct(c.used)) + '</span>' +
      '</div>' +
      '<div class="meter meter-sm">' +
        '<div class="' + cls + '" style="width:' + w + '%"></div>' +
        (w > 0 && w < 100
          ? '<div class="meter-gap" style="left:calc(' + w + '% - 1px)"></div>'
          : '') +
      '</div>' +
      '<div class="channel-foot">' +
        esc(fmt(c.spent)) + ' spent' +
        '<span class="sep">·</span>' + tail +
      '</div>' +
    '</div>';
  }).join('');

  /* -- Pacing chart --------------------------------------------------------- */

  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function niceStep(range, target) {
    var raw  = range / target;
    var mag  = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  }

  var host    = el('pacing-host');
  var tooltip = el('pacing-tooltip');
  var geom    = null;          // last-drawn geometry, for the hover layer
  var hoverIx = -1;

  function drawChart() {
    var width = host.clientWidth;
    if (!width) return;

    var height = width < 560 ? 260 : 320;
    var pad = { top: 16, right: width < 560 ? 20 : 92, bottom: 34, left: width < 560 ? 52 : 68 };
    var plotW = Math.max(10, width - pad.left - pad.right);
    var plotH = height - pad.top - pad.bottom;

    var maxVal = Math.max(cumBudget[cumBudget.length - 1] || 0, runS);
    var step   = niceStep(maxVal || 1, 5);
    var yMax   = Math.ceil((maxVal || 1) / step) * step;

    var n = D.months.length;
    var x = function (i) { return pad.left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1)); };
    var y = function (v) { return pad.top + plotH - (plotH * v) / yMax; };

    var old = host.querySelector('svg');
    if (old) old.remove();

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + width + ' ' + height,
      height: height,
      role: 'img',
      'aria-label':
        'Cumulative marketing spend against cumulative budget across ' +
        n + ' ' + meta.periodUnit + '. Full figures are in the table below.'
    });

    var ink   = css('--text-muted');
    var grid  = css('--gridline');
    var base  = css('--baseline');
    var cSpent  = css('--series-spent');
    var cBudget = css('--series-budget');
    var surf    = css('--surface-1');

    // Gridlines and y-axis ticks — solid hairlines, one step off the surface.
    for (var v = 0; v <= yMax + 0.5; v += step) {
      var yy = y(v);
      svg.appendChild(svgEl('line', {
        x1: pad.left, x2: pad.left + plotW, y1: yy, y2: yy,
        stroke: v === 0 ? base : grid, 'stroke-width': 1
      }));
      var t = svgEl('text', {
        x: pad.left - 10, y: yy + 4,
        'text-anchor': 'end', fill: ink,
        'font-size': 11, 'font-variant-numeric': 'tabular-nums'
      });
      t.textContent = fmtShort(v);
      svg.appendChild(t);
    }

    // X-axis labels — thinned out on narrow screens.
    var everyOther = plotW / n < 34;
    D.months.forEach(function (m, i) {
      if (everyOther && i % 2 !== 0 && i !== n - 1) return;
      var t = svgEl('text', {
        x: x(i), y: pad.top + plotH + 20,
        'text-anchor': 'middle', fill: ink, 'font-size': 11
      });
      t.textContent = m.name;
      svg.appendChild(t);
    });

    function path(values) {
      var d = '', started = false;
      values.forEach(function (v, i) {
        if (v === null) return;
        d += (started ? ' L' : 'M') + x(i) + ' ' + y(v);
        started = true;
      });
      return d;
    }

    svg.appendChild(svgEl('path', {
      d: path(cumBudget), fill: 'none', stroke: cBudget,
      'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));
    svg.appendChild(svgEl('path', {
      d: path(cumSpent), fill: 'none', stroke: cSpent,
      'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));

    // End markers — 8px dots with a 2px surface ring so they stay legible
    // where the two lines cross.
    function endDot(ix, val, colour) {
      if (ix < 0) return;
      svg.appendChild(svgEl('circle', {
        cx: x(ix), cy: y(val), r: 4,
        fill: colour, stroke: surf, 'stroke-width': 2
      }));
    }
    endDot(n - 1, cumBudget[n - 1], cBudget);
    endDot(spendEnds, cumSpent[spendEnds], cSpent);

    // Direct labels — endpoints only. Text wears an ink token, never the
    // series colour; the dot beside it carries identity.
    if (pad.right > 60) {
      var bl = svgEl('text', {
        x: x(n - 1) + 12, y: y(cumBudget[n - 1]) + 4,
        fill: css('--text-secondary'), 'font-size': 12
      });
      bl.textContent = fmtShort(cumBudget[n - 1]);
      svg.appendChild(bl);
    }
    // The spend line ends mid-plot, so its label has no free margin to sit in.
    // Below ~560px there is not enough room to place it clear of the budget
    // line — drop it and let the tooltip and the table carry the value.
    if (spendEnds >= 0 && width >= 560) {
      var sv = cumSpent[spendEnds];
      var above = sv >= (cumBudget[spendEnds] || 0);
      var sl = svgEl('text', {
        x: x(spendEnds), y: y(sv) + (above ? -14 : 22),
        'text-anchor': 'middle',
        fill: css('--text-secondary'), 'font-size': 12
      });
      sl.textContent = fmtShort(sv) + ' spent';
      svg.appendChild(sl);
    }

    // Hover layer: crosshair plus one generous hit band per month.
    var crosshair = svgEl('line', {
      y1: pad.top, y2: pad.top + plotH,
      stroke: base, 'stroke-width': 1, opacity: 0
    });
    svg.appendChild(crosshair);

    var focusDots = [
      svgEl('circle', { r: 4, fill: cSpent,  stroke: surf, 'stroke-width': 2, opacity: 0 }),
      svgEl('circle', { r: 4, fill: cBudget, stroke: surf, 'stroke-width': 2, opacity: 0 })
    ];
    focusDots.forEach(function (d) { svg.appendChild(d); });

    var band = plotW / Math.max(1, n - 1);
    D.months.forEach(function (m, i) {
      var hit = svgEl('rect', {
        x: x(i) - band / 2, y: 0,
        width: Math.max(24, band), height: height,
        fill: 'transparent'
      });
      hit.addEventListener('pointerenter', function () { showAt(i); });
      svg.appendChild(hit);
    });

    svg.addEventListener('pointerleave', hide);

    geom = { x: x, y: y, crosshair: crosshair, dots: focusDots, width: width, height: height };
    host.insertBefore(svg, tooltip);

    if (hoverIx >= 0) showAt(hoverIx);
  }

  function showAt(i) {
    if (!geom) return;
    hoverIx = i;
    var m = D.months[i];
    var s = cumSpent[i], b = cumBudget[i];

    geom.crosshair.setAttribute('x1', geom.x(i));
    geom.crosshair.setAttribute('x2', geom.x(i));
    geom.crosshair.setAttribute('opacity', 1);

    if (s === null) {
      geom.dots[0].setAttribute('opacity', 0);
    } else {
      geom.dots[0].setAttribute('cx', geom.x(i));
      geom.dots[0].setAttribute('cy', geom.y(s));
      geom.dots[0].setAttribute('opacity', 1);
    }
    geom.dots[1].setAttribute('cx', geom.x(i));
    geom.dots[1].setAttribute('cy', geom.y(b));
    geom.dots[1].setAttribute('opacity', 1);

    var rows =
      '<div class="tooltip-row">' +
        '<span class="k" style="background:var(--series-spent)"></span>Spent' +
        '<span class="n">' + (s === null ? '—' : esc(fmt(s))) + '</span></div>' +
      '<div class="tooltip-row">' +
        '<span class="k" style="background:var(--series-budget)"></span>Budget' +
        '<span class="n">' + esc(fmt(b)) + '</span></div>';

    if (s !== null) {
      rows += '<div class="tooltip-row"><span style="width:10px"></span>Difference' +
              '<span class="n">' + esc(fmtSigned(s - b)) + '</span></div>';
    }

    tooltip.innerHTML =
      '<div class="tooltip-title">' + esc(m.name) +
        (m.partial ? ' <span style="font-weight:400;color:var(--text-muted)">· part month</span>' : '') +
      '</div>' + rows;

    tooltip.classList.add('is-on');

    // Keep the tooltip inside the card.
    var tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    var left = geom.x(i) + 14;
    if (left + tw > geom.width) left = geom.x(i) - tw - 14;
    tooltip.style.left = Math.max(0, left) + 'px';
    tooltip.style.top  = Math.max(0, Math.min(geom.y(b) - th / 2, geom.height - th)) + 'px';
  }

  function hide() {
    hoverIx = -1;
    if (!geom) return;
    tooltip.classList.remove('is-on');
    geom.crosshair.setAttribute('opacity', 0);
    geom.dots.forEach(function (d) { d.setAttribute('opacity', 0); });
  }

  // Keyboard parity with hover.
  host.tabIndex = 0;
  host.setAttribute('aria-label', 'Pacing chart. Use the left and right arrow keys to step through the ' + meta.periodUnit + '.');
  host.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    var next = hoverIx < 0
      ? 0
      : hoverIx + (e.key === 'ArrowRight' ? 1 : -1);
    showAt(Math.max(0, Math.min(next, D.months.length - 1)));
  });
  host.addEventListener('blur', hide);

  drawChart();
  if (window.ResizeObserver) {
    new ResizeObserver(function () { drawChart(); }).observe(host);
  } else {
    window.addEventListener('resize', drawChart);
  }

  /* -- Tables --------------------------------------------------------------- */

  function buildChannelTable() {
    var rows = sorted.map(function (c) {
      return '<tr>' +
        '<td>' + esc(c.name) + '</td>' +
        '<td>' + esc(fmt(c.budget)) + '</td>' +
        '<td>' + esc(fmt(c.spent)) + '</td>' +
        '<td>' + (c.over ? '−' : '') + esc(fmt(Math.abs(c.remaining))) + '</td>' +
        '<td>' + esc(pct(c.used)) + '</td>' +
        '<td>' + (c.over ? 'Over budget' : 'Within budget') + '</td>' +
      '</tr>';
    }).join('');

    el('channel-table').innerHTML =
      '<caption>Budget and spend by channel</caption>' +
      '<thead><tr><th scope="col">Channel</th><th scope="col">Budget</th>' +
      '<th scope="col">Spent</th><th scope="col">Remaining</th>' +
      '<th scope="col">Used</th><th scope="col">Status</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td>Total</td><td>' + esc(fmt(totalBudget)) + '</td>' +
      '<td>' + esc(fmt(totalSpent)) + '</td>' +
      '<td>' + (totalLeft < 0 ? '−' : '') + esc(fmt(Math.abs(totalLeft))) + '</td>' +
      '<td>' + esc(pct(totalUsed)) + '</td><td></td></tr></tfoot>';
  }

  function buildMonthTable() {
    var rows = D.months.map(function (m, i) {
      var s = m.spent === null || m.spent === undefined ? null : m.spent;
      return '<tr>' +
        '<td>' + esc(m.name) + (m.partial ? ' (part month)' : '') + '</td>' +
        '<td>' + esc(fmt(m.budget)) + '</td>' +
        '<td>' + (s === null ? '—' : esc(fmt(s))) + '</td>' +
        '<td>' + esc(fmt(cumBudget[i])) + '</td>' +
        '<td>' + (cumSpent[i] === null ? '—' : esc(fmt(cumSpent[i]))) + '</td>' +
      '</tr>';
    }).join('');

    el('month-table').innerHTML =
      '<caption>Budget and spend by month, with running totals</caption>' +
      '<thead><tr><th scope="col">Month</th><th scope="col">Budget</th>' +
      '<th scope="col">Spent</th><th scope="col">Budget to date</th>' +
      '<th scope="col">Spent to date</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td>Total</td><td>' + esc(fmt(monthBudgetTotal)) + '</td>' +
      '<td>' + esc(fmt(monthSpentTotal)) + '</td><td></td><td></td></tr></tfoot>';
  }

  buildChannelTable();
  buildMonthTable();

  var tToggle = el('table-toggle'), tBody = el('table-body');
  tToggle.addEventListener('click', function () {
    var open = tBody.hidden;
    tBody.hidden = !open;
    tToggle.textContent = open ? 'Hide tables' : 'Show tables';
    tToggle.setAttribute('aria-expanded', String(open));
  });

  /* -- Footnote and theme --------------------------------------------------- */

  el('footnote').textContent =
    'Percentages are spend divided by the budget for the same line. ' +
    '"Against plan" compares spend to date with the budget phased across the ' +
    meta.periodUnit + ' — ' + fmt(expectedSpend) + ' by ' + meta.asOfLabel +
    ' — not with a flat run rate, so a seasonal budget is not misread as an overspend.';

  var toggle = el('theme-toggle');

  function currentTheme() {
    var stamped = document.documentElement.getAttribute('data-theme');
    if (stamped) return stamped;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function syncToggle() {
    toggle.textContent = currentTheme() === 'dark' ? 'Light mode' : 'Dark mode';
  }

  toggle.addEventListener('click', function () {
    document.documentElement.setAttribute(
      'data-theme', currentTheme() === 'dark' ? 'light' : 'dark');
    syncToggle();
    drawChart();   // the chart reads its colours from the CSS custom properties
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (!document.documentElement.getAttribute('data-theme')) {
      syncToggle();
      drawChart();
    }
  });

  syncToggle();
})();
