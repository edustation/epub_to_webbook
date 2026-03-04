import requests
import json
import time

API_BASE = "http://localhost:8002"

def test_complete_registration():
    email = "test@example.com"
    username = f"testuser_{int(time.time())}"
    password = "testpassword"
    full_name = "Test User"
    nationality = "Vietnam"
    code = "572771" # Captured from logs
    
    print(f"2. Registering user {username}...")
    try:
        payload = {
            "username": username,
            "password": password,
            "email": email,
            "full_name": full_name,
            "nationality": nationality,
            "code": code
        }
        resp = requests.post(f"{API_BASE}/auth/register", json=payload)
        print(f"   Register Response: {resp.status_code}, {resp.json()}")
        if resp.status_code != 200:
            return

        print("\n3. Verifying user data via /auth/me...")
        # Need to login first to get token
        login_resp = requests.post(f"{API_BASE}/auth/login", data={"username": username, "password": password})
        print(f"   Login Response: {login_resp.status_code}")
        token = login_resp.json().get("access_token")
        
        me_resp = requests.get(f"{API_BASE}/auth/me", headers={"Authorization": f"Bearer {token}"})
        print(f"   Me Response: {me_resp.status_code}, {me_resp.json()}")
        
        user_data = me_resp.json()
        if user_data.get("full_name") == full_name and user_data.get("nationality") == nationality:
            print("\nSUCCESS: User data verified correctly!")
        else:
            print("\nFAILURE: User data mismatch!")
            print(f"Expected: {full_name}, {nationality}")
            print(f"Got: {user_data.get('full_name')}, {user_data.get('nationality')}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_complete_registration()
