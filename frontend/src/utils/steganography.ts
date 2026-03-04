/**
 * Zero-Width Character Steganography Utility
 * @description
 * 텍스트 데이터 내에 보이지 않는 식별자(예: 사용자 ID)를 공백 문자로 인코딩하여 삽입합니다.
 * 이 방식은 외관상으로는 보이지 않으나, 텍스트를 복사하여 붙여넣더라도 인코딩된 정보가 유지되므로
 * 콘텐츠 유출 경로 추적(Watermarking)에 유용합니다.
 */

// Zero-Width Characters
const ZERO_WIDTH = {
    START: '\u200B', // Zero Width Space
    ONE: '\u200C',   // Zero Width Non-Joiner
    ZERO: '\u200D',  // Zero Width Joiner
    END: '\u200E',   // Left-To-Right Mark
};

/**
 * 평문 텍스트를 이진수로 변환한 후, 이진수의 각 비트를 Zero-Width 문자로 매핑하여 인코딩합니다.
 * @param {string} text - 숨기고자 하는 식별자 텍스트 (예: 'user_123')
 * @returns {string} Zero-Width 문자로 변환된 인코딩 문자열
 */
export const encodeZeroWidth = (text: string): string => {
    const binary = text
        .split('')
        .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');

    const zeroWidthStr = binary
        .split('')
        .map((bit) => (bit === '1' ? ZERO_WIDTH.ONE : ZERO_WIDTH.ZERO))
        .join('');

    return `${ZERO_WIDTH.START}${zeroWidthStr}${ZERO_WIDTH.END}`;
};

/**
 * 텍스트 내에 포함된 Zero-Width 인코딩 패턴을 찾아 다시 평문으로 디코딩합니다.
 * @param {string} text - 숨겨진 코드가 포함되어 있을 것으로 추정되는 전체 텍스트
 * @returns {string | null} 디코딩된 평문 식별자, 패턴이 없으면 null 반환
 */
export const decodeZeroWidth = (text: string): string | null => {
    if (!text.includes(ZERO_WIDTH.START) || !text.includes(ZERO_WIDTH.END)) {
        return null;
    }

    const matches = text.match(new RegExp(`${ZERO_WIDTH.START}(.*?)${ZERO_WIDTH.END}`));
    if (!matches || !matches[1]) return null;

    const binaryStr = matches[1]
        .split('')
        .map((char) => {
            if (char === ZERO_WIDTH.ONE) return '1';
            if (char === ZERO_WIDTH.ZERO) return '0';
            return '';
        })
        .join('');

    let decoded = '';
    for (let i = 0; i < binaryStr.length; i += 8) {
        const byte = binaryStr.substring(i, i + 8);
        decoded += String.fromCharCode(parseInt(byte, 2));
    }

    return decoded;
};

/**
 * 원본 콘텐츠의 문장 끝이나 공백 부분에 인코딩된 워터마크를 분산하여 삽입합니다.
 * 단순히 텍스트 끝에 붙이는 방식보다 제거하기가 훨씬 까다롭습니다.
 * @param {string} content - 원본 텍스트 콘텐츠
 * @param {string} watermarkText - 삽입할 식별자 텍스트
 * @returns {string} 워터마크가 삽입된 결과 텍스트
 */
export const injectWatermark = (content: string, watermarkText: string): string => {
    const code = encodeZeroWidth(watermarkText);
    // 문장 끝이나 공백 뒤에 삽입
    return content.replace(/(\.|\s)/g, `$1${code}`);
};
