/**
 * Canvas 기반 콘텐츠 렌더러 컴포넌트입니다.
 * @description
 * - 보안성 향상을 위해 텍스트와 이미지를 직접적인 HTML DOM이 아닌 Canvas 위에 수동으로 드로잉합니다.
 * - 이는 브라우저의 기본 복사, 드래그, 인쇄 기능을 원천적으로 차단하는 효과가 있습니다.
 * - 질문 답변용 빈칸(`ActivityBlank`)과 같은 인터랙티브 요소는 Canvas 좌표 위에 절대 좌표로 배치된 HTML 오버레이로 처리합니다.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

interface ASTNode {
    type: string;
    props?: Record<string, unknown>;
    children?: ASTNode[];
    content?: string;
}

/**
 * 렌더러의 입력 속성(Props) 인터페이스입니다.
 * @property {ASTNode[]} content - 렌더링할 도서 본문 AST 데이터
 * @property {number} [width=700] - Canvas 가로 너비 (기본값 700px)
 */
interface CanvasContentRendererProps {
    content: ASTNode[];
    width?: number;
}

/**
 * Canvas 드로잉 중에 공유되는 렌더링 컨텍스트 상태입니다.
 * 현재 좌표(x, y), 폰트 스타일, 컬러 및 인터랙티브 요소 목록을 추적합니다.
 */
interface RenderContext {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    maxWidth: number;
    lineHeight: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    fontStyle: string;
    color: string;
    interactiveElements: InteractiveElement[];
}

interface InteractiveElement {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    answer: string;
}

/**
 * Canvas 위에 오버레이로 표시되는 빈칸 채우기 입력 콤보입니다.
 * Canvas 좌표를 기반으로 하되, 실제 입력 상호작용은 표준 HTML 요소를 통해 수행합니다.
 * @private
 * @param {InteractiveElement} element - 오버레이 요소의 위치 및 정보
 */
function ActivityBlankOverlay({
    element,
    t
}: {
    element: InteractiveElement;
    t: (key: string) => any;
}) {
    const [value, setValue] = useState('');
    const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
    const [hint, setHint] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCheck = async () => {
        if (!value.trim()) return;
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:8001/activity/check-answer', {
                activity_id: element.id,
                user_answer: value,
                correct_answer: element.answer,
                question_context: ''
            });

            if (response.data.is_correct) {
                setStatus('correct');
                setHint('');
            } else {
                setStatus('incorrect');
                setHint(response.data.hint || t('renderer_try_again'));
            }
        } catch {
            setHint(t('renderer_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setValue('');
        setStatus('idle');
        setHint('');
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: element.x,
                top: element.y,
                zIndex: 10
            }}
        >
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={status === 'correct'}
                    className={`px-3 py-1 border-2 rounded-lg text-sm w-32 ${status === 'correct' ? 'border-green-500 bg-green-50' :
                        status === 'incorrect' ? 'border-red-500 bg-red-50' :
                            'border-blue-300'
                        }`}
                    placeholder={t('renderer_placeholder')}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                />
                {status !== 'correct' && (
                    <button
                        onClick={handleCheck}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                    >
                        {loading ? '...' : t('renderer_check')}
                    </button>
                )}
                {status === 'incorrect' && (
                    <button
                        onClick={handleRetry}
                        className="px-3 py-1 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600"
                    >
                        {t('renderer_retry')}
                    </button>
                )}
            </div>
            {hint && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm max-w-xs">
                    {hint}
                </div>
            )}
        </div>
    );
}

/**
 * 메인 Canvas 렌더러 컴포넌트 함수입니다.
 */
export function CanvasContentRenderer({ content, t, width = 700 }: CanvasContentRendererProps & { t: (key: string) => any }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [interactiveElements, setInteractiveElements] = useState<InteractiveElement[]>([]);

    /**
     * Canvas 드로잉 전에 필요한 모든 이미지를 사전에 로드합니다.
     * crossOrigin 설정을 통해 외부 이미지도 Canvas에 안전하게 그릴 수 있도록 합니다.
     * @private
     */
    const preloadImages = useCallback(async (nodes: ASTNode[]) => {
        const imageSrcs: string[] = [];

        const collectImages = (node: ASTNode) => {
            if (node.type === 'img' && node.props?.src) {
                imageSrcs.push(node.props.src as string);
            }
            if (node.children) {
                node.children.forEach(collectImages);
            }
        };

        nodes.forEach(collectImages);

        const loaded = new Map<string, HTMLImageElement>();
        await Promise.all(imageSrcs.map(src =>
            new Promise<void>((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    loaded.set(src, img);
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = src;
            })
        ));

        return loaded;
    }, []);

    /**
     * AST 데이터를 단계별로 Canvas에 드로잉하는 핵심 로직입니다.
     * 1. 이미지 프리로드
     * 2. 고해상도(Retina) 대응을 위한 고배율 백버퍼 설정
     * 3. 가상 렌더링(Dry Run)을 수행하여 전체 콘텐츠의 높이를 측정
     * 4. 측정된 높이로 Canvas 크기 재조정 후 실제 드로잉 수행
     * @private
     */
    const renderToCanvas = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 이미지 프리로드
        const images = await preloadImages(content);

        // 고해상도 지원 (Retina)
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = width;

        // 초기 높이 계산 (임시)
        let estimatedHeight = 2000;
        canvas.width = displayWidth * dpr;
        canvas.height = estimatedHeight * dpr;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${estimatedHeight}px`;
        ctx.scale(dpr, dpr);

        // 배경 클리어
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, displayWidth, estimatedHeight);

        const renderCtx: RenderContext = {
            ctx,
            x: 0,
            y: 20,
            maxWidth: displayWidth - 40,
            lineHeight: 28,
            fontSize: 16,
            fontFamily: "'Spoqa Han Sans Neo', 'Spoqa Han Sans', sans-serif",
            fontWeight: 'normal',
            fontStyle: 'normal',
            color: '#1e293b',
            interactiveElements: []
        };

        // 렌더링 (첫 번째 패스: 가상 렌더링으로 높이 측정)
        for (const node of content) {
            renderNode(node, renderCtx, images);
        }

        // 실제 높이로 조정
        const finalHeight = renderCtx.y + 100;
        setInteractiveElements(renderCtx.interactiveElements);

        // 캔버스 높이 재조정
        canvas.height = finalHeight * dpr;
        canvas.style.height = `${finalHeight}px`;
        ctx.scale(dpr, dpr);

        // 다시 렌더링 (두 번째 패스: 실제 렌더링)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, displayWidth, finalHeight);

        renderCtx.y = 20;
        renderCtx.interactiveElements = [];
        for (const node of content) {
            renderNode(node, renderCtx, images);
        }
        setInteractiveElements(renderCtx.interactiveElements);

    }, [content, width, preloadImages]);

    useEffect(() => {
        renderToCanvas();
    }, [renderToCanvas]);

    return (
        <div
            ref={containerRef}
            className="relative"
            style={{
                userSelect: 'none',
                WebkitUserSelect: 'none'
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    pointerEvents: 'none'
                }}
            />
            {/* 인터랙티브 요소 오버레이 */}
            {interactiveElements.map((element) => (
                <ActivityBlankOverlay
                    key={element.id}
                    element={element}
                    t={t}
                />
            ))}
        </div>
    );
}

// --- External Render Helpers ---

const renderText = (text: string, ctx: RenderContext) => {
    const { ctx: canvasCtx, maxWidth, lineHeight } = ctx;
    canvasCtx.font = `${ctx.fontStyle} ${ctx.fontWeight} ${ctx.fontSize}px ${ctx.fontFamily}`;
    canvasCtx.fillStyle = ctx.color;
    const words = text.split(/(\s+)/);
    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine + word;
        const metrics = canvasCtx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
            canvasCtx.fillText(currentLine, ctx.x + 20, ctx.y);
            ctx.y += lineHeight;
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        canvasCtx.fillText(currentLine, ctx.x + 20, ctx.y);
    }
};

const renderImage = (
    node: ASTNode,
    ctx: RenderContext,
    images: Map<string, HTMLImageElement>
) => {
    const src = node.props?.src as string;
    const img = images.get(src);
    if (img) {
        const maxImgWidth = ctx.maxWidth - 40;
        let imgWidth = img.width;
        let imgHeight = img.height;
        if (imgWidth > maxImgWidth) {
            const ratio = maxImgWidth / imgWidth;
            imgWidth = maxImgWidth;
            imgHeight = img.height * ratio;
        }
        ctx.y += 10;
        ctx.ctx.drawImage(img, 20, ctx.y, imgWidth, imgHeight);
        ctx.y += imgHeight + 20;
    }
};

const extractText = (node: ASTNode): string => {
    if (node.content) return node.content;
    if (node.children) {
        return node.children.map(extractText).join('');
    }
    return '';
};

const findNodes = (node: ASTNode, types: string | string[]): ASTNode[] => {
    const typeArr = Array.isArray(types) ? types : [types];
    const results: ASTNode[] = [];
    if (typeArr.includes(node.type)) {
        results.push(node);
    }
    if (node.children) {
        for (const child of node.children) {
            results.push(...findNodes(child, types));
        }
    }
    return results;
};

const renderTable = (node: ASTNode, ctx: RenderContext) => {
    ctx.y += 10;
    const rows = findNodes(node, 'tr');
    const cellWidth = (ctx.maxWidth - 40) / 4;
    const cellHeight = 30;
    for (const row of rows) {
        const cells = findNodes(row, ['td', 'th']);
        let cellX = 20;
        for (const cell of cells) {
            ctx.ctx.strokeStyle = '#e2e8f0';
            ctx.ctx.strokeRect(cellX, ctx.y, cellWidth, cellHeight);
            const text = extractText(cell);
            ctx.ctx.font = `${ctx.fontSize}px ${ctx.fontFamily}`;
            ctx.ctx.fillStyle = ctx.color;
            ctx.ctx.fillText(text.substring(0, 20), cellX + 5, ctx.y + 20);
            cellX += cellWidth;
        }
        ctx.y += cellHeight;
    }
    ctx.y += 20;
};

const renderNode = (
    node: ASTNode,
    ctx: RenderContext,
    images: Map<string, HTMLImageElement>
) => {
    if (node.content) {
        renderText(node.content, ctx);
        return;
    }
    const savedState = { ...ctx };
    switch (node.type) {
        case 'h1': ctx.fontSize = 32; ctx.fontWeight = 'bold'; ctx.y += 20; break;
        case 'h2': ctx.fontSize = 26; ctx.fontWeight = 'bold'; ctx.y += 16; break;
        case 'h3': ctx.fontSize = 22; ctx.fontWeight = 'bold'; ctx.y += 12; break;
        case 'p': ctx.y += 8; break;
        case 'strong': case 'b': ctx.fontWeight = 'bold'; break;
        case 'em': case 'i': ctx.fontStyle = 'italic'; break;
        case 'span':
            if (node.props?.className && String(node.props.className).includes('activity-blank')) {
                const answer = node.props['data-answer'] as string || '';
                const elementId = `blank-${ctx.interactiveElements.length}`;
                ctx.interactiveElements.push({
                    id: elementId, x: ctx.x + 20, y: ctx.y - 10, width: 150, height: 40, answer
                });
                ctx.y += 50;
                return;
            }
            break;
        case 'img': renderImage(node, ctx, images); return;
        case 'br': ctx.y += ctx.lineHeight; ctx.x = 0; return;
        case 'table': renderTable(node, ctx); return;
    }
    if (node.children) {
        for (const child of node.children) {
            renderNode(child, ctx, images);
        }
    }
    if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'li', 'tr'].includes(node.type)) {
        ctx.y += ctx.lineHeight; ctx.x = 0;
    }
    ctx.fontSize = savedState.fontSize;
    ctx.fontWeight = savedState.fontWeight;
    ctx.fontStyle = savedState.fontStyle;
};

export default CanvasContentRenderer;
