from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List
import itertools
from collections import Counter
from functools import lru_cache
import os
import bcrypt

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta

# Import settings
from config.settings import (
    CLIENT_BUILD, 
    JWT_SECRET_KEY, 
    JWT_ACCESS_TOKEN_EXPIRES,
    DEBUG,
    PORT,
    HOST,
    DATA_FILE
)

# Import services
from core.data_service import DoorDashDataService
from core.auth import AuthService

# Import blueprints
from api.auth_routes import auth_bp
from api.data_routes import data_bp
from api.session_routes import session_bp
from api.debug_routes import debug_bp

# Initialize services
data_service = DoorDashDataService(DATA_FILE)
auth_service = AuthService()

def create_app():
    app = Flask(__name__, static_folder=str(CLIENT_BUILD), static_url_path='')
    
    # Configure CORS properly for development
    if DEBUG:
        # More permissive CORS for development
        CORS(app, resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:3000",
                    "http://localhost:5173",  # Vite default port
                    "http://127.0.0.1:3000",
                    "http://127.0.0.1:5173"
                ],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"]
            }
        })
    else:
        # More restrictive CORS for production
        CORS(app)
    
    # Configure JWT
    app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=JWT_ACCESS_TOKEN_EXPIRES)
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_HEADER_NAME"] = "Authorization"
    app.config["JWT_HEADER_TYPE"] = "Bearer"
    
    # Initialize JWT
    jwt = JWTManager(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(data_bp)
    app.register_blueprint(session_bp)
    app.register_blueprint(debug_bp)
    
    # Default route - serve React app
    @app.route("/", defaults={'path': ''})
    @app.route("/<path:path>")
    def serve_react(path):
        file_path = CLIENT_BUILD / path
        if file_path.exists():
            return send_from_directory(CLIENT_BUILD, path)
        else:
            return send_from_directory(CLIENT_BUILD, 'index.html')
    
    return app

# Create app instance
app = create_app()

# This is the only code that should be outside create_app()
if __name__ == "__main__":
    app.run(debug=DEBUG, port=PORT, host=HOST)

# Optional: Schedule background tasks if running in production
if __name__ != "__main__" and not DEBUG:
    import threading
    import time
    from tools.worker import precompute_aggregations
    
    def background_worker():
        """Run precomputation every hour"""
        while True:
            precompute_aggregations()
            time.sleep(3600)  # Sleep for 1 hour
    
    # Start background thread
    worker_thread = threading.Thread(target=background_worker, daemon=True)
    worker_thread.start()
