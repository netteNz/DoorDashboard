from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.data_service import DoorDashDataService
from config.settings import DATA_FILE
from utils.validation import validate_session

session_bp = Blueprint('session', __name__, url_prefix='/api/sessions')
data_service = DoorDashDataService(DATA_FILE)

@session_bp.route("")
@jwt_required()
def get_sessions():
    data = data_service.load_data()
    
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

@session_bp.route("", methods=["POST"])
@jwt_required()
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
        
        # Refresh cache
        data_service.refresh_cache()
        
        return jsonify({"success": True, "message": "Session added successfully"})
    
    except Exception as e:
        print(f"Error adding session: {e}")
        return jsonify({"error": str(e)}), 500

@session_bp.route("/<session_id>", methods=["DELETE"])
@jwt_required()
def delete_session(session_id):
    try:
        session_index = int(session_id)
        success = data_service.delete_session(session_index)
        
        if success:
            # Refresh cache
            data_service.refresh_cache()
            return jsonify({"success": True, "message": "Session deleted successfully"})
        else:
            return jsonify({"error": "Failed to delete session"}), 404
    except ValueError:
        return jsonify({"error": "Invalid session ID"}), 400
    except Exception as e:
        print(f"Error deleting session: {e}")
        return jsonify({"error": str(e)}), 500