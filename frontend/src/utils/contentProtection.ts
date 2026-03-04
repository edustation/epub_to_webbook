/**
 * 콘텐츠 보호 기능을 초기화하고 이벤트 리스너를 등록합니다.
 * @description
 * 1. 우클릭 차단
 * 2. 텍스트 드래그 및 선택 차단
 * 3. 이미지 무단 저장(드래그) 차단
 * 4. 주요 단축키(저장, 인쇄, 복사, 개발자도구) 차단
 * 5. 캡처 및 인쇄 시도 감지시 화면 보호
 */
export function enableContentProtection() {
    // 1. 우클릭 금지
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // 2. 텍스트 선택 금지
    document.addEventListener('selectstart', (e) => {
        // 입력 필드는 허용
        if ((e.target as HTMLElement).tagName === 'INPUT' ||
            (e.target as HTMLElement).tagName === 'TEXTAREA') {
            return true;
        }
        e.preventDefault();
        return false;
    });

    // 3. 이미지 드래그 금지
    document.addEventListener('dragstart', (e) => {
        if ((e.target as HTMLElement).tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });

    // 4. 키보드 단축키 차단
    document.addEventListener('keydown', (e) => {
        // Ctrl+S (저장)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            return false;
        }
        // Ctrl+P (인쇄)
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            return false;
        }
        // Ctrl+C (복사) - 입력 필드 제외
        if (e.ctrlKey && e.key === 'c') {
            const activeElement = document.activeElement;
            if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                return false;
            }
        }
        // Ctrl+Shift+I (개발자 도구)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }
        // F12 (개발자 도구)
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        // PrintScreen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            // 화면 가림 효과
            showCaptureBlocker();
            return false;
        }
    });

    // 5. 화면 캡처 감지 (가시성 변화 감지)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // 탭이 숨겨짐 - 캡처 시도 가능성
        }
    });

    // 6. 인쇄 시도 차단 (JS)
    window.onbeforeprint = (e) => {
        e.preventDefault();
        showCaptureBlocker();
        return false;
    };

    // 7. CSS로 선택 금지 스타일 적용
    addProtectionStyles();
}

/**
 * 캡처 또는 인쇄 시도가 감지되었을 때 일시적으로 화면을 검게 가리는 효과를 줍니다.
 * @private
 */
function showCaptureBlocker() {
    const blocker = document.createElement('div');
    blocker.id = 'capture-blocker';
    blocker.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: black;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
    ">
      ⚠️ 화면 캡처가 감지되었습니다
    </div>
  `;
    document.body.appendChild(blocker);

    setTimeout(() => {
        blocker.remove();
    }, 1500);
}

/**
 * 사용자 정의 CSS를 삽입하여 브라우저 수준의 선택 및 드래그를 원천 차단합니다.
 * @private
 */
function addProtectionStyles() {
    const style = document.createElement('style');
    style.id = 'content-protection-styles';
    style.textContent = `
    /* 텍스트 선택 금지 */
    .content-rendered,
    .content-rendered * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }

    /* 이미지 드래그 금지 */
    .content-rendered img {
      -webkit-user-drag: none !important;
      -khtml-user-drag: none !important;
      -moz-user-drag: none !important;
      -o-user-drag: none !important;
      user-drag: none !important;
      pointer-events: none;
    }

    /* 인쇄 시 내용 숨기기 */
    @media print {
      body * {
        visibility: hidden !important;
      }
      body::after {
        visibility: visible !important;
        content: "이 콘텐츠는 인쇄할 수 없습니다.";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 24px;
        font-weight: bold;
      }
    }
  `;
    document.head.appendChild(style);
}

export default enableContentProtection;
