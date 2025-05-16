from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List
import itertools
from collections import Counter
from functools import lru_cache

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from worker import precompute_aggregations
from data_service import DoorDashDataService

# Path to your data file
DATA_FILE = Path(__file__).parent / "data/doordash_sessions.json"

# Initialize the data service
data_service = DoorDashDataService(DATA_FILE)

# Create a timed cache for expensive operations
@lru_cache(maxsize=1)
def get_cached_data(timestamp=None):
    """Cache the data with proper error handling"""
    try:
        return data_service.load_data()
    except Exception as e:
        print(f"Error in get_cached_data: {e}")
        # Return minimal valid data structure
        return {"sessions": [], "summary": {}}

def refresh_cache():
    """Force cache refresh by creating a new timestamp"""
    get_cached_data.cache_clear()
    return get_cached_data(datetime.now().timestamp())

# Enhanced data loading with error handling
def load_sessions(path: Path) -> Dict[str, Any]:
    try:
        if not path.exists():
            raise FileNotFoundError(f"Cannot find data file: {path.resolve()}")

        # Load the full JSON object first
        data = json.loads(path.read_text())
        
        return {
            "sessions": data["sessions"],
            "by_date": {s["date"]: s for s in data["sessions"]},
            "summary": calculate_summary(data["sessions"])
        }
    except Exception as e:
        print(f"Error loading data: {e}")
        return {"sessions": [], "by_date": {}, "summary": {}}

def calculate_summary(sessions):
    # Move the summary calculation to a separate function for clarity
    total_earnings = 0
    total_offers = 0
    total_dash_minutes = 0
    total_active_minutes = 0
    challenge_bonus_total = 0

    for session in sessions:
        # Handle challenge bonuses
        if "challenge_bonus" in session:
            challenge_bonus_total += session["challenge_bonus"]
            total_earnings += session["challenge_bonus"]
        else:
            # Standard delivery session
            session_earnings = sum(delivery["total"] for delivery in session["deliveries"])
            total_earnings += session_earnings
            total_offers += session["deliveries_count"]
            
            # Only include time metrics for regular delivery sessions
            if "dash_time_minutes" in session and "active_time_minutes" in session:
                total_dash_minutes += session["dash_time_minutes"]
                total_active_minutes += session["active_time_minutes"]

    dash_count = len([s for s in sessions if "deliveries_count" in s and s["deliveries_count"] > 0])

    return {
        "total_sessions": dash_count,
        "total_earnings": round(total_earnings, 2),
        "total_offers": total_offers,
        "challenge_bonus_total": round(challenge_bonus_total, 2),
        "avg_per_dash": round(total_earnings / dash_count, 2) if dash_count else 0,
        "avg_per_offer": round(total_earnings / total_offers, 2) if total_offers else 0,
        "total_dash_min": total_dash_minutes,
        "total_active_min": total_active_minutes,
        "avg_per_hour": round(total_earnings / (total_dash_minutes / 60), 2) if total_dash_minutes else 0,
        "session_count": dash_count,
        "total_miles": 0,
        "total_gas": 0,
    }

DATA = get_cached_data()

# Serve the React build from ../client/dist
CLIENT_BUILD = Path(__file__).parent.parent / "client" / "dist"

app = Flask(__name__, static_folder=str(CLIENT_BUILD), static_url_path='')
CORS(app)

# API routes
@app.route("/api/summary")
def api_summary():
    try:
        # Force cache refresh to ensure fresh data
        data = refresh_cache()
        sessions = data.get("sessions", [])
        
        # Detailed logging for debugging
        print(f"Processing {len(sessions)} sessions for summary")
        
        # Calculate totals with error handling
        total_earnings = 0
        total_deliveries = 0
        total_dash_minutes = 0
        total_active_minutes = 0
        
        # Count challenge bonuses separately for debugging
        challenge_bonus_count = 0
        challenge_bonus_amount = 0
        
        # Log each session for debugging
        session_details = []
        
        for i, session in enumerate(sessions):
            session_info = {
                "index": i,
                "date": session.get("date", "unknown"),
                "has_deliveries": "deliveries" in session,
                "delivery_count": 0,
                "earnings": 0
            }
            
            # Include challenge bonuses in total earnings
            if "challenge_bonus" in session:
                bonus_amount = float(session.get("challenge_bonus", 0))
                total_earnings += bonus_amount
                challenge_bonus_count += 1
                challenge_bonus_amount += bonus_amount
                session_info["challenge_bonus"] = bonus_amount
            
            # Sum delivery totals
            if "deliveries" in session:
                # Count actual delivery items
                delivery_count = len(session.get("deliveries", []))
                total_deliveries += delivery_count
                session_info["delivery_count"] = delivery_count
                
                session_earnings = 0
                for delivery in session.get("deliveries", []):
                    if "total" in delivery:
                        try:
                            amount = float(delivery.get("total", 0))
                            total_earnings += amount
                            session_earnings += amount
                        except (TypeError, ValueError) as e:
                            print(f"Error converting delivery total: {e}")
                
                session_info["earnings"] = session_earnings
            
            # Sum time values
            if "dash_time_minutes" in session:
                try:
                    dash_time = float(session.get("dash_time_minutes", 0))
                    total_dash_minutes += dash_time
                    session_info["dash_time"] = dash_time
                except (TypeError, ValueError) as e:
                    print(f"Error converting dash time: {e}")
                    
            if "active_time_minutes" in session:
                try:
                    active_time = float(session.get("active_time_minutes", 0))
                    total_active_minutes += active_time
                    session_info["active_time"] = active_time
                except (TypeError, ValueError) as e:
                    print(f"Error converting active time: {e}")
            
            session_details.append(session_info)
        
        # Print detailed summary for debugging
        print(f"Total deliveries: {total_deliveries}")
        print(f"Total earnings: ${total_earnings:.2f}")
        print(f"Challenge bonuses: ${challenge_bonus_amount:.2f} ({challenge_bonus_count} bonuses)")
        
        # Calculate averages (avoid division by zero)
        avg_per_delivery = total_earnings / max(1, total_deliveries)
        avg_per_hour = total_earnings / (total_dash_minutes / 60) if total_dash_minutes > 0 else 0
        time_efficiency = (total_active_minutes / total_dash_minutes * 100) if total_dash_minutes > 0 else 0
        
        summary = {
            "total_earnings": round(total_earnings, 2),
            "total_deliveries": total_deliveries,
            "total_offers": total_deliveries,  # Add alias for compatibility
            "total_dash_min": total_dash_minutes,
            "total_active_min": total_active_minutes,
            "avg_per_delivery": round(avg_per_delivery, 2),
            "avg_per_hour": round(avg_per_hour, 2),
            "time_efficiency": round(time_efficiency, 2),
            "challenge_bonus_total": round(challenge_bonus_amount, 2),
            # Add debug fields that can be removed later
            "debug_session_count": len(sessions),
            "debug_has_challenge_count": challenge_bonus_count
        }
        
        return jsonify(summary)
    except Exception as e:
        print(f"Error in summary endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "total_earnings": 0,
            "total_deliveries": 0,
            "total_dash_min": 0,
            "total_active_min": 0,
            "avg_per_delivery": 0,
            "avg_per_hour": 0,
            "time_efficiency": 0,
            "error": str(e)
        })

@app.route("/api/timeseries")
def api_timeseries():
    sessions_sorted = sorted(
        DATA["sessions"],
        key=lambda s: datetime.strptime(s["date"], "%Y-%m-%d")
    )
    return jsonify(sessions_sorted)

# Get restaurant delivery stats
@app.route('/api/restaurants')
def get_restaurant_data():
    # Group deliveries by restaurant
    restaurant_data = {}
    
    for session in DATA['sessions']:
        # Skip sessions without deliveries array (like challenge bonuses)
        if 'deliveries' not in session:
            continue
            
        for delivery in session['deliveries']:
            rest_name = delivery['restaurant']
            if rest_name not in restaurant_data:
                restaurant_data[rest_name] = {
                    'name': rest_name,
                    'deliveries_count': 0,
                    'total_earnings': 0,
                    'base_pay_total': 0,
                    'tips_total': 0,
                    'dates': []
                }
            
            # Update restaurant stats
            restaurant_data[rest_name]['deliveries_count'] += 1
            restaurant_data[rest_name]['total_earnings'] += delivery['total']
            restaurant_data[rest_name]['base_pay_total'] += delivery['doordash_pay']
            restaurant_data[rest_name]['tips_total'] += delivery['tip']
            
            # Add date if not already included
            if session['date'] not in restaurant_data[rest_name]['dates']:
                restaurant_data[rest_name]['dates'].append(session['date'])
    
    # Calculate average metrics and convert to list
    restaurants_list = []
    for rest_data in restaurant_data.values():
        rest_data['avg_per_delivery'] = round(rest_data['total_earnings'] / rest_data['deliveries_count'], 2)
        rest_data['dates_count'] = len(rest_data['dates'])
        restaurants_list.append(rest_data)
    
    # Sort by most deliveries
    restaurants_list.sort(key=lambda x: x['deliveries_count'], reverse=True)
    
    return jsonify(restaurants_list)

# Group sessions by week
@app.route('/api/weekly')
def get_weekly_data():
    weekly_data = []
    week_map = {}
    
    # Sort sessions by date
    sorted_sessions = sorted(DATA['sessions'], key=lambda s: s['date'])
    
    for session in sorted_sessions:
        date_obj = datetime.strptime(session['date'], '%Y-%m-%d')
        # Find the Monday of this week
        start_of_week = date_obj - timedelta(days=date_obj.weekday())
        week_key = start_of_week.strftime('%Y-%m-%d')
        
        # Calculate end of week (Sunday)
        end_of_week = start_of_week + timedelta(days=6)
        end_key = end_of_week.strftime('%Y-%m-%d')
        
        # Create or update week data
        if week_key not in week_map:
            week_num = int(start_of_week.strftime('%V'))  # ISO week number
            week_map[week_key] = {
                'id': len(week_map) + 1,
                'week_number': week_num,
                'start_date': week_key,
                'end_date': end_key,
                'earnings': 0,
                'deliveries': 0,
                'dash_minutes': 0,
                'active_minutes': 0,
                'gas': 0,
                'challenge_bonus': 0
            }
        
        # Add challenge bonus if present
        if 'challenge_bonus' in session:
            week_map[week_key]['challenge_bonus'] += session['challenge_bonus']
            week_map[week_key]['earnings'] += session['challenge_bonus']
            continue
        
        # Sum up the week's delivery data
        session_earnings = sum(delivery['total'] for delivery in session['deliveries'])
        week_map[week_key]['earnings'] += session_earnings
        week_map[week_key]['deliveries'] += session['deliveries_count']
        
        # Only add time metrics if available
        if 'dash_time_minutes' in session and 'active_time_minutes' in session:
            week_map[week_key]['dash_minutes'] += session['dash_time_minutes']
            week_map[week_key]['active_minutes'] += session['active_time_minutes']
    
    # Convert map to sorted list
    weekly_data = list(week_map.values())
    weekly_data.sort(key=lambda w: w['start_date'])
    
    return jsonify(weekly_data)

# Get location data from deliveries
@app.route('/api/locations')
def get_locations():
    # Extract all delivery locations
    locations = []
    for session in DATA['sessions']:
        for delivery in session['deliveries']:
            if 'dropoff_location' in delivery:
                locations.append(delivery['dropoff_location'])
    
    # Count occurrences of each location
    location_counts = Counter(locations)
    
    # Format as list of objects
    location_data = [
        {'name': location, 'count': count} 
        for location, count in location_counts.most_common(10)
    ]
    
    return jsonify(location_data)

# Combined data endpoint with filtering via query parameters
@app.route("/api/sessions")
def api_sessions():
    data = get_cached_data()
    
    # Get query parameters for filtering
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    merchant = request.args.get('merchant')
    merchant_type = request.args.get('merchant_type')
    limit = int(request.args.get('limit', 1000))
    offset = int(request.args.get('offset', 0))
    
    sessions = data["sessions"]
    
    # Apply filters if provided
    if start_date:
        sessions = [s for s in sessions if s["date"] >= start_date]
    if end_date:
        sessions = [s for s in sessions if s["date"] <= end_date]
    if merchant:
        sessions = [s for s in sessions if any(d["restaurant"] == merchant for d in s.get("deliveries", []))]
    
    # Get total count before pagination
    total_count = len(sessions)
    
    # Paginate results
    sessions = sessions[offset:offset+limit]
    
    return jsonify({
        "sessions": sessions,
        "total": total_count,
        "limit": limit,
        "offset": offset
    })

# Data modification endpoint
@app.route("/api/sessions", methods=["POST"])
def add_session():
    try:
        new_session = request.json
        
        # Validate input
        if not validate_session(new_session):
            return jsonify({"error": "Invalid session data"}), 400
            
        # Add new session
        success = data_service.add_session(new_session)
        if not success:
            return jsonify({"error": "Failed to save session data"}), 500
        
        # Explicitly refresh cache - IMPORTANT FIX
        refresh_cache()
        
        # Also clear any other cached endpoints
        get_cached_data.cache_clear()
        if 'get_weekly_data_cached' in globals():
            get_weekly_data_cached.cache_clear()
        
        return jsonify({"success": True, "message": "Session added successfully"})
    
    except Exception as e:
        print(f"Error adding session: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    try:
        # Convert string ID to int if needed
        session_id = int(session_id) if session_id.isdigit() else session_id
        
        success = data_service.delete_session(session_id)
        
        if success:
            # Refresh the cache after deletion
            refresh_cache()
            return jsonify({"success": True, "message": "Session deleted successfully"})
        else:
            return jsonify({"error": "Session not found"}), 404
            
    except Exception as e:
        print(f"Error deleting session: {e}")
        return jsonify({"error": str(e)}), 500

def validate_session(session):
    """Validate session data structure"""
    required_fields = ["date", "deliveries_count"]
    
    # Check required fields
    for field in required_fields:
        if field not in session:
            return False
    
    # If it has deliveries, validate each one
    if "deliveries" in session and isinstance(session["deliveries"], list):
        for delivery in session["deliveries"]:
            if not all(k in delivery for k in ["restaurant", "doordash_pay", "tip", "total"]):
                return False
                
    return True

# Debugging endpoint
@app.route("/api/debug")
def api_debug():
    """Debug endpoint to check data structure"""
    try:
        data = get_cached_data()
        
        # Basic stats
        session_count = len(data.get("sessions", []))
        
        # Check for common issues
        sessions_with_deliveries = sum(1 for s in data.get("sessions", []) 
                                      if "deliveries" in s and s["deliveries"])
        
        # Sample the first session if available
        first_session = {}
        if data.get("sessions"):
            first_session = data["sessions"][0]
            # Limit the size to avoid huge response
            if "deliveries" in first_session and len(first_session["deliveries"]) > 2:
                first_session = {**first_session}  # Create a copy
                first_session["deliveries"] = first_session["deliveries"][:2]
                first_session["deliveries"].append({"note": "... (truncated)"})
        
        debug_info = {
            "total_sessions": session_count,
            "sessions_with_deliveries": sessions_with_deliveries,
            "sample_session": first_session
        }
        
        return jsonify(debug_info)
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route("/api/debug/summary")
def api_debug_summary():
    """Debug endpoint to test summary calculations"""
    try:
        data = get_cached_data()
        sessions = data.get("sessions", [])
        
        # Detailed calculation breakdown
        session_breakdown = []
        total_deliveries = 0
        total_earnings = 0
        
        for i, session in enumerate(sessions):
            session_data = {
                "index": i,
                "date": session.get("date", "N/A"),
                "has_deliveries": "deliveries" in session,
                "deliveries_count": len(session.get("deliveries", [])),
                "has_challenge": "challenge_bonus" in session,
                "challenge_amount": session.get("challenge_bonus", 0)
            }
            
            # Count deliveries and add up earnings
            if "deliveries" in session:
                delivery_count = len(session.get("deliveries", []))
                total_deliveries += delivery_count
                session_data["delivery_earnings"] = sum(
                    float(d.get("total", 0)) for d in session.get("deliveries", [])
                )
                total_earnings += session_data["delivery_earnings"]
            
            # Add challenge bonus
            if "challenge_bonus" in session:
                challenge_amount = float(session.get("challenge_bonus", 0))
                total_earnings += challenge_amount
            
            session_breakdown.append(session_data)
        
        return jsonify({
            "total_sessions": len(sessions),
            "total_deliveries": total_deliveries,
            "total_earnings": total_earnings,
            "session_breakdown": session_breakdown
        })
    except Exception as e:
        return jsonify({"error": str(e)})

# Frontend route
@app.route("/", defaults={'path': ''})
@app.route("/<path:path>")
def serve_react(path):
    file_path = CLIENT_BUILD / path
    if file_path.exists():
        return send_from_directory(CLIENT_BUILD, path)
    else:
        return send_from_directory(CLIENT_BUILD, 'index.html')

if __name__ == "__main__":
    app.run(debug=True, port=5000)
