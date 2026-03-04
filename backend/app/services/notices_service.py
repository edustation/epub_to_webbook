from pathlib import Path
import json
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger("notices-service")

# 설정
DATA_DIR = Path(__file__).parent.parent.parent / "data"
NOTICES_FILE = DATA_DIR / "notices.json"

class Notice(BaseModel):
    id: Optional[str] = None
    title: str
    content: str
    author: Optional[str] = None
    timestamp: Optional[str] = None
    priority: bool = False

class NoticesService:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not NOTICES_FILE.exists():
            self._save_notices([])
            
    def _load_notices(self) -> List[dict]:
        try:
            with open(NOTICES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
            
    def _save_notices(self, notices: List[dict]):
        try:
            with open(NOTICES_FILE, 'w', encoding='utf-8') as f:
                json.dump(notices, f, ensure_ascii=False, indent=2)
            logger.info(f"Successfully saved {len(notices)} notices to {NOTICES_FILE}")
        except Exception as e:
            logger.error(f"Failed to save notices to {NOTICES_FILE}: {e}")
            raise
            
    def get_all_notices(self) -> List[dict]:
        # 최신순 정렬
        notices = self._load_notices()
        return sorted(notices, key=lambda x: x['timestamp'], reverse=True)
        
    def add_notice(self, notice_data: dict) -> dict:
        notices = self._load_notices()
        # id handle
        if not notice_data.get("id"):
            notice_data["id"] = datetime.now().strftime("%Y%m%d%H%M%S%f")
            
        # timestamp handle
        if not notice_data.get("timestamp"):
            notice_data["timestamp"] = datetime.now().isoformat()
            
        notices.append(notice_data)
        self._save_notices(notices)
        return notice_data
        
    def update_notice(self, notice_id: str, update_data: dict) -> Optional[dict]:
        notices = self._load_notices()
        for i, notice in enumerate(notices):
            if notice["id"] == notice_id:
                notices[i].update(update_data)
                self._save_notices(notices)
                return notices[i]
        return None

    def delete_notice(self, notice_id: str) -> bool:
        notices = self._load_notices()
        new_notices = [n for n in notices if n["id"] != notice_id]
        if len(new_notices) < len(notices):
            self._save_notices(new_notices)
            return True
        return False

notices_service = NoticesService()
