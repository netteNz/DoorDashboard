from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.data_service import DoorDashDataService
from config.settings import DATA_FILE
from datetime import datetime, timedelta
from collections import Counter

data_bp = Blueprint('data', __name__, url_prefix='/api')
data_service = DoorDashDataService(DATA_FILE)

@data_bp.route("/summary")
@jwt_required()
def api_summary():
    try:
        # Try to refresh cache first, but fall back to load_data if refresh_cache is not available
        try:
            data = data_service.refresh_cache()
        except AttributeError:
            data = data_service.load_data()
            
        sessions = data.get("sessions", [])
        
        # Calculate totals with error handling
        total_earnings = 0
        total_deliveries = 0
        total_dash_minutes = 0
        total_active_minutes = 0
        challenge_bonus_amount = 0
        challenge_bonus_count = 0
        
        for session in sessions:
            # Include challenge bonuses in total earnings
            if "challenge_bonus" in session:
                bonus_amount = float(session.get("challenge_bonus", 0))
                total_earnings += bonus_amount
                challenge_bonus_count += 1
                challenge_bonus_amount += bonus_amount
            
            # Sum delivery totals
            if "deliveries" in session:
                delivery_count = len(session.get("deliveries", []))
                total_deliveries += delivery_count
                
                for delivery in session.get("deliveries", []):
                    if "total" in delivery:
                        amount = float(delivery.get("total", 0))
                        total_earnings += amount
            
            # Sum time values
            if "dash_time_minutes" in session:
                dash_time = float(session.get("dash_time_minutes", 0))
                total_dash_minutes += dash_time
                    
            if "active_time_minutes" in session:
                active_time = float(session.get("active_time_minutes", 0))
                total_active_minutes += active_time
        
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

@data_bp.route('/restaurants')
@jwt_required()
def get_restaurant_data():
    # Group deliveries by restaurant
    restaurant_data = {}
    data = data_service.load_data()
    
    for session in data['sessions']:
        # Skip sessions without deliveries array
        if 'deliveries' not in session:
            continue
            
        for delivery in session['deliveries']:
            rest_name = delivery['restaurant']
            if rest_name not in restaurant_data:
                restaurant_data[rest_name] = {
                    'name': rest_name,
                    'deliveries_count': 0,
                    'total_earnings': 0.0,  # Explicitly use float
                    'base_pay_total': 0.0,  # Explicitly use float
                    'tips_total': 0.0,      # Explicitly use float
                    'dates': []
                }
            
            # Update restaurant stats with proper type conversion
            restaurant_data[rest_name]['deliveries_count'] += 1
            restaurant_data[rest_name]['total_earnings'] += float(delivery.get('total', 0))
            restaurant_data[rest_name]['base_pay_total'] += float(delivery.get('doordash_pay', 0))
            restaurant_data[rest_name]['tips_total'] += float(delivery.get('tip', 0))
            
            # Add date if not already included
            if session['date'] not in restaurant_data[rest_name]['dates']:
                restaurant_data[rest_name]['dates'].append(session['date'])
    
    # Convert to list and sort by total earnings
    restaurants_list = list(restaurant_data.values())
    
    # Add derived metrics
    for restaurant in restaurants_list:
        if restaurant['deliveries_count'] > 0:
            restaurant['avg_per_delivery'] = round(restaurant['total_earnings'] / restaurant['deliveries_count'], 2)
        else:
            restaurant['avg_per_delivery'] = 0
        restaurant['visit_count'] = len(restaurant['dates'])
    
    # Sort by total earnings (descending)
    restaurants_list.sort(key=lambda x: x['total_earnings'], reverse=True)
    
    return jsonify(restaurants_list)

@data_bp.route('/weekly')
@jwt_required()
def get_weekly_data():
    weekly_data = []
    week_map = {}
    data = data_service.load_data()
    
    # Sort sessions by date
    sorted_sessions = sorted(data['sessions'], key=lambda s: s['date'])
    
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
        if 'deliveries' in session:
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

@data_bp.route('/locations')
@jwt_required()
def get_locations():
    # Extract and count restaurant locations
    data = data_service.load_data()
    all_restaurants = []
    
    for session in data['sessions']:
        if 'deliveries' not in session:
            continue
        
        for delivery in session['deliveries']:
            if 'restaurant' in delivery:
                all_restaurants.append(delivery['restaurant'])
    
    # Count occurrences
    location_counts = Counter(all_restaurants)
    
    # Convert to list of objects with counts
    locations = [{'name': loc, 'count': count} for loc, count in location_counts.items()]
    
    # Sort by count descending
    locations.sort(key=lambda x: x['count'], reverse=True)
    
    return jsonify(locations)

@data_bp.route('/timeseries')
@jwt_required()
def get_timeseries_data():
    """Get earnings data over time for charting"""
    try:
        data = data_service.load_data()
        
        # Ensure sessions is ALWAYS an array, even if data structure is wrong
        sessions = data.get("sessions", []) if isinstance(data, dict) else []
        
        # Make sure we have a valid list and sort it properly
        if not isinstance(sessions, list):
            sessions = []
        else:
            # Sort by date - only sort if we have valid dates
            try:
                sessions = sorted(sessions, key=lambda x: x.get("date", ""))
            except Exception as e:
                print(f"Error sorting sessions: {e}")
                # Continue with unsorted sessions if sorting fails
        
        # Initialize response structure with empty arrays
        timeseries = {
            "labels": [],
            "earnings": [],
            "deliveries": [],
            "dash_time": [],
            "active_time": []
        }
        
        # Process each session with careful error handling
        for session in sessions:
            # Skip invalid sessions
            if not isinstance(session, dict) or "date" not in session:
                continue
                
            # Add date to labels
            timeseries["labels"].append(session["date"])
            
            # Calculate earnings safely
            session_earnings = 0
            if "earnings" in session and isinstance(session["earnings"], (int, float)):
                session_earnings = float(session["earnings"])
            else:
                try:
                    # Sum delivery totals if they exist
                    deliveries = session.get("deliveries", [])
                    if isinstance(deliveries, list):
                        for delivery in deliveries:
                            if isinstance(delivery, dict) and "total" in delivery:
                                session_earnings += float(delivery.get("total", 0))
                except Exception as e:
                    print(f"Error calculating earnings for session {session.get('date')}: {e}")
            
            timeseries["earnings"].append(round(session_earnings, 2))
            
            # Add delivery count (ensure it's a number)
            try:
                deliveries_count = int(session.get("deliveries_count", 0))
            except (ValueError, TypeError):
                deliveries_count = 0
            timeseries["deliveries"].append(deliveries_count)
            
            # Add time metrics (ensure they're numbers)
            try:
                dash_time = float(session.get("dash_time_minutes", 0))
            except (ValueError, TypeError):
                dash_time = 0
            timeseries["dash_time"].append(dash_time)
            
            try:
                active_time = float(session.get("active_time_minutes", 0))
            except (ValueError, TypeError):
                active_time = 0
            timeseries["active_time"].append(active_time)
        
        # Ensure we have data to return
        if not timeseries["labels"]:
            print("Warning: No valid timeseries data found")
            
        return jsonify(timeseries)
    except Exception as e:
        print(f"Error in timeseries endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "labels": [],
            "earnings": [],
            "deliveries": [],
            "dash_time": [],
            "active_time": [],
            "error": str(e)
        })