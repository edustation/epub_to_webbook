import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from .auth_service import auth_service
from .store_service import store_service
from .review_service import review_service

# 설정
DATA_DIR = Path(__file__).parent.parent.parent / "data"
ACTIVITY_FILE = DATA_DIR / "activity.json"

class AdminService:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not ACTIVITY_FILE.exists():
            self._save_activities([])

    def _load_activities(self) -> List[dict]:
        try:
            with open(ACTIVITY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []

    def _save_activities(self, activities: List[dict]):
        with open(ACTIVITY_FILE, 'w', encoding='utf-8') as f:
            json.dump(activities, f, ensure_ascii=False, indent=2)

    def log_activity(self, username: str, action: str, details: str):
        activities = self._load_activities()
        new_activity = {
            "timestamp": datetime.now().isoformat(),
            "username": username,
            "action": action,
            "details": details
        }
        activities.insert(0, new_activity)  # 최신순
        # 최근 500개만 유지
        self._save_activities(activities[:500])

    def get_activities(self) -> List[dict]:
        return self._load_activities()

    def get_all_users(self) -> List[dict]:
        users_dict = auth_service._load_users()
        user_list = []
        for username, data in users_dict.items():
            # 보안을 위해 비밀번호 제외
            user_info = {
                "username": data.get("username"),
                "email": data.get("email"),
                "full_name": data.get("full_name"),
                "nationality": data.get("nationality"),
                "disabled": data.get("disabled", False),
                "is_verified": data.get("is_verified", False),
                "joined_at": data.get("joined_at", "Unknown") # 필드가 없을 수 있음
            }
            user_list.append(user_info)
        return user_list

    def toggle_user_status(self, username: str) -> bool:
        users = auth_service._load_users()
        if username in users:
            users[username]["disabled"] = not users[username].get("disabled", False)
            auth_service._save_users(users)
            return True
        return False

    def get_platform_stats(self) -> dict:
        users = auth_service._load_users()
        books = store_service.get_all_books()
        reviews_map = review_service._load_reviews()
        
        total_reviews = sum(len(revs) for revs in reviews_map.values())
        
        return {
            "total_users": len(users),
            "total_books": len(books),
            "total_reviews": total_reviews,
            "recent_activities": self.get_activities()[:5]
        }

    def get_user_purchased_books(self, username: str) -> List[dict]:
        from .book_cache_service import book_cache
        return book_cache.list_cached_books(username)

    def admin_create_user(self, data: dict) -> bool:
        # 어드민 전용 사용자 생성 (이메일 인증 등 불필요)
        success = auth_service.create_user(
            username=data.get("username"),
            password=data.get("password"),
            email=data.get("email"),
            full_name=data.get("full_name"),
            nationality=data.get("nationality")
        )
        if success:
            self.log_activity("admin", "User Created", f"New user: {data.get('username')}")
        return success

    def admin_update_user(self, username: str, data: dict) -> bool:
        success = auth_service.update_user(
            username=username,
            full_name=data.get("full_name"),
            nationality=data.get("nationality"),
            password=data.get("password")
        )
        if success:
            self.log_activity("admin", "User Updated", f"Modified user: {username}")
        return success

    def admin_delete_user(self, username: str) -> bool:
        import shutil
        from .book_cache_service import BOOKS_DIR
        
        if username == "admin":
            return False # 보호용
            
        success = auth_service.delete_user(username)
        if success:
            # 해당 유저의 도서 데이터 폴더도 삭제
            user_book_dir = BOOKS_DIR / username
            if user_book_dir.exists():
                shutil.rmtree(user_book_dir, ignore_errors=True)
            self.log_activity("admin", "User Deleted", f"Removed user: {username}")
        return success

    def run_diagnosis(self) -> dict:
        """시스템 상태를 전반적으로 진단합니다."""
        import zipfile
        from .book_cache_service import BOOKS_DIR
        
        results = []
        
        # 1. EPUB 매핑 무결성 검사
        BASE_DIR = Path(__file__).parent.parent.parent
        EPUB_MAPPING_PATH = Path(__file__).parent.parent / "resources" / "epub_mapping.json"
        STORE_EPUB_DIR = Path(__file__).parent.parent.parent.parent / "frontend" / "public" / "sample_assets" / "epubs"
        STORAGE_DIR = Path("storage")
        
        # 매핑 파일 존재 여부
        if EPUB_MAPPING_PATH.exists():
            try:
                with open(EPUB_MAPPING_PATH, 'r', encoding='utf-8') as f:
                    mapping_data = json.load(f)
                    mappings = mapping_data.get('mappings', [])
                    results.append({"name": "Mapping File", "status": "PASS", "details": f"Loaded {len(mappings)} mappings"})
                    
                    # 매핑된 파일의 실제 존재 여부
                    missing_files = []
                    for m in mappings:
                        epub_file = m.get('epub')
                        if epub_file and not (STORE_EPUB_DIR / epub_file).exists():
                            missing_files.append(epub_file)
                    
                    if missing_files:
                        results.append({"name": "Mapping Content", "status": "WARN", "details": f"Missing {len(missing_files)} referenced EPUBs"})
                    else:
                        results.append({"name": "Mapping Content", "status": "PASS", "details": "All referenced EPUBs exist"})
            except Exception as e:
                results.append({"name": "Mapping File", "status": "FAIL", "details": f"Error: {str(e)}"})
        else:
            results.append({"name": "Mapping File", "status": "FAIL", "details": "epub_mapping.json missing"})

        # 2. 내부 저장소(storage) 손상 검사
        if STORAGE_DIR.exists():
            corrupted = []
            files = list(STORAGE_DIR.glob("*.epub"))
            for f in files:
                try:
                    if f.stat().st_size < 1024:
                        corrupted.append(f.name)
                        continue
                    with zipfile.ZipFile(f, 'r') as z:
                        z.testzip()
                except:
                    corrupted.append(f.name)
            
            if corrupted:
                results.append({"name": "Internal Storage", "status": "FAIL", "details": f"Found {len(corrupted)} corrupted EPUBs"})
            else:
                results.append({"name": "Internal Storage", "status": "PASS", "details": f"Verified {len(files)} EPUBs"})

        # 3. 사용자 캐시 무결성 검사
        if BOOKS_DIR.exists():
            broken_caches = 0
            for user_dir in BOOKS_DIR.iterdir():
                if user_dir.is_dir():
                    for book_dir in user_dir.iterdir():
                        if book_dir.is_dir():
                            meta_file = book_dir / "meta.json"
                            if not meta_file.exists() or meta_file.stat().st_size == 0:
                                broken_caches += 1
            
            if broken_caches > 0:
                results.append({"name": "User Caches", "status": "WARN", "details": f"Found {broken_caches} inconsistent cache entries"})
            else:
                results.append({"name": "User Caches", "status": "PASS", "details": "All user caches look healthy"})

        # 4. 활동 로그 에러 분석
        activities = self._load_activities()
        errors = [a for a in activities if any(word in a.get('action', '') + a.get('details', '') for word in ['FAIL', 'Error', '실패', '오류'])]
        if errors:
            results.append({"name": "System Activity", "status": "WARN", "details": f"Logged {len(errors)} potential issues recently"})
        else:
            results.append({"name": "System Activity", "status": "PASS", "details": "No critical errors found in recent logs"})

        # 5. 디스크 공간 상태 검사
        import shutil
        try:
            _, _, free = shutil.disk_usage(".")
            free_gb = free // (2**30)
            if free_gb < 1:
                results.append({"name": "Disk Space", "status": "WARN", "details": f"Low disk space: {free_gb}GB remaining"})
            else:
                results.append({"name": "Disk Space", "status": "PASS", "details": f"{free_gb}GB available"})
        except Exception as e:
            results.append({"name": "Disk Space", "status": "FAIL", "details": str(e)})

        # 6. 환경 변수 구성 검사
        missing_env = [env for env in ["GEMINI_API_KEY", "JWT_SECRET_KEY"] if not os.getenv(env)]
        if missing_env:
            results.append({"name": "Environment Variables", "status": "FAIL", "details": f"Missing: {', '.join(missing_env)}"})
        else:
            results.append({"name": "Environment Variables", "status": "PASS", "details": "Critical variables loaded"})

        # 7. 주요 디렉토리 쓰기 권한 검사
        dirs_to_check = [STORAGE_DIR, DATA_DIR, BOOKS_DIR]
        permission_issues = [d.name for d in dirs_to_check if d.exists() and not os.access(d, os.W_OK)]
        if permission_issues:
            results.append({"name": "Write Permissions", "status": "FAIL", "details": f"No write access to: {', '.join(permission_issues)}"})
        else:
            results.append({"name": "Write Permissions", "status": "PASS", "details": "All critical directories are writable"})

        # 8. JSON 데이터베이스 무결성 검사
        db_files = {
            "Users DB": DATA_DIR / "users.json",
            "Reviews DB": DATA_DIR / "reviews.json",
            "Notices DB": DATA_DIR / "notices.json"
        }
        for name, path in db_files.items():
            if path.exists():
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        count = len(data) if isinstance(data, (dict, list)) else 0
                        results.append({"name": name, "status": "PASS", "details": f"Healthy ({count} entries)"})
                except Exception as e:
                    results.append({"name": name, "status": "FAIL", "details": f"Corruption: {str(e)}"})
            else:
                results.append({"name": name, "status": "WARN", "details": "Not yet initialized"})

        return {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_checks": len(results),
                "passed": len([r for r in results if r['status'] == 'PASS']),
                "warn": len([r for r in results if r['status'] == 'WARN']),
                "fail": len([r for r in results if r['status'] == 'FAIL'])
            },
            "checks": results,
            "error_logs": errors[:10] # 최신 에러 10개
        }

admin_service = AdminService()
