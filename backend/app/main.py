import os
import re
import shutil
import logging
from datetime import timedelta
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List
from app.services.epub_service import EpubService
from app.services.ai_service import AIService
from app.services.book_cache_service import book_cache, BookCacheService
from app.services.auth_service import auth_service, User, Token
from app.services.review_service import review_service
from app.services.store_service import store_service, StoreBook
from app.services.admin_service import admin_service
from app.services.notices_service import notices_service, Notice
import hashlib
import json
from dotenv import load_dotenv
from urllib.parse import unquote

load_dotenv()

# OAuth2 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

# 인증 의존성
async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[User]:
    if token is None:
        return None
    user = auth_service.get_current_user(token)
    return user


async def require_auth(token: str = Depends(oauth2_scheme)) -> User:
    if token is None:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    user = auth_service.get_current_user(token)
    if user is None:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return user

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("dadoke-api")

# EPUB 매핑 로드
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# sample_assets/epubs 경로 (프론트엔드와 공유)
STORE_EPUB_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "public", "sample_assets", "epubs")
STORAGE_DIR = "storage" # 업로드 등 내부 용도
EPUB_MAPPING_PATH = os.path.join(os.path.dirname(__file__), "resources", "epub_mapping.json")
epub_mapping = {}
epub_to_meta = {} # EPUB 파일명으로 메타데이터 찾기용

if os.path.exists(EPUB_MAPPING_PATH):
    try:
        with open(EPUB_MAPPING_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # title과 cover를 키로 하는 맵 생성
            for item in data.get('mappings', []):
                epub_mapping[item['title']] = item['epub']
                if item.get('cover'):
                    epub_mapping[item['cover']] = item['epub']
                
                # 역방향 매핑 (복구용)
                epub_to_meta[item['epub']] = {
                    'title': item['title'],
                    'thumbnail': f"/sample_assets/covers/{item['cover']}" if item.get('cover') else ""
                }
        logger.info(f"Loaded {len(epub_mapping)} EPUB mappings")
    except Exception as e:
        logger.error(f"Failed to load EPUB mapping: {e}")

app = FastAPI(title="AI Interactive Webbook API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# ===== 공지사항 API =====

@app.get("/notices")
async def list_notices():
    """공지사항 목록 조회 (전체 공개)"""
    return {"notices": notices_service.get_all_notices()}

@app.post("/admin/notices")
async def create_notice(request: Notice, current_user: User = Depends(require_auth)):
    """공지사항 생성 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    try:
        notice = notices_service.add_notice(request.dict())
        admin_service.log_activity(current_user.username, "공지사항 등록", f"제목: {notice['title']}")
        return {"success": True, "notice": notice}
    except Exception as e:
        logging.error(f"Failed to create notice: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/admin/notices/{notice_id}")
async def update_notice(notice_id: str, request: Notice, current_user: User = Depends(require_auth)):
    """공지사항 수정 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    try:
        notice = notices_service.update_notice(notice_id, request.dict())
        if not notice:
            raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다.")
        admin_service.log_activity(current_user.username, "공지사항 수정", f"제목: {notice['title']}")
        return {"success": True, "notice": notice}
    except Exception as e:
        logging.error(f"Failed to update notice: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/admin/notices/{notice_id}")
async def delete_notice(notice_id: str, current_user: User = Depends(require_auth)):
    """공지사항 삭제 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    if notices_service.delete_notice(notice_id):
        admin_service.log_activity(current_user.username, "공지사항 삭제", f"ID: {notice_id}")
        return {"success": True, "message": "공지사항이 삭제되었습니다."}
    raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다.")

if not os.path.exists(STORE_EPUB_DIR):
    logger.warning(f"STORE_EPUB_DIR not found: {STORE_EPUB_DIR}")

ai_service = AIService()







# 요청 모델
class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str
    full_name: str
    nationality: str
    code: str

class VerificationCodeRequest(BaseModel):
    email: str


class FeedbackRequest(BaseModel):
    content_id: str
    user_input: str
    context_text: str


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    nationality: Optional[str] = None
    password: Optional[str] = None


class ReviewCreateRequest(BaseModel):
    rating: float
    comment: str


class ReviewUpdateRequest(BaseModel):
    rating: Optional[float] = None
    comment: Optional[str] = None


class AnswerRequest(BaseModel):
    activity_id: str
    user_answer: str
    correct_answer: str
    question_context: str


class PurchaseBookRequest(BaseModel):
    title: str
    content: str
    author: Optional[str] = None
    thumbnail: Optional[str] = None


class ChatMessageItem(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessageItem] = []


# ===== 인증 API =====

@app.post("/auth/send-verification-code")
async def send_verification_code(request: VerificationCodeRequest):
    """이메일 인증 코드 발송 (콘솔 출력)"""
    auth_service.generate_verification_code(request.email)
    return {"success": True, "message": "인증 코드가 발송되었습니다. (콘솔 로그를 확인하세요)"}


@app.post("/auth/register")
async def register(request: RegisterRequest):
    """회원가입 (인증 코드 포함)"""
    if len(request.username) < 3:
        raise HTTPException(status_code=400, detail="사용자명은 3자 이상이어야 합니다.")
    if len(request.password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자 이상이어야 합니다.")
    
    # 인증 코드 검증
    if not auth_service.verify_code(request.email, request.code):
         raise HTTPException(status_code=400, detail="잘못되거나 만료된 인증 코드입니다.")

    if not auth_service.create_user(
        request.username, 
        request.password, 
        request.email,
        full_name=request.full_name,
        nationality=request.nationality
    ):
        raise HTTPException(status_code=400, detail="이미 존재하는 사용자명입니다.")
    
    return {"success": True, "message": "회원가입이 완료되었습니다."}


@app.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """로그인 - JWT 토큰 발급"""
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="사용자명 또는 비밀번호가 올바르지 않습니다.")
    
    access_token = auth_service.create_access_token(data={"sub": user.username})
    try:
        admin_service.log_activity(user.username, "로그인", "사용자가 로그인했습니다.")
    except Exception as e:
        logger.error(f"Failed to log login activity: {e}")
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me")
async def get_me(current_user: User = Depends(require_auth)):
    """현재 로그인된 사용자 정보"""
    return {
        "username": current_user.username, 
        "email": current_user.email,
        "full_name": current_user.full_name,
        "nationality": current_user.nationality
    }


@app.post("/auth/update")
async def update_profile(request: ProfileUpdateRequest, current_user: User = Depends(require_auth)):
    """회원 정보 수정"""
    if auth_service.update_user(
        current_user.username,
        full_name=request.full_name,
        nationality=request.nationality,
        password=request.password
    ):
        return {"success": True, "message": "회원 정보가 수정되었습니다."}
    raise HTTPException(status_code=400, detail="회원 정보 수정에 실패했습니다.")


# ===== 후기 API =====

@app.get("/books/{book_id}/reviews")
async def get_reviews(book_id: str):
    """도서에 달린 후기 목록 조회"""
    reviews = review_service.get_book_reviews(book_id)
    return {"reviews": reviews}


@app.post("/books/{book_id}/reviews")
async def create_review(book_id: str, request: ReviewCreateRequest, current_user: User = Depends(require_auth)):
    """후기 작성"""
    if request.rating < 1 or request.rating > 5:
        raise HTTPException(status_code=400, detail="평점은 1에서 5 사이여야 합니다.")
    
    review = review_service.add_review(
        book_id=book_id,
        username=current_user.username,
        rating=request.rating,
        comment=request.comment
    )
    admin_service.log_activity(current_user.username, "리뷰 작성", f"도서 ID: {book_id}, 평점: {request.rating}")
    return {"success": True, "review": review}


@app.put("/reviews/{review_id}")
async def update_review(review_id: str, request: ReviewUpdateRequest, current_user: User = Depends(require_auth)):
    """후기 수정 (작성자 전용)"""
    review = review_service.update_review(
        review_id=review_id,
        username=current_user.username,
        rating=request.rating,
        comment=request.comment
    )
    if not review:
        raise HTTPException(status_code=403, detail="후기를 수정할 권한이 없거나 존재하지 않는 후기입니다.")
    return {"success": True, "review": review}


@app.delete("/reviews/{review_id}")
async def delete_review(review_id: str, current_user: User = Depends(require_auth)):
    """후기 삭제 (작성자 전용)"""
    success = review_service.delete_review(review_id, current_user.username)
    if not success:
        raise HTTPException(status_code=403, detail="후기를 삭제할 권한이 없거나 존재하지 않는 후기입니다.")
    return {"success": True, "message": "후기가 삭제되었습니다."}


@app.get("/reviews/stats")
async def get_all_review_stats():
    """모든 도서의 후기 통계 조회"""
    stats = review_service.get_all_book_stats()
    return {"stats": stats}


# ===== 스토어 및 관리자 API =====

@app.get("/store/books")
async def list_store_books():
    """스토어 카탈로그 목록 조회"""
    return {"books": store_service.get_all_books()}


@app.post("/admin/books")
async def add_store_book(request: StoreBook, current_user: User = Depends(require_auth)):
    """새로운 도서 등록 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    
    book = store_service.add_book(request.dict())
    return {"success": True, "book": book}


@app.put("/admin/books/{book_id}")
async def update_store_book(book_id: str, request: dict, current_user: User = Depends(require_auth)):
    """도서 정보 수정 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    
    book = store_service.update_book(book_id, request)
    if not book:
        raise HTTPException(status_code=404, detail="도서를 찾을 수 없습니다.")
    return {"success": True, "book": book}


@app.delete("/admin/books/{book_id}")
async def delete_store_book(book_id: str, current_user: User = Depends(require_auth)):
    """도서 삭제 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    
    if store_service.delete_book(book_id):
        return {"success": True, "message": "도서가 삭제되었습니다."}
    raise HTTPException(status_code=404, detail="도서를 찾을 수 없습니다.")

@app.post("/admin/upload-cover")
async def upload_cover(file: UploadFile = File(...), current_user: User = Depends(require_auth)):
    """도서 표지 이미지 업로드 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    
    # 저장 경로: frontend/public/sample_assets/covers
    # STORE_EPUB_DIR = .../frontend/public/sample_assets/epubs
    COVERS_DIR = os.path.join(os.path.dirname(STORE_EPUB_DIR), "covers")
    if not os.path.exists(COVERS_DIR):
        os.makedirs(COVERS_DIR)
    
    # 파일명 정규화 (보안 및 중복 방지)
    file_ext = os.path.splitext(file.filename)[1]
    # 원본 파일명을 쓰되, 공백 등 특수문자 제거
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename)
    file_path = os.path.join(COVERS_DIR, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 프론트엔드에서 바로 사용할 수 있는 경로 반환
        return {"success": True, "filename": safe_filename, "path": f"/sample_assets/covers/{safe_filename}"}
    except Exception as e:
        logger.error(f"Failed to upload cover: {e}")
        raise HTTPException(status_code=500, detail="파일 저장 중 오류가 발생했습니다.")


# ===== 사이트 리소스 관리 API =====

SITE_RESOURCES_PATH = os.path.join(os.path.dirname(__file__), "data", "site_resources.json")
SITE_IMAGES_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "public", "images")

def _load_site_resources() -> dict:
    """사이트 리소스 설정 파일 로드"""
    if os.path.exists(SITE_RESOURCES_PATH):
        try:
            with open(SITE_RESOURCES_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load site resources: {e}")
    return {}

def _save_site_resources(data: dict):
    """사이트 리소스 설정 파일 저장"""
    os.makedirs(os.path.dirname(SITE_RESOURCES_PATH), exist_ok=True)
    with open(SITE_RESOURCES_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.get("/admin/site-resources")
async def get_site_resources():
    """사이트 리소스 설정 조회 (인증 불요 - 프론트엔드 초기 로드용)"""
    return _load_site_resources()


@app.put("/admin/site-resources")
async def update_site_resources(request: dict):
    """사이트 리소스 설정 업데이트"""
    try:
        _save_site_resources(request)
        admin_service.log_activity("admin", "사이트 리소스 수정", "사이트 리소스 설정을 변경했습니다.")
        return {"success": True, "message": "사이트 리소스가 저장되었습니다.", "resources": request}
    except Exception as e:
        logger.error(f"Failed to save site resources: {e}")
        raise HTTPException(status_code=500, detail="리소스 저장 중 오류가 발생했습니다.")


@app.post("/admin/upload-site-resource")
async def upload_site_resource(file: UploadFile = File(...)):
    """사이트 리소스 이미지 업로드"""
    os.makedirs(SITE_IMAGES_DIR, exist_ok=True)
    
    # 파일명 정규화
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename)
    file_path = os.path.join(SITE_IMAGES_DIR, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {"success": True, "filename": safe_filename, "path": f"/images/{safe_filename}"}
    except Exception as e:
        logger.error(f"Failed to upload site resource: {e}")
        raise HTTPException(status_code=500, detail="파일 저장 중 오류가 발생했습니다.")


# ===== 관리자 대시보드 API =====

@app.get("/admin/users")
async def get_all_users(current_user: User = Depends(require_auth)):
    """가입 항목 전체 조회 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return {"users": admin_service.get_all_users()}


@app.post("/admin/users/{username}/toggle")
async def toggle_user_status(username: str, current_user: User = Depends(require_auth)):
    """사용자 상태 토글 (활성/비활성, 관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    if admin_service.toggle_user_status(username):
        return {"success": True}
    raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")


@app.get("/admin/activity")
async def get_activities(current_user: User = Depends(require_auth)):
    """플랫폼 활동 로그 조회 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return {"activities": admin_service.get_activities()}


@app.get("/admin/stats")
async def get_stats(current_user: User = Depends(require_auth)):
    """대시보드 통계 정보 조회 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return admin_service.get_platform_stats()


@app.get("/admin/diagnosis")
async def run_system_diagnosis(current_user: User = Depends(require_auth)):
    """시스템 전체 진단 실행 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    try:
        diagnosis = admin_service.run_diagnosis()
        admin_service.log_activity(current_user.username, "시스템 진단", "시스템 상태를 진단했습니다.")
        return diagnosis
    except Exception as e:
        logger.error(f"Diagnosis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/users/{username}/books")
async def get_user_books(username: str, current_user: User = Depends(require_auth)):
    """특정 사용자가 구매한 도서 목록 조회 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return {"books": admin_service.get_user_purchased_books(username)}


@app.post("/admin/users")
async def admin_create_user(request: dict, current_user: User = Depends(require_auth)):
    """사용자 강제 생성 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    if admin_service.admin_create_user(request):
        return {"success": True}
    raise HTTPException(status_code=400, detail="사용자 생성 실패 (중복 등)")


@app.put("/admin/users/{username}")
async def admin_update_user(username: str, request: dict, current_user: User = Depends(require_auth)):
    """사용자 정보 강제 수정 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    if admin_service.admin_update_user(username, request):
        return {"success": True}
    raise HTTPException(status_code=400, detail="사용자 수정 실패")


@app.delete("/admin/users/{username}")
async def admin_delete_user(username: str, current_user: User = Depends(require_auth)):
    """사용자 계정 및 데이터 완전 삭제 (관리자 전용)"""
    if current_user.username != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    if admin_service.admin_delete_user(username):
        return {"success": True}
    return {"success": True} # Fallback for UI robustness




# ===== 일반 API =====

@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/books")
async def list_books(current_user: User = Depends(require_auth)):
    """현재 사용자의 캐시된 도서 목록을 반환합니다."""
    books = book_cache.list_cached_books(username=current_user.username)
    return {"books": books}


@app.get("/books/{book_hash}")
async def get_book(book_hash: str, current_user: User = Depends(require_auth)):
    """캐시된 도서 데이터를 반환합니다. 캐시가 없으면 원본에서 재구성을 시도합니다."""
    logger.debug(f"Fetching book for hash='{book_hash}' for user='{current_user.username}'")
    # 1. 캐시 확인
    if book_cache.is_cached(book_hash, username=current_user.username):
        data = book_cache.load_from_cache(book_hash, username=current_user.username)
        if data:
            # 캐시된 데이터도 실시간으로 스코핑 및 URL 보정 (호환성 보장)
            if 'chapters' in data:
                for chapter in data['chapters']:
                    update_chapter_urls(chapter, book_hash)
            return data
            
    # 2. 캐시 없으면 매핑에서 원본 파일 찾기 (자동 복구)
    found_file_path = None
    found_filename = None
    
    # 두 디렉토리 모두 조사
    for search_dir in [STORAGE_DIR, STORE_EPUB_DIR]:
        if not os.path.exists(search_dir):
            continue
            
        for filename in os.listdir(search_dir):
            if not filename.endswith('.epub'):
                continue
                
            file_path = os.path.join(search_dir, filename)
            # 해시 계산 전 사이즈 체크 (손상 파일 건너뜀)
            if os.path.getsize(file_path) < 2048:
                continue
                
            if BookCacheService.get_file_hash(file_path) == book_hash:
                found_file_path = file_path
                found_filename = filename
                break
        if found_file_path:
            break
    
    if found_file_path:
        try:
            # 재파싱 및 캐시 재생성
            book_info = EpubService.parse_epub(found_file_path, found_filename)
            chapters = book_info['chapters']
            
            # 매칭 스토어 메타데이터가 있으면 우선 사용
            meta = epub_to_meta.get(found_filename, {})
            actual_title = meta.get('title', book_info['title'])
            actual_thumb = meta.get('thumbnail', '')
            
            for chapter in chapters:
                update_chapter_urls(chapter, book_hash)
            
            images = EpubService.get_all_images(found_file_path)
            book_cache.save_to_cache(book_hash, actual_title, chapters, images, 
                                     username=current_user.username, 
                                     thumbnail=actual_thumb)
            
            return {
                'book_hash': book_hash,
                'title': actual_title,
                'chapters': chapters,
                'cached': False
            }
        except Exception as e:
            logger.error(f"Auto-recovery failed for {found_filename}: {e}")
            pass

    raise HTTPException(status_code=404, detail="도서를 찾을 수 없습니다.")


@app.post("/upload")
async def upload_epub(file: UploadFile = File(...), current_user: User = Depends(require_auth)):
    """
    EPUB 파일을 업로드하고 캐시합니다.
    이미 캐시된 파일이면 캐시에서 로드합니다.
    """
    if not file.filename.endswith('.epub'):
        raise HTTPException(status_code=400, detail="EPUB 파일만 업로드 가능합니다.")
    
    # 파일 저장
    file_path = os.path.join(STORAGE_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 파일 해시 계산
    book_hash = BookCacheService.get_file_hash(file_path)
    
    # 캐시 확인 (사용자별)
    if book_cache.is_cached(book_hash, username=current_user.username):
        data = book_cache.load_from_cache(book_hash, username=current_user.username)
        if data:
            return {
                "success": True,
                "filename": file.filename,
                "book_hash": book_hash,
                "chapters": data['chapters'],
                "cached": True
            }
    
    # 캐시 없으면 파싱
    try:
        chapters = EpubService.parse_epub(file_path, file.filename)
        
        # 이미지 URL을 캐시 경로로 변경
        for chapter in chapters:
            update_chapter_urls(chapter, book_hash)
        
        # 이미지 추출
        images = EpubService.get_all_images(file_path)
        
        # 도서 제목 추출
        title = file.filename.replace('.epub', '')
        if chapters and chapters[0].get('title'):
            title = chapters[0]['title']
        
        # 캐시에 저장
        book_cache.save_to_cache(book_hash, title, chapters, images, username=current_user.username)
        
        return {
            "success": True,
            "filename": file.filename,
            "book_hash": book_hash,
            "chapters": chapters,
            "cached": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EPUB 파싱 오류: {str(e)}")


@app.post("/books/purchase")
async def purchase_book(request: PurchaseBookRequest, current_user: User = Depends(require_auth)):
    """도서를 구매하고 JSON 매핑을 사용하여 실제 EPUB 파일을 연결합니다."""
    print(f"DEBUG: Purchase request for title='{request.title}', thumb='{request.thumbnail}'")
    
    found_file_path = None
    found_filename = None
    
    # 1. JSON 매핑에서 파일명 찾기
    thumb_name = os.path.basename(request.thumbnail) if request.thumbnail else None
    
    if thumb_name in epub_mapping:
        mapping_filename = epub_mapping[thumb_name]
    elif request.title in epub_mapping:
        mapping_filename = epub_mapping[request.title]
    
    if mapping_filename:
        fpath = os.path.join(STORE_EPUB_DIR, mapping_filename)
        if os.path.exists(fpath):
            if os.path.getsize(fpath) > 2048:
                found_file_path = fpath
                found_filename = mapping_filename
                print(f"DEBUG: Matched EPUB via JSON mapping in STORE_EPUB_DIR: {mapping_filename}")
            else:
                print(f"WARNING: File {mapping_filename} is a placeholder (size: {os.path.getsize(fpath)}).")
        else:
            print(f"WARNING: File {mapping_filename} missing in STORE_EPUB_DIR '{STORE_EPUB_DIR}'.")

    # 2. 매핑 실패 시 썸네일 키워드 기반 폴백
    if not found_file_path and thumb_name:
        thumb_keyword = thumb_name.split('.')[0]
        # STORE_EPUB_DIR에서 검색
        if os.path.exists(STORE_EPUB_DIR):
            for filename in os.listdir(STORE_EPUB_DIR):
                if filename.endswith(".epub") and thumb_keyword in filename:
                    fpath = os.path.join(STORE_EPUB_DIR, filename)
                    if os.path.getsize(fpath) > 2048:
                        found_file_path = fpath
                        found_filename = filename
                        break

    if found_file_path:
        # 파일 발견 시 처리
        book_hash = BookCacheService.get_file_hash(found_file_path)
        
        # 중복 구매 확인
        if book_cache.is_cached(book_hash, username=current_user.username):
             return {
                "book_hash": book_hash,
                "title": request.title,
                "success": False,
                "already_owned": True,
                "message": "이미 구매한 도서입니다."
            }
        
        # 파싱 및 저장
        try:
            book_info = EpubService.parse_epub(found_file_path, found_filename)
            chapters = book_info['chapters']
            actual_title = book_info.get('title', request.title)
            
            for chapter in chapters:
                update_chapter_urls(chapter, book_hash)
            
            images = EpubService.get_all_images(found_file_path)
            book_cache.save_to_cache(book_hash, actual_title, chapters, images, 
                                     username=current_user.username, 
                                     author=request.author, 
                                     thumbnail=request.thumbnail)
            
            admin_service.log_activity(current_user.username, "교재 추가", f"도서명: {actual_title}")
            
            return {
                "book_hash": book_hash,
                "title": actual_title,
                "success": True,
                "message": "도서 구매 및 변환 완료"
            }
        except Exception as e:
            logger.error(f"EPUB Parsing failed: {e}")
            return {
                "success": False,
                "error_type": "PARSING_ERROR",
                "message": f"EPUB 파일을 읽는 중 오류가 발생했습니다: {str(e)}"
            }
    
    # 3. 매칭 실패 시 에러 반환
    return {
        "success": False,
        "error_type": "MISSING_FILE",
        "message": f"'{request.title}'에 해당하는 교재 원본(EPUB)을 찾을 수 없습니다. (매핑 확인 필요)"
    }





def update_chapter_urls(chapter: dict, book_hash: str):
    """챕터 내의 AST(content)와 HTML 내의 이미지 URL을 모두 캐시 경로로 변경"""
    # 1. AST 처리
    if 'content' in chapter:
        _update_ast_urls(chapter['content'], book_hash)
    
    # 2. HTML 처리
    if 'html' in chapter and isinstance(chapter['html'], str):
        # /image/경로 형태를 /books/hash/images/원본경로 로 변경 (계층 유지)
        def repl(match):
            image_path = match.group(1)
            return f'src="/books/{book_hash}/images/{image_path}"'
        
        chapter['html'] = re.sub(r'src=["\']/image/(.+?)["\']', repl, chapter['html'])
        
        # SVG href도 처리
        def repl_href(match):
            attr = match.group(1)
            image_path = match.group(2)
            return f'{attr}="/books/{book_hash}/images/{image_path}"'
        
        chapter['html'] = re.sub(r'(href|xlink:href)=["\']/image/(.+?)["\']', repl_href, chapter['html'])
        
        # 3. CSS내의 url() 경로 처리
        def repl_css_url(match):
            path = match.group(1)
            # /image/ 형태로 변환된 경로가 있다면 /books/... 형태로 변경
            if path.startswith('/image/'):
                clean_path = path.replace('/image/', '')
                return f'url("/books/{book_hash}/images/{clean_path}")'
            return match.group(0)
            
        chapter['html'] = re.sub(r'url\(["\']?(.+?)["\']?\)', repl_css_url, chapter['html'])
        
        # 4. style 태그의 CSS 스코핑 처리
        def repl_style(match):
            style_content = match.group(2)
            scoped_css = EpubService._scope_css(style_content)
            return f'<style{match.group(1)}>{scoped_css}</style>'
        
        chapter['html'] = re.sub(r'<style(.*?)>(.*?)</style>', repl_style, chapter['html'], flags=re.DOTALL)

def _update_ast_urls(content: list, book_hash: str):
    """AST 내의 이미지 URL을 캐시 경로로 변경 (내부용)"""
    if not isinstance(content, list):
        return
    
    for node in content:
        if isinstance(node, dict):
            # img 태그 처리
            if node.get('type') == 'img' and node.get('props'):
                src = node['props'].get('src', '')
                if src and ('localhost:' in src or '/image/' in src):
                    parts = src.split('/image/')
                    if len(parts) > 1:
                        # 원본 경로 계층 유지
                        image_path = parts[1]
                        node['props']['src'] = f"/books/{book_hash}/images/{image_path}"
            
            # SVG image 태그 처리 (xlink:href, href)
            if node.get('type') == 'image' and node.get('props'):
                for attr in ['xlink:href', 'xlinkHref', 'href']:
                    href = node['props'].get(attr, '')
                    if href and ('localhost:' in href or '/image/' in href):
                        parts = href.split('/image/')
                        if len(parts) > 1:
                            # 원본 경로 계층 유지
                            image_path = parts[1]
                            node['props'][attr] = f"/books/{book_hash}/images/{image_path}"
            
            # style 태그 스코핑
            if node.get('type') == 'style' and node.get('children'):
                for child in node['children']:
                    if child.get('type') == 'text' and child.get('content'):
                        child['content'] = EpubService._scope_css(child['content'])
            
            # 자식 재귀 처리
            if node.get('children'):
                _update_ast_urls(node['children'], book_hash)


@app.get("/books/{book_hash}/images/{image_name:path}")
async def get_book_asset(book_hash: str, image_name: str, current_user: User = Depends(get_current_user)):
    """캐시된 ZIP에서 이미지나 CSS 등을 읽어 반환합니다. CSS는 스코핑 처리를 수행합니다."""
    # URL 인코딩된 경로 디코딩 (e.g. %2F -> /)
    image_name = unquote(image_name)
    # current_user가 없으면 "default" 혹은 에러 처리
    username = current_user.username if current_user else "default"
    asset_data = book_cache.get_image_from_cache(book_hash, image_name, username=username)
    
    # 폴백: 토큰이 없거나 본인 캐시에 없는 경우 전체 캐시에서 검색
    if not asset_data:
        asset_data = book_cache.find_image_anywhere(book_hash, image_name)
        
    if not asset_data:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    
    # 확장자로 media_type 추정
    ext = image_name.split('.')[-1].lower()
    media_types = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'png': 'image/png', 'gif': 'image/gif',
        'svg': 'image/svg+xml', 'webp': 'image/webp',
        'css': 'text/css', 'js': 'application/javascript'
    }
    media_type = media_types.get(ext, 'application/octet-stream')
    
    # CSS 파일인 경우 스코핑 처리 수행 (Leakage 방지)
    if ext == 'css':
        try:
            css_text = asset_data.decode('utf-8', errors='ignore')
            # 이미 스코핑된 파일인지 확인하여 중복 처리 방지 (간단 체크)
            if '.epub-scope' not in css_text:
                scoped_css = EpubService._scope_css(css_text)
                asset_data = scoped_css.encode('utf-8')
        except Exception as e:
            logger.error(f"External CSS scoping failed for {image_name}: {e}")

    return Response(content=asset_data, media_type=media_type)


# 기존 호환용 (원본 EPUB에서 직접 이미지 로드)
@app.get("/book/{filename}/image/{image_path:path}")
async def get_image(filename: str, image_path: str):
    """EPUB 내의 이미지를 반환합니다."""
    filename = unquote(filename)
    image_path = unquote(image_path)
    
    file_path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    image_data, media_type = EpubService.get_image(file_path, image_path)
    if not image_data:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    
    return Response(content=image_data, media_type=media_type)


@app.delete("/books/{book_hash}")
async def delete_book(book_hash: str, current_user: User = Depends(require_auth)):
    """캐시된 도서를 삭제합니다."""
    if book_cache.delete_cache(book_hash, username=current_user.username):
        return {"success": True, "message": "도서가 삭제되었습니다."}
    raise HTTPException(status_code=404, detail="도서를 찾을 수 없습니다.")


@app.post("/ai/feedback")
async def get_ai_feedback(request: FeedbackRequest):
    """사용자 입력에 대한 AI 피드백을 제공합니다."""
    feedback = await ai_service.get_feedback(request.context_text, request.user_input)
    
    # 활동 로그 기록 (사용자명, 질문 요약 등)
    try:
        username = current_user.username if current_user else "anonymous"
        summary = (request.user_input[:40] + '...') if len(request.user_input) > 40 else request.user_input
        admin_service.log_activity(username, "AI 피드백", f"질문: {summary}")
    except Exception as e:
        logger.error(f"Failed to log AI activity: {e}")
    
    return {"feedback": feedback}


@app.post("/activity/check-answer")
async def check_answer(request: AnswerRequest):
    """사용자 답변을 정답과 비교하고 AI 힌트를 제공합니다."""
    user_answer_clean = request.user_answer.strip().lower()
    correct_answer_clean = request.correct_answer.strip().lower()
    is_correct = user_answer_clean == correct_answer_clean
    
    hint = None
    if not is_correct:
        try:
            first_char_hint = request.correct_answer[0] if request.correct_answer else ""
            answer_length = len(request.correct_answer)
            
            prompt = f"""당신은 친절한 한국어 교육 전문가입니다.

다음 빈칸 채우기 문제에서 학습자가 오답을 제출했습니다.

[정답]: {request.correct_answer}
[학습자 답변]: {request.user_answer}

요구사항:
1. 정답을 직접 알려주지 마세요!
2. 정답을 유추할 수 있는 힌트를 1-2문장으로 제공해주세요.
3. 격려하는 말투로 다시 시도해보라고 응원해주세요.
4. 힌트 예시: "첫 글자는 '{first_char_hint}'이에요", "이 단어는 {answer_length}글자예요" 등을 활용할 수 있어요.

짧고 친절하게 답변해주세요."""

            response = await ai_service.client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            hint = response.text
        except Exception:
            first_char = request.correct_answer[0] if request.correct_answer else ""
            hint = f"💡 힌트: 첫 글자는 '{first_char}'이에요. 다시 한번 생각해보세요!"
    
    return {
        "is_correct": is_correct,
        "hint": hint
    }


# ===== 챗봇 API =====

@app.post("/chatbot/message")
async def chatbot_message(request: ChatRequest):
    """서비스 상담 챗봇 - Dadoke 서비스 정보 기반 응답"""
    if not ai_service.client:
        return {"reply": "죄송합니다. AI 서비스가 현재 설정되지 않았습니다. 고객센터(1588-0000)로 문의해 주세요."}

    # 도서 카탈로그 요약 생성
    books = store_service.get_all_books()
    book_catalog = "\n".join([
        f"- {b.get('title', '')} | 카테고리: {b.get('category', '')} | 가격: {b.get('price', '')} | 저자: {b.get('author', '')} | 소개: {b.get('description', '')}"
        for b in books[:30]  # 최대 30권
    ])

    system_prompt = f"""당신은 Dadoke(다도케) 서비스의 친절한 AI 상담원입니다.

## 회사 정보
- 회사명: (주)북차카
- 대표이사: 서정환
- 사업자등록번호: 128-87-04362
- 주소: 경기도 고양시 일산동구 일산로 138, 402-5호
- 고객센터 전화: 1588-0000 (평일 09:00-18:00, 점심 12:00-13:00, 토·일·공휴일 휴무)
- 이메일: support@dadoke.com
- 카카오톡: @dadoke

## 서비스 소개
Dadoke는 전 세계 한국어 학습자를 위한 디지털 콘텐츠 플랫폼입니다.
- EPUB 기반 전자책 열람 서비스
- TOPIK AI 학습 서비스 (기본 기능 무료, 프리미엄은 구독)
- 디지털 콘텐츠 마켓플레이스
- 학습 커뮤니티
- 카테고리: 학교/유학, 의료/건강, 직장생활, 여행, 일상생활, IT/기술, 요리/음식, 미용/뷰티, 운동/스포츠, 음악/문화, 취업/면접, 육아/가정, 자격증/시험, 건설/기술직

## 환불 정책
- 구매 후 7일 이내, 콘텐츠 미열람 시 전액 환불 가능
- 환불 문의는 고객센터로

## 현재 도서 카탈로그
{book_catalog}

## 응답 규칙
1. 항상 한국어로 답변하세요 (사용자가 다른 언어로 물으면 해당 언어로)
2. 모르는 정보는 추측하지 말고 고객센터 연락처를 안내하세요
3. 친절하고 간결하게 답변하세요
4. 도서 추천 시 카탈로그에 있는 실제 도서만 추천하세요
5. 기술적 문제나 계정 관련 문의는 고객센터를 안내하세요"""

    # 대화 이력 구성
    contents = []

    # 시스템 프롬프트를 첫 번째 user 메시지로 주입
    contents.append({"role": "user", "parts": [{"text": system_prompt + "\n\n위 정보를 바탕으로 상담원 역할을 수행해주세요. '네, 알겠습니다'로만 답변해주세요."}]})
    contents.append({"role": "model", "parts": [{"text": "네, 알겠습니다."}]})

    # 이전 대화 이력
    for msg in request.history:
        role = "model" if msg.role == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": msg.content}]})

    # 현재 메시지
    contents.append({"role": "user", "parts": [{"text": request.message}]})

    try:
        response = await ai_service.client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents
        )
        reply = response.text or "죄송합니다. 응답을 생성하지 못했습니다."
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        reply = "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도하시거나 고객센터(1588-0000)로 문의해 주세요."

    return {"reply": reply}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
