import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATA_MIN = pd.Timestamp("2026-04-01")
DATA_MAX = pd.Timestamp("2026-09-30")


def load_stakes(path):
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        f.readline()
        for line in f:
            line = line.rstrip("\r\n")
            if not line.strip():
                continue
            parts = line.split(",")
            if len(parts) < 5:
                continue
            rows.append({
                "site_id": parts[0],
                "site_name": ",".join(parts[1:-3]),
                "game": parts[-3],
                "date": parts[-2],
                "stakes_eur": parts[-1],
            })
    df = pd.DataFrame(rows)
    df["site_id"] = pd.to_numeric(df["site_id"])
    df["date"] = pd.to_datetime(df["date"])
    df["stakes_eur"] = pd.to_numeric(df["stakes_eur"])
    return df


def clean_stakes(df):
    df = df.drop_duplicates()
    df = df.groupby(["site_id", "site_name", "game", "date"], as_index=False)["stakes_eur"].sum()
    return df


def compute_promo(r, stakes):
    s, e = r["start_date"], r["end_date"]
    out = {"promo_id": r["promo_id"], "before": None, "during": None, "uplift": None, "status": "ok"}

    if e < s:
        out["status"] = "invalid dates"
        return out

    n = (e - s).days + 1
    b_start, b_end = s - pd.Timedelta(days=n), s - pd.Timedelta(days=1)

    d = stakes[stakes["site_id"] == r["site_id"]]
    if r["games"].strip().upper() == "ALL":
        games = sorted(d["game"].unique())
    else:
        games = [g.strip() for g in r["games"].split(";")]
    d = d[d["game"].isin(games)]

    before = d[(d["date"] >= b_start) & (d["date"] <= b_end)]
    during = d[(d["date"] >= s) & (d["date"] <= e)]
    out["before"] = round(before["stakes_eur"].sum(), 2)
    out["during"] = round(during["stakes_eur"].sum(), 2)

    if b_start < DATA_MIN:
        out["status"] = "before window starts before data"
    elif e > DATA_MAX:
        out["status"] = "promo ends after data"
    elif len(before) < n * len(games):
        out["status"] = "incomplete before data"
    elif len(during) < n * len(games):
        out["status"] = "incomplete during data"
    elif out["before"] == 0:
        out["status"] = "before is zero"

    if out["status"] == "ok":
        out["uplift"] = round((out["during"] - out["before"]) / out["before"] * 100, 1)
    return out


def main():
    stakes = clean_stakes(load_stakes(DATA_DIR / "stakes_delivery.csv"))
    promos = pd.read_csv(DATA_DIR / "promos.csv")
    promos["start_date"] = pd.to_datetime(promos["start_date"])
    promos["end_date"] = pd.to_datetime(promos["end_date"])

    results = pd.DataFrame([compute_promo(r, stakes) for _, r in promos.iterrows()])
    results = results.merge(promos[["promo_id", "site_name", "games", "start_date", "end_date"]], on="promo_id")
    results["start_date"] = results["start_date"].dt.strftime("%Y-%m-%d")
    results["end_date"] = results["end_date"].dt.strftime("%Y-%m-%d")

    results[["promo_id", "before", "during", "uplift"]].to_csv(ROOT / "results.csv", index=False)

    public = ROOT / "frontend" / "public"
    public.mkdir(parents=True, exist_ok=True)
    results.to_json(public / "results.json", orient="records")

    print(results["status"].value_counts())


if __name__ == "__main__":
    main()