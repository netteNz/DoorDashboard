import json
from pathlib import Path
import sys

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

def repair_json_file(json_path):
    """Repair JSON data file by normalizing all numeric fields"""
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        print(f"Loaded JSON file: {json_path}")
        
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
        
        # Make backup of original file
        backup_path = json_path.with_suffix('.json.bak')
        with open(backup_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Created backup at: {backup_path}")
        
        # Save repaired data
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Successfully repaired and saved data to: {json_path}")
        return True
    
    except Exception as e:
        print(f"Error repairing data: {e}")
        return False

if __name__ == "__main__":
    data_path = Path(__file__).parent / "data/doordash_sessions.json"
    
    # Allow custom path from command line
    if len(sys.argv) > 1:
        data_path = Path(sys.argv[1])
    
    repair_json_file(data_path)