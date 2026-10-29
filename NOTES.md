## Data problems found

1. **Unquoted commas in site names** The CSV parser failed and the columns
   shifted. After checking the data I saw there were issues with the site
   names, for example `Casino Beta, DE`. So I parsed each line by taking the
   first field as the site ID and the last three as game, date and stakes,
   what is left in between is the site name.

2. **39 exact duplicate rows** For Casino Delta IT (site 1004), all the rows
   from 10 to 12 Sep appear twice, and the second copy sits at the end of the
   file, so it looks like a block that was loaded again by mistake. If they
   stayed in, the stakes of those days would be counted twice. This affects P04 
   (same site, all games, 14 to 20 Sep), because its "before" period (7 to 13 Sep) 
   contains those days and its uplift would have been understated. 
   I removed the duplicates and kept one copy of each row.
   
3. **12 days with a second, negative row** for the same site, game and day
   (1% to 10% of the day's value). Stakes cannot be negative, so I assumed these rows 
   are adjustments and summed them with the main row to get one net value per day. 
   I checked that these were the only negative values in the file. If they are export errors instead, 
   the effect on the uplift is very small (12 days out of about 81,000 rows).

4. **Promo P05** has an end date before its start date, so I marked it as not measurable.
   
5. **Midnight Bells**  only exists at one site (Casino Gamma HR), from 8 Sep onwards. Promo P07 runs this game from 9 to 15 Sep, so its "before" period has only one day of data, and I marked it as not measurable.

I also checked for missing days, outliers, inconsistent names, overlapping promotions and promo games that do not exist at their site, and found no other discrepancies.

## Choices

- **Dates and periods:** I treated start and end dates as inclusive, so a promotion from 17 to 23 Aug lasts 7 days. The "before" period has the same number of days and ends the day before the promotion starts, which keeps the comparison fair.
- **When a promo is measured:** a promotion is only measured if every one of its games has data on every day of both periods. Otherwise I leave the uplift empty and the page shows the reason, instead of showing a number that could be misleading.
- **Sanity check:** to see whether the uplift reflects the promotions and not a general trend, I applied the same calculation to the period just before each "before" window, where there is no promotion. The average there was +0.6%, against +24.5% for the real promotions.

## What I would do with more time

- **Confirm the data issues with the owners of the export:** whether the negative rows are real adjustments and why one block was loaded twice, to validate the cleaning rules I applied.
- **Make the comparison fairer:** stakes are higher on weekends, so promotions that are not a multiple of 7 days can look better or worse only because of how many weekend days fall in each period. I would compare equivalent weekdays, or use sites without a promotion as a control group.
- **Add automated tests:** pytest tests for the uplift and the edge cases I found (invalid dates, a game launched late, a "before" period outside the data), run in CI on every push.
- **Document the code:** docstrings and comments that explain the reasoning behind each cleaning and measurability rule, so that other developers can understand and maintain it.
- **Improve the structure:** split `run.py` into smaller modules (loading, cleaning, uplift) with type hints, and add a formatter and linter (black and ruff, ESLint and Prettier) to keep the code consistent.
- **Extend the page:** add a daily chart per promotion with the "before" and "during" periods highlighted, so a KAM sees the shape of the change and not only one number, and serve the results from a small API instead of a static JSON file.
  
## AI tools

I used Claude as an assistant. I used it to debug the CSV parsing, to debug and review my code and to get ideas for the design of the React page. Because of the short time, I also used it to generate better written text for the README and this file, since I only had plain-text drafts of both.