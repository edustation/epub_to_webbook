import React, { useState } from 'react';
import axios from 'axios';

/**
 * EPUB 콘텐츠를 구조화한 추상 구문 트리(AST) 노드의 인터페이스입니다.
 */
interface ASTNode {
    type: string;                    // HTML 태그명 (예: 'div', 'p', 'span') 또는 'text'
    props?: Record<string, unknown>; // 태그의 속성 (id, class, style 등)
    children?: ASTNode[];            // 하위 노드 배열
    content?: string;                // text 타입 노드인 경우의 실제 문자열 내용
}

interface ActivityBlankProps {
    activityId: string;
    answer: string;
    t: (key: string) => any;
}

/**
 * 도서 본문 내의 '빈칸 채우기' 활동을 처리하는 컴포넌트입니다.
 * 사용자의 답변을 백엔드로 전송하여 정답 여부를 확인하고 힌트를 출력합니다.
 * 
 * @param {ActivityBlankProps} props - 컴포넌트 속성
 * @param {string} props.activityId - 활동 고유 식별자
 * @param {string} props.answer - 정답 (백엔드 대조용)
 */
export function ActivityBlank({ activityId, answer, t }: ActivityBlankProps) {
    const [value, setValue] = useState('');
    const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [hint, setHint] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    const handleCheck = async () => {
        if (!value.trim()) {
            alert(t('renderer_answer_required'));
            return;
        }

        setIsChecking(true);
        try {
            const response = await axios.post('/activity/check-answer', {
                activity_id: activityId,
                user_answer: value,
                correct_answer: answer,
                question_context: ''
            });

            if (response.data.is_correct) {
                setStatus('correct');
                setHint(null);
            } else {
                setStatus('wrong');
                setHint(response.data.hint || null);
            }
        } catch {
            alert(t('renderer_check_failed'));
        } finally {
            setIsChecking(false);
        }
    };

    const handleRetry = () => {
        setValue('');
        setStatus('idle');
        setHint(null);
    };

    return (
        <span className="activity-container inline-flex items-center gap-1 flex-wrap">
            <input
                type="text"
                className={`activity-input px-3 py-1.5 border-2 rounded-lg text-center min-w-[100px] text-sm focus:outline-none focus:ring-2 transition-all ${status === 'correct'
                    ? 'border-green-500 bg-green-50'
                    : status === 'wrong'
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-blue-300 focus:border-blue-500 focus:ring-blue-200'
                    }`}
                placeholder={t('renderer_placeholder')}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={status === 'correct' || isChecking}
            />

            {status === 'idle' && (
                <button
                    onClick={handleCheck}
                    disabled={isChecking}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                    {isChecking ? '...' : t('renderer_check')}
                </button>
            )}

            {status === 'wrong' && (
                <button
                    onClick={handleRetry}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 active:scale-95 transition-all shadow-sm"
                >
                    🔄 {t('renderer_retry')}
                </button>
            )}

            <span className="text-sm">
                {status === 'correct' && <span className="text-green-600 font-bold">✅</span>}
                {status === 'wrong' && <span className="text-amber-500">❌</span>}
            </span>

            {hint && (
                <div className="w-full mt-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm">
                    <div className="flex items-start gap-2">
                        <span className="text-xl">💡</span>
                        <div className="flex-1">
                            <p className="font-bold text-amber-700 text-sm mb-1">{t('renderer_hint')}</p>
                            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{hint}</p>
                        </div>
                    </div>
                </div>
            )}
        </span>
    );
}

interface ContentRendererProps {
    content: ASTNode[];
    t: (key: string) => any;
}

/**
 * EPUB 본문 데이터를 React 컴포넌트 트리로 변환하여 화면에 출력하는 핵심 렌더러입니다.
 * @description
 * 1. 전달받은 AST(Abstract Syntax Tree)를 재귀적으로 탐색합니다.
 * 2. 일반 HTML 태그는 `React.createElement`를 통해 표준 요소로 변환합니다.
 * 3. `style` 태그 및 `activity-blank`와 같은 특수 요소는 별도의 로직으로 처리합니다.
 * 
 * @param {ContentRendererProps} props - 렌더러 속성
 * @param {ASTNode[]} props.content - 렌더링할 AST 노드 배열
 */
export function ContentRenderer({ content, t }: ContentRendererProps) {
    /**
     * 개별 AST 노드를 React Node로 변환하는 내부 재귀 함수입니다.
     * @param {ASTNode} node - 현재 처리할 노드
     * @param {number} index - 배열 내 위치 (React key용)
     */
    const renderNode = (node: ASTNode, index: number): React.ReactNode => {
        // 텍스트 노드
        if (node.type === 'text') {
            return node.content;
        }

        // style 태그 특별 처리
        if (node.type === 'style') {
            const cssContent = node.children?.map(child => child.type === 'text' ? child.content : '').join('\n') || '';
            return <style key={index} dangerouslySetInnerHTML={{ __html: cssContent }} />;
        }

        // activity-blank 특별 처리
        const className = node.props?.className;
        if (node.type === 'span' && typeof className === 'string' && className.includes('activity-blank')) {
            return (
                <ActivityBlank
                    key={`activity-${index}`}
                    activityId={(node.props?.['data-activity-id'] as string) || `act-${index}`}
                    answer={(node.props?.['data-answer'] as string) || ''}
                    t={t}
                />
            );
        }

        // props 변환
        const props: Record<string, unknown> = { key: index };
        if (node.props) {
            for (const [key, value] of Object.entries(node.props)) {
                if (key === 'className') {
                    props.className = value;
                } else if (key === 'style' && typeof value === 'string') {
                    // style 문자열을 객체로 변환 (간단 버전)
                    if (value.includes('display: none') || value.includes('display:none')) {
                        props.style = { display: 'none' };
                    }
                } else if (key.startsWith('data-')) {
                    props[key] = value;
                } else {
                    props[key] = value;
                }
            }
        }

        // 자식 요소 렌더링
        const children = node.children?.map((child, i) => renderNode(child, i));

        // void 요소 처리 (img, br, hr 등)
        const voidElements = ['img', 'br', 'hr', 'input', 'meta', 'link'];
        if (voidElements.includes(node.type)) {
            return React.createElement(node.type, props);
        }

        // 일반 요소
        return React.createElement(node.type, props, children);
    };

    return (
        <div className="content-rendered epub-scope">
            {content.map((node, index) => renderNode(node, index))}
        </div>
    );
}

export default ContentRenderer;
