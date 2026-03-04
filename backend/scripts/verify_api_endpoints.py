import requests
import json
import socket
import time

API_BASE = "http://localhost:8002"

def test_registration():
    email = "test@example.com"
    username = "testuser"
    password = "testpassword"
    full_name = "Test User"
    nationality = "Vietnam"
    
    print(f"1. Sending verification code to {email}...")
    try:
        resp = requests.post(f"{API_BASE}/auth/send-verification-code", json={"email": email})
        print(f"   Response: {resp.status_code}, {resp.json()}")
        if resp.status_code != 200:
            return
    except Exception as e:
        print(f"Error: {e}")
        return

    # In a real environment we'd check the logs for the code.
    # But since I can't easily read background process stdout from here,
    # I'll check the auth_service.py's internal state if I can,
    # or just assume the code is generated.
    # Actually, as an agent, I can check the backend process output if I use command_status.
    
    # But for now, let's assume I know it or I can force a code for testing.
    # Wait! I can't read the logs of a process I already started and is "LISTENING" independently.
    
    # I'll update auth_service.py to use a fixed code for testing if needed,
    # OR I'll just check the backend's stdout via command_status if I restart it again and wait.
    
    print("\nCheck backend logs for code...")

if __name__ == "__main__":
    test_registration()
