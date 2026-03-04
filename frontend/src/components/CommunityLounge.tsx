import React from 'react';
import {
    TrendingUp, Star, ChevronRight,
    MoreHorizontal, ThumbsUp, MessageCircle,
    Share2, Zap,
    Award
} from 'lucide-react';

/**
 * 커뮤니티 게시글 데이터 인터페이스입니다.
 */
interface Post {
    id: string;      // 게시글 고유 ID
    author: string;  // 작성자 이름
    avatar: string;  // 작성자 프로필 이미지 URL
    time: string;    // 작성 시간 표시 (예: '1시간 전')
    title: string;   // 게시글 제목
    content: string; // 게시글 본문 요약
    tags: string[];  // 관련 태그 배열
    likes: number;   // 좋아요 수
    comments: number; // 댓글 수
}

/**
 * 멘토(선배) 정보 인터페이스입니다.
 */
interface Mentor {
    id: string;      // 멘토 고유 ID
    name: string;    // 부를 이름
    role: string;    // 전문 분야 또는 역할
    avatar: string;  // 멘토 프로필 이미지 URL
    company: string; // 소속 기관 명
}


interface CommunityLoungeProps {
    t: (key: string) => any;
}

/**
 * 사용자들이 정보를 공유하고 전문가(멘토)에게 조언을 얻을 수 있는 커뮤니티 공간입니다.
 * @description
 * - 상단 히어로 섹션을 통해 커뮤니티의 목적을 알리고 질문 작성 버튼을 제공합니다.
 * - 추천 선배 멘토 리스트를 가로 그리드로 보여줍니다.
 * - 최신 피드 형식으로 커뮤니티 게시글을 렌더링합니다.
 * - 사이드바에 실시간 인기 토픽 및 베스트 선배 목록을 표시합니다.
 */
export const CommunityLounge: React.FC<CommunityLoungeProps> = ({ t }) => {
    const mentors: Mentor[] = [
        { id: 'm1', name: '김민준 선배', role: '금융권 취업 멘토', avatar: 'https://i.pravatar.cc/150?u=m1', company: '글로벌 파이낸스' },
        { id: 'm2', name: '박지민 선배', role: '비자/행정 전문가', avatar: 'https://i.pravatar.cc/150?u=m2', company: '엑스팻 리걸' },
        { id: 'm3', name: '이서윤 선배', role: '커리어 코치', avatar: 'https://i.pravatar.cc/150?u=m3', company: '테크 탤런트' },
        { id: 'm4', name: '장혁 선배', role: '부동산 전문 가이드', avatar: 'https://i.pravatar.cc/150?u=m4', company: '서울 리빙' },
        { id: 'm5', name: '최수아 선배', role: '의료/건강 상담', avatar: 'https://i.pravatar.cc/150?u=m5', company: '이태원 클리닉' },
    ];

    const posts: Post[] = [
        {
            id: 'p1',
            author: 'Minji',
            avatar: 'https://i.pravatar.cc/150?u=pf1',
            time: '1h ago',
            title: 'Visa Extension Tips',
            content: 'I recently extended my F-2 visa and wanted to share some details about the process and documents needed...',
            tags: ['visa', 'admin', 'settlement'],
            likes: 12,
            comments: 5
        },
        {
            id: 'p2',
            author: 'Junho',
            avatar: 'https://i.pravatar.cc/150?u=pf2',
            time: '3h ago',
            title: 'Bank Accounts for Foreign Students',
            content: 'Which banks offer the best interest rates for international students in Korea? Any recommendations?',
            tags: ['finance', 'bank', 'tip'],
            likes: 8,
            comments: 12
        },
        {
            id: 'p3',
            author: 'Sophia',
            avatar: 'https://i.pravatar.cc/150?u=pf3',
            time: '6h ago',
            title: 'Finding Housing in Seoul',
            content: 'How to check the official register (등기부등본) when looking for an apartment to avoid scams.',
            tags: ['real_estate', 'housing', 'life'],
            likes: 24,
            comments: 7
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
            <main className="max-w-[1440px] mx-auto px-6 py-10 pb-20">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* 메인 콘텐츠 영역 */}
                    <div className="flex-1 space-y-12">
                        {/* 히어로 섹션 */}
                        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#0055D1] to-[#0085FF] p-12 text-white shadow-2xl shadow-blue-100 group">
                            <div className="relative z-10 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-4 py-1 bg-white/20 rounded-full border border-white/30 mb-6">
                                    <Award size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('comm_premium')}</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4 break-keep">
                                    {t('comm_hero_title').split('\n').map((line: string, i: number) => (
                                        <React.Fragment key={i}>
                                            {line}
                                            <br />
                                        </React.Fragment>
                                    ))}
                                </h2>
                                <p className="text-blue-500/10 text-lg font-medium mb-8 leading-relaxed opacity-90 text-white/80">
                                    {t('comm_hero_desc').split('\n').map((line: string, i: number) => (
                                        <React.Fragment key={i}>
                                            {line}
                                            <br />
                                        </React.Fragment>
                                    ))}
                                </p>
                                <div className="flex items-center gap-4">
                                    <button className="px-8 py-4 bg-white text-[#0055D1] rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 shadow-xl">
                                        {t('comm_ask')}
                                    </button>
                                    <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all text-sm">
                                        {t('comm_trending_topics')}
                                    </button>
                                </div>
                            </div>
                            {/* 장식 요소 */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl opacity-50" />
                        </section>

                        {/* 멘토 보드 */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('comm_recommend_mentors')}</h3>
                                    <p className="text-slate-500 text-sm font-medium mt-1">{t('comm_mentor_desc')}</p>
                                </div>
                                <button className="text-[#0055D1] hover:text-blue-700 font-bold flex items-center gap-1 text-sm transition-colors group">
                                    {t('view_all')} <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {mentors.map((mentor) => (
                                    <div key={mentor.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 text-center hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer group">
                                        <div className="relative inline-block mb-4">
                                            <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-0 group-hover:opacity-10 transition-opacity" />
                                            <img src={mentor.avatar} alt={mentor.name} className="relative w-24 h-24 rounded-full border-4 border-slate-50 object-cover mx-auto shadow-sm" />
                                            <div className="absolute bottom-1 right-1 w-6 h-6 bg-[#0055D1] rounded-full border-2 border-white flex items-center justify-center">
                                                <Zap size={10} className="text-white fill-white" />
                                            </div>
                                        </div>
                                        <h4 className="text-slate-900 font-bold mb-1">{mentor.name}</h4>
                                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1">{mentor.role}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{mentor.company}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 게시글 피드 */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-8 border-b border-slate-100">
                                <button className="text-slate-900 font-black text-lg border-b-4 border-[#0055D1] pb-4 -mb-[2px]">{t('comm_feed_latest')}</button>
                                <button className="text-slate-400 font-bold text-lg hover:text-slate-600 transition-colors pb-4">{t('comm_feed_popular')}</button>
                                <button className="text-slate-400 font-bold text-lg hover:text-slate-600 transition-colors pb-4">{t('comm_feed_guide')}</button>
                            </div>

                            <div className="space-y-6">
                                {posts.map((post) => (
                                    <div key={post.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer group">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-2xl object-cover bg-slate-50" />
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{post.author}</p>
                                                    <p className="text-[11px] text-slate-400 font-medium">{post.time}</p>
                                                </div>
                                            </div>
                                            <button className="p-2 text-slate-300 hover:text-slate-500 rounded-xl hover:bg-slate-50 transition-all">
                                                <MoreHorizontal size={20} />
                                            </button>
                                        </div>
                                        <h4 className="text-xl font-black text-slate-900 mb-3 group-hover:text-[#0055D1] transition-colors break-keep">{post.title}</h4>
                                        <p className="text-slate-500 leading-relaxed mb-6 text-sm line-clamp-2 font-medium">
                                            {post.content}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mb-8">
                                            {post.tags.map(tag => (
                                                <span key={tag} className="px-3 py-1 bg-slate-50 text-slate-500 text-[11px] font-bold rounded-lg border border-slate-100">
                                                    #{t(`comm_tags.${tag}`)}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-6 pt-6 border-t border-slate-50">
                                            <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all group/btn">
                                                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center group-hover/btn:bg-blue-50 transition-colors">
                                                    <ThumbsUp size={16} />
                                                </div>
                                                <span className="text-xs font-black">{post.likes}</span>
                                            </button>
                                            <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all group/btn">
                                                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center group-hover/btn:bg-blue-50 transition-colors">
                                                    <MessageCircle size={16} />
                                                </div>
                                                <span className="text-xs font-black">{post.comments}</span>
                                            </button>
                                            <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all ml-auto group/btn">
                                                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center group-hover/btn:bg-blue-50 transition-colors">
                                                    <Share2 size={16} />
                                                </div>
                                                <span className="text-xs font-black">{t('comm_share')}</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* 우측 사이드바 */}
                    <aside className="w-full lg:w-80 space-y-8">
                        {/* 트렌딩 토픽 */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingUp size={20} className="text-[#0055D1]" />
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">{t('comm_sidebar_trending')}</h3>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    { tag: 'bank', count: '1.2k' },
                                    { tag: 'visa', count: '942' },
                                    { tag: 'finance', count: '856' },
                                    { tag: 'life', count: '742' },
                                    { tag: 'settlement', count: '631' }
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center justify-between group cursor-pointer">
                                        <span className="text-slate-500 font-bold text-sm group-hover:text-[#0055D1] transition-all">#{t(`comm_tags.${item.tag}`)}</span>
                                        <span className="px-2 py-1 bg-slate-50 rounded-lg text-[10px] text-slate-400 font-black tracking-tight">{item.count}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 인기 멘토 */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <Star size={20} className="text-[#0055D1]" />
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">{t('comm_sidebar_best')}</h3>
                            </div>
                            <ul className="space-y-6">
                                {mentors.slice(0, 3).map((mentor, i) => (
                                    <li key={i} className="flex items-center gap-3 group cursor-pointer">
                                        <img src={mentor.avatar} alt={mentor.name} className="w-10 h-10 rounded-2xl object-cover border border-slate-100" />
                                        <div>
                                            <p className="text-xs font-black text-slate-900 group-hover:text-[#0055D1] transition-all">{mentor.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{mentor.role}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 프리미엄 배너 */}
                        <div className="bg-[#0F172A] rounded-[2.5rem] p-8 overflow-hidden relative group">
                            <div className="relative z-10 text-center">
                                <h3 className="text-white font-black text-xl mb-2">{t('comm_help_title')}</h3>
                                <p className="text-slate-400 text-[11px] mb-6 font-medium leading-relaxed">
                                    {t('comm_help_desc').split('\n').map((line: string, i: number) => (
                                        <React.Fragment key={i}>
                                            {line}
                                            <br />
                                        </React.Fragment>
                                    ))}
                                </p>
                                <button className="w-full py-4 bg-[#0055D1] text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all shadow-xl shadow-blue-900/40">
                                    {t('comm_mentoring_button')}
                                </button>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};
