import requests
import json
from datetime import datetime

# Test creating a schedule event
test_data = {
    "title": "Test Event",
    "event_time": datetime.now().isoformat(),
    "status": "upcoming"
}

print("Testing Schedule Creation...")
print(f"Sending data: {json.dumps(test_data, indent=2, default=str)}")
print()

try:
    response = requests.post(
        "http://localhost:8000/api/schedule",
        json=test_data,
        timeout=5
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
