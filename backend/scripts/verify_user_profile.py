import requests
import json
import time

API_BASE = "http://localhost:8002"

def test_profile_update():
    # 1. Login to get token
    # We'll use the user we created in the previous test or a new one
    username = f"testuser_{int(time.time())}"
    password = "testpassword"
    email = "test@example.com"
    full_name = "Original Name"
    nationality = "Original Nationality"
    
    # First, need a code (capture from logs - manually for now if I were a human, 
    # but as an agent I use command_status. 
    # Wait, I already have a user from previous turns if I can find the credentials.
    # Actually, I'll just register a new one and capture code.
    print(f"1. Registering {username}...")
    requests.post(f"{API_BASE}/auth/send-verification-code", json={"email": email})
    # As an agent, I can't easily wait for logs in a single run_command call that finishes.
    # But I can use a fixed code for testing if I modify auth_service temporarily, 
    # OR I can just skip registration if I have an existing user.
    # Let's try to login with a known user from previous tests if possible.
    # From Step 381: testuser_1770622226 / testpassword
    
    test_user = "testuser_1770622226"
    test_pass = "testpassword"
    
    print(f"2. Logging in as {test_user}...")
    login_resp = requests.post(f"{API_BASE}/auth/login", data={"username": test_user, "password": test_pass})
    if login_resp.status_code != 200:
        print("Login failed, checking auth logs...")
        return
    token = login_resp.json().get("access_token")
    
    # 3. Update profile
    new_name = "Updated Name"
    new_nat = "Updated Nationality"
    print(f"3. Updating profile to {new_name}, {new_nat}...")
    update_resp = requests.post(
        f"{API_BASE}/auth/update", 
        json={"full_name": new_name, "nationality": new_nat},
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"   Update Response: {update_resp.status_code}, {update_resp.json()}")
    
    # 4. Verify update
    print("4. Verifying via /auth/me...")
    me_resp = requests.get(f"{API_BASE}/auth/me", headers={"Authorization": f"Bearer {token}"})
    user_data = me_resp.json()
    print(f"   Me Response: {user_data}")
    
    if user_data.get("full_name") == new_name and user_data.get("nationality") == new_nat:
        print("\nSUCCESS: Profile update verified!")
    else:
        print("\nFAILURE: Profile update mismatch!")

if __name__ == "__main__":
    test_profile_update()
