#!/usr/bin/env python3
"""
read_sessions.py
Read DoorDash session data from a JSON file and prepare a handy dictionary.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, List, Any


def load_sessions(path: str | Path) -> Dict[str, Any]:
    """Load the JSON file and return a dict with summary metrics."""
    path = Path(path).expanduser()
    sessions: List[dict] = json.loads(path.read_text())

    # --- index by date --------------------------------------------------------
    by_date = {s["date"]: s for s in sessions}

    # --- compute summary stats -----------------------------------------------
    total_earnings = sum(s["earnings"] for s in sessions)
    total_offers   = sum(s["offers"]   for s in sessions)
    total_dashes   = len(sessions)
    total_minutes  = sum(s["dash_min"] for s in sessions)

    summary = {
        "total_sessions": total_dashes,
        "total_earnings": round(total_earnings, 2),
        "total_offers":   total_offers,
        "avg_per_dash":   round(total_earnings / total_dashes, 2),
        "avg_per_offer":  round(total_earnings / total_offers, 2),
        "total_dash_min": total_minutes,
        "avg_per_hour":   round(total_earnings / (total_minutes / 60), 2),
    }

    return {
        "summary":  summary,
        "by_date":  by_date,
        "sessions": sessions,
    }


if __name__ == "__main__":
    data = load_sessions("doordash_sessions.json")
    # Pretty-print to verify
    print(json.dumps(data, indent=2))
