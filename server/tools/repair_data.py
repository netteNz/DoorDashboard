#!/usr/bin/env python
"""
DoorDashboard Data Repair Tool
------------------------------
Fix common issues in data files
"""
import sys
import json
import argparse
from pathlib import Path

# Adjust import path to include parent directory
sys.path.append(str(Path(__file__).parent.parent))

from config.settings import DATA_FILE

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

def repair_data(data_file=DATA_FILE, backup=True):
    """Repair common issues in data file"""
    try:
        # Create backup first
        if backup:
            backup_file = str(data_file) + ".bak"
            print(f"Creating backup at {backup_file}")
            with open(data_file, 'r') as src, open(backup_file, 'w') as dst:
                dst.write(src.read())
        
        # Load data
        with open(data_file, 'r') as f:
            data = json.load(f)
        
        # Check if sessions key exists
        if "sessions" not in data:
            print("Adding missing 'sessions' key")
            data["sessions"] = []
        
        # Fix common issues in sessions
        fixed_items = 0
        for i, session in enumerate(data["sessions"]):
            # Ensure date is in correct format
            if "date" in session and not session["date"].startswith("20"):
                parts = session["date"].split("-")
                if len(parts) == 3:
                    # Fix reversed date format
                    session["date"] = f"{parts[2]}-{parts[1]}-{parts[0]}"
                    fixed_items += 1
                    print(f"Fixed date format in session {i}")
            
            # Fix missing deliveries array
            if "deliveries_count" in session and session["deliveries_count"] > 0 and "deliveries" not in session:
                session["deliveries"] = []
                fixed_items += 1
                print(f"Added missing deliveries array in session {i}")
            
            # Fix numeric fields
            numeric_fields = ["dash_time_minutes", "active_time_minutes", "deliveries_count"]
            for field in numeric_fields:
                if field in session and not isinstance(session[field], (int, float)):
                    try:
                        session[field] = float(session[field])
                        fixed_items += 1
                        print(f"Fixed non-numeric {field} in session {i}")
                    except ValueError:
                        print(f"WARNING: Could not convert {field} to number in session {i}")
        
        # Process each session
        for i, session in enumerate(data.get("sessions", [])):
            # Normalize time fields
            if "active_time_minutes" in session:
                session["active_time_minutes"] = ensure_numeric(session["active_time_minutes"])
            if "dash_time_minutes" in session:
                session["dash_time_minutes"] = ensure_numeric(session["dash_time_minutes"])
            if "deliveries_count" in session:
                session["deliveries_count"] = ensure_numeric(session["deliveries_count"])
            
            # Process deliveries if present
            if "deliveries" in session:
                for j, delivery in enumerate(session["deliveries"]):
                    # Normalize delivery fields
                    if "doordash_pay" in delivery:
                        delivery["doordash_pay"] = ensure_numeric(delivery["doordash_pay"])
                    if "tip" in delivery:
                        delivery["tip"] = ensure_numeric(delivery["tip"]) 
                    if "total" in delivery:
                        delivery["total"] = ensure_numeric(delivery["total"])
                    
                    # Add merchant type if missing
                    if "merchant_type" not in delivery and "restaurant" in delivery:
                        merchant_name = delivery["restaurant"].lower()
                        if any(s in merchant_name for s in ["cvs", "walgreens", "walmart", "target", "dollar general", "7-eleven"]):
                            delivery["merchant_type"] = "Shopping"
                        elif any(s in merchant_name for s in ["kroger", "publix", "safeway", "albertsons", "aldi", "whole foods"]):
                            delivery["merchant_type"] = "Grocery"
                        elif any(s in merchant_name for s in ["mcdonald", "burger king", "wendy", "taco bell", "kfc", "chipotle"]):
                            delivery["merchant_type"] = "Fast Food"
                        else:
                            delivery["merchant_type"] = "Restaurant"
                
                # Update deliveries_count if needed
                session["deliveries_count"] = len(session["deliveries"])
        
        # Save fixed data
        with open(data_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"✅ Repair complete. Fixed {fixed_items} items.")
        return True
    except Exception as e:
        print(f"❌ Error repairing data: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='DoorDashboard Data Repair')
    
    parser.add_argument('--file', help='Data file to repair (default from settings)')
    parser.add_argument('--no-backup', action='store_true', help='Skip creating backup')
    
    args = parser.parse_args()
    
    data_file = args.file or DATA_FILE
    success = repair_data(data_file, not args.no_backup)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())