# Marketing budget dashboard

A single-page dashboard showing marketing spend against budget: how much has
been committed, how much is left, and what share of each budget line has been
used.

Open `index.html` in a browser. There is no build step, no package manager and
no server — it is plain HTML, CSS and JavaScript, so it works straight from the
file system and can be dropped on any static host or an internal share.

> **The figures currently in the repository are placeholders.** They were
> invented so the dashboard has something to draw. Replace them before showing
> this to anyone (see below), and the warning banner will clear.

## What it shows

| Section | Answers |
|---|---|
| Headline figure and meter | What share of the total budget has been used, and how that compares with the budget phased to today |
| KPI row | Total budget · spent to date · remaining · variance against plan |
| Where the budget has gone | Spent, remaining and percentage used for every channel, with any channel over its budget flagged |
| Pacing through the year | Cumulative spend against cumulative budget, month by month |
| All figures | The same numbers in full, as tables |

## Putting your own numbers in

Everything lives in `data.js`. You should not need to touch any other file.

1. **Set the currency.** Change `currency` and `locale` at the top of `meta`
   — for example `currency: 'LKR', locale: 'en-LK'`. Every figure on the page
   reformats from those two lines.
2. **Set the period.** `periodLabel` and `asOfLabel` are display text.
   `periodElapsed` is how far through the period you are (7.5 of 12 months =
   mid-August); it drives the "planned by now" marker.
3. **List your channels.** One entry per budget line, each with a `budget` and
   a `spent`. Remaining amounts, percentages and over-budget status are all
   worked out for you.
4. **List your months.** Give every month a `budget`. Set `spent` to `null`
   for months that have not happened yet, and add `partial: true` to a month
   that is still in progress so a half-month is not read as an underspend.
5. **Set `isPlaceholder: false`** to clear the warning banner.

The dashboard checks that the monthly figures add up to the channel figures and
shows a reconciliation warning if they disagree, so a typo in one table does not
quietly skew the other.

## How "against plan" is worked out

Spend to date is compared with the budget **phased across the months**, not with
a flat run rate. If your budget is seasonal — heavier in the booking peak, say —
a flat comparison would report an overspend in the busy months and an underspend
in the quiet ones when in fact you were on plan throughout. The footnote on the
page states the phased figure being used.

Percentages are always spend divided by the budget for that same line.

## Notes

- **Light and dark.** The page follows the operating system setting and has its
  own toggle in the header.
- **Nothing is hover-only.** Every value in a chart is also in the tables at the
  bottom. The pacing chart takes keyboard focus and steps through the months
  with the arrow keys.
- **Colours.** Series colours come from a palette validated for colour-vision
  deficiency and for contrast against both the light and dark surfaces. If you
  reskin it, change the custom properties at the top of `styles.css` rather than
  scattering hex values through the file, and re-check contrast.
- **Printing.** The page prints as laid out; the theme and table toggles are
  hidden in print.

## Files

```
index.html   page structure
styles.css   colour tokens, layout, mark specs
app.js       derived figures, charts, tables, interaction
data.js      >>> the only file you need to edit <<<
```
