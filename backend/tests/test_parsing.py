import sys
import os
from pathlib import Path

# Add app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'app'))

from services.epub_service import EpubService
from services.book_cache_service import BookCacheService

def test_parse_and_cache():
    epub_path = 'storage/factory_worker.epub'
    print(f"Testing parsing and caching for: {epub_path}")
    
    if not os.path.exists(epub_path):
        print(f"Error: File not found at {epub_path}")
        return

    try:
        # 1. Parsing
        sys.setrecursionlimit(5000)
        book_info = EpubService.parse_epub(epub_path)
        title = book_info['title']
        chapters = book_info['chapters']
        
        # 2. Caching
        cache_service = BookCacheService()
        import hashlib
        with open(epub_path, 'rb') as f:
            book_hash = hashlib.md5(f.read()).hexdigest()[:16]
            
        print(f"Calculated hash: {book_hash}")
        
        images = EpubService.get_all_images(epub_path)
        success = cache_service.save_to_cache(book_hash, title, chapters, images)
        
        if success:
            print(f"Successfully cached book: {title} (Hash: {book_hash})")
            # Verify cache exists
            if cache_service.is_cached(book_hash):
                print("Verification: Cache IS present.")
            else:
                print("Verification FAILED: Cache is NOT present despite success=True.")
        else:
            print("FAILED to save to cache.")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_parse_and_cache()
