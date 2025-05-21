from datetime import datetime

def validate_session(session):
    """Validate session data structure"""
    required_fields = ["date", "deliveries_count"]
    
    # Check required fields
    for field in required_fields:
        if field not in session:
            return False
    
    # Validate date format
    try:
        datetime.strptime(session["date"], "%Y-%m-%d")
    except ValueError:
        return False
    
    # If it has deliveries, validate each one
    if "deliveries" in session and isinstance(session["deliveries"], list):
        for delivery in session["deliveries"]:
            if not all(k in delivery for k in ["restaurant", "doordash_pay", "tip", "total"]):
                return False
                
    return True

def validate_numeric_fields(data, fields):
    """Validate that specified fields contain numeric values"""
    for field in fields:
        if field in data:
            try:
                float(data[field])
            except (ValueError, TypeError):
                return False
    return True