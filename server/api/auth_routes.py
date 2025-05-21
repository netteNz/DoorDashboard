from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from core.auth import AuthService
from config.settings import USERS_FILE

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
auth_service = AuthService(USERS_FILE)

@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")
        email = data.get("email")
        
        # Validate input
        if not all([username, password, email]):
            return jsonify({"error": "Username, password, and email are required"}), 400
            
        # Register user
        result = auth_service.register_user(
            username=username,
            password=password,
            email=email
        )
        
        if result["success"]:
            # Generate JWT token
            access_token = create_access_token(identity=username)
            return jsonify({
                "message": "User registered successfully",
                "access_token": access_token,
                "user": result["user"]
            })
        else:
            return jsonify({"error": result["message"]}), 400
            
    except Exception as e:
        print(f"Error in register: {e}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        
        user = auth_service.validate_user(username, password)
        
        if user:
            # Generate JWT token
            access_token = create_access_token(identity=username)
            return jsonify({
                "message": "Login successful",
                "access_token": access_token,
                "user": user
            })
        else:
            return jsonify({"error": "Invalid username or password"}), 401
            
    except Exception as e:
        print(f"Error in login: {e}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/me")
@jwt_required()
def get_current_user():
    try:
        # Get username from token
        username = get_jwt_identity()
        print(f"Getting user profile for: {username}")
        
        users_data = auth_service.load_users()
        
        for user in users_data["users"]:
            if user["username"] == username:
                # Return user info without password
                user_info = {k: v for k, v in user.items() if k != "password"}
                return jsonify(user_info)
        
        return jsonify({"error": "User not found"}), 404
        
    except Exception as e:
        print(f"Error getting user: {e}")
        return jsonify({"error": str(e)}), 500