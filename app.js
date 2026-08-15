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
  function fmtSigned(n) { return (n >= 0 ? '+' : '−') + fmt(Math.abs(n)); }
  function pct(n, dp)  { return n.toFixed(dp === undefined ? 1 : dp) + '%'; }

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

  function catColour(key) { return 'var(--cat-' + key + ')'; }

  /* -- Derived figures ----------------------------------------------------- */

  var catName = {};
  D.categories.forEach(function (c) { catName[c.key] = c.name; });

  var totalSpent  = D.items.reduce(function (t, x) { return t + x.amount; }, 0);
  var totalBudget = meta.totalBudget;
  var totalLeft   = totalBudget - totalSpent;
  var usedPct     = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Spend by category, in the fixed category order (colour follows the
  // category, never its rank), then sorted for display by value.
  var byCat = D.categories.map(function (c) {
    var items = D.items.filter(function (x) { return x.cat === c.key; });
    var amount = items.reduce(function (t, x) { return t + x.amount; }, 0);
    return {
      key: c.key, name: c.name, amount: amount, count: items.length,
      share: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
    };
  }).filter(function (c) { return c.amount > 0; });

  var byCatSorted = byCat.slice().sort(function (a, b) { return b.amount - a.amount; });

  // Spend by month, split by category.
  var recorded = D.months.filter(function (m) { return m.recorded; });

  var byMonth = recorded.map(function (m) {
    var items = D.items.filter(function (x) { return x.month === m.key; });
    var total = items.reduce(function (t, x) { return t + x.amount; }, 0);
    var segs = D.categories.map(function (c) {
      return {
        key: c.key, name: c.name,
        amount: items.filter(function (x) { return x.cat === c.key; })
                     .reduce(function (t, x) { return t + x.amount; }, 0)
      };
    }).filter(function (s) { return s.amount > 0; });
    return {
      key: m.key, name: m.name, total: total, segs: segs,
      count: items.length, partial: m.key === D.partialMonth
    };
  });

  // Pacing reference: the budget spread across the period. Only a real phasing
  // if the workbook supplied one — otherwise an even spread, labelled as such.
  var perMonth = totalBudget / meta.periodMonths;

  function budgetFor(key) {
    if (meta.budgetIsPhased && meta.monthlyBudget && meta.monthlyBudget[key] != null) {
      return meta.monthlyBudget[key];
    }
    return perMonth;
  }

  var cumBudget = [], cumSpent = [], runB = 0, runS = 0, spendEnds = -1;
  var monthTotal = {};
  byMonth.forEach(function (m) { monthTotal[m.key] = m.total; });

  D.months.forEach(function (m, i) {
    runB += budgetFor(m.key);
    cumBudget.push(runB);
    if (m.recorded) {
      runS += monthTotal[m.key] || 0;
      cumSpent.push(runS);
      spendEnds = i;
    } else {
      cumSpent.push(null);
    }
  });

  // Expected spend by now, from whatever phasing is in force.
  var elapsed  = Math.max(0, Math.min(meta.monthsElapsed, meta.periodMonths));
  var whole    = Math.floor(elapsed);
  var expected = 0;
  for (var i = 0; i < whole && i < D.months.length; i++) {
    expected += budgetFor(D.months[i].key);
  }
  if (elapsed - whole > 0 && whole < D.months.length) {
    expected += budgetFor(D.months[whole].key) * (elapsed - whole);
  }
  var expectedPct = totalBudget > 0 ? (expected / totalBudget) * 100 : 0;
  var variance    = totalSpent - expected;
  var variancePct = expected > 0 ? (variance / expected) * 100 : 0;

  var queried = D.items.filter(function (x) { return x.note; });

  /* -- Header and notices --------------------------------------------------- */

  el('period-label').textContent = meta.budgetPeriodLabel;
  el('as-of-label').textContent  = meta.asOf;

  el('budget-notice-text').innerHTML = meta.budgetIsPhased
    ? '<strong>Budget phasing.</strong> The pacing figures on this page use the ' +
      'monthly budget set in <code>data.js</code>.'
    : '<strong>The budget was given as one total, not a plan.</strong> ' +
      esc(fmt(totalBudget)) + ' was supplied for the whole period with no split ' +
      'by month or by category. This page therefore compares spend with an ' +
      '<em>even</em> spread of that total — ' + esc(fmt(perMonth)) + ' a month — ' +
      'which is an assumption, not an approved plan. It also means no ' +
      'category below can be shown against a budget, because there isn\'t one. ' +
      'If a real phasing exists, put it in <code>monthlyBudget</code> in ' +
      '<code>data.js</code>.';

  var wrongYear  = queried.filter(function (x) { return /^year recorded/.test(x.note); });
  var wrongMonth = queried.filter(function (x) { return !/^year recorded/.test(x.note); });

  if (meta.showDateQueries && queried.length) {
    el('date-notice').hidden = false;
    el('date-notice-text').innerHTML =
      '<strong>' + queried.length + ' of ' + D.items.length +
      ' lines carry a date that disagrees with the sheet they sit on.</strong> ' +
      wrongYear.length + ' are dated 2025 on a sheet titled 2026; ' +
      wrongMonth.length + ' fall outside their sheet\'s month altogether, and ' +
      'read as month/day where the rest of the workbook is day/month. ' +
      'Amounts are grouped by the sheet the line appears on, which is ' +
      'unambiguous and reconciles to each sheet\'s own total, so no figure on ' +
      'this page is affected. The dates themselves are shown exactly as ' +
      'recorded and summarised at the foot of the page.';
  }

  /* -- Headline ------------------------------------------------------------- */

  el('hero-figure').textContent = pct(usedPct);
  el('hero-sub').textContent =
    fmt(totalSpent) + ' spent of ' + fmt(totalBudget) + ' · ' +
    (totalLeft >= 0 ? fmt(totalLeft) + ' left' : fmt(-totalLeft) + ' overspent');

  var ahead = variance > 0;
  var verdictColour = Math.abs(variancePct) < 5
    ? css('--status-good')
    : (ahead ? css('--status-warning') : css('--status-good'));

  el('hero-verdict').innerHTML =
    '<span class="dot" style="background:' + verdictColour + '"></span>' +
    (Math.abs(variancePct) < 0.5
      ? 'In line with an even spread of the budget'
      : (ahead ? 'Ahead of an even spread by ' : 'Under an even spread by ') +
        fmt(Math.abs(variance)) + ' (' + pct(Math.abs(variancePct)) + ')');

  var fillPct = Math.max(0, Math.min(usedPct, 100));
  el('overall-fill').style.width = fillPct + '%';

  var gap = el('overall-gap');
  if (fillPct <= 0 || fillPct >= 100) gap.hidden = true;
  else gap.style.left = 'calc(' + fillPct + '% - 1px)';

  var pacePos = Math.max(0, Math.min(expectedPct, 100));
  el('overall-pace').style.left = 'calc(' + pacePos + '% - 1px)';

  var paceNote = el('pace-note');
  paceNote.textContent =
    (meta.budgetIsPhased ? 'Planned by now: ' : 'Even spread by now: ') + pct(expectedPct, 0);
  paceNote.style.left = pacePos + '%';
  paceNote.style.transform =
    pacePos < 12 ? 'none' : (pacePos > 88 ? 'translateX(-100%)' : 'translateX(-50%)');

  /* -- KPI row -------------------------------------------------------------- */

  var kpis = [
    { label: 'Total budget', value: fmt(totalBudget),
      note: meta.budgetPeriodLabel, key: null },
    { label: 'Spent so far', value: fmt(totalSpent),
      note: pct(usedPct) + ' of budget', key: 'var(--spend)' },
    { label: totalLeft >= 0 ? 'Left to spend' : 'Overspent',
      value: fmt(Math.abs(totalLeft)),
      note: pct(Math.abs(100 - usedPct)) + (totalLeft >= 0 ? ' of budget unspent' : ' over budget'),
      key: totalLeft >= 0 ? 'var(--track)' : 'var(--status-critical)' },
    { label: 'Recorded so far', value: String(D.items.length) + ' lines',
      note: 'across ' + recorded.length + ' months, ' + byCat.length + ' categories',
      key: null }
  ];

  el('kpi-row').innerHTML = kpis.map(function (k) {
    return '<div class="kpi">' +
      '<div class="kpi-label">' +
        (k.key ? '<span class="kpi-key" style="background:' + k.key + '"></span>' : '') +
        esc(k.label) + '</div>' +
      '<div class="kpi-value">' + esc(k.value) + '</div>' +
      '<div class="kpi-note">' + esc(k.note) + '</div>' +
    '</div>';
  }).join('');

  /* -- Bar rows ------------------------------------------------------------- */

  var barTip = el('bar-tooltip');

  function attachTip(node, html) {
    node.addEventListener('pointerenter', function () {
      barTip.innerHTML = html;
      barTip.classList.add('is-on');
    });
    node.addEventListener('pointermove', function (e) {
      var w = barTip.offsetWidth, h = barTip.offsetHeight;
      var x = Math.min(e.clientX + 14, window.innerWidth - w - 8);
      var y = Math.max(8, e.clientY - h - 12);
      barTip.style.left = x + 'px';
      barTip.style.top  = y + 'px';
    });
    node.addEventListener('pointerleave', function () {
      barTip.classList.remove('is-on');
    });
  }

  /* Spend by category — one bar per category, drawn as a share of total
     recorded spend, so a bar's length is the percentage printed beside it. */
  el('cat-sub').textContent =
    'All ' + fmt(totalSpent) + ' of recorded spend, grouped into ' +
    byCat.length + ' categories. Categories were assigned from the line-item ' +
    'names in the workbook; the workbook itself has no category column, so ' +
    'if a line is filed wrongly it can be moved in data.js. There is no ' +
    'budget per category, so these are shares of spend, not budget usage.';

  el('cat-bars').innerHTML = byCatSorted.map(function (c) {
    return '<div>' +
      '<div class="bar-row-top">' +
        '<span class="bar-name">' +
          '<span class="chip"><span class="dot" style="background:' + catColour(c.key) + '"></span>' +
          esc(c.name) + '</span></span>' +
        '<span class="bar-values">' + esc(fmt(c.amount)) +
          '<span class="share">' + esc(pct(c.share)) + ' of spend</span></span>' +
      '</div>' +
      '<div class="bar-track">' +
        '<div class="bar-fill" data-cat="' + esc(c.key) + '" style="width:' +
          c.share + '%;background:' + catColour(c.key) + '"></div>' +
      '</div>' +
    '</div>';
  }).join('');

  byCatSorted.forEach(function (c) {
    var node = document.querySelector('#cat-bars .bar-fill[data-cat="' + c.key + '"]');
    if (node) attachTip(node,
      '<div class="tooltip-title">' + esc(c.name) + '</div>' +
      '<div class="tooltip-row"><span class="k" style="background:' + catColour(c.key) +
        '"></span>Spent<span class="n">' + esc(fmt(c.amount)) + '</span></div>' +
      '<div class="tooltip-row"><span style="width:10px"></span>Share of spend' +
        '<span class="n">' + esc(pct(c.share)) + '</span></div>' +
      '<div class="tooltip-row"><span style="width:10px"></span>Lines' +
        '<span class="n">' + c.count + '</span></div>');
  });

  /* Spend by month — stacked by category, all rows on one shared scale. */
  var monthMax = Math.max.apply(null, byMonth.map(function (m) { return m.total; }));

  el('month-legend').innerHTML = byCat.map(function (c) {
    return '<span class="legend-item"><span class="legend-key" style="background:' +
      catColour(c.key) + '"></span>' + esc(c.name) + '</span>';
  }).join('');

  el('month-bars').innerHTML = byMonth.map(function (m, mi) {
    var acc = 0;
    var segs = m.segs.map(function (s, si) {
      var left = acc / monthMax * 100;
      acc += s.amount;
      return '<div class="bar-seg" data-m="' + mi + '" data-s="' + si + '" style="left:' +
        left + '%;width:' + (s.amount / monthMax * 100) + '%;background:' +
        catColour(s.key) + '"></div>';
    }).join('');

    return '<div>' +
      '<div class="bar-row-top">' +
        '<span class="bar-name">' + esc(m.name) +
          (m.partial ? ' <span class="flag"><span class="dot"></span>part month</span>' : '') +
        '</span>' +
        '<span class="bar-values">' + esc(fmt(m.total)) +
          '<span class="share">' + m.count + (m.count === 1 ? ' line' : ' lines') +
        '</span></span>' +
      '</div>' +
      '<div class="bar-track">' + segs + '</div>' +
    '</div>';
  }).join('');

  byMonth.forEach(function (m, mi) {
    m.segs.forEach(function (s, si) {
      var node = document.querySelector(
        '#month-bars .bar-seg[data-m="' + mi + '"][data-s="' + si + '"]');
      if (!node) return;
      attachTip(node,
        '<div class="tooltip-title">' + esc(m.name) + '</div>' +
        '<div class="tooltip-row"><span class="k" style="background:' + catColour(s.key) +
          '"></span>' + esc(s.name) + '<span class="n">' + esc(fmt(s.amount)) + '</span></div>' +
        '<div class="tooltip-row"><span style="width:10px"></span>Month total' +
          '<span class="n">' + esc(fmt(m.total)) + '</span></div>' +
        '<div class="tooltip-row"><span style="width:10px"></span>Share of month' +
          '<span class="n">' + esc(pct(s.amount / m.total * 100)) + '</span></div>');
    });
  });

  /* -- Pacing chart --------------------------------------------------------- */

  el('pace-sub').textContent =
    'Spend so far adds up to ' + fmt(totalSpent) + '. The reference line is ' +
    (meta.budgetIsPhased
      ? 'the monthly budget, accumulated.'
      : 'the budget spread evenly at ' + fmt(perMonth) +
        ' a month — an assumption, since no monthly plan was supplied.') +
    ' The spend line stops at the last month entered.';

  el('pace-legend').innerHTML =
    '<span class="legend-item"><span class="legend-key line" style="background:var(--spend)"></span>Spend to date</span>' +
    '<span class="legend-item"><span class="legend-key line" style="background:var(--cat-digital)"></span>' +
    (meta.budgetIsPhased ? 'Budget to date' : 'Even spread of budget') + '</span>';

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

  var host    = el('pace-host');
  var tooltip = el('pace-tooltip');
  var geom    = null;
  var hoverIx = -1;

  function drawChart() {
    var width = host.clientWidth;
    if (!width) return;

    var narrow = width < 620;
    var height = narrow ? 260 : 320;
    var pad = { top: 16, right: narrow ? 16 : 96, bottom: 34, left: narrow ? 56 : 76 };
    var plotW = Math.max(10, width - pad.left - pad.right);
    var plotH = height - pad.top - pad.bottom;

    // The top of the plot is the full budget, so the reference line finishes
    // in the top-right corner rather than leaving a band of dead space above.
    var yMax = Math.max(cumBudget[cumBudget.length - 1] || 0, runS) || 1;
    var step = niceStep(yMax, 4);

    var ticks = [];
    for (var tv = 0; tv < yMax; tv += step) {
      if (tv / yMax < 0.93) ticks.push(tv);      // skip a tick crowding the top
    }
    ticks.push(yMax);

    var n = D.months.length;
    var x = function (i) { return pad.left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1)); };
    var y = function (v) { return pad.top + plotH - (plotH * v) / yMax; };

    var old = host.querySelector('svg');
    if (old) old.remove();

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + width + ' ' + height, height: height, role: 'img',
      'aria-label': 'Running total of marketing spend against the budget across ' +
        n + ' months. Every value is also in the tables below.'
    });

    var ink    = css('--text-muted');
    var grid   = css('--gridline');
    var base   = css('--baseline');
    var cSpend = css('--spend');
    var cBud   = css('--cat-digital');
    var surf   = css('--surface-1');

    ticks.forEach(function (v) {
      var yy = y(v);
      svg.appendChild(svgEl('line', {
        x1: pad.left, x2: pad.left + plotW, y1: yy, y2: yy,
        stroke: v === 0 ? base : grid, 'stroke-width': 1
      }));
      var t = svgEl('text', {
        x: pad.left - 10, y: yy + 4, 'text-anchor': 'end',
        fill: ink, 'font-size': 11, 'font-variant-numeric': 'tabular-nums'
      });
      t.textContent = fmtShort(v);
      svg.appendChild(t);
    });

    var everyOther = plotW / n < 34;
    D.months.forEach(function (m, i) {
      if (everyOther && i % 2 !== 0 && i !== n - 1) return;
      var t = svgEl('text', {
        x: x(i), y: pad.top + plotH + 20, 'text-anchor': 'middle',
        fill: ink, 'font-size': 11
      });
      t.textContent = m.key;
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
      d: path(cumBudget), fill: 'none', stroke: cBud,
      'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));
    svg.appendChild(svgEl('path', {
      d: path(cumSpent), fill: 'none', stroke: cSpend,
      'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));

    function endDot(ix, val, colour) {
      if (ix < 0) return;
      svg.appendChild(svgEl('circle', {
        cx: x(ix), cy: y(val), r: 4, fill: colour, stroke: surf, 'stroke-width': 2
      }));
    }
    endDot(n - 1, cumBudget[n - 1], cBud);
    endDot(spendEnds, cumSpent[spendEnds], cSpend);

    // Endpoint labels only, in ink tokens — the dot beside carries identity.
    // The budget line finishes on the top gridline, which already carries the
    // figure — a second label there would just repeat it. Only spend is
    // labelled, since its endpoint sits away from any axis.
    if (!narrow) {
      if (spendEnds >= 0) {
        var sl = svgEl('text', {
          x: x(spendEnds), y: y(cumSpent[spendEnds]) + 22, 'text-anchor': 'middle',
          fill: css('--text-secondary'), 'font-size': 12
        });
        sl.textContent = fmtShort(cumSpent[spendEnds]) + ' spent';
        svg.appendChild(sl);
      }
    }

    var crosshair = svgEl('line', {
      y1: pad.top, y2: pad.top + plotH, stroke: base, 'stroke-width': 1, opacity: 0
    });
    svg.appendChild(crosshair);

    var dots = [
      svgEl('circle', { r: 4, fill: cSpend, stroke: surf, 'stroke-width': 2, opacity: 0 }),
      svgEl('circle', { r: 4, fill: cBud,   stroke: surf, 'stroke-width': 2, opacity: 0 })
    ];
    dots.forEach(function (d) { svg.appendChild(d); });

    var band = plotW / Math.max(1, n - 1);
    D.months.forEach(function (m, i) {
      var hit = svgEl('rect', {
        x: x(i) - band / 2, y: 0, width: Math.max(24, band), height: height,
        fill: 'transparent'
      });
      hit.addEventListener('pointerenter', function () { showAt(i); });
      svg.appendChild(hit);
    });

    svg.addEventListener('pointerleave', hideChart);

    geom = { x: x, y: y, crosshair: crosshair, dots: dots, width: width, height: height };
    host.insertBefore(svg, tooltip);
    if (hoverIx >= 0) showAt(hoverIx);
  }

  function showAt(i) {
    if (!geom) return;
    hoverIx = i;
    var m = D.months[i], s = cumSpent[i], b = cumBudget[i];

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
      '<div class="tooltip-row"><span class="k" style="background:var(--spend)"></span>' +
        'Spent to date<span class="n">' + (s === null ? 'not entered' : esc(fmt(s))) + '</span></div>' +
      '<div class="tooltip-row"><span class="k" style="background:var(--cat-digital)"></span>' +
        (meta.budgetIsPhased ? 'Budget to date' : 'Even spread') +
        '<span class="n">' + esc(fmt(b)) + '</span></div>';

    if (s !== null) {
      rows += '<div class="tooltip-row"><span style="width:10px"></span>Difference' +
              '<span class="n">' + esc(fmtSigned(s - b)) + '</span></div>';
    }

    tooltip.innerHTML =
      '<div class="tooltip-title">' + esc(m.name) +
        (m.key === D.partialMonth
          ? ' <span style="font-weight:400;color:var(--text-muted)">· part month</span>' : '') +
      '</div>' + rows;

    tooltip.classList.add('is-on');

    var tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    var left = geom.x(i) + 14;
    if (left + tw > geom.width) left = geom.x(i) - tw - 14;
    tooltip.style.left = Math.max(0, left) + 'px';
    tooltip.style.top  = Math.max(0, Math.min(geom.y(b) - th / 2, geom.height - th)) + 'px';
  }

  function hideChart() {
    hoverIx = -1;
    if (!geom) return;
    tooltip.classList.remove('is-on');
    geom.crosshair.setAttribute('opacity', 0);
    geom.dots.forEach(function (d) { d.setAttribute('opacity', 0); });
  }

  host.tabIndex = 0;
  host.setAttribute('aria-label',
    'Running total chart. Use the left and right arrow keys to step through the months.');
  host.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    var next = hoverIx < 0 ? 0 : hoverIx + (e.key === 'ArrowRight' ? 1 : -1);
    showAt(Math.max(0, Math.min(next, D.months.length - 1)));
  });
  host.addEventListener('blur', hideChart);

  drawChart();
  if (window.ResizeObserver) new ResizeObserver(drawChart).observe(host);
  else window.addEventListener('resize', drawChart);

  /* -- Detail table --------------------------------------------------------- */

  el('detail-sub').textContent =
    'All ' + D.items.length + ' lines from the workbook, in sheet order, with the ' +
    'category each has been filed under. Each month\'s subtotal matches that ' +
    'sheet\'s own total row.';

  var rowsHtml = '';
  byMonth.forEach(function (m) {
    rowsHtml +=
      '<tr class="month-head"><td colspan="5">' + esc(m.name) +
      (m.partial ? ' — part month' : '') + '</td></tr>';

    D.items.filter(function (x) { return x.month === m.key; }).forEach(function (x) {
      rowsHtml +=
        '<tr>' +
          '<td class="col-text">' + esc(x.date) +
            (x.note ? ' <span class="flag"><span class="dot"></span>query</span>' : '') +
          '</td>' +
          '<td class="col-text">' + esc(x.item) +
            (x.desc ? '<span class="desc">' + esc(x.desc) + '</span>' : '') + '</td>' +
          '<td class="col-text"><span class="chip"><span class="dot" style="background:' +
            catColour(x.cat) + '"></span>' + esc(catName[x.cat]) + '</span></td>' +
          '<td class="col-text">' + esc(x.pay) + '</td>' +
          '<td class="num">' + esc(fmt(x.amount)) + '</td>' +
        '</tr>';
    });

    rowsHtml +=
      '<tr class="month-total"><td colspan="4" class="col-text">' +
      esc(m.name) + ' total</td><td class="num">' + esc(fmt(m.total)) + '</td></tr>';
  });

  el('detail-table').innerHTML =
    '<caption>Marketing expenses by month, exactly as recorded in the workbook</caption>' +
    '<thead><tr>' +
      '<th scope="col" class="col-text">Date</th>' +
      '<th scope="col" class="col-text">Line item</th>' +
      '<th scope="col" class="col-text">Category</th>' +
      '<th scope="col" class="col-text">Paid by</th>' +
      '<th scope="col" class="num">Amount</th>' +
    '</tr></thead><tbody>' + rowsHtml + '</tbody>' +
    '<tfoot><tr><td colspan="4" class="col-text">Total recorded spend</td>' +
    '<td class="num">' + esc(fmt(totalSpent)) + '</td></tr></tfoot>';

  var dToggle = el('detail-toggle'), dBody = el('detail-body');
  dToggle.addEventListener('click', function () {
    var open = dBody.hidden;
    dBody.hidden = !open;
    dToggle.textContent = open ? 'Hide detail' : 'Show detail';
    dToggle.setAttribute('aria-expanded', String(open));
  });

  /* -- Data quality --------------------------------------------------------- */

  if (!queried.length) {
    el('dq-card').hidden = true;
  } else {
    var grouped = {};
    queried.forEach(function (x) {
      var kind = /^year recorded/.test(x.note)
        ? 'Sheet is titled 2026 but the date carries ' + x.note.replace('year recorded as ', '')
        : 'Date sits outside the month of the sheet it is on';
      (grouped[kind] = grouped[kind] || []).push(x);
    });

    var dqRows = Object.keys(grouped).map(function (k) {
      var g = grouped[k];
      var amount = g.reduce(function (t, x) { return t + x.amount; }, 0);
      return '<tr>' +
        '<td class="col-text">' + esc(k) + '</td>' +
        '<td class="num">' + g.length + '</td>' +
        '<td class="num">' + esc(fmt(amount)) + '</td>' +
        '<td class="col-text">' + esc(g.slice(0, 3).map(function (x) {
          return x.month + ' ' + x.date;
        }).join(', ')) + (g.length > 3 ? ' …' : '') + '</td>' +
      '</tr>';
    }).join('');

    el('dq-table').innerHTML =
      '<caption>Recording problems found while reading the workbook</caption>' +
      '<thead><tr><th scope="col" class="col-text">What is wrong</th>' +
      '<th scope="col" class="num">Lines</th>' +
      '<th scope="col" class="num">Value affected</th>' +
      '<th scope="col" class="col-text">Examples</th></tr></thead>' +
      '<tbody>' + dqRows + '</tbody>';
  }

  /* -- Footnote and theme --------------------------------------------------- */

  el('footnote').textContent =
    'Source: "Marketing Expences August 2nd Week.xlsx", sheets Apr 26 to Aug 26. ' +
    'Each month\'s lines were checked against that sheet\'s own total row and all ' +
    'five agree, giving ' + fmt(totalSpent) + ' of recorded spend. The ' +
    fmt(totalBudget) + ' budget was supplied separately. Percentages are spend ' +
    'divided by the total budget; category bars are drawn as a share of ' +
    'recorded spend, so each bar\'s length is the percentage printed beside it. ' +
    'Amounts are shown to the nearest ' + meta.currency + '.';

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
    if (!document.documentElement.getAttribute('data-theme')) { syncToggle(); drawChart(); }
  });

  syncToggle();
})();
