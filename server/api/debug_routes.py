from flask import Blueprint, request, jsonify
from core.data_service import DoorDashDataService
from config.settings import DATA_FILE

debug_bp = Blueprint('debug', __name__, url_prefix='/api/debug')
data_service = DoorDashDataService(DATA_FILE)

@debug_bp.route("")
def api_debug():
    """Debug endpoint to check data structure"""
    try:
        data = data_service.load_data()
        
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
            "data_file": str(DATA_FILE),
            "sample_session": first_session
        }
        
        return jsonify(debug_info)
    except Exception as e:
        return jsonify({"error": str(e)})

@debug_bp.route("/summary")
def api_debug_summary():
    """Debug endpoint to test summary calculations"""
    try:
        data = data_service.load_data()
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