from pathlib import Path
import json
import bcrypt
from typing import Dict, Optional
from datetime import datetime
from config.settings import USERS_FILE

class AuthService:
    def __init__(self, users_file=USERS_FILE):
        self.users_file = users_file
        
    def load_users(self):
        """Load users from JSON file"""
        try:
            if not Path(self.users_file).exists():
                # Create directory if it doesn't exist
                Path(self.users_file).parent.mkdir(parents=True, exist_ok=True)
                # Create initial users file
                with open(self.users_file, 'w') as f:
                    json.dump({"users": []}, f)
                return {"users": []}
            
            with open(self.users_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading users: {e}")
            return {"users": []}
    
    def save_users(self, users_data):
        """Save users to JSON file"""
        # Create directory if it doesn't exist
        Path(self.users_file).parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.users_file, 'w') as f:
            json.dump(users_data, f, indent=2)
    
    def register_user(self, username, password, email, is_admin=False):
        """Register a new user"""
        users_data = self.load_users()
        
        # Check if username already exists
        if any(u.get('username') == username for u in users_data.get('users', [])):
            return {"success": False, "message": "Username already exists"}
        
        # Hash password
        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Generate new user id
        next_id = 1
        if users_data.get('users'):
            next_id = max(u.get('id', 0) for u in users_data.get('users', [])) + 1
        
        # Create new user
        new_user = {
            "id": next_id,
            "username": username,
            "password": hashed_pw.decode('utf-8'),
            "email": email,
            "created_at": datetime.now().isoformat(),
            "is_admin": is_admin
        }
        
        users_data['users'].append(new_user)
        self.save_users(users_data)
        
        # Return user without password
        user_info = {k: v for k, v in new_user.items() if k != 'password'}
        return {"success": True, "user": user_info}
    
    def validate_user(self, username, password):
        """Validate username and password"""
        users_data = self.load_users()
        
        for user in users_data.get('users', []):
            if user.get('username') == username:
                stored_pw = user.get('password', '').encode('utf-8')
                if bcrypt.checkpw(password.encode('utf-8'), stored_pw):
                    # Return user info without password
                    return {k: v for k, v in user.items() if k != 'password'}
        
        return None