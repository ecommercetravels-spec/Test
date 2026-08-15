/* ============================================================================
 * Marketing Budget Dashboard — data file
 * ============================================================================
 *
 *  >>> EVERY FIGURE BELOW IS PLACEHOLDER DATA. <<<
 *
 *  Nothing here has been taken from a real ledger, finance export or ad
 *  account. The numbers exist only so the dashboard has something to draw
 *  while you wire in your own. Replace them before showing this to anyone,
 *  and set `isPlaceholder` to false to remove the warning banner.
 *
 *  You should not need to touch any other file to change the figures.
 * ========================================================================= */

var DASHBOARD_DATA = {

  /* ---- Display settings -------------------------------------------------
   * currency / locale drive all number formatting. Change these two lines
   * if you report in something other than pounds sterling — e.g.
   *   currency: 'LKR', locale: 'en-LK'
   *   currency: 'USD', locale: 'en-US'
   * -------------------------------------------------------------------- */
  meta: {
    currency: 'GBP',
    locale: 'en-GB',

    periodLabel: 'Financial year 2026 · January–December',
    asOfLabel: '15 August 2026',

    // How far through the reporting period we are. Used for the "expected
    // pace" marker — i.e. the share of budget you would have spent by now if
    // you were spending evenly. 7.5 of 12 months = mid-August.
    periodElapsed: 7.5,
    periodTotal: 12,
    periodUnit: 'months',

    // Set to false once real figures are in. Controls the warning banner.
    isPlaceholder: true
  },

  /* ---- Budget and spend by channel --------------------------------------
   * One entry per line of the marketing budget.
   *   name    — how it appears on screen
   *   budget  — the amount approved for the whole period
   *   spent   — the amount committed or invoiced so far
   * Remaining, percentage used and over/under status are all worked out for
   * you; do not add them here.
   * -------------------------------------------------------------------- */
  channels: [
    { name: 'Paid search',            budget: 340000, spent: 236800 },
    { name: 'Meta ads',               budget: 265000, spent: 191400 },
    { name: 'Metasearch',             budget: 180000, spent: 128250 },
    { name: 'Affiliates & partners',  budget: 125000, spent:  79750 },
    { name: 'Email & CRM',            budget:  96000, spent:  51300 },
    { name: 'Content & SEO',          budget:  88000, spent:  54600 },
    { name: 'Brand & offline',        budget:  70000, spent:  74900 },
    { name: 'Creative & production',  budget:  36000, spent:  21700 }
  ],

  /* ---- Budget and spend by month ----------------------------------------
   * Drives the pacing chart. Give every month of the period a budget.
   * Leave `spent` as null for months that have not happened yet — a null
   * stops the spend line rather than drawing it down to zero.
   *
   * Add `partial: true` to a month that is still in progress, so the chart
   * and tables can say so rather than making a half-month look like an
   * underspend.
   *
   * The month budgets should add up to the sum of the channel budgets, and
   * the month spends to the sum of the channel spends. The dashboard checks
   * this for you and shows a reconciliation warning if they disagree.
   * -------------------------------------------------------------------- */
  months: [
    { name: 'Jan', budget: 115000, spent: 112400 },
    { name: 'Feb', budget: 120000, spent: 124600 },
    { name: 'Mar', budget: 125000, spent: 131800 },
    { name: 'Apr', budget: 115000, spent: 118900 },
    { name: 'May', budget: 105000, spent: 109200 },
    { name: 'Jun', budget: 100000, spent: 102500 },
    { name: 'Jul', budget:  95000, spent:  96800 },
    { name: 'Aug', budget:  90000, spent:  42500, partial: true },
    { name: 'Sep', budget:  85000, spent: null },
    { name: 'Oct', budget:  85000, spent: null },
    { name: 'Nov', budget:  85000, spent: null },
    { name: 'Dec', budget:  80000, spent: null }
  ]
};
