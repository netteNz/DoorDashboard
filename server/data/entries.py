import json
from pathlib import Path

def load_sessions(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_sessions(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def add_new_session():
    session = {
        "date": input("Date (YYYY-MM-DD): "),
        "start_time": input("Start Time (HH:MM, 24h): "),
        "end_time": input("End Time (HH:MM, 24h): "),
        "active_time_minutes": int(input("Active Time (minutes): ")),
        "dash_time_minutes": int(input("Dash Time (minutes): ")),
        "deliveries_count": int(input("Number of deliveries: ")),
        "deliveries": []
    }

    for i in range(session["deliveries_count"]):
        print(f"\nDelivery #{i + 1}")
        restaurant = input("Restaurant name: ")
        doordash_pay = float(input("DoorDash pay: "))
        tip = float(input("Customer tip: "))
        delivery = {
            "restaurant": restaurant,
            "doordash_pay": doordash_pay,
            "tip": tip,
            "total": round(doordash_pay + tip, 2)
        }
        session["deliveries"].append(delivery)

    return session

# File path
json_path = Path("doordash_sessions.json")

# Load → Append → Save
data = load_sessions(json_path)
new_session = add_new_session()
data["sessions"].append(new_session)
save_sessions(json_path, data)

print("✅ New session added successfully!")
