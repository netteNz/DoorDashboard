import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"

# Data files
DATA_FILE = DATA_DIR / "doordash_sessions.json"
USERS_FILE = DATA_DIR / "users.json"
CACHE_FILE = DATA_DIR / "cache.json"

# Server settings
DEBUG = os.environ.get("DEBUG", "True").lower() == "true"
PORT = int(os.environ.get("PORT", 5000))
HOST = os.environ.get("HOST", "0.0.0.0")

# JWT settings
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-this")
JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get("JWT_TOKEN_EXPIRES", 12))  # hours

# Client build path
CLIENT_BUILD = BASE_DIR.parent / "client" / "dist"