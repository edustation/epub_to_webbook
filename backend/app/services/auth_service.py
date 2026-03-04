"""
JWT 기반 인증 서비스
- 사용자 등록/로그인
- JWT 토큰 발급/검증
"""
import os
import json
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# 설정
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7일

# 비밀번호 해싱 (sha256_crypt 사용 - bcrypt 72바이트 제한 없음)
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# 사용자 저장소 (JSON 파일)
DATA_DIR = Path(__file__).parent.parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"


class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    nationality: Optional[str] = None
    disabled: bool = False
    is_verified: bool = False


class UserInDB(User):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class AuthService:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not USERS_FILE.exists():
            self._save_users({})
        self.verification_codes = {} # {email: code}
    
    def _load_users(self) -> dict:
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    
    def _save_users(self, users: dict):
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def get_user(self, username: str) -> Optional[UserInDB]:
        users = self._load_users()
        if username in users:
            user_data = users[username]
            return UserInDB(**user_data)
        return None
    
    def authenticate_user(self, username: str, password: str) -> Optional[UserInDB]:
        user = self.get_user(username)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user
    
    def create_user(self, username: str, password: str, email: Optional[str] = None, 
                    full_name: Optional[str] = None, nationality: Optional[str] = None) -> bool:
        users = self._load_users()
        if username in users:
            return False  # 이미 존재
        
        users[username] = {
            "username": username,
            "email": email,
            "full_name": full_name,
            "nationality": nationality,
            "disabled": False,
            "is_verified": False,
            "joined_at": datetime.now().isoformat(),
            "hashed_password": self.get_password_hash(password)
        }
        self._save_users(users)
        return True

    def generate_verification_code(self, email: str) -> str:
        """이메일 인증 코드 생성 및 저장 (실제로는 이메일 발송 로직이 들어갈 자리)"""
        code = "".join(secrets.choice("0123456789") for _ in range(6))
        self.verification_codes[email] = code
        print(f"\n[EMAIL_VERIFICATION] Verification code for {email}: {code}\n")
        return code

    def verify_code(self, email: str, code: str) -> bool:
        """인증 코드 검증"""
        stored_code = self.verification_codes.get(email)
        if stored_code and stored_code == code:
            # 인증 성공 시 코드 삭제 (1회용)
            del self.verification_codes[email]
            return True
        return False
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[str]:
        """토큰 검증 후 username 반환"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                return None
            return username
        except JWTError:
            return None
    
    def get_current_user(self, token: str) -> Optional[UserInDB]:
        username = self.verify_token(token)
        if username is None:
            return None
        return self.get_user(username)

    def update_user(self, username: str, full_name: Optional[str] = None, 
                   nationality: Optional[str] = None, password: Optional[str] = None) -> bool:
        users = self._load_users()
        if username not in users:
            return False
            
        if full_name is not None:
            users[username]["full_name"] = full_name
        if nationality is not None:
            users[username]["nationality"] = nationality
        if password:
            users[username]["hashed_password"] = self.get_password_hash(password)
            
        self._save_users(users)
        return True

    def delete_user(self, username: str) -> bool:
        users = self._load_users()
        if username in users:
            del users[username]
            self._save_users(users)
            return True
        return False


# 싱글톤
auth_service = AuthService()
