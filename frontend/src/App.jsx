import { useEffect, useMemo, useState } from "react";
import "./App.css";

const REASONS = {
  "invalid dates": "the end date is before the start date",
  "before window starts before data":
    "the period before the promo starts earlier than the first day of data (1 Apr)",
  "promo ends after data":
    "the promo ends after the last day of data (30 Sep)",
  "incomplete before data":
    "some games have no data for the full period before the promo (for example, a game launched during that period)",
  "incomplete during data":
    "some games have no data for the full promo period",
  "before is zero": "there were no stakes in the period before the promo",
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toTime = (iso) => new Date(iso + "T00:00:00Z").getTime();

const fmtDay = (time, withYear = false) =>
  new Date(time).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });

const eur = (v) =>
  v == null ? "–" : v.toLocaleString("en-GB", { maximumFractionDigits: 0 });

const pct = (v) =>
  `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;

const gamesText = (g) =>
  g.trim().toUpperCase() === "ALL" ? "All games" : g.replaceAll(";", ", ");

export default function App() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [site, setSite] = useState("all");
  const [onlyMeasurable, setOnlyMeasurable] = useState(false);
  const [sortDir, setSortDir] = useState("desc");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetch("/results.json")
      .then((r) => r.json())
      .then(setRows);
  }, []);

  const sites = useMemo(
    () => [...new Set(rows.map((r) => r.site_name))].sort(),
    [rows]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter(
        (r) =>
          (site === "all" || r.site_name === site) &&
          (!onlyMeasurable || r.uplift != null) &&
          (!q || r.promo_id.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        if (a.uplift == null && b.uplift == null) return 0;
        if (a.uplift == null) return 1;
        if (b.uplift == null) return -1;
        return sortDir === "desc" ? b.uplift - a.uplift : a.uplift - b.uplift;
      });
  }, [rows, query, site, onlyMeasurable, sortDir]);

  const measurable = rows.filter((r) => r.uplift != null);
  const avg = measurable.length
    ? measurable.reduce((s, r) => s + r.uplift, 0) / measurable.length
    : null;

  const selected = rows.find((r) => r.promo_id === selectedId);

  let windows = null;
  if (selected && selected.uplift != null) {
    const start = toTime(selected.start_date);
    const end = toTime(selected.end_date);
    const n = Math.round((end - start) / DAY_MS) + 1;
    windows = {
      n,
      beforeStart: start - n * DAY_MS,
      beforeEnd: start - DAY_MS,
      start,
      end,
    };
  }

  return (
    <div className="page">
      <h1>Promotion impact</h1>
      <p className="lead">
        See how stakes changed during each promotion compared with the days right before it
      </p>
      <p className="formula">
        Uplift = (during − before) ÷ before, over equal-length periods. Positive means higher stakes during the promotion
      </p>

      <div className="cards">
        <div className="card">
          <span>Promotions</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="card">
          <span>Measurable</span>
          <strong>{measurable.length}</strong>
        </div>
        <div className="card">
          <span>Average uplift</span>
          <strong className={avg != null && avg >= 0 ? "pos" : "neg"}>
            {avg == null ? "–" : pct(avg)}
          </strong>
        </div>
        <div className="card">
          <span>Not measurable</span>
          <strong className="warn">{rows.length - measurable.length}</strong>
        </div>
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor="q">Search promo ID</label>
          <input
            id="q"
            type="text"
            placeholder="e.g. P07"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="s">Site</label>
          <select id="s" value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="all">All sites</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="check">
          <input
            id="m"
            type="checkbox"
            checked={onlyMeasurable}
            onChange={(e) => setOnlyMeasurable(e.target.checked)}
          />
          <label htmlFor="m">Only measurable</label>
        </div>
      </div>

      <div className="tablebox">
        <table>
          <thead>
            <tr>
              <th>Promo</th>
              <th>Site</th>
              <th>Games</th>
              <th>Period</th>
              <th className="num">Before (€)</th>
              <th className="num">During (€)</th>
              <th
                className="num sortable"
                onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
              >
                Uplift {sortDir === "desc" ? "▼" : "▲"}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.promo_id}
                className={r.promo_id === selectedId ? "selected" : ""}
                onClick={() => setSelectedId(r.promo_id)}
              >
                <td>
                  <button className="idbtn">{r.promo_id}</button>
                </td>
                <td>{r.site_name}</td>
                <td>{gamesText(r.games)}</td>
                <td className="nowrap">
                  {fmtDay(toTime(r.start_date))} → {fmtDay(toTime(r.end_date))}
                </td>
                <td className="num">{eur(r.before)}</td>
                <td className="num">{eur(r.during)}</td>
                <td className="num">
                  {r.uplift == null ? (
                    <span className="badge">
                      Not measurable: {REASONS[r.status] || r.status}
                    </span>
                  ) : (
                    <strong className={r.uplift >= 0 ? "pos" : "neg"}>
                      {pct(r.uplift)}
                    </strong>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No promotions match these filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="detail">
        {!selected ? (
          <p className="hint">
            Click a promo to see the exact periods behind its number
          </p>
        ) : (
          <>
            <div className="detailhead">
              <h2>
                {selected.promo_id} · {selected.site_name} ·{" "}
                {gamesText(selected.games)}
              </h2>
              {selected.uplift != null && (
                <strong className={selected.uplift >= 0 ? "pos big" : "neg big"}>
                  {pct(selected.uplift)}
                </strong>
              )}
            </div>
            {windows ? (
              <div className="detailgrid">
                <div className="box">
                  <span>
                    Before · {fmtDay(windows.beforeStart)} to{" "}
                    {fmtDay(windows.beforeEnd, true)} ({windows.n} days)
                  </span>
                  <strong>€{eur(selected.before)}</strong>
                </div>
                <div className="box">
                  <span>
                    During · {fmtDay(windows.start)} to{" "}
                    {fmtDay(windows.end, true)} ({windows.n} days)
                  </span>
                  <strong>€{eur(selected.during)}</strong>
                </div>
                <div className="box">
                  <span>Checks passed</span>
                  <p>Full data in both periods and before above zero.</p>
                </div>
              </div>
            ) : (
              <p className="reason">
                <span className="badge">Not measurable</span>{" "}
                {REASONS[selected.status] || selected.status}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
