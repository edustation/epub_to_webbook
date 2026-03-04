"""
도서 캐싱 서비스
- EPUB 파일 해시 기반 캐싱
- 챕터별 JSON AST 저장
- 이미지 추출 및 저장
- ZIP 패킹/언패킹
"""
import os
import json
import hashlib
import zipfile
import shutil
from pathlib import Path
from typing import Optional, Dict, List, Any
import ebooklib
from ebooklib import epub

# 데이터 저장 경로
DATA_DIR = Path(__file__).parent.parent.parent / "data"
BOOKS_DIR = DATA_DIR / "books"
TEMP_DIR = DATA_DIR / "temp"


class BookCacheService:
    """도서 캐싱 서비스"""
    
    def __init__(self):
        # 디렉토리 생성
        BOOKS_DIR.mkdir(parents=True, exist_ok=True)
        TEMP_DIR.mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    def get_file_hash(file_path: str) -> str:
        """파일의 MD5 해시를 반환"""
        hasher = hashlib.md5()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                hasher.update(chunk)
        return hasher.hexdigest()[:16]  # 앞 16자리만 사용
    
    def get_cache_path(self, book_hash: str, username: str = "default") -> Path:
        """캐시된 ZIP 파일 경로 반환 (사용자별 폴더)"""
        user_dir = BOOKS_DIR / username
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir / f"{book_hash}.zip"
    
    def get_temp_path(self, book_hash: str) -> Path:
        """임시 폴더 경로 반환"""
        return TEMP_DIR / book_hash
    
    def is_cached(self, book_hash: str, username: str = "default") -> bool:
        """캐시 존재 여부 확인"""
        return self.get_cache_path(book_hash, username).exists()
    
    def load_from_cache(self, book_hash: str, username: str = "default") -> Optional[Dict[str, Any]]:
        """캐시에서 도서 데이터 로드"""
        cache_path = self.get_cache_path(book_hash, username)
        if not cache_path.exists():
            return None
        
        try:
            with zipfile.ZipFile(cache_path, 'r') as zf:
                # metadata.json 로드
                metadata = json.loads(zf.read('metadata.json').decode('utf-8'))
                
                # 챕터 데이터 로드
                chapters = []
                for chapter_info in metadata['chapters']:
                    chapter_file = f"chapters/{chapter_info['id']}.json"
                    if chapter_file in zf.namelist():
                        chapter_data = json.loads(zf.read(chapter_file).decode('utf-8'))
                        chapters.append(chapter_data)
                
                return {
                    'book_hash': book_hash,
                    'title': metadata['title'],
                    'chapters': chapters,
                    'cached': True
                }
        except Exception as e:
            print(f"캐시 로드 실패: {e}")
            return None
    
    def save_to_cache(self, book_hash: str, title: str, chapters: List[Dict], 
                      images: Dict[str, bytes], username: str = "default", 
                      author: str = '', thumbnail: str = '') -> bool:
        """도서 데이터를 캐시에 저장 (ZIP 패킹)"""
        temp_path = self.get_temp_path(book_hash)
        cache_path = self.get_cache_path(book_hash, username)
        
        try:
            # 임시 폴더 생성
            if temp_path.exists():
                shutil.rmtree(temp_path)
            temp_path.mkdir(parents=True)
            
            chapters_dir = temp_path / "chapters"
            chapters_dir.mkdir()
            
            images_dir = temp_path / "images"
            images_dir.mkdir()
            
            # 메타데이터 저장
            metadata = {
                'title': title,
                'author': author,
                'thumbnail': thumbnail,
                'book_hash': book_hash,
                'chapters': [{'id': ch['id'], 'title': ch['title']} for ch in chapters]
            }
            with open(temp_path / "metadata.json", 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            # 챕터 데이터 저장
            for chapter in chapters:
                chapter_file = chapters_dir / f"{chapter['id']}.json"
                with open(chapter_file, 'w', encoding='utf-8') as f:
                    json.dump(chapter, f, ensure_ascii=False)
            
            # 이미지 저장
            for img_name, img_data in images.items():
                # 원본 경로 계층 구조를 그대로 유지 (중첩 폴더 지원)
                img_path = Path("images") / img_name.replace('\\', '/')
                img_file = temp_path / img_path
                img_file.parent.mkdir(parents=True, exist_ok=True)
                with open(img_file, 'wb') as f:
                    f.write(img_data)
            
            # ZIP 패킹
            with zipfile.ZipFile(cache_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for root, dirs, files in os.walk(temp_path):
                    for file in files:
                        file_path = Path(root) / file
                        # ZIP 내 경로 생성 (백슬래시를 슬래시로 변경하여 표준 준수)
                        arcname = file_path.relative_to(temp_path).as_posix()
                        zf.write(file_path, arcname)
            
            # 임시 폴더 삭제
            shutil.rmtree(temp_path)
            
            print(f"DEBUG: Successfully saved book to cache: {cache_path}")
            return True
        except Exception as e:
            print(f"DEBUG: FAILED to save to cache: {e}")
            import traceback
            traceback.print_exc()
            # 실패 시 정리
            if temp_path.exists():
                shutil.rmtree(temp_path)
            return False
    
    def get_image_from_cache(self, book_hash: str, image_name: str, username: str = "default") -> Optional[bytes]:
        """캐시된 ZIP에서 이미지 추출 (계층 구조 지원)"""
        cache_path = self.get_cache_path(book_hash, username)
        if not cache_path.exists():
            return None
        
        try:
            with zipfile.ZipFile(cache_path, 'r') as zf:
                # 1. 표준 'images/원본경로' 형태로 찾기
                normalized_name = image_name.replace('\\', '/')
                image_path = f"images/{normalized_name}"
                if image_path in zf.namelist():
                    return zf.read(image_path)
                
                # 2. 폴백: 파일명만으로 찾기 (레거시 캐시 호환성 및 유연성)
                filename = image_name.split('/')[-1].lower()
                for name in zf.namelist():
                    if name.startswith('images/'):
                        if name.split('/')[-1].lower() == filename:
                            return zf.read(name)
                
                print(f"이미지를 찾지 못함: {image_name} (ZIP 내 파일: {[n for n in zf.namelist() if n.startswith('images/')]})")
                return None
        except Exception as e:
            print(f"이미지 로드 실패: {e}")
            return None
            
    def find_image_anywhere(self, book_hash: str, image_name: str) -> Optional[bytes]:
        """모든 사용자 폴더를 검색하여 이미지를 찾습니다 (인증 없는 요청용 폴백)"""
        # 1. 모든 구매자 디렉토리 탐색
        for user_dir in BOOKS_DIR.iterdir():
            if user_dir.is_dir():
                data = self.get_image_from_cache(book_hash, image_name, username=user_dir.name)
                if data:
                    return data
        return None
    
    def list_cached_books(self, username: str = "default") -> List[Dict[str, str]]:
        """사용자의 캐시된 모든 도서 목록 반환"""
        books = []
        user_dir = BOOKS_DIR / username
        if not user_dir.exists():
            return []
            
        for zip_file in user_dir.glob("*.zip"):
            try:
                if zip_file.stem in ["e263de88764c9346"]: # Blacklisted ghost books
                    continue
                with zipfile.ZipFile(zip_file, 'r') as zf:
                    metadata = json.loads(zf.read('metadata.json').decode('utf-8'))
                    books.append({
                        'book_hash': zip_file.stem,
                        'title': metadata['title'],
                        'author': metadata.get('author', 'Unknown'),
                        'thumbnail': metadata.get('thumbnail', '')
                    })
            except:
                pass
        return books
    
    def delete_cache(self, book_hash: str, username: str = "default") -> bool:
        """캐시 삭제 (유저별 폴더 우선, 없으면 레거시 경로 시도)"""
        cache_path = self.get_cache_path(book_hash, username)
        if cache_path.exists():
            cache_path.unlink()
            return True
            
        # 레거시 혹은 잘못 저장된 경로(상위 디렉토리) 확인
        legacy_path = BOOKS_DIR / f"{book_hash}.zip"
        if legacy_path.exists():
            legacy_path.unlink()
            return True
            
        return False


# 싱글톤 인스턴스
book_cache = BookCacheService()
