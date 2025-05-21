#!/usr/bin/env python
"""
DoorDashboard Setup Script
--------------------------
Creates initial admin user and performs other setup tasks
"""
import os
import sys
import json
import argparse
import secrets
import string
from pathlib import Path

# Adjust import path to include parent directory
sys.path.append(str(Path(__file__).parent.parent))

from core.auth import AuthService
from config.settings import USERS_FILE, DATA_FILE

def generate_secure_password(length=12):
    """Generate a cryptographically secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def create_user(username, password=None, email=None, is_admin=False):
    """Create a new user with given credentials"""
    if password is None:
        password = generate_secure_password()
        print(f"Generated secure password: {password}")
    
    if email is None:
        email = f"{username}@example.com"
    
    print(f"Creating user '{username}'...")
    
    try:
        auth_service = AuthService(USERS_FILE)
        result = auth_service.register_user(
            username=username,
            password=password,
            email=email,
            is_admin=is_admin
        )
        
        if result["success"]:
            print(f"✅ User created successfully!")
            print(f"Username: {username}")
            print(f"Password: {password}")
            print(f"Email: {email}")
            if is_admin:
                print(f"Role: Administrator")
            print("\nPlease change this password after first login")
            return True
        else:
            print(f"❌ Failed to create user: {result.get('message', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        return False

def verify_data_directory():
    """Ensure data directory exists with proper permissions"""
    data_dir = Path(DATA_FILE).parent
    
    if not data_dir.exists():
        print(f"Creating data directory: {data_dir}")
        data_dir.mkdir(parents=True)
    
    users_file = USERS_FILE
    if not Path(users_file).exists():
        print(f"Creating empty users file: {users_file}")
        Path(users_file).parent.mkdir(parents=True, exist_ok=True)
        with open(users_file, 'w') as f:
            json.dump({"users": []}, f)
    
    data_file = DATA_FILE
    if not Path(data_file).exists():
        print(f"Creating empty data file: {data_file}")
        Path(data_file).parent.mkdir(parents=True, exist_ok=True)
        with open(data_file, 'w') as f:
            json.dump({"sessions": []}, f)
    
    print("✅ Data directory setup complete")
    return True

def main():
    parser = argparse.ArgumentParser(description='DoorDashboard Setup')
    
    # Add command line arguments
    parser.add_argument('--username', default="admin", help='Admin username')
    parser.add_argument('--password', help='Admin password (will generate if not provided)')
    parser.add_argument('--email', help='Admin email')
    parser.add_argument('--no-admin', action='store_true', help='Create regular user instead of admin')
    parser.add_argument('--verify-only', action='store_true', help='Only verify data directory')
    
    args = parser.parse_args()
    
    # Always verify data directory first
    verify_data_directory()
    
    if args.verify_only:
        return 0
        
    # Create user if needed
    success = create_user(
        username=args.username,
        password=args.password,
        email=args.email,
        is_admin=not args.no_admin
    )
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())