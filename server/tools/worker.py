import json
from pathlib import Path
import time
from collections import defaultdict
import sys
from pathlib import Path

# Add parent directory to path so we can import modules
sys.path.append(str(Path(__file__).parent.parent))

# Update file paths to use the project root
PROJECT_ROOT = Path(__file__).parent.parent
DATA_FILE = PROJECT_ROOT / "data/doordash_sessions.json"
CACHE_FILE = PROJECT_ROOT / "data/cache.json"

def ensure_numeric(value):
    """Convert various data types to a numeric (float) value"""
    if isinstance(value, (int, float)):
        return float(value)
    elif isinstance(value, str):
        # Remove any currency symbols or commas
        clean_value = value.replace('$', '').replace(',', '').strip()
        try:
            return float(clean_value)
        except ValueError:
            print(f"Warning: Could not convert '{value}' to a number, using 0")
            return 0.0
    else:
        # For None or other types
        return 0.0

def precompute_aggregations():
    """Background worker to precompute common aggregations"""
    try:
        print("Starting precomputation of aggregations...")
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
            
        sessions = data.get('sessions', [])
        
        # Precompute common aggregations
        aggregations = {
            "merchants": defaultdict(lambda: {
                "count": 0, 
                "earnings": 0.0,
                "base_pay": 0.0,
                "tips": 0.0
            }),
            "by_date": defaultdict(lambda: {
                "count": 0,
                "earnings": 0.0,
                "active_time": 0,
                "dash_time": 0
            }),
            "summary": {
                "total_earnings": 0.0,
                "total_deliveries": 0,
                "total_dash_minutes": 0,
                "total_active_minutes": 0,
            }
        }
        
        # Process each session
        for session in sessions:
            # Get session date
            date_key = session.get("date", "unknown")
            
            # Process time fields
            active_time = ensure_numeric(session.get("active_time_minutes", 0))
            dash_time = ensure_numeric(session.get("dash_time_minutes", 0))
            
            # Update summary totals
            aggregations["summary"]["total_dash_minutes"] += dash_time
            aggregations["summary"]["total_active_minutes"] += active_time
            
            # Update date aggregation
            date_agg = aggregations["by_date"][date_key]
            date_agg["active_time"] += active_time
            date_agg["dash_time"] += dash_time
            
            # Skip if no deliveries
            if "deliveries" not in session or not session["deliveries"]:
                continue
                
            # Process each delivery
            session_earnings = 0.0
            for delivery in session["deliveries"]:
                merchant = delivery.get("restaurant", "Unknown")
                doordash_pay = ensure_numeric(delivery.get("doordash_pay", 0))
                tip = ensure_numeric(delivery.get("tip", 0))
                total = ensure_numeric(delivery.get("total", 0))
                
                # Update merchant stats
                merchant_agg = aggregations["merchants"][merchant]
                merchant_agg["count"] += 1
                merchant_agg["earnings"] += total
                merchant_agg["base_pay"] += doordash_pay
                merchant_agg["tips"] += tip
                
                # Add to session earnings
                session_earnings += total
                
                # Increment total deliveries
                aggregations["summary"]["total_deliveries"] += 1
            
            # Update session earnings
            aggregations["summary"]["total_earnings"] += session_earnings
            date_agg["earnings"] += session_earnings
            date_agg["count"] += len(session.get("deliveries", []))
        
        # Calculate derived metrics
        summary = aggregations["summary"]
        total_deliveries = max(1, summary["total_deliveries"])  # Avoid division by zero
        total_dash_hours = max(0.01, summary["total_dash_minutes"] / 60)  # Avoid division by zero
        
        summary["avg_per_delivery"] = summary["total_earnings"] / total_deliveries
        summary["avg_per_hour"] = summary["total_earnings"] / total_dash_hours
        summary["time_efficiency"] = (summary["total_active_minutes"] / max(1, summary["total_dash_minutes"])) * 100
        
        # Convert defaultdicts to regular dicts for JSON serialization
        cleaned_aggregations = {
            "merchants": {k: dict(v) for k, v in aggregations["merchants"].items()},
            "by_date": {k: dict(v) for k, v in aggregations["by_date"].items()},
            "summary": aggregations["summary"]
        }
        
        # Save to cache file
        with open(CACHE_FILE, 'w') as f:
            json.dump({
                "timestamp": time.time(),
                "aggregations": cleaned_aggregations
            }, f, indent=2)
            
        print("Precomputation complete")
        return cleaned_aggregations
        
    except Exception as e:
        print(f"Error in precomputation: {e}")
        return None

if __name__ == "__main__":
    precompute_aggregations()