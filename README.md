# Promotion impact

Compares stakes during each promotion with the same number of days right
before it, and shows the results on a web page that a Key Account Manager
(KAM) could use.

## Requirements

- Python 3.11 or newer
- Node.js 20.19 or newer

## How to run

From the repository root:

```
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
python analysis/run.py
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.

`python analysis/run.py` reads `data/stakes_delivery.csv` and
`data/promos.csv`, cleans the stakes data, and writes:

- `results.csv` (repo root): `promo_id, before, during, uplift` (uplift in %)
- `frontend/public/results.json`: the same results plus status, site, games
  and dates, used by the web page

The generated files are already committed, so the page also works without
running the Python step.

## Structure

- `analysis/run.py`: data cleaning and uplift calculation
- `analysis/explore.ipynb`: exploration notebook with the data checks (it was
  written in Colab, `run.py` is the actual pipeline)
- `frontend/`: React page (Vite)
- `data/`: input files
- `results.csv`: final output
- `NOTES.md`: data problems found, next steps, AI tools used

## Method

- `uplift = (during - before) / before`, shown as a percentage with one decimal.
- Start and end dates are inclusive. The "before" period has the same number
  of days and ends the day before the promotion starts.
- Only the promotion's games at its site are counted. `ALL` means every game
  the site has in the data.
- A promotion is measured only if every game has data on every day of both
  periods, the periods fall inside the data (1 Apr to 30 Sep 2026), and the
  dates are valid. Otherwise the uplift is left empty and the page shows
  the reason.

