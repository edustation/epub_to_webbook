import json
import uuid
import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from pydantic import BaseModel

# 설정
DATA_DIR = Path(__file__).parent.parent.parent / "data"
REVIEWS_FILE = DATA_DIR / "reviews.json"

class Review(BaseModel):
    id: str
    book_id: str
    username: str
    rating: float  # 1-5
    comment: str
    created_at: str
    updated_at: Optional[str] = None

class ReviewService:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not REVIEWS_FILE.exists():
            self._save_reviews({})
    
    def _load_reviews(self) -> Dict[str, List[dict]]:
        """book_id: [review_dicts] 구조로 로드"""
        try:
            with open(REVIEWS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
            
    def _save_reviews(self, reviews: Dict[str, List[dict]]):
        with open(REVIEWS_FILE, 'w', encoding='utf-8') as f:
            json.dump(reviews, f, ensure_ascii=False, indent=2)

    def get_book_reviews(self, book_id: str) -> List[dict]:
        reviews_map = self._load_reviews()
        return reviews_map.get(book_id, [])

    def add_review(self, book_id: str, username: str, rating: float, comment: str) -> dict:
        reviews_map = self._load_reviews()
        if book_id not in reviews_map:
            reviews_map[book_id] = []
            
        new_review = {
            "id": str(uuid.uuid4()),
            "book_id": book_id,
            "username": username,
            "rating": rating,
            "comment": comment,
            "created_at": datetime.now().isoformat(),
            "updated_at": None
        }
        
        # 중복 방지 (사용자당 한 권에 하나의 후기만 가능하게 하거나, 단순히 추가)
        # 여기서는 단순히 추가하되, 기존 후기가 있다면 덮어씌울지 결정 가능. 
        # 일단은 자유로운 추가로 구현.
        reviews_map[book_id].insert(0, new_review) # 최신순
        self._save_reviews(reviews_map)
        return new_review

    def update_review(self, review_id: str, username: str, rating: Optional[float] = None, comment: Optional[str] = None) -> Optional[dict]:
        reviews_map = self._load_reviews()
        for book_id, reviews in reviews_map.items():
            for i, rev in enumerate(reviews):
                if rev["id"] == review_id:
                    # 권한 확인
                    if rev["username"] != username:
                        return None 
                    
                    if rating is not None:
                        rev["rating"] = rating
                    if comment is not None:
                        rev["comment"] = comment
                    rev["updated_at"] = datetime.now().isoformat()
                    
                    self._save_reviews(reviews_map)
                    return rev
        return None

    def delete_review(self, review_id: str, username: str) -> bool:
        reviews_map = self._load_reviews()
        for book_id, reviews in reviews_map.items():
            for i, rev in enumerate(reviews):
                if rev["id"] == review_id:
                    # 권한 확인
                    if rev["username"] != username:
                        return False
                    
                    reviews.pop(i)
                    self._save_reviews(reviews_map)
                    return True
        return False

    def get_all_book_stats(self) -> Dict[str, dict]:
        """모든 도서의 평균 평점과 후기 개수를 반품"""
        reviews_map = self._load_reviews()
        stats = {}
        for book_id, reviews in reviews_map.items():
            if not reviews:
                continue
            total_count = len(reviews)
            sum_rating = sum(r["rating"] for r in reviews)
            average_rating = round(sum_rating / total_count, 1)
            stats[book_id] = {
                "average_rating": average_rating,
                "total_count": total_count
            }
        return stats

# 싱글톤
review_service = ReviewService()
