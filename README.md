# Dadoke B2B Webbook Platform - Deployment Guide

이 문서는 Dadoke B2B 웹북 플랫폼의 백엔드 및 프런트엔드 서비스 배포를 위한 가이드를 담고 있습니다.

## 프로젝트 구조

```text
b2b/
├── backend/            # FastAPI (Python) 기반 API 서버
│   ├── app/            # 소스 코드 및 서비스 로직
│   ├── data/           # 사용자 데이터베이스 (JSON 기반)
│   ├── resources/      # EPUB 매핑 정보
│   ├── storage/        # 내부 업로드 파일 저장소
│   └── main.py         # 진입점
└── frontend/           # Vite + React 기반 프런트엔드
    ├── src/            # 리액트 소스 코드
    ├── public/         # 정적 자산 및 샘플 EPUB
    └── dist/           # 빌드 결과물 (생성 예정)
```

---

## 1. 백엔드 배포 (Backend Deployment)

백엔드는 Python 3.9+와 FastAPI를 사용합니다.

### 환경 설정
1. `b2b/backend` 폴더로 이동합니다.
2. 가상 환경을 생성하고 활성화합니다.
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Mac/Linux
   .venv\Scripts\activate     # Windows
   ```
3. 필요한 패키지를 설치합니다.
   ```bash
   pip install -r requirements.txt
   ```
4. `.env` 파일을 생성하고 Gemini API 키를 설정합니다.
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### 실행 방법 (Production)
Uvicorn을 사용하여 서버를 실행합니다. 실서비스에서는 `--port`를 도메인 설정에 맞게 변경하고, 필요시 프로세스 매니저(PM2 등)를 사용하세요.
```bash
# PYTHONPATH 설정 후 실행
$env:PYTHONPATH = "."  # Windows PowerShell
export PYTHONPATH="."   # Mac/Linux

python app/main.py
```
*기본 포트: 8002*

---

## 2. 프런트엔드 배포 (Frontend Deployment)

프런트엔드는 Node.js와 Vite를 사용합니다.

### 환경 설정
1. `b2b/frontend` 폴더로 이동합니다.
2. 종속성 패키지를 설치합니다.
   ```bash
   npm install
   ```

### 빌드 및 배포
1. 운영용 정적 파일을 빌드합니다.
   ```bash
   npm run build
   ```
2. 생성된 `dist/` 폴더 내의 파일들을 Nginx나 Apache와 같은 웹 서버를 통해 호스팅합니다.

### Vite Proxy 설정 (개발 모드)
`vite.config.ts`에서 백엔드 API와의 연동을 위해 프록시 설정이 되어 있습니다. 배포 환경에서는 리버스 프록시(Nginx 등)를 사용하여 `/books`, `/auth`, `/image`, `/activity`, `/upload` 경로가 백엔드로 전달되도록 구성해야 합니다.

---

## 3. 데이터 및 자산 관리

### EPUB 자산
- 서비스에서 제공하는 샘플 도서들은 `b2b/frontend/public/sample_assets/epubs`에 위치해야 합니다.
- 해당 위치에 EPUB이 존재해야 백엔드에서 정상적으로 파싱 및 캐싱이 가능합니다.

### 캐시 및 유저 데이터
- 백엔드 실행 시 `b2b/backend/data/` 폴더에 사용자별 도서 캐시와 활동 데이터가 생성됩니다.
- 배포 시 이 폴더에 대한 쓰기 권한이 필요합니다.

---

## 4. 유의사항
- **보안**: `dist` 빌드 결과물과 백엔드 API는 동일한 도메인 또는 리버스 프록시 뒤에 두는 것을 권장합니다 (`API_BASE`가 상대 경로 `''`로 설정되어 있음).
- **콘텐츠 보호**: `contentProtection.ts` 유틸리티를 통해 기본적인 무단 복제 방지 기능이 적용되어 있습니다.
