from pathlib import Path
import json
from typing import List, Optional
from pydantic import BaseModel

# 설정
DATA_DIR = Path(__file__).parent.parent.parent / "data"
STORE_BOOKS_FILE = DATA_DIR / "store_books.json"

class TOCItem(BaseModel):
    title: str
    pages: str

class StoreBook(BaseModel):
    id: str
    title: str
    price: str
    category: str
    type: str
    mentor: str
    description: str
    longDescription: Optional[str] = None
    thumbnail: Optional[str] = None
    author: str
    toc: List[TOCItem] = []

class StoreService:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not STORE_BOOKS_FILE.exists():
            self._save_books([])
            
    def _load_books(self) -> List[dict]:
        try:
            with open(STORE_BOOKS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
            
    def _save_books(self, books: List[dict]):
        with open(STORE_BOOKS_FILE, 'w', encoding='utf-8') as f:
            json.dump(books, f, ensure_ascii=False, indent=2)
            
    def get_all_books(self) -> List[dict]:
        return self._load_books()
        
    def add_book(self, book_data: dict) -> dict:
        books = self._load_books()
        # id는 프론트엔드에서 생성하거나 여기서 생성
        if "id" not in book_data or not book_data["id"]:
            book_data["id"] = str(len(books) + 1)
        
        books.append(book_data)
        self._save_books(books)
        return book_data
        
    def update_book(self, book_id: str, update_data: dict) -> Optional[dict]:
        books = self._load_books()
        for i, book in enumerate(books):
            if book["id"] == book_id:
                books[i].update(update_data)
                self._save_books(books)
                return books[i]
        return None

    def delete_book(self, book_id: str) -> bool:
        books = self._load_books()
        new_books = [b for b in books if b["id"] != book_id]
        if len(new_books) < len(books):
            self._save_books(new_books)
            return True
        return False

store_service = StoreService()
