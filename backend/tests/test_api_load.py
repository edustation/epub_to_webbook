
import requests
import json

API_BASE = "http://localhost:8002"

def test_get_book():
    # 1. Get all books to find a valid hash
    try:
        # Mocking auth if needed, but the current backend uses auto_error=False or doesn't strictly check for list
        # Actually list_books has require_auth. I'll need a token or check if I can bypass.
        # Let's try to get a specific known hash from the storage dir if I can calculate it.
        pass
    except:
        pass

    # From previous logs, I know some files exist.
    # I'll try to find a book hash by listing and hashing.
    import os
    import hashlib
    STORAGE_DIR = "storage"
    files = [f for f in os.listdir(STORAGE_DIR) if f.endswith('.epub')]
    if not files:
        print("No epub files found in storage")
        return

    filename = files[0]
    file_path = os.path.join(STORAGE_DIR, filename)
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            hasher.update(chunk)
    book_hash = hasher.hexdigest()[:16]
    
    print(f"Testing book_hash: {book_hash} (file: {filename})")
    
    # HIT API (bypass auth for test if possible, or I'll just check code)
    # Actually I'll check if the server is running and reachable.
    try:
        # Since I don't have a JWT token handy in this script, 
        # I'll just check if the books endpoint exists and if I can get a 401.
        resp = requests.get(f"{API_BASE}/books/{book_hash}")
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Chapters found: {len(data.get('chapters', []))}")
            if data.get('chapters'):
                print(f"First chapter content nodes: {len(data['chapters'][0].get('content', []))}")
        else:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_get_book()
