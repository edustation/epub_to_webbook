
import ebooklib
from ebooklib import epub
import os

def test_epub():
    storage_dir = "storage"
    if not os.path.exists(storage_dir):
        print("Storage dir not found")
        return
        
    for filename in os.listdir(storage_dir):
        if filename.endswith('.epub'):
            file_path = os.path.join(storage_dir, filename)
            print(f"Testing {filename} ({os.path.getsize(file_path)} bytes)...")
            try:
                book = epub.read_epub(file_path)
                chapters = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))
                print(f"  Success! Found {len(chapters)} chapters.")
            except Exception as e:
                print(f"  Error: {e}")

if __name__ == "__main__":
    test_epub()
