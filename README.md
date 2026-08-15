# Marketing budget dashboard

A single-page dashboard showing marketing spend against budget: how much has
gone, how much is left, what share each category takes, and every line item
behind the totals.

Open `index.html` in a browser. There is no build step, no package manager and
no server — plain HTML, CSS and JavaScript, so it works straight from the file
system and can be dropped on any static host or internal share.

## The figures

| | |
|---|---|
| Budget | LKR 6,156,000 (supplied separately) |
| Spend recorded | LKR 1,707,401 across 49 lines |
| Months covered | April – August 2026 (August is a part month) |
| Source | `Marketing Expences August 2nd Week.xlsx`, sheets `Apr 26` … `Aug 26` |

Every line was read from that workbook and nothing was estimated, rounded or
filled in. Each month's extracted lines were checked against that sheet's own
Total row and all five agree exactly, which is what gives the 1,707,401 figure.

## Two things the workbook does not contain

**No budget split.** The 6,156,000 arrived as a single number with no breakdown
by month or by category. The dashboard therefore cannot show a budget per
category and does not invent one — the category section shows shares of *spend*,
clearly labelled as such. For pacing it compares spend with an **even** spread
of the total (LKR 513,000 a month over twelve months), labelled as an assumption
everywhere it appears. If a real phasing exists, put it in `monthlyBudget` in
`data.js` and set `budgetIsPhased: true`; every pacing figure and label follows
automatically.

**No category column.** Categories were assigned from the line-item names. If a
line is filed in the wrong place, change its `cat` in `data.js` — the charts,
percentages and legend all follow.

## Dates need attention in the source file

44 of the 49 lines carry a date that disagrees with the sheet it sits on:

- **28 lines** are dated 2025 on a sheet titled 2026.
- **16 lines** fall outside their sheet's month entirely. In every one of them
  the first number equals the sheet's month, so these were entered as
  day/month and read back as month/day — `05/04/2025` on the May sheet is
  4 May, not 5 April.

None of this moves a total. Amounts are grouped by the **sheet** a line appears
on, which is unambiguous and reconciles to each sheet's own total. The dates are
shown exactly as recorded, flagged row by row, and summarised at the foot of the
page. Nothing has been silently corrected — that is a decision for whoever owns
the workbook. Once it is tidied, set `showDateQueries: false` to drop the banner.

## Keeping it up to date

Everything lives in `data.js`; no other file needs touching.

1. Add the new month's lines to `items` — `month`, `date`, `item`, `desc`,
   `amount`, `pay`, `cat`.
2. Flip that month's `recorded` to `true` in `months`.
3. Update `asOf` and `monthsElapsed`, and move `partialMonth` to the month still
   in progress (or set it to `null`).

Totals, percentages, shares, charts and tables all recompute.

To report in a different currency, change `currency` and `locale` at the top of
`meta` — every figure on the page reformats from those two lines.

## Notes

- **Light and dark.** The page follows the operating system setting and has its
  own toggle in the header.
- **Nothing is hover-only.** Every value in a chart is also in the tables. The
  running-total chart takes keyboard focus and steps through months with the
  arrow keys.
- **Colours.** Each category holds a fixed colour slot, so a colour always means
  the same thing no matter how the figures move. The eight slots are validated
  for colour-vision deficiency and for contrast against both the light and dark
  surfaces. If you reskin it, change the custom properties at the top of
  `styles.css` rather than scattering hex values through the file.
- **Bar lengths mean what the labels say.** Category bars are drawn as a share
  of recorded spend, so a bar's length is the percentage printed beside it.
  Month bars share one scale, so the months are directly comparable.

## Files

```
index.html   page structure
styles.css   colour tokens, layout, mark specs
app.js       derived figures, charts, tables, interaction
data.js      >>> the only file you need to edit <<<
```
