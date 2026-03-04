import os
import sys
from app.services.epub_service import EpubService

STORAGE_DIR = "c:/Users/admin/project/epub_to_webbook2/b2b/frontend/public/sample_assets/epubs"
if not os.path.exists(STORAGE_DIR):
    print(f"Error: {STORAGE_DIR} not found")
    sys.exit(1)

files = [f for f in os.listdir(STORAGE_DIR) if f.endswith(".epub")]
print(f"Testing {len(files)} EPUB files using resilient parser...")

for f in files:
    fpath = os.path.join(STORAGE_DIR, f)
    try:
        book_info = EpubService.parse_epub(fpath, f)
        print(f"[OK] {f} - {len(book_info['chapters'])} chapters")
    except Exception as e:
        print(f"[FAIL] {f}: {e}")

print("Validation complete.")
