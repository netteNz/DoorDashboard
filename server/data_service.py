import json
from pathlib import Path
from datetime import datetime
import os
import threading
import time
from typing import Dict, Any, List

class DoorDashDataService:
    def __init__(self, data_file: Path):
        self.data_file = data_file
        self.cache_file = data_file.parent / "cache.json"
        self._data = None
        self._last_load_time = 0
        self.load_data()
    
    def load_data(self) -> Dict[str, Any]:
        """Load data from file with file change detection"""
        try:
            current_mtime = os.path.getmtime(self.data_file)
            
            # Only reload if file has changed or not loaded yet
            if self._data is None or current_mtime > self._last_load_time:
                with open(self.data_file, 'r') as f:
                    self._data = json.load(f)
                self._last_load_time = current_mtime
                
                # Process the data to add derived fields
                self._process_data()
                
            return self._data
        except Exception as e:
            print(f"Error loading data: {e}")
            # Return empty data structure to prevent crashes
            return {"sessions": [], "currency": "USD"}
    
    def _process_data(self):
        """Add derived fields to each session and normalize data types"""
        try:
            for session in self._data.get('sessions', []):
                # Skip sessions without deliveries
                if "deliveries" not in session:
                    continue
                    
                # Ensure numeric fields are properly typed
                if "active_time_minutes" in session:
                    session["active_time_minutes"] = self._ensure_numeric(session["active_time_minutes"])
                if "dash_time_minutes" in session:
                    session["dash_time_minutes"] = self._ensure_numeric(session["dash_time_minutes"])
                if "deliveries_count" in session:
                    session["deliveries_count"] = self._ensure_numeric(session["deliveries_count"])
                                       
                # Process each delivery to ensure consistent types
                for delivery in session.get("deliveries", []):
                    if "total" in delivery:
                        delivery["total"] = self._ensure_numeric(delivery["total"])
                    if "doordash_pay" in delivery:
                        delivery["doordash_pay"] = self._ensure_numeric(delivery["doordash_pay"])
                    if "tip" in delivery:
                        delivery["tip"] = self._ensure_numeric(delivery["tip"])
                    
                    # Add merchant_type if not present
                    if "merchant_type" not in delivery and "restaurant" in delivery:
                        delivery["merchant_type"] = self._get_merchant_type(delivery["restaurant"])
                
                # Calculate session earnings if not already present
                if "earnings" not in session:
                    # Use the normalized values for calculation
                    session["earnings"] = sum(
                        delivery.get("total", 0) 
                        for delivery in session.get("deliveries", [])
                    )
        except Exception as e:
            print(f"Error processing data: {e}")
    
    def _ensure_numeric(self, value):
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
    
    def _get_merchant_type(self, merchant_name: str) -> str:
        """Determine merchant type from name"""
        if not merchant_name:
            return "Restaurant"
            
        merchant_name_lower = merchant_name.lower()
        
        # Shopping/Pharmacy
        if any(s in merchant_name_lower for s in ["cvs", "walgreens", "walmart", "target", "dollar general", "7-eleven"]):
            return "Shopping"
            
        # Grocery
        if any(s in merchant_name_lower for s in ["kroger", "publix", "safeway", "albertsons", "aldi", "whole foods"]):
            return "Grocery"
            
        # Fast food
        if any(s in merchant_name_lower for s in ["mcdonald", "burger king", "wendy", "taco bell", "kfc", "chipotle"]):
            return "Fast Food"
            
        # Default
        return "Restaurant"

    def add_session(self, session_data: Dict[str, Any]) -> bool:
        """Add a new session to the data"""
        try:
            # Force reload data to ensure we have latest
            self._data = None
            data = self.load_data()
            
            # Add the new session
            data["sessions"].append(session_data)
            
            # Save the updated data back to the file
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2)
                
            # Force reload on next access
            self._data = None
            
            return True
        except Exception as e:
            print(f"Error adding session: {e}")
            return False

    def delete_session(self, session_index: int) -> bool:
        """Delete a session by its index"""
        try:
            # Force reload data to ensure we have latest
            self._data = None
            data = self.load_data()
            
            if session_index < 0 or session_index >= len(data["sessions"]):
                return False
            
            # Remove the session at the specified index
            data["sessions"].pop(session_index)
            
            # Save the updated data back to the file
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2)
                
            # Force reload on next access
            self._data = None
            
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False