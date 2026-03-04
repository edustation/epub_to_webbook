import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  Search, Library, LogOut, ChevronRight, Star, Book,
  GraduationCap, Stethoscope, Home, Briefcase, Plane, Coffee, Terminal, Users,
  ShoppingBag, Dumbbell, Music, Utensils, Scissors, Heart, Trophy, Sprout,
  Settings, HardHat, GraduationCap as School, UserCheck, Trash2, Sparkles,
  BarChart2, List, Shield, Monitor, Activity, Database, CheckCircle, XCircle, BookOpen,
  User, ShieldAlert, Plus, Image as ImageIcon, PlusCircle, Bell,
  Mail, Phone, MapPin, Clock, FileText, HelpCircle, MessageCircle, Globe, Eye, Lock,
  Palette, Upload
} from 'lucide-react';
import { ContentRenderer } from './components/ContentRenderer';
import { CommunityLounge } from './components/CommunityLounge';
import enableContentProtection from './utils/contentProtection';

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
// @ts-ignore
import 'swiper/css';
import { FreeMode } from 'swiper/modules';

const API_BASE = '';

/**
 * 콘텐츠를 구조화한 추상 구문 트리(AST) 노드 인터페이스입니다.
 */
interface ASTNode {
  type: string;                    // HTML 태그 명 또는 'text'
  props?: Record<string, unknown>; // 태그 속성 (id, class, style 등)
  children?: ASTNode[];            // 하위 노드
  content?: string;                // text 타입일 때의 실제 내용
}

/**
 * 도서의 개별 챕터 정보를 담는 인터페이스입니다.
 */
interface Chapter {
  id: string;        // 챕터 식별자
  title: string;     // 챕터 제목
  content: ASTNode[]; // 챕터 본문 AST
}

/**
 * 로컬 환경(IndexedDB 등)에 캐시된 도서 정보입니다.
 */
interface CachedBook {
  book_hash: string;  // 도서 고유 해시 (ID 대용)
  title: string;      // 도서 제목
  thumbnail?: string; // 썸네일 경로
  author?: string;    // 저자
}

/**
 * 목차(Table of Contents) 항목입니다.
 */
interface TOCItem {
  title: string;
}

/**
 * 도서 리뷰(후기) 데이터입니다.
 */
interface Review {
  user: string;    // 작성자 이름
  rating: number;  // 별점 (1~5)
  date: string;    // 작성일
  comment: string; // 후기 내용
}

/**
 * 마켓에서 판매되는 도서의 상세 정보입니다.
 */
interface BookData {
  id: string;               // 도서 ID
  title: string;            // 제목
  price: string;            // 가격 (표시용 문자열)
  category: string;         // 카테고리 (교육, 의료 등)
  type: string;             // 도서 타입
  icon?: string;            // 아이콘 명 (lucide-react 이름)
  mentor: string;           // 추천 멘토 이름
  description: string;      // 짧은 요약
  longDescription?: string; // 상세 소개
  thumbnail?: string;       // 썸네일 이미지 URL
  author: string;           // 저자 이름
  toc?: TOCItem[];          // 목차 리스트
  reviews?: Review[];       // 리뷰 리스트
}

// axios 인터셉터 설정
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

import { encodeZeroWidth } from './utils/steganography';

/**
 * 다국어 지원을 위한 번역 데이터 셋입니다. (한국어, 베트남어)
 * @description UI 텍스트 전반에 걸쳐 사용되는 상수들을 정의합니다.
 */
const translations = {
  ko: {
    market: '스토어',
    library: '라이브러리',
    ai: '인공지능',
    login: '로그인/가입',
    logout: '로그아웃',
    my_page: '마이 페이지',
    search_placeholder: '무엇이든 검색해보세요',
    trending_now: 'DADOKE 인기 선배 🔥',
    view_all: '전체보기',
    buy_now: '라이브러리에 추가',
    price: '가격',
    reviews: '후기',
    toc: '목차',
    description: '도서 상세 소개',
    premium_guide: '프리미엄 한국어 가이드',
    hero_title: '선배가 들려주는\n|실전 한국어 가이드|',
    hero_desc: '낯선 정점이 기적의 조각이 되는 순간,\n|DADOKE|가 성장을 지원합니다.',
    job: '직무',
    life: '생활',
    mentor_recommendations: '선배들의 추천 가이드',
    mentor_desc: '현직 선배들이 직접 알려주는 실전 한국어 가이드입니다.',
    back_to_list: '목록으로 돌아가기',
    free_open: '무료 공개 중',
    community_title: '선배들의 리얼한 한국어 팁, 더 많이 알고 싶나요?',
    community_desc: '지금 바로 커뮤니티에 참여하고 현장 꿀팁을 공유받으세요.',
    community_go: '커뮤니티 바로가기',
    reviews_count: '개의 후기',
    recommended_by: '학생들이 추천한 가이드',
    real_reviews: '선배들의 생생 리얼 후기',
    my_books: '내 도서 가이드',
    purchase_history: '도서 등록 내역',
    edit_profile: '회원 정보 수정',
    delete_confirm: '이 도서를 삭제하시겠습니까?',
    no_books: '소유하고 계신 도서가 없습니다.',
    start_reading: '읽기 시작',
    history_desc: '최근 라이브러리에 추가하신 교재 정보입니다.',
    paid_complete: '등록완료',
    remove: '제거하기',
    upload: '업로드',
    choose_file: '직접 업로드할 파일 선택',
    ai_revolution: '한국어 학습의 새로운 혁명',
    ai_desc_1: '내가 읽은 웹북의 난이도를 분석하고, 실전 TOPIK 점수를 예측합니다.',
    ai_desc_2: '선배들의 가이드와 AI의 분석이 만나 가장 완벽한 학습 경로를 제안합니다.',
    notify_me: '준비 중인 서비스 알림받기',
    accuracy: '정확도',
    realtime: '실시간',
    status: '상태',
    chapters: '목차',
    open_webbook: '웹북 열기',
    edit_profile_desc: '안전한 서비스 이용을 위해 계정 정보를 관리해 주세요.',
    update_success: '정보가 정상적으로 반영되었습니다.',
    nickname_placeholder: '닉네임을 입력하세요',
    auth_subtitle: '프리미엄 한국어 직무 교재 플랫폼',
    login_tab: '로그인',
    register_tab: '회원가입',
    username_placeholder: '사용자명 (ID)',
    password_placeholder: '비밀번호',
    email_placeholder: '이메일 주소',
    name_placeholder: '실명',
    nationality_placeholder: '국적 (예: 베트남)',
    verification_code_placeholder: '인증 코드 6자리',
    send_code_button: '인증 코드 발송',
    register_button: '가입하기',
    login_button: '들어가기',
    login_failed: '로그인 실패',
    register_success: '회원가입 성공! 로그인해주세요.',
    register_failed: '회원가입 실패',
    login_required: '로그인이 필요합니다.',
    upload_failed: '업로드 실패',
    main_search_placeholder: '지역, 직무, 생활 반경 등을 검색해보세요',
    no_results: '검색 조건에 맞는 교재가 없습니다.',
    first_review: '첫 번째 리뷰를 남겨주세요!',
    no_reviews_yet: '아직 등록된 후기가 없습니다.',
    be_the_first: '이 교재의 첫 번째 주인공이 되어보세요!',
    categories: {
      '교육': '학교/유학',
      '의료': '의료/건강',
      '생활': '생활/정착',
      '금융': '금융/은행',
      '서비스': '카페/알바',
      '쇼핑': '쇼핑/배달',
      'IT': 'IT/개발',
      '제조': '제조/건설',
      '요리': '요리/급식',
      '미용': '미용/서비스',
      '농업': '농업/귀농',
      '가족': '가족/사회',
      '취미': '취미/건강'
    },
    review_form_desc: '여러분의 소중한 후기가 다른 유학생들에게 큰 도움이 됩니다.',
    write_review_title: '생생한 수강 후기를 들려주세요!',
    edit_review_title: '후기 수정하기',
    rating_label: '만족도는 어떠신가요?',
    experience_label: '상세한 경험을 공유해 주세요',
    submit_review: '후기 등록',
    update_review: '후기 수정',
    cancel: '취소',
    login_to_review: '로그인 후 나만의 생생한 후기를 남겨보세요!',
    go_to_login: '로그인하러 가기',
    no_reviews: '아직 등록된 후기가 없습니다. 첫 번째 후기를 남겨보세요!',
    book_detail_intro: '도서 상세 소개',
    toc_guide: '목차 가이드 (Index)',
    toc_preparing: '목차 정보가 준비 중입니다.',
    admin_console: '관리자 콘솔',
    search_results: '검색 결과',
    all_books_catalog: '전체 도서 카탈로그',
    category_view_desc: '의 모든 실전 가이드를 확인해보세요.',
    search_found_prefix: '검색 조건에 맞는',
    search_found_suffix: '권의 가이드가 있습니다.',
    trending_view_desc: '현재 가장 핫한 선배들의 가이드를 모두 만나보세요.',
    new_view_desc: '따끈따끈한 최신 가이드들을 모두 확인해보세요.',
    all_view_desc: '플랫폼에서 제공하는 모든 선배들의 가이드를 한곳에서 확인하세요.',
    new_arrivals: '새롭게 합류한 선배',
    new_arrivals_desc: '따끈따끈한 신규 선배들의 실전 가이드를 만나보세요.',
    new_tag: '신규',
    back_to_all: '전체 목록으로',
    edit: '수정',
    delete: '삭제',
    run_admin_console: '관리자 콘솔 실행하기',
    admin_id_label: '고유 ID (ID)',
    admin_type_label: '도서 타입 (직무/생활)',
    admin_icon_label: '이모지 아이콘 (Icon)',
    admin_edit_title: '교재 정보 수정 (Edit Textbook)',
    admin_register_title: '새로운 교재 등록 (Register New Textbook)',
    admin_edit_desc: '기존 도서의 메타데이터와 콘텐츠 정보를 관리합니다.',
    admin_register_desc: '플랫폼에 새로운 도서 가이드를 추가합니다.',
    admin_meta_title: '도서 표지 이미지 및 메타데이터 설정',
    admin_choose_image: '이미지 파일 선택',
    admin_no_file: '선택된 파일 없음',
    admin_upload_auto_save: '이미지 업로드 시 전용 경로에 자동 저장됩니다.',
    admin_category_label: '카테고리',
    admin_title_label: '교재 제목 *',
    admin_author_label: '저자명 (Author)',
    admin_price_label: '판매 가격 *',
    admin_won: '원',
    admin_detail_intro_label: '도서 상세 소개 관리',
    admin_summary_label: '리스트용 짧은 요약',
    admin_long_desc_label: '상세 상세 정보 (웹북 개요)',
    admin_save_changes: '변경 사항 저장하기',
    admin_register_book: '새로운 교재 등록하기',
    admin_cancel: '취소',
    username_label: '사용자명 (Email)',
    save_profile: '회원정보 업기',
    admin_overlay_subtitle: '교재 카탈로그 및 목차 정보 통합 관리',
    open_dashboard: '대시보드 열기',
    exit_mode: '모드 종료',
    review_write_confirm: '후기 내용을 입력해 주세요.',
    review_save_error: '후기 저장에 실패했습니다.',
    review_delete_confirm: '정말 이 후기를 삭제하시겠습니까?',
    review_delete_error: '후기 삭제에 실패했습니다.',
    book_load_error: '도서 로드 실패',
    delete_error: '삭제 처리 중 오류가 발생했습니다.',
    admin_overview_title: '시스템 현황 (Overview)',
    admin_overview_desc: '플랫폼 현재 지표 및 요약 정보입니다.',
    admin_total_users: '총 가입 멤버',
    admin_total_books: '등록 교재 수',
    admin_total_reviews: '누적 리뷰 수',
    admin_recent_activity: '최근 플랫폼 활동',
    admin_members_title: '회원 관리 (Members)',
    admin_members_desc: '가입 사용자 목록 및 상태를 관리합니다.',
    admin_add_member: '신규 회원 등록',
    admin_user_id: '사용자 ID',
    admin_name: '이름',
    admin_catalog_title: '도서 카탈로그 (Catalog)',
    admin_catalog_desc: '플랫폼 전체 도서 목록을 관리합니다.',
    admin_add_book: '새 교재 등록',
    admin_activity_title: '시스템 활동 (Activity)',
    admin_activity_desc: '플랫폼 내에서 발생하는 주요 이벤트를 모니터링합니다.',
    admin_no_activity: '활동 내역이 없습니다.',
    admin_book_inventory: '보유 교재 인벤토리',
    admin_inventory_desc: '회원이 현재 이용 가능한 모든 도서 목록입니다.',
    admin_total_owned: '총 보유 권수',
    admin_no_owned_books: '보유한 교재가 없습니다.',
    admin_inventory_placeholder: '라이브러리에 구매한 도서가 추가되면 여기에 표시됩니다.',
    author_unknown: '저자 미상',
    renderer_answer_required: '답변을 입력해주세요.',
    renderer_check_failed: '정답 확인 실패',
    renderer_placeholder: '정답 입력',
    renderer_check: '확인',
    renderer_retry: '다시',
    renderer_hint: '힌트',
    renderer_try_again: '다시 시도해보세요!',
    renderer_error: '오류가 발생했습니다.',
    comm_premium: 'Premium Community',
    comm_hero_title: 'Dadoke 선배들의\n리얼한 한국어 팁',
    comm_hero_desc: '현장 지식부터 정착 노하우까지,\n먼저 경험한 선배들이 직접 알려드립니다.',
    comm_ask: '질문하기',
    comm_trending_topics: '인기 토픽 보기',
    comm_recommend_mentors: '추천 선배 멘토',
    comm_mentor_desc: '분야별 검증된 전문가에게 조언을 구해보세요',
    comm_feed_latest: '최신 피드',
    comm_feed_popular: '인기글',
    comm_feed_guide: '정착 가이드',
    comm_share: '공유',
    comm_sidebar_trending: '실시간 인기 토픽',
    admin_notices_title: '공지사항 관리',
    admin_notices_desc: '공지사항을 작성하고 중요 소식을 전달합니다.',
    admin_add_notice: '새 공지 등록',
    admin_edit_notice: '공지사항 수정',
    notice_title_label: '제목',
    notice_content_label: '내용',
    notice_priority_label: '중요 공지 (상단 배너 노출)',
    admin_save_notice: '공지 저장하기',
    notice_save_error: '공지사항 저장에 실패했습니다.',
    notice_delete_confirm: '이 공지사항을 삭제하시겠습니까?',
    notice_list_title: '공지사항 및 소식',
    no_notices: '등록된 공지사항이 없습니다.',
    notices_news_desc: '플랫폼의 새로운 소식과 주요 안내사항을 확인하세요.',
    comm_sidebar_best: '베스트 선배',
    comm_help_title: '도움이 필요하신가요?',
    comm_help_desc: '인증된 선배 프리미엄 멘토링으로\n고민을 단번에 해결하세요.',
    comm_mentoring_button: '멘토링 신청하기',
    comm_tags: {
      visa: '비자',
      admin: '행정',
      settlement: '정착',
      finance: '금융',
      bank: '은행',
      tip: '팁',
      real_estate: '부동산',
      housing: '주거',
      life: '생활'
    },
    notice_post_unit: '개 게시물',
    notice_type_priority: '필독',
    notice_type_hot: '인기'
  },
  vi: {
    market: 'Cửa hàng',
    library: 'Thư viện',
    ai: 'Trí tuệ nhân tạo',
    login: 'Đăng nhập/Đăng ký',
    logout: 'Đăng xuất',
    my_page: 'Trang của tôi',
    search_placeholder: 'Tìm kiếm bất cứ điều gì',
    trending_now: 'Tiền bối nổi bật của DADOKE 🔥',
    view_all: 'Xem tất cả',
    buy_now: 'Thêm vào thư viện',
    price: 'Giá',
    reviews: 'Đánh giá',
    toc: 'Mục lục',
    description: 'Giới thiệu chi tiết sách',
    premium_guide: 'Hướng dẫn tiếng Hàn cao cấp',
    hero_title: 'Hướng dẫn tiếng Hàn\n|thực tế| từ tiền bối',
    hero_desc: 'Khoảnh khắc bir điểm xa lạ trở thành một mảnh phép màu,\n|DADOKE| hỗ trợ sự trưởng thành của bạn.',
    job: 'Công việc',
    life: 'Đời sống',
    mentor_recommendations: 'Hướng dẫn đề xuất từ tiền bối',
    mentor_desc: 'Hướng dẫn tiếng Hàn thực tế được cung cấp trực tiếp bởi các tiền bối đang làm việc.',
    notice_list_title: 'Thông báo & Tin tức',
    no_notices: 'Không có thông báo nào được đăng.',
    notices_news_desc: 'Kiểm tra các tin tức mới và thông báo quan trọng của nền tảng.',
    notice_post_unit: 'Bài đăng',
    notice_type_priority: 'Quan trọng',
    notice_type_hot: 'HOT',
    admin_notices_title: 'Quản lý thông báo',
    admin_notices_desc: 'Viết thông báo và truyền tải tin tức quan trọng.',
    admin_add_notice: 'Đăng thông báo mới',
    admin_edit_notice: 'Chỉnh sửa thông báo',
    notice_title_label: 'Tiêu đề',
    notice_content_label: 'Nội dung',
    notice_priority_label: 'Thông báo quan trọng (Hiển thị biểu ngữ hàng đầu)',
    admin_save_notice: 'Lưu thông báo',
    notice_save_error: 'Lưu thông báo thất bại.',
    notice_delete_confirm: 'Bạn có chắc chắn muốn xóa thông báo này không?',
    free_open: 'Đang mở miễn phí',
    community_title: 'Mẹo tiếng Hàn thực tế từ tiền bối, bạn muốn biết thêm không?',
    community_desc: 'Tham gia ngay vào cộng đồng và chia sẻ các mẹo thực tế.',
    community_go: 'Đi đến cộng đồng',
    reviews_count: 'đánh giá',
    recommended_by: 'Được học sinh đề xuất',
    real_reviews: 'Đánh giá thực tế từ tiền bối',
    my_books: 'Sách của tôi',
    purchase_history: 'Lịch sử thêm sách',
    edit_profile: 'Sửa thông tin thành viên',
    delete_confirm: 'Bạn có chắc chắn muốn xóa cuốn sách này không?',
    no_books: 'Bạn chưa sở hữu cuốn sách nào.',
    start_reading: 'Bắt đầu đọc',
    history_desc: 'Thông tin sách bạn đã thêm gần đây.',
    paid_complete: 'Đã đăng ký',
    remove: 'Xóa',
    upload: 'Tải lên',
    choose_file: 'Chọn tệp để tải lên trực tiếp',
    ai_revolution: 'Cuộc cách mạng mới trong học tiếng Hàn',
    ai_desc_1: 'Phân tích mức độ khó của webbook bạn đã đọc và dự đoán điểm số TOPIK thực tế.',
    ai_desc_2: 'Sự kết hợp giữa hướng dẫn của tiền bối và phân tích của AI sẽ đề xuất lộ trình học tập hoàn hảo nhất.',
    notify_me: 'Nhận thông báo về dịch vụ đang chuẩn bị',
    accuracy: 'Độ chính xác',
    realtime: 'Thời gian thực',
    status: 'Trạng thái',
    chapters: 'Chương',
    open_webbook: 'Mở Webbook',
    edit_profile_desc: 'Vui lòng quản lý thông tin tài khoản của bạn để sử dụng dịch vụ an toàn.',
    update_success: 'Thông tin đã được phản ánh thành công.',
    nickname_placeholder: 'Nhập biệt danh của bạn',
    auth_subtitle: 'Nền tảng tài liệu tiếng Hàn chuyên môn cao cấp',
    login_tab: 'Đăng nhập',
    register_tab: 'Đăng ký',
    username_placeholder: 'Tên người dùng (ID)',
    password_placeholder: 'Mật khẩu',
    email_placeholder: 'Địa chỉ Email',
    name_placeholder: 'Họ và tên',
    nationality_placeholder: 'Quốc tịch (VD: Việt Nam)',
    verification_code_placeholder: 'Mã xác thực 6 chữ số',
    send_code_button: 'Gửi mã xác thực',
    register_button: 'Đăng ký',
    login_button: 'Vào học',
    login_failed: 'Đăng nhập thất bại',
    register_success: 'Đăng ký thành công! Vui lòng đăng nhập.',
    register_failed: 'Đăng ký thất bại',
    login_required: 'Cần đăng nhập.',
    upload_failed: 'Tải lên thất bại',
    main_search_placeholder: 'Tìm kiếm khu vực, công việc, v.v.',
    no_results: 'Không có tài liệu nào phù hợp với điều kiện tìm kiếm.',
    first_review: 'Hãy là người đầu tiên để lại đánh giá!',
    no_reviews_yet: 'Chưa có đánh giá nào được đăng ký.',
    be_the_first: 'Hãy trở thành nhân vật chính đầu tiên của tài liệu này!',
    categories: {
      '교육': 'Trường học/Du học',
      '의료': 'Y tế/Sức khỏe',
      '생활': 'Đời sống/Định cư',
      '금융': 'Tài chính/Ngân hàng',
      '서비스': 'Cafe/Làm thêm',
      '쇼핑': 'Mua sắm/Giao hàng',
      'IT': 'IT/Phát triển',
      '제조': 'Sản xuất/Xây dựng',
      '요리': 'Nấu ăn/Cung cấp suất ăn',
      '미용': 'Làm đẹp/Dịch vụ',
      '농업': 'Nông nghiệp/Về quê',
      '가족': 'Gia đình/Xã hội',
      '취미': 'Sở thích/Sức khỏe'
    },
    review_form_desc: 'Những đánh giá quý báu của bạn sẽ giúp ích rất nhiều cho các du học sinh khác.',
    write_review_title: 'Hãy chia sẻ trải nghiệm thực tế của bạn!',
    edit_review_title: 'Chỉnh sửa đánh giá',
    rating_label: 'Bạn đánh giá thế nào?',
    experience_label: 'Chia sẻ chi tiết trải nghiệm của bạn',
    submit_review: 'Đăng đánh giá',
    update_review: 'Cập nhật đánh giá',
    cancel: 'Hủy',
    login_to_review: 'Hãy đăng nhập để để lại những đánh giá chân thực của riêng bạn!',
    go_to_login: 'Đi đến Đăng nhập',
    no_reviews: 'Chưa có đánh giá nào. Hãy là người đầu tiên để lại đánh giá!',
    book_detail_intro: 'Giới thiệu chi tiết tài liệu',
    toc_guide: 'Hướng dẫn mục lục (Index)',
    toc_preparing: 'Thông tin mục lục đang được chuẩn bị.',
    admin_console: 'Bảng điều khiển quản trị',
    search_results: 'Kết quả tìm kiếm',
    all_books_catalog: 'Toàn bộ danh mục sách',
    category_view_desc: 'Khám phá tất cả các hướng dẫn thực tế.',
    search_found_prefix: 'Có',
    search_found_suffix: 'tài liệu phù hợp với điều kiện tìm kiếm.',
    trending_view_desc: 'Khám phá tất cả những hướng dẫn nổi bật nhất từ các tiền bối chuyên môn.',
    new_view_desc: 'Xem tất cả những hướng dẫn mới nhất vừa được cập nhật.',
    all_view_desc: 'Xem tất cả các hướng dẫn từ tất cả các tiền bối trên nền tảng tại một nơi.',
    new_arrivals: 'Tiền bối mới gia nhập',
    new_arrivals_desc: 'Khám phá các hướng dẫn thực tế từ những tiền bối mới nhất.',
    new_tag: 'Mới',
    back_to_all: 'Quay lại danh sách',
    edit: 'Sửa',
    delete: 'Xóa',
    run_admin_console: 'Chạy bảng điều khiển quản trị',
    admin_id_label: 'ID duy nhất (ID)',
    admin_type_label: 'Loại tài liệu (Công việc/Đời sống)',
    admin_icon_label: 'Biểu tượng Emoji (Biểu tượng)',
    admin_edit_title: 'Chỉnh sửa thông tin tài liệu',
    admin_register_title: 'Đăng ký tài liệu mới',
    admin_edit_desc: 'Quản lý siêu dữ liệu và thông tin nội dung của tài liệu hiện có.',
    admin_register_desc: 'Thêm hướng dẫn tài liệu mới vào nền tảng.',
    admin_meta_title: 'Thiết lập ảnh bìa và siêu dữ liệu tài liệu',
    admin_choose_image: 'Chọn tệp hình ảnh',
    admin_no_file: 'Chưa chọn tệp',
    admin_upload_auto_save: 'Hình ảnh sẽ được tự động lưu vào đường dẫn riêng khi tải lên.',
    admin_category_label: 'Danh mục',
    admin_title_label: 'Tiêu đề tài liệu *',
    admin_author_label: 'Tên tác giả (Tác giả)',
    admin_price_label: 'Giá bán *',
    admin_won: 'won',
    admin_detail_intro_label: 'Quản lý giới thiệu chi tiết tài liệu',
    admin_summary_label: 'Tóm tắt ngắn cho danh sách',
    admin_long_desc_label: 'Thông tin chi tiết (Tổng quan Webbook)',
    admin_save_changes: 'Lưu thay đổi',
    admin_register_book: 'Đăng ký tài liệu mới',
    admin_cancel: 'Hủy',
    username_label: 'Tên người dùng (Email)',
    save_profile: 'Lưu thông tin',
    admin_overlay_subtitle: 'Quản lý tích hợp danh mục tài liệu và thông tin mục lục',
    open_dashboard: 'Mở bảng điều khiển',
    exit_mode: 'Thoát chế độ',
    review_write_confirm: 'Vui lòng nhập nội dung đánh giá.',
    review_save_error: 'Lưu đánh giá thất bại.',
    review_delete_confirm: 'Bạn có chắc muốn xóa đánh giá này không?',
    review_delete_error: 'Xóa đánh giá thất bại.',
    book_load_error: 'Tải tài liệu thất bại',
    delete_error: 'Có lỗi xảy ra trong quá trình xóa.',
    admin_overview_title: 'Tổng quan hệ thống',
    admin_overview_desc: 'Chỉ số hiện tại của nền tảng và thông tin tóm tắt.',
    admin_total_users: 'Tổng số thành viên',
    admin_total_books: 'Số tài liệu đã đăng ký',
    admin_total_reviews: 'Tổng số đánh giá',
    admin_recent_activity: 'Hoạt động gần đây của nền tảng',
    admin_members_title: 'Quản lý thành viên',
    admin_members_desc: 'Quản lý danh sách người dùng và trạng thái tham gia.',
    admin_add_member: 'Đăng ký thành viên mới',
    admin_user_id: 'ID người dùng',
    admin_name: 'Họ tên',
    admin_catalog_title: 'Danh mục tài liệu',
    admin_catalog_desc: 'Quản lý toàn bộ danh sách tài liệu trên nền tảng.',
    admin_add_book: 'Đăng ký tài liệu mới',
    admin_activity_title: 'Hoạt động hệ thống',
    admin_activity_desc: 'Theo dõi các sự kiện chính xảy ra trong nền tảng.',
    admin_no_activity: 'Không có lịch sử hoạt động.',
    admin_book_inventory: 'Kho tài liệu sở hữu',
    admin_inventory_desc: 'Danh sách tất cả các tài liệu mà thành viên hiện có thể sử dụng.',
    admin_total_owned: 'Tổng số tài liệu sở hữu',
    admin_no_owned_books: 'Không có tài liệu sở hữu nào.',
    admin_inventory_placeholder: 'Tài liệu đã mua sẽ hiển thị ở đây khi được thêm vào thư viện.',
    author_unknown: 'Không rõ tác giả',
    renderer_answer_required: 'Vui lòng nhập câu trả lời của bạn.',
    renderer_check_failed: 'Kiểm tra câu trả lời thất bại',
    renderer_placeholder: 'Nhập câu trả lời',
    renderer_check: 'Kiểm tra',
    renderer_retry: 'Thử lại',
    renderer_hint: 'Gợi ý',
    renderer_try_again: 'Hãy thử lại lần nữa!',
    renderer_error: 'Đã xảy ra lỗi.',
    comm_sidebar_best: 'Tiền bối xuất sắc nhất',
    comm_help_title: 'Bạn cần giúp đỡ?',
    comm_help_desc: 'Giải quyết nỗi lo của bạn ngay lập tức\nvới dịch vụ cố vấn cao cấp từ các tiền bối đã được chứng nhận.',
    comm_mentoring_button: 'Đăng ký cố vấn',
    comm_tags: {
      visa: 'Visa',
      admin: 'Hành chính',
      settlement: 'Định cư',
      finance: 'Tài chính',
      bank: 'Ngân hàng',
      tip: 'Mẹo',
      real_estate: 'Bất động sản',
      housing: 'Nhà ở',
      life: 'Đời sống'
    }
  }
};

const Watermark = ({ text }: { text: string }) => {
  // 육안으로는 거의 보이지 않지만(0.5%) 화면 캡처 시 미세하게 남을 수 있는 시각적 워터마크
  // + Zero-Width Steganography (보이지 않는 워터마크)
  const invisibleCode = encodeZeroWidth(text);

  const items = Array.from({ length: 40 }).map((_, i) => (
    <div key={i} className="flex flex-col items-center justify-center p-12 transform -rotate-45 select-none">
      {/* 
        opacity-0.5 (0.5%) -> 육안 식별 불가, 이미지 프로세싱으로 복원 가능성 유지
        비가시성 요구사항 충족
      */}
      <div className="text-xl font-black text-black opacity-[0.005] whitespace-nowrap">
        {text || "Protected"} {invisibleCode}
      </div>
    </div>
  ));

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] flex flex-wrap content-center items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      {items}
    </div>
  );
};

/**
 * 애플리케이션의 메인 엔트리 컴포넌트입니다.
 * 상태 관리, 라우팅 시뮬레이션, 데이터 페칭 및 주요 비즈니스 로직을 포함합니다.
 */
function App() {
  const fetchNotices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/notices`);
      setNotices(response.data.notices);
    } catch (error) {
      console.error("Failed to fetch notices:", error);
    }
  };

  const handleSaveNotice = async (noticeData: any) => {
    try {
      if (adminEditingNotice?.id) {
        await axios.put(`${API_BASE}/admin/notices/${adminEditingNotice.id}`, noticeData);
      } else {
        await axios.post(`${API_BASE}/admin/notices`, noticeData);
      }
      fetchNotices();
      setAdminEditingNotice(null);
      setAdminSubView('notices');
    } catch (error: any) {
      console.error("Failed to save notice:", error);
      const detail = error.response?.data?.detail;
      let errorMsg = error.message;

      if (detail) {
        if (Array.isArray(detail)) {
          errorMsg = detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join('\n');
        } else {
          errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
        }
      }

      alert(`${t('notice_save_error')}\n\n${errorMsg}`);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (!window.confirm(t('notice_delete_confirm'))) return;
    try {
      await axios.delete(`${API_BASE}/admin/notices/${noticeId}`);
      fetchNotices();
    } catch (error) {
      console.error("Failed to delete notice:", error);
      alert(t('delete_error'));
    }
  };

  // ----- 유틸리티 함수 (Utility Functions) -----
  // --- 공통 상태 (Core States) ---
  const [loading, setLoading] = useState(false);                 // 전역 로딩 상태
  const [language, setLanguage] = useState<'ko' | 'vi'>('ko');   // 다국어 설정 (ko: 한국어, vi: 베트남어)
  const [viewMode, setViewMode] = useState<'market' | 'library' | 'viewer' | 'bookDetail' | 'ai' | 'community' | 'adminDashboard' | 'notices' | 'about' | 'privacy' | 'terms' | 'csCenter'>('market'); // 현재 화면 모드

  // --- 마켓 및 검색 상태 (Market & Search States) ---
  const [storeBooks, setStoreBooks] = useState<BookData[]>([]);  // 마켓 판매 도서 목록
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null); // 현재 상세 보기 중인 도서
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // 선택된 카테고리 필터
  const [searchQuery, setSearchQuery] = useState('');           // 검색어
  const [showStickySearch, setShowStickySearch] = useState(false); // 상단 고정 검색바 표시 여부
  const [marketViewAll, setMarketViewAll] = useState<'trending' | 'new' | 'all' | null>(null); // '전체보기' 확장 모드 (trending: 인기, new: 신규, all: 전체)
  const [visibleMarketItemsCount, setVisibleMarketItemsCount] = useState(20); // 마켓 무한 스크롤 가시 개수
  const [scrollProgress, setScrollProgress] = useState(0);      // 스크롤 진행도 (0.0 ~ 1.0, 80px 기준)

  // --- 챗봇 상태 (Chatbot States) ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSize, setChatSize] = useState({ w: 380, h: 520 });
  const [chatIsResizing, setChatIsResizing] = useState(false);
  const chatResizing = useRef(false);
  const chatResizeStart = useRef({ x: 0, y: 0, w: 380, h: 520 });
  const scrollRafRef = useRef<number | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatOpen) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!chatResizing.current || !chatBoxRef.current) return;
      const dx = chatResizeStart.current.x - e.clientX;
      const dy = chatResizeStart.current.y - e.clientY;
      const newW = Math.max(320, Math.min(700, chatResizeStart.current.w + dx));
      const newH = Math.max(400, Math.min(800, chatResizeStart.current.h + dy));
      // DOM 직접 조작 — re-render 없이 즉시 반영
      chatBoxRef.current.style.width = `${newW}px`;
      chatBoxRef.current.style.height = `${newH}px`;
    };
    const onMouseUp = () => {
      if (!chatResizing.current) return;
      chatResizing.current = false;
      setChatIsResizing(false);
      // 드래그 종료 시 최종 크기를 state에 동기화
      if (chatBoxRef.current) {
        setChatSize({
          w: parseInt(chatBoxRef.current.style.width) || 380,
          h: parseInt(chatBoxRef.current.style.height) || 520,
        });
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [chatOpen]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/chatbot/message`, {
        message: userMsg,
        history: chatMessages,
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '죄송합니다. 오류가 발생했습니다. 고객센터(1588-0000)로 문의해 주세요.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Smoothstep crossfade: 0.15~0.85 구간으로 넓혀 점진적 크로스페이드
  const crossfadeT = Math.min(Math.max((scrollProgress - 0.15) / 0.7, 0), 1);
  const crossfade = crossfadeT * crossfadeT * (3 - 2 * crossfadeT);

  // 카테고리/검색/전체보기 상태 변경 시 무한 스크롤 카운트 초기화
  useEffect(() => {
    setVisibleMarketItemsCount(20);
  }, [selectedCategory, searchQuery, marketViewAll]);

  // --- 라이브러리 및 뷰어 상태 (Library & Viewer States) ---
  const [cachedBooks, setCachedBooks] = useState<CachedBook[]>([]); // 구매/소유한 도서 목록
  const [chapters, setChapters] = useState<Chapter[]>([]);        // 현재 로드된 도서의 챕터 목록
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null); // 현재 읽고 있는 챕터
  const [currentBookHash, setCurrentBookHash] = useState<string | null>(null); // 현재 열린 도서의 고유 해시
  const [file, setFile] = useState<File | null>(null);            // 직접 업로드할 파일 객체

  // --- 관리자 모드 상태 (Admin States) ---
  const [isAdminMode, setIsAdminMode] = useState(false);          // 관리자 권한 여부
  const [adminSubView, setAdminSubView] = useState<'overview' | 'members' | 'books' | 'activity' | 'reviews' | 'memberDetail' | 'addMember' | 'bookDetail' | 'notices' | 'diagnosis' | 'resources'>('overview'); // 관리자 내부 서브 메뉴
  const [siteResources, setSiteResources] = useState<any>({}); // 사이트 리소스 설정
  const [editingSiteResources, setEditingSiteResources] = useState<any>({}); // 리소스 편집 중 상태
  const [resourceUploading, setResourceUploading] = useState<string | null>(null); // 현재 업로드 중인 리소스 키
  const [adminEditingBook, setAdminEditingBook] = useState<BookData | null>(null); // 현재 편집 중인 도서 정보
  const [allUsers, setAllUsers] = useState<any[]>([]);            // 전체 사용자 목록
  const [activities, setActivities] = useState<any[]>([]);        // 사용자 활동 로그
  const [adminStats, setAdminStats] = useState<any>(null);        // 관리자 대시보드 통계
  const [notices, setNotices] = useState<any[]>([]);              // 공지사항 목록
  const [adminEditingNotice, setAdminEditingNotice] = useState<any>(null); // 현재 편집 중인 공지사항
  const [noticesPage, setNoticesPage] = useState(1);             // 공지사항 페이지네이션 현재 페이지

  // --- 사용자 인터페이스 상태 (UI States) ---
  const [myPageTab, setMyPageTab] = useState<'books' | 'history' | 'profile'>('books'); // 마이페이지 내부 탭
  const [showUserMenu, setShowUserMenu] = useState(false);        // 사용자 상세 메뉴 표시 여부
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // 관리자 사이드바 축소 여부

  // 브라우저 뒤로가기/앞으로가기 제어를 위한 레퍼런스
  const isInternalNavigation = useRef(false);

  /**
   * 브라우저의 전/후진 버튼 클릭(popstate) 발생 시 앱의 viewMode와 상태를 동기화합니다.
   * SPA 브라우징 경험을 위해 수동으로 히스토리 상태를 관리합니다.
   */
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state) {
        isInternalNavigation.current = true;
        if (state.viewMode) setViewMode(state.viewMode);

        if (state.selectedBookId !== undefined) {
          if (state.selectedBookId) {
            const book = storeBooks.find(b => b.id === state.selectedBookId);
            setSelectedBook(book || null);
          } else {
            setSelectedBook(null);
          }
        }

        if (state.currentBookHash !== undefined) setCurrentBookHash(state.currentBookHash);
      } else {
        // 초대 상태 또는 예상치 못한 상태일 경우 마켓으로 초기화
        isInternalNavigation.current = true;
        setViewMode('market');
        setSelectedBook(null);
        setCurrentBookHash(null);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // 초기 상태가 없을 경우 히스토리에 현재 마켓 상태를 주입
    if (!window.history.state) {
      window.history.replaceState({ viewMode: 'market', selectedBookId: null, currentBookHash: null }, '', '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [storeBooks]); // storeBooks가 로드된 후 정확한 도서 정보 매핑을 위해 의존성 추가

  /**
   * 주요 상태(viewMode, selectedBook 등) 변경 시 브라우저 히스토리 스택에 상태를 푸시합니다.
   * 이를 통해 브라우저 뒤로가기 버튼이 활성화됩니다.
   */
  useEffect(() => {
    if (isInternalNavigation.current) {
      isInternalNavigation.current = false;
      return;
    }

    const currentState = window.history.state;
    if (
      !currentState ||
      currentState.viewMode !== viewMode ||
      currentState.selectedBookId !== (selectedBook?.id || null) ||
      currentState.currentBookHash !== currentBookHash
    ) {
      window.history.pushState({ viewMode, selectedBookId: selectedBook?.id || null, currentBookHash }, '', '');
    }
  }, [viewMode, selectedBook, currentBookHash]);

  /**
   * 마켓 뷰에서 스크롤을 내리거나 다른 뷰로 이동할 경우 상단 고정 검색바 표시 여부를 결정합니다.
   */
  useEffect(() => {
    if (viewMode !== 'market') {
      setShowStickySearch(true);
    } else {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        setShowStickySearch(mainContent.scrollTop > 80);
      } else {
        setShowStickySearch(false);
      }
    }
  }, [viewMode]);

  // Fetch reviews whenever a book is selected
  useEffect(() => {
    if (selectedBook) {
      fetchReviews(selectedBook.id);
    }
  }, [selectedBook?.id]);

  const handleSaveAdminBook = async () => {
    if (!adminBookTitle || !adminBookPrice) {
      alert("제목과 가격은 필수입니다.");
      return;
    }

    const bookData = {
      title: adminBookTitle,
      price: adminBookPrice.includes('원') ? adminBookPrice : (Number(adminBookPrice.replace(/[^0-9]/g, '')).toLocaleString() + '원'),
      category: adminBookCategory,
      type: '생활', // Default or derived
      mentor: adminBookMentor,
      description: adminBookDesc,
      longDescription: adminBookLongDesc,
      author: adminBookAuthor,
      toc: adminBookTOC,
      thumbnail: adminBookThumbnail,
      icon: adminBookIcon
    };

    try {
      if (adminEditingBook) {
        await axios.put(`${API_BASE}/admin/books/${adminEditingBook.id}`, bookData);
        alert("교재 정보가 수정되었습니다.");
      } else {
        await axios.post(`${API_BASE}/admin/books`, bookData);
        alert("새로운 교재가 등록되었습니다.");
      }
      setAdminSubView('books');
      fetchStoreBooks();
    } catch (error) {
      alert("교재 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAdminBook = async (bookId: string) => {
    if (!window.confirm("정말로 이 교재를 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE}/admin/books/${bookId}`);
      alert("교재가 삭제되었습니다.");
      fetchStoreBooks();
    } catch (error) {
      alert("교재 삭제 중 오류가 발생했습니다.");
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/users`);
      setAllUsers(response.data.users);
    } catch (error) {
      console.error("Failed to fetch users");
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/activity`);
      setActivities(response.data.activities);
    } catch (error) {
      console.error("Failed to fetch activities");
    }
  };

  const fetchAdminStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/stats`);
      setAdminStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats");
    }
  };

  const toggleUserStatus = async (targetUsername: string) => {
    try {
      await axios.post(`${API_BASE}/admin/users/${targetUsername}/toggle`);
      fetchAdminUsers();
    } catch (error) {
      alert("상태 변경 실패");
    }
  };

  const fetchUserBooks = async (user: any) => {
    try {
      const response = await axios.get(`${API_BASE}/admin/users/${user.username}/books`);
      setSelectedUserBooks(response.data.books);
      setEditingAdminUser(user);
      setUserEditForm({
        username: user.username,
        password: '',
        email: user.email || '',
        full_name: user.full_name || '',
        nationality: user.nationality || ''
      });
      setAdminSubView('memberDetail');
    } catch (error) {
      console.error("Failed to fetch user books");
    }
  };

  const handleAdminSaveUser = async () => {
    try {
      if (editingAdminUser) {
        await axios.put(`${API_BASE}/admin/users/${editingAdminUser.username}`, userEditForm);
        alert("사용자 정보가 수정되었습니다.");
      } else {
        await axios.post(`${API_BASE}/admin/users`, userEditForm);
        alert("신규 사용자가 등록되었습니다.");
      }
      setAdminSubView('members');
      fetchAdminUsers();
      admin_service_log(userEditForm.username, editingAdminUser ? 'User Updated' : 'User Created', `User: ${userEditForm.username}`);
    } catch (error: any) {
      alert(error.response?.data?.detail || "사용자 저장 에러");
    }
  };

  const handleAdminDeleteUser = async (username: string) => {
    if (!window.confirm(`정말로 '${username}' 사용자와 모든 데이터를 삭제하시겠습니까?`)) return false;
    try {
      await axios.delete(`${API_BASE}/admin/users/${username}`);
      alert("사용자가 삭제되었습니다.");
      fetchAdminUsers();
      admin_service_log(username, 'User Deleted', `Username: ${username}`);
      return true;
    } catch (error) {
      alert("사용자 삭제 실패");
      return false;
    }
  };

  const [diagnosisResults, setDiagnosisResults] = useState<any>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleRunDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      const response = await axios.get(`${API_BASE}/admin/diagnosis`);
      setDiagnosisResults(response.data);
    } catch (error: any) {
      alert("진단 실행 중 오류가 발생했습니다: " + (error.response?.data?.detail || error.message));
    } finally {
      setIsDiagnosing(false);
    }
  };

  const admin_service_log = async (u: string | null, action: string, details: string) => {
    try {
      await axios.post(`${API_BASE}/admin/logs`, {
        username: u,
        action,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to log admin action", error);
    }
  };

  useEffect(() => {
    if (viewMode === 'adminDashboard') {
      fetchAdminStats();
      if (adminSubView === 'members') fetchAdminUsers();
      if (adminSubView === 'activity') fetchActivities();
      if (adminSubView === 'books') fetchStoreBooks();
      if (adminSubView === 'resources') setEditingSiteResources({ ...siteResources });
    }
  }, [viewMode, adminSubView]);

  // 사이트 리소스 로드 (앱 시작시)
  useEffect(() => {
    axios.get(`${API_BASE}/admin/site-resources`).then(res => {
      setSiteResources(res.data || {});
    }).catch(() => { });
  }, []);

  // 사이트 리소스 기반 동적 favicon / 페이지 타이틀
  useEffect(() => {
    if (siteResources.favicon_url) {
      const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (link) link.href = siteResources.favicon_url;
    }
    const sn = siteResources.service_name || 'Dadoke';
    document.title = `${sn} - 프리미엄 교재 마켓플레이스`;
  }, [siteResources]);

  // 썸네일 경로 처리 헬퍼
  const resolveThumbnail = (thumb: string | undefined): string => {
    if (!thumb) return '';
    if (thumb.startsWith('http') || thumb.startsWith('/') || thumb.startsWith('blob:')) return thumb;
    return `/sample_assets/covers/${thumb}`;
  };

  const openAdminAddModal = () => {
    setAdminEditingBook(null);
    setAdminBookTitle('');
    setAdminBookPrice('');
    setAdminBookCategory('교육');
    setAdminBookMentor('');
    setAdminBookDesc('');
    setAdminBookLongDesc('');
    setAdminBookAuthor('');
    setAdminBookIcon('GraduationCap');
    setAdminBookThumbnail('');
    setAdminBookTOC([{ title: '' }]);
    setAdminSubView('bookDetail');
  };

  const openAdminEditModal = (book: BookData) => {
    setAdminEditingBook(book);
    setAdminBookTitle(book.title);
    setAdminBookPrice(book.price.replace(/[^0-9]/g, ''));
    setAdminBookCategory(book.category);
    setAdminBookMentor(book.mentor);
    setAdminBookDesc(book.description);
    setAdminBookLongDesc(book.longDescription || '');
    setAdminBookAuthor(book.author);
    setAdminBookIcon((book.icon as string) || 'GraduationCap');
    // 경로가 포함된 경우 파일명만 추출하여 표시 (사용자 요청)
    const thumbName = book.thumbnail?.split('/').pop() || '';
    setAdminBookThumbnail(thumbName);
    setAdminBookTOC(book.toc || [{ title: '' }]);
    setAdminSubView('bookDetail');
  };

  const addTOCLine = () => setAdminBookTOC([...adminBookTOC, { title: '' }]);
  const removeTOCLine = (index: number) => setAdminBookTOC(adminBookTOC.filter((_, i) => i !== index));
  const updateTOCLine = (index: number, field: keyof TOCItem, value: string) => {
    const newTOC = [...adminBookTOC];
    newTOC[index][field] = value;
    setAdminBookTOC(newTOC);
  };

  /**
   * 번역 키를 입력받아 현재 설정된 언어에 맞는 문자열을 반환합니다.
   * 중첩된 키(객체 경로)를 지원합니다. (예: 'categories.교육')
   * @param {string} key - 번역 데이터의 키
   * @returns {string} 번역된 문자열 또는 원본 키
   */
  const t = (key: string) => {
    const keys = key.split('.');
    let result: any = translations[language];
    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        return key;
      }
    }
    return result;
  };

  // --- 관리자 도서 편집 상태 (Admin Book Editing States) ---
  const [adminBookTitle, setAdminBookTitle] = useState('');
  const [adminBookPrice, setAdminBookPrice] = useState('');
  const [adminBookCategory, setAdminBookCategory] = useState('');
  const [adminBookMentor, setAdminBookMentor] = useState('');
  const [adminBookDesc, setAdminBookDesc] = useState('');
  const [adminBookLongDesc, setAdminBookLongDesc] = useState('');
  const [adminBookAuthor, setAdminBookAuthor] = useState('');
  const [adminBookTOC, setAdminBookTOC] = useState<TOCItem[]>([]);
  const [adminBookThumbnail, setAdminBookThumbnail] = useState('');
  const [adminBookIcon, setAdminBookIcon] = useState('Book');

  // Admin User Management States
  const [selectedUserBooks, setSelectedUserBooks] = useState<any[]>([]);
  const [editingAdminUser, setEditingAdminUser] = useState<any>(null);
  const [userEditForm, setUserEditForm] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    nationality: ''
  });

  const fetchStoreBooks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/store/books`);
      const rawBooks = response.data.books || [];
      const iconMap: Record<string, React.ReactNode> = {
        'GraduationCap': <GraduationCap size={8} />,
        'School': <School size={8} />,
        'Home': <Home size={8} />,
        'Stethoscope': <Stethoscope size={8} />,
        'Coffee': <Coffee size={8} />,
        'Briefcase': <Briefcase size={8} />,
        'Plane': <Plane size={8} />,
        'UserCheck': <UserCheck size={8} />,
        'Terminal': <Terminal size={8} />,
        'HardHat': <HardHat size={8} />,
        'Utensils': <Utensils size={8} />,
        'Scissors': <Scissors size={8} />,
        'Sprout': <Sprout size={8} />,
        'Heart': <Heart size={8} />,
        'Trophy': <Trophy size={8} />,
        'ShoppingBag': <ShoppingBag size={8} />,
        'Dumbbell': <Dumbbell size={8} />,
        'Music': <Music size={8} />,
        'Book': <Book size={8} />
      };

      const mappedBooks = rawBooks.map((b: any) => ({
        ...b,
        icon: iconMap[b.icon] || <Book size={8} />,
        iconName: b.icon
      }));
      setStoreBooks(mappedBooks);
    } catch (error) {
      console.error("Failed to fetch store books:", error);
    }
  };

  /**
   * 도서 구매(라이브러리 등록)를 처리합니다.
   * @async
   * @param {BookData} book - 구매할 도서 정보
   */
  const handlePurchase = async (book: typeof storeBooks[0]) => {
    setLoading(true);
    try {
      const bookData = {
        book_hash: '', // 백엔드에서 생성하거나 폴백 처리될 해시
        title: book.title,
        author: book.author,
        thumbnail: book.thumbnail,
        content: `# ${book.title}\n\n${book.longDescription || book.description}\n\n## 구매해주셔서 감사합니다!\n\n${book.author} 드림.`
      };

      let finalHash = '';
      try {
        const response = await axios.post(`${API_BASE}/books/purchase`, bookData);
        if (response.data && response.data.book_hash) {
          finalHash = response.data.book_hash;
        }
      } catch (e) {
        // 백엔드 통신 실패 시 클라이언트 측에서 임시 해시 생성
        finalHash = `fallback_${Math.random().toString(36).substring(7)}`;
      }

      if (!finalHash) {
        throw new Error('No valid book hash returned from API');
      }

      const purchasedBook = { ...bookData, book_hash: finalHash };

      // 로컬 캐시 상태 즉시 업데이트 및 저장
      setCachedBooks(prev => {
        if (prev.find(b => b.book_hash === finalHash)) return prev;
        const updated = [...prev, purchasedBook as any];
        localStorage.setItem(`dadoke_purchased_books_${username || 'guest'}`, JSON.stringify(updated));
        return updated;
      });

      alert(`'${book.title}' 가이드가 라이브러리에 등록되었습니다!\n마이 페이지 '내 도서 가이드'에서 바로 확인하실 수 있습니다.`);

      // 구매 목록 재동기화
      await loadCachedBooks();
    } catch (error) {
      alert('구매 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 인증 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [nationality, setNationality] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authNationality, setAuthNationality] = useState('');
  const [authVerificationCode, setAuthVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [authError, setAuthError] = useState('');

  // Profile Edit State
  const [profileFullName, setProfileFullName] = useState('');
  const [profileNationality, setProfileNationality] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [bookReviews, setBookReviews] = useState<any[]>([]);
  const [globalReviewStats, setGlobalReviewStats] = useState<Record<string, any>>({});
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');

  // Calculate review statistics based on real data
  const reviewStats = useMemo(() => {
    const totalCount = bookReviews?.length || 0;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        averageRating: 0,
        recommendationRate: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const sum = (bookReviews || []).reduce((acc, rev) => acc + (rev.rating || 0), 0);
    const averageRating = parseFloat((sum / totalCount).toFixed(1));
    const recommendationRate = Math.round((averageRating / 5.0) * 100);

    const distribution = (bookReviews || []).reduce((acc, rev) => {
      acc[rev.rating] = (acc[rev.rating] || 0) + 1;
      return acc;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

    // Convert to percentages for UI bars
    Object.keys(distribution).forEach(key => {
      distribution[key] = Math.round((distribution[key] / totalCount) * 100);
    });

    return { totalCount, averageRating, recommendationRate, distribution };
  }, [bookReviews]);

  /**
   * 앱이 처음 로드될 때 실행되는 초기화 로직입니다.
   * 1. 콘텐츠 보호 기능(우클릭/드래그 방지 등) 활성화
   * 2. 로컬 스토리지에서 토큰 확인 후 자동 로그인 시도
   * 3. 마켓 도서 목록 및 전역 리뷰 통계 데이터 페칭
   */
  useEffect(() => {
    enableContentProtection();

    const token = localStorage.getItem('token');
    if (token) {
      checkAuth();
    }
    fetchStoreBooks();
    fetchGlobalReviewStats();
    fetchNotices();
  }, []);

  // 화면 전환 시 최상단으로 스크롤 이동
  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [viewMode, selectedBook]);

  // 언어 변경에 따른 폰트 및 클래스 적용
  useEffect(() => {
    if (language === 'vi') {
      document.documentElement.classList.add('lang-vi');
      document.body.classList.add('lang-vi');
    } else {
      document.documentElement.classList.remove('lang-vi');
      document.body.classList.remove('lang-vi');
    }
  }, [language]);

  /**
   * 서버에 현재 사용자의 인증 상태를 확인하고 정보를 업데이트합니다.
   * @async
   */
  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_BASE}/auth/me`);
      setIsLoggedIn(true);
      setUsername(response.data.username);
      setFullName(response.data.full_name || '');
      setNationality(response.data.nationality || '');
      loadCachedBooks(response.data.username);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.error("Auth check failed:", error);
      }
      localStorage.removeItem('token');
      setIsLoggedIn(false);
    }
  };

  /**
   * 사용자가 구매했거나 소유한 도서 목록을 백엔드 및 로컬 스토리지에서 병합하여 로드합니다.
   * @async
   * @param {string} [targetUser] - 특정 사용자의 도서를 로드할 경우 (기본값은 현재 로그인된 사용자)
   */
  const loadCachedBooks = async (targetUser?: string) => {
    let booksFromBackend = [];
    const activeUser = targetUser || username;

    if (activeUser && activeUser !== 'guest') {
      try {
        const response = await axios.get(`${API_BASE}/books`);
        booksFromBackend = response.data.books;
      } catch {
        // 백엔드 통신 실패 시 다음 단계(로컬 스토리지)로 진행
      }
    }

    // 로컬 스토리지 데이터 로드 및 병합 (오프라인/임시 소유 지원)
    const storageKeyUser = activeUser || 'guest';
    const localBooksStr = localStorage.getItem(`dadoke_purchased_books_${storageKeyUser}`);

    if (localBooksStr) {
      try {
        const localBooks = JSON.parse(localBooksStr);
        const merged = [...booksFromBackend];
        localBooks.forEach((lb: any) => {
          // 레거시 해시 필터링 및 중복 합치기
          const isLegacyId = /^\d+$/.test(lb.book_hash) ||
            lb.book_hash.length < 10 ||
            lb.book_hash.startsWith('id_') ||
            lb.book_hash.startsWith('fallback_');
          if (!isLegacyId && !merged.find(mb => mb.book_hash === lb.book_hash)) {
            merged.push(lb);
          }
        });
        setCachedBooks(merged);
      } catch (e) {
        setCachedBooks(booksFromBackend);
      }
    } else {
      setCachedBooks(booksFromBackend);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const params = new URLSearchParams();
      params.append('username', authUsername);
      params.append('password', authPassword);

      const response = await axios.post(`${API_BASE}/auth/login`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      localStorage.setItem('token', response.data.access_token);
      await checkAuth(); // Use checkAuth to get all fields accurately
      setShowAuthModal(false);
      setAuthUsername('');
      setAuthPassword('');
    } catch (error: any) {
      setAuthError(error.response?.data?.detail || t('login_failed'));
    }
  };

  const handleSendVerificationCode = async () => {
    if (!authEmail) {
      setAuthError('이메일 주소를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/send-verification-code`, { email: authEmail });
      setIsCodeSent(true);
      alert('인증 코드가 발송되었습니다. (개발 환경에서는 백엔드 콘솔을 확인하세요)');
    } catch (error: any) {
      setAuthError(error.response?.data?.detail || '인증 코드 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!isCodeSent) {
      setAuthError('먼저 이메일 인증 코드를 발송해 주세요.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username: authUsername,
        password: authPassword,
        email: authEmail,
        full_name: authFullName,
        nationality: authNationality,
        code: authVerificationCode
      });
      // 회원가입 성공
      setAuthMode('login');
      setAuthError('');
      alert(t('register_success'));
      // Reset registration fields
      setAuthFullName('');
      setAuthNationality('');
      setAuthVerificationCode('');
      setIsCodeSent(false);
    } catch (error: any) {
      setAuthError(error.response?.data?.detail || t('register_failed'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 로그아웃을 처리하고 모든 사용자 섹션 상태를 초기화합니다.
   * 마이페이지 등 보호된 뷰에 있을 경우 마켓으로 강제 이동합니다.
   */
  const handleLogout = () => {
    const wasLoggedIn = isLoggedIn;
    const currentView = viewMode;

    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUsername('');
    setFullName('');
    setNationality('');
    setChapters([]);
    setCurrentChapter(null);
    setCachedBooks([]);
    setCurrentBookHash(null);
    setIsAdminMode(false);

    // 스마트 리다이렉션: 로그인 권한이 필요한 페이지에 있었던 경우 마켓으로 보냄
    const protectedViews = ['library', 'viewer', 'adminDashboard', 'memberDetail', 'addMember', 'bookDetail'];
    if (wasLoggedIn && (protectedViews.includes(currentView) || currentView === 'adminDashboard')) {
      setViewMode('market');
      setSelectedBook(null);
    }
  };

  // Sync profile form when tab opens or data changes
  useEffect(() => {
    if (myPageTab === 'profile' && isLoggedIn) {
      setProfileFullName(fullName);
      setProfileNationality(nationality);
    }
  }, [myPageTab, isLoggedIn, fullName, nationality]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profilePassword && profilePassword !== profileConfirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/update`, {
        full_name: profileFullName,
        nationality: profileNationality,
        password: profilePassword || undefined
      });
      alert('정보가 정상적으로 반영되었습니다.');
      // Refresh current user data
      await checkAuth();
      setProfilePassword('');
      setProfileConfirmPassword('');
    } catch (error: any) {
      alert(error.response?.data?.detail || '보안상의 이유로 혹은 서버 오류로 정보 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData);
      setChapters(response.data.chapters);
      setCurrentBookHash(response.data.book_hash);
      if (response.data.chapters.length > 0) {
        setCurrentChapter(response.data.chapters[0]);
      }
      setViewMode('viewer');
      // Pass the current username to ensure correct loading immediately after upload
      if (username) {
        await loadCachedBooks(username);
      } else {
        await loadCachedBooks();
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        alert(t('login_required'));
        setShowAuthModal(true);
      } else {
        alert(t('upload_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (bookId: string) => {
    try {
      const response = await axios.get(`${API_BASE}/books/${bookId}/reviews`);
      setBookReviews(response.data.reviews);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    }
  };

  const fetchGlobalReviewStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/reviews/stats`);
      setGlobalReviewStats(response.data.stats || {});
    } catch (error) {
      console.error("Failed to fetch global review stats:", error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    if (!newReviewComment.trim()) {
      alert(t('review_write_confirm'));
      return;
    }

    setLoading(true);
    try {
      if (editingReviewId) {
        // Update existing review
        await axios.put(`${API_BASE}/reviews/${editingReviewId}`, {
          rating: newReviewRating,
          comment: newReviewComment
        });
        setEditingReviewId(null);
      } else {
        // Create new review
        await axios.post(`${API_BASE}/books/${selectedBook.id}/reviews`, {
          rating: newReviewRating,
          comment: newReviewComment
        });
      }
      setNewReviewComment('');
      setNewReviewRating(5);
      await fetchReviews(selectedBook.id);
      await fetchGlobalReviewStats();
    } catch (error: any) {
      alert(error.response?.data?.detail || t('review_save_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm(t('review_delete_confirm'))) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE}/reviews/${reviewId}`);
      if (selectedBook) await fetchReviews(selectedBook.id);
      await fetchGlobalReviewStats();
    } catch (error: any) {
      alert(error.response?.data?.detail || t('review_delete_error'));
    } finally {
      setLoading(false);
    }
  };

  const startEditingReview = (review: any) => {
    setEditingReviewId(review.id);
    setNewReviewRating(review.rating);
    setNewReviewComment(review.comment);
    // Optional: scroll to form
    const form = document.getElementById('review-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  };

  const loadBook = async (bookHash: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/books/${bookHash}`);
      setChapters(response.data.chapters);
      setCurrentBookHash(bookHash);
      if (response.data.chapters.length > 0) {
        setCurrentChapter(response.data.chapters[0]);
      }
      setViewMode('viewer');
    } catch (error: any) {
      if (error.response?.status === 401) {
        alert(t('login_required'));
        setShowAuthModal(true);
      } else {
        alert(t('book_load_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 소유한 도서를 삭제합니다. 백엔드 요청 후 성공 여부와 관계없이 로컬 캐시를 정리합니다.
   * @async
   * @param {string} bookHash - 삭제할 도서의 고유 해시
   */
  const deleteBook = async (bookHash: string) => {
    if (!confirm(t('delete_confirm'))) return;
    try {
      try {
        await axios.delete(`${API_BASE}/books/${bookHash}`);
      } catch (e) {
        console.warn('백엔드 삭제 실패, 로컬 클린업 진행:', e);
      }

      // 로컬 스토리지의 모든 사용자 관련 구매 목록에서 해당 해시 제거
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dadoke_purchased_books')) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const list = JSON.parse(val);
              if (Array.isArray(list)) {
                const filtered = list.filter((b: any) => b.book_hash !== bookHash);
                if (filtered?.length !== list?.length) {
                  localStorage.setItem(key, JSON.stringify(filtered));
                }
              }
            } catch (e) { }
          }
        }
      }

      isInternalNavigation.current = true;
      setCachedBooks(prev => prev.filter(b => b.book_hash !== bookHash));
      await loadCachedBooks();

      if (currentBookHash === bookHash) {
        setChapters([]);
        setCurrentChapter(null);
        setCurrentBookHash(null);
        setViewMode('library');
      }
    } catch (error) {
      console.error('삭제 처리 중 오류:', error);
      alert(t('delete_error'));
    }
  };

  /**
   * Layout Constants for Sticky Navigation
   * --------------------------------------
   * headerHeight: Fixed at 72px as per user requirement.
   * stickyTopOffset: The base offset for sticky elements (Header + Optional Admin Console).
   * bannerTotalHeight: The height of the notice banner (h-8 = 32px).
   */
  const headerHeight = 72;
  const isAdminConsoleVisible = isAdminMode;
  const adminConsoleHeight = 48;
  const stickyTopOffset = (isAdminConsoleVisible ? adminConsoleHeight : 0) + headerHeight;
  const bannerTotalHeight = 32;

  // 공지사항 배너 가시성 여부 (특정 뷰 모드 제외)
  const isNoticeVisible = !!(notices?.length > 0 && notices.find(n => n.priority) && viewMode !== 'viewer' && viewMode !== 'bookDetail');

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-700 relative overflow-hidden">
      {/* Admin Console Overlay Header */}
      {isAdminMode && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white px-6 py-3 flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-300 z-[1001] h-[48px]">
          <div className="flex items-center gap-3">
            <Settings size={20} />
            <div>
              <span className="font-bold tracking-tight text-sm md:text-base">ADMIN CONSOLE</span>
              <span className="mx-3 opacity-40">|</span>
              <span className="text-[10px] md:text-xs opacity-90 text-purple-100 uppercase tracking-widest font-black">{t('admin_overlay_subtitle')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => { setViewMode('adminDashboard'); setAdminSubView('overview'); }}
              className="px-3 md:px-4 py-1.5 bg-white/20 hover:bg-white text-white hover:text-purple-700 rounded-full text-[10px] md:text-sm font-bold transition-all flex items-center gap-2"
            >
              <Monitor size={14} /> {t('open_dashboard')}
            </button>
            <button
              onClick={() => { setIsAdminMode(false); setViewMode('market'); }}
              className="px-3 md:px-4 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-[10px] md:text-sm font-bold transition-all flex items-center gap-2"
            >
              <LogOut size={14} /> {t('exit_mode')}
            </button>
          </div>
        </div>
      )}
      <Watermark text={username} />
      {/* 
          메인 헤더: 로고, 전역 검색바, 언어 선택, 사용자 메뉴를 포함합니다.
          관리자 모드일 경우 상단 관리자 툴바 높이만큼 위치가 조정됩니다.
      */}
      <header
        className="fixed left-0 right-0 bg-white/80 backdrop-blur-md z-[180] border-b border-slate-100"
        style={{
          top: isAdminMode ? '48px' : '0',
          height: `${headerHeight}px`,
          transition: 'top 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between">
          {/* 로고 영역 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center cursor-pointer group" onClick={() => { setViewMode('market'); setSelectedCategory(null); }}>
              <h1 className="text-2xl font-extrabold text-[#0055D1] tracking-tighter group-hover:opacity-80 transition-all flex items-center gap-1.5">
                {siteResources.logo_url ? (
                  <img src={siteResources.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover transform -rotate-6 group-hover:rotate-0 transition-transform" />
                ) : (
                  <span className="w-8 h-8 bg-[#0055D1] rounded-lg flex items-center justify-center text-white text-base transform -rotate-6 group-hover:rotate-0 transition-transform">{(siteResources.service_name || 'Dadoke')[0]}</span>
                )}
                {siteResources.service_name || 'Dadoke'}
              </h1>
            </div>
          </div>

          {/* 중앙 검색바 (마켓 전용) */}
          <div className="flex-1 max-w-4xl mx-auto px-4 hidden md:flex items-center justify-center">
            <div className={`w-full flex items-center transition-all duration-300 ease-out ${showStickySearch ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
              <div className="relative w-full flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-0.5 group focus-within:border-[#0055D1] focus-within:bg-white focus-within:shadow-xl focus-within:shadow-blue-200/20 transition-all overflow-hidden origin-center">
                <div className="pl-4 text-slate-400">
                  <Search size={16} className="group-focus-within:text-[#0055D1] transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full px-3 py-1.5 bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus:outline-none font-bold text-sm"
                />
                <button className="w-8 h-8 bg-[#0055D1] text-white rounded-xl flex items-center justify-center hover:bg-[#0044A7] transition-all active:scale-95 shrink-0 ml-1">
                  <Search size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>

          {/* 우측 메뉴 영역 (언어/로그인) */}
          <div className="flex items-center gap-6">
            {/* 언어 스위처 */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button
                onClick={() => setLanguage('ko')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${language === 'ko' ? 'bg-[#0055D1] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                KO
              </button>
              <button
                onClick={() => setLanguage('vi')}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${language === 'vi' ? 'bg-[#0055D1] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                VI
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            {/* 로그인 상태에 따른 UI 분기 */}
            {isLoggedIn ? (
              <div className="relative">
                <div
                  className="flex items-center gap-2 cursor-pointer group bg-slate-50 hover:bg-[#0055D1]/5 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-[#0055D1]/10"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="w-8 h-8 rounded-full bg-[#0055D1] flex items-center justify-center text-white text-xs font-black uppercase tracking-tighter shadow-lg shadow-blue-100">
                    {username.substring(0, 1)}
                  </div>
                  <span className="text-sm text-slate-900 font-bold group-hover:text-[#0055D1] transition-all">{username}</span>
                </div>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-[190]" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 z-[200] animate-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={() => { setViewMode('library'); loadCachedBooks(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all"
                      >
                        <Library size={16} /> {t('my_page')}
                      </button>
                      {username === 'admin' && (
                        <button
                          onClick={() => { setViewMode('adminDashboard'); setAdminSubView('overview'); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-purple-600 hover:bg-purple-50 transition-all"
                        >
                          <Settings size={16} /> {t('admin_console')}
                        </button>
                      )}
                      <button
                        onClick={() => { setViewMode('notices'); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        <Bell size={16} /> {t('notice_list_title')}
                      </button>
                      <div className="h-[1px] bg-slate-50 my-1" />
                      <button
                        onClick={() => { handleLogout(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-50 transition-all"
                      >
                        <LogOut size={16} /> {t('logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="px-8 py-3 bg-slate-900 text-white text-sm rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg active:scale-95"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content wrapper with fixed height to enable inner scrolling */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden transition-all duration-300">
        {viewMode === 'adminDashboard' ? (
          <div className="flex w-full h-full bg-slate-50 overflow-hidden relative" style={{ paddingTop: isAdminMode ? '120px' : '72px' }}>
            {/* Sidebar */}
            <aside
              className={`bg-white border-r border-slate-100 flex flex-col pt-8 transition-all duration-300 relative ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}
            >
              {/* Collapse Toggle Button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all z-20 shadow-sm"
              >
                <ChevronRight size={14} className={`transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
              </button>

              {/* Logo Area */}
              <div className={`px-4 mb-10 flex flex-col items-center transition-all duration-300 ${isSidebarCollapsed ? 'gap-0' : 'gap-4'}`}>
                {isSidebarCollapsed ? (
                  <div className="w-12 h-12 bg-[#0055D1] rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-100 animate-in zoom-in duration-300">
                    {siteResources.logo_url ? <img src={siteResources.logo_url} alt="Logo" className="w-full h-full rounded-2xl object-cover" /> : (siteResources.service_name || 'Dadoke')[0]}
                  </div>
                ) : (
                  <div className="w-full px-4 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setViewMode('market'); setIsAdminMode(false); }}>
                      {siteResources.logo_url ? (
                        <img src={siteResources.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover transform -rotate-6 group-hover:rotate-0 transition-all" />
                      ) : (
                        <div className="w-10 h-10 bg-[#0055D1] rounded-xl flex items-center justify-center text-white text-base font-black transform -rotate-6 group-hover:rotate-0 transition-all">{(siteResources.service_name || 'Dadoke')[0]}</div>
                      )}
                      <span className="text-2xl font-black text-slate-900 tracking-tighter italic">{siteResources.service_name || 'Dadoke'}</span>
                    </div>
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 animate-in fade-in duration-700">시스템 관리 센터</h2>
                )}
              </div>

              <nav className="flex-1 px-4 space-y-2">
                {[
                  { id: 'overview', label: '대시보드 홈', icon: <BarChart2 size={18} /> },
                  { id: 'members', label: '회원 관리', icon: <Users size={18} /> },
                  { id: 'books', label: '도서 관리', icon: <List size={18} /> },
                  { id: 'activity', label: '활동 로그', icon: <Activity size={18} /> },
                  { id: 'reviews', label: '리뷰 모니터링', icon: <Shield size={18} /> },
                  { id: 'notices', label: '공지사항 관리', icon: <Bell size={18} /> },
                  { id: 'resources', label: '리소스 관리', icon: <Palette size={18} /> },
                  { id: 'diagnosis', label: '시스템 진단', icon: <ShieldAlert size={18} /> },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setAdminSubView(item.id as any)}
                    className={`nav-item-tooltip w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group relative ${adminSubView === item.id
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? item.label : ''}
                  >
                    <div className={`shrink-0 transition-transform duration-300 ${adminSubView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                      {item.icon}
                    </div>
                    {!isSidebarCollapsed && (
                      <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">
                        {item.label}
                      </span>
                    )}
                    {isSidebarCollapsed && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                        {item.label}
                      </div>
                    )}
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-50">
                <button
                  onClick={() => { setViewMode('market'); setIsAdminMode(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all group relative ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title={isSidebarCollapsed ? "관리 모드 종료" : ""}
                >
                  <div className="shrink-0 group-hover:scale-110 transition-transform">
                    <LogOut size={18} />
                  </div>
                  {!isSidebarCollapsed && <span className="truncate">관리 모드 종료</span>}
                  {isSidebarCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-red-600 text-white text-[10px] font-black rounded-xl opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                      관리 모드 종료
                    </div>
                  )}
                </button>
              </div>
            </aside>

            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              {adminSubView === 'bookDetail' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
                  <header className="flex items-center justify-between py-5 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setAdminSubView('books')}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        <ChevronRight size={20} className="rotate-180" />
                      </button>
                      <div>
                        <h1 className="text-xl font-black text-slate-900">
                          {adminEditingBook ? t('admin_edit_title') : t('admin_register_title')}
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 leading-none">
                          {adminEditingBook ? t('admin_edit_desc') : t('admin_register_desc')}
                        </p>
                      </div>
                    </div>
                  </header>

                  <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-10">
                    {/* Basic Meta Data */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <Settings size={16} />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">{t('admin_meta_title')}</h3>
                      </div>

                      {/* Cover Image Upload & Preview at the Top */}
                      {/* Cover Image Upload & Metadata Grid */}
                      <div className="flex flex-col md:flex-row gap-10 items-start pb-8 border-b border-slate-50">
                        {/* Left: Preview & Upload Controls */}
                        <div className="w-56 space-y-4 shrink-0">
                          <div className="aspect-[3/4] bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center relative group shadow-sm">
                            {adminBookThumbnail ? (
                              <img src={resolveThumbnail(adminBookThumbnail)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Preview" />
                            ) : (
                              <div className="flex flex-col items-center gap-3 text-slate-300">
                                <ImageIcon size={48} strokeWidth={1} />
                                <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                              <Sparkles className="text-white animate-pulse" />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <button
                              onClick={() => document.getElementById('admin-cover-upload')?.click()}
                              className="w-full px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-blue-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                              <Plus size={16} /> {t('admin_choose_image')}
                            </button>
                            <input
                              id="admin-cover-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const formData = new FormData();
                                formData.append('file', file);

                                try {
                                  const token = localStorage.getItem('token');
                                  const resp = await axios.post(`${API_BASE}/admin/upload-cover`, formData, {
                                    headers: {
                                      'Content-Type': 'multipart/form-data',
                                      'Authorization': `Bearer ${token}`
                                    }
                                  });
                                  if (resp.data.success) {
                                    // 파일명만 저장 (사용자 요청)
                                    setAdminBookThumbnail(resp.data.filename);
                                  }
                                } catch (err) {
                                  alert("이미지 업로드에 실패했습니다.");
                                }
                              }}
                            />
                            <div className="px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 font-bold text-[10px] text-slate-400 truncate text-center">
                              {adminBookThumbnail || t('admin_no_file')}
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium px-1 flex items-center justify-center gap-1.5 leading-tight text-center">
                              <Activity size={10} /> {t('admin_upload_auto_save')}
                            </p>
                          </div>
                        </div>

                        {/* Right: Metadata Stack (Vertical) */}
                        <div className="flex-1 space-y-6 w-full">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin_category_label')}</label>
                            <select
                              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                              value={adminBookCategory} onChange={e => setAdminBookCategory(e.target.value)}
                            >
                              {Object.keys(translations.ko.categories).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin_title_label')}</label>
                            <input
                              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                              value={adminBookTitle} onChange={e => setAdminBookTitle(e.target.value)} placeholder="예: [도서명] 실전 가이드"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin_author_label')}</label>
                            <input
                              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                              value={adminBookAuthor} onChange={e => setAdminBookAuthor(e.target.value)} placeholder="예: 홍길동"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin_price_label')}</label>
                            <div className="relative group">
                              <input
                                type="text"
                                className="w-full px-5 py-4 pr-12 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                                value={adminBookPrice}
                                onChange={e => setAdminBookPrice(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="숫자만 입력 (예: 25000)"
                              />
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                원
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
                      <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                        <Activity size={16} />
                      </div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight">{t('admin_detail_intro_label')}</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin_summary_label')}</label>
                        <input
                          className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                          value={adminBookDesc} onChange={e => setAdminBookDesc(e.target.value)} placeholder="검색 결과 및 리스트에 노출될 한 줄 요약"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">상세 상세 소개 (Markdown Support)</label>
                        <textarea
                          className="w-full h-48 px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-900 resize-none leading-relaxed"
                          value={adminBookLongDesc} onChange={e => setAdminBookLongDesc(e.target.value)} placeholder="교재 상세 페이지에 노출될 본문 내용을 마크다운으로 작성하세요."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Table of Contents */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                          <List size={16} />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">목차 정보 (Table of Contents)</h3>
                      </div>
                      <button onClick={addTOCLine} className="text-blue-600 text-[10px] font-black flex items-center gap-1.5 hover:underline uppercase tracking-widest bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <Plus size={14} /> 항목 추가
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {adminBookTOC.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-left-2 duration-300">
                          <span className="text-[10px] font-black text-slate-300 w-4 pl-1">{idx + 1}</span>
                          <input
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-100 bg-white focus:border-blue-500 outline-none font-bold text-sm text-slate-900"
                            value={item.title} onChange={e => updateTOCLine(idx, 'title', e.target.value)} placeholder="챕터 제목 (예: S1. 도입부)"
                          />
                          <button onClick={() => removeTOCLine(idx)} className="p-2.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-10 border-t border-slate-50 gap-6">
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium max-w-lg">
                      도서 정보를 저장하면 플랫폼 스토어와 관리 카탈로그에 즉시 반영됩니다.<br />
                      필수 항목(*)이 누락되지 않았는지 다시 한번 확인해 주세요.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAdminSubView('books')}
                        className="px-8 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-sm hover:bg-slate-200 transition-all active:scale-[0.98]"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSaveAdminBook}
                        className="px-12 py-4 bg-[#0055D1] text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-200 active:scale-[0.98] whitespace-nowrap"
                      >
                        {adminEditingBook ? '정보 수정 완료' : '신규 교재 등록하기'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {adminSubView === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('admin_overview_title')}</h1>
                    <p className="text-slate-500 font-bold mt-1">{t('admin_overview_desc')}</p>
                  </header>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-blue-50 transition-all">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <Users size={24} />
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('admin_total_users')}</p>
                      <h3 className="text-4xl font-black text-slate-900 mt-2">{adminStats?.total_users || 0}</h3>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-orange-50 transition-all">
                      <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                        <Database size={24} />
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('admin_total_books')}</p>
                      <h3 className="text-4xl font-black text-slate-900 mt-2">{adminStats?.total_books || 0}</h3>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-green-50 transition-all">
                      <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                        <Shield size={24} />
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('admin_total_reviews')}</p>
                      <h3 className="text-4xl font-black text-slate-900 mt-2">{adminStats?.total_reviews || 0}</h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-600" /> {t('admin_recent_activity')}
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {(adminStats?.recent_activities || []).map((act: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-6 p-6 rounded-3xl bg-slate-50 border border-transparent hover:border-blue-100 hover:bg-white transition-all">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                            {act.action === '교재 추가' ? <Database size={20} className="text-orange-500" /> : <Users size={20} className="text-blue-500" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black text-slate-900">{act.username}</p>
                            <p className="text-xs font-bold text-slate-500 mt-0.5">{act.action}: {act.details}</p>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 bg-slate-200/50 px-3 py-1 rounded-full">{new Date(act.timestamp).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {adminSubView === 'members' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('admin_members_title')}</h1>
                      <p className="text-slate-500 font-bold mt-1">{t('admin_members_desc')}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingAdminUser(null);
                        setUserEditForm({ username: '', password: '', email: '', full_name: '', nationality: '' });
                        setAdminSubView('addMember');
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg"
                    >
                      <Users size={18} /> {t('admin_add_member')}
                    </button>
                  </header>

                  <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t('admin_user_id')}</th>
                          <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t('admin_name')}</th>
                          <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">국적</th>
                          <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">상태</th>
                          <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(allUsers || []).map(user => (
                          <tr key={user.username} className="hover:bg-blue-50/30 transition-all">
                            <td className="px-8 py-6">
                              <span className="font-black text-slate-900">{user.username}</span>
                              <p className="text-[10px] text-slate-400 font-bold">{user.email}</p>
                            </td>
                            <td className="px-8 py-6 font-bold text-slate-700">{user.full_name}</td>
                            <td className="px-8 py-6">
                              <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-600">{user.nationality}</span>
                            </td>
                            <td className="px-8 py-6">
                              {user.disabled ? (
                                <span className="flex items-center gap-1.5 text-red-500 text-xs font-black">
                                  <XCircle size={14} /> 정지됨
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-green-600 text-xs font-black">
                                  <CheckCircle size={14} /> 정상
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => fetchUserBooks(user)}
                                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
                                  title="회원 관리 및 도서 보기"
                                >
                                  <Users size={14} /> 관리하기
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminSubView === 'addMember' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
                  <header className="flex items-center justify-between py-5 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setAdminSubView('members')}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        <ChevronRight size={20} className="rotate-180" />
                      </button>
                      <div>
                        <h1 className="text-xl font-black text-slate-900">신규 회원 등록 (Add New Member)</h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 leading-none">플랫폼에 새로운 멤버를 추가합니다.</p>
                      </div>
                    </div>
                  </header>

                  <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center justify-between pb-6 border-b border-slate-50 mb-2">
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2.5 leading-none">
                          <User size={18} className="text-blue-600" /> 기본 계정 정보 설정
                        </h3>
                        <p className="text-xs text-slate-400 font-bold leading-none">신규 가입할 회원의 정보를 입력해 주세요.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">사용자 ID (Username)</label>
                          <input
                            type="text"
                            value={userEditForm.username}
                            onChange={(e) => setUserEditForm({ ...userEditForm, username: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                            placeholder="사용자 ID 입력"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">성명 (Full Name)</label>
                          <input
                            type="text"
                            value={userEditForm.full_name}
                            onChange={(e) => setUserEditForm({ ...userEditForm, full_name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                            placeholder="실명 입력"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">이메일 주소 (Email Address)</label>
                          <input
                            type="email"
                            value={userEditForm.email}
                            onChange={(e) => setUserEditForm({ ...userEditForm, email: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                            placeholder="이메일 입력"
                          />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">계정 비밀번호 (Password)</label>
                          <input
                            type="password"
                            value={userEditForm.password}
                            onChange={(e) => setUserEditForm({ ...userEditForm, password: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                            placeholder="비밀번호 설정"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">국적 (Nationality)</label>
                          <input
                            type="text"
                            value={userEditForm.nationality}
                            onChange={(e) => setUserEditForm({ ...userEditForm, nationality: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                            placeholder="예: 베트남"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-slate-50 gap-6">
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium max-w-md">
                        신규 회원을 등록하면 즉시 서비스 이용이 가능해집니다.<br />
                        아이디와 비밀번호는 보안 정책에 맞게 설정해 주세요.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAdminSubView('members')}
                          className="px-8 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-sm hover:bg-slate-200 transition-all active:scale-[0.98]"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleAdminSaveUser}
                          className="px-10 py-4 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 active:scale-[0.98] whitespace-nowrap"
                        >
                          신규 회원 등록하기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {adminSubView === 'memberDetail' && editingAdminUser && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
                  {/* Compact Minimal Header - Pixel Perfect Alignment */}
                  <header className="flex items-center justify-between py-5 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setAdminSubView('members')}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        <ChevronRight size={20} className="rotate-180" />
                      </button>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0">
                          {editingAdminUser.full_name?.charAt(0) || editingAdminUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-2 leading-none">
                            <h1 className="text-lg font-black text-slate-900">{editingAdminUser.username}</h1>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${editingAdminUser.disabled ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                              {editingAdminUser.disabled ? '정지됨' : '활성'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 leading-none">{editingAdminUser.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleUserStatus(editingAdminUser.username)}
                        className={`px-4 py-2.5 rounded-lg font-black text-[11px] transition-all border ${editingAdminUser.disabled
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-white text-rose-500 border-rose-100 hover:bg-rose-50'
                          }`}
                      >
                        {editingAdminUser.disabled ? '정지 해제' : '사용 정지'}
                      </button>
                      <button
                        onClick={async () => { if (await handleAdminDeleteUser(editingAdminUser.username)) setAdminSubView('members'); }}
                        className="px-4 py-2.5 bg-slate-900 text-white rounded-lg font-black text-[11px] hover:bg-rose-600 transition-all active:scale-95"
                      >
                        계정 삭제
                      </button>
                    </div>
                  </header>

                  <div className="flex flex-col gap-8 items-stretch">
                    {/* Top Card: Profile Form */}
                    <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-8">
                      <div className="flex items-center justify-between pb-6 border-b border-slate-50 mb-2">
                        <div className="space-y-1.5">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2.5 leading-none">
                            <User size={18} className="text-blue-600" /> 기본 정보 편집
                          </h3>
                          <p className="text-xs text-slate-400 font-bold leading-none">회원 프로필과 계정 설정을 상세하게 관리합니다.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">성명 (Full Name)</label>
                            <input
                              type="text"
                              value={userEditForm.full_name}
                              onChange={(e) => setUserEditForm({ ...userEditForm, full_name: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">이메일 주소 (Email Address)</label>
                            <input
                              type="email"
                              value={userEditForm.email}
                              onChange={(e) => setUserEditForm({ ...userEditForm, email: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">국적 (Nationality)</label>
                            <input
                              type="text"
                              value={userEditForm.nationality}
                              onChange={(e) => setUserEditForm({ ...userEditForm, nationality: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">계정 비밀번호 (Security Password)</label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              value={userEditForm.password}
                              onChange={(e) => setUserEditForm({ ...userEditForm, password: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-slate-50 gap-6">
                        <div className="flex items-start gap-4">
                          <ShieldAlert size={20} className="text-orange-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium max-w-md">
                            회원 데이터 변경 시 즉시 반영되며 실시간 동기화됩니다.<br />
                            민감 정보 처리에 각별히 유의바라며, 수정 후 반드시 확인해 주세요.
                          </p>
                        </div>
                        <button
                          onClick={handleAdminSaveUser}
                          className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 active:scale-[0.98] whitespace-nowrap"
                        >
                          변경사항 저장하기
                        </button>
                      </div>
                    </div>

                    {/* Bottom Card: Books Inventory */}
                    <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm min-h-[400px] flex flex-col space-y-8">
                      <div className="flex items-center justify-between pb-6 border-b border-slate-50">
                        <div className="space-y-1.5">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2.5 leading-none">
                            <BookOpen size={18} className="text-blue-600" /> {t('admin_book_inventory')}
                          </h3>
                          <p className="text-xs text-slate-400 font-bold leading-none">{t('admin_inventory_desc')}</p>
                        </div>
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">{t('admin_total_owned')}</span>
                          <span className="text-sm font-black text-blue-600 leading-none">{selectedUserBooks.length}</span>
                        </div>
                      </div>

                      {selectedUserBooks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {selectedUserBooks.map((book: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-slate-100 transition-all group">
                              <div className="aspect-[3/4] w-full bg-white rounded-xl overflow-hidden shrink-0 border border-slate-100 shadow-sm relative group-hover:scale-[1.02] transition-transform">
                                {book.thumbnail ? (
                                  <img src={resolveThumbnail(book.thumbnail)} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-50">
                                    <BookOpen size={32} strokeWidth={1} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 space-y-2.5">
                                <h4 className="font-black text-slate-900 text-xs line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                  {book.title}
                                </h4>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                                  <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                    {book.category}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">
                                    {(!book.author || book.author === 'Unknown') ? t('author_unknown') : book.author}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-12">
                          <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-3xl mb-4">
                            <BookOpen size={32} strokeWidth={1} className="opacity-20" />
                          </div>
                          <p className="font-black text-sm text-slate-400">{t('admin_no_owned_books')}</p>
                          <p className="text-xs text-slate-300 mt-2">{t('admin_inventory_placeholder')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {
                adminSubView === 'books' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <header className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('admin_catalog_title')}</h1>
                        <p className="text-slate-500 font-bold mt-1">{t('admin_catalog_desc')}</p>
                      </div>
                      <button
                        onClick={openAdminAddModal}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                      >
                        <Sparkles size={18} /> {t('admin_add_book')}
                      </button>
                    </header>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                      {storeBooks.map(book => (
                        <div key={book.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm flex flex-col group hover:shadow-xl transition-all">
                          <div className="aspect-[4/3] relative overflow-hidden bg-slate-50">
                            {book.thumbnail ? (
                              <img src={resolveThumbnail(book.thumbnail)} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Book size={64} />
                              </div>
                            )}
                            <div className="absolute top-4 right-4 flex gap-2">
                              <button onClick={() => openAdminEditModal(book)} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-lg">
                                <Settings size={18} />
                              </button>
                              <button onClick={() => handleDeleteAdminBook(book.id)} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                          <div className="p-6 space-y-3">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{book.category}</span>
                            <h4 className="font-black text-slate-900 text-lg line-clamp-1">{book.title}</h4>
                            <p className="text-sm font-bold text-slate-500">{book.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }

              {
                adminSubView === 'activity' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <header>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('admin_activity_title')}</h1>
                      <p className="text-slate-500 font-bold mt-1">{t('admin_activity_desc')}</p>
                    </header>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                      <div className="space-y-2">
                        {activities.map((act, idx) => (
                          <div key={idx} className="flex items-start gap-6 p-6 rounded-3xl hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
                            <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${act.action === '교재 추가' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                              {act.action === '교재 추가' ? <Database size={18} /> : <Activity size={18} />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-900">{act.username}</span>
                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{new Date(act.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-sm font-bold text-[#0055D1] mt-1">{act.action}</p>
                              <p className="text-sm text-slate-600 mt-1 font-medium">{act.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              {
                adminSubView === 'notices' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <header className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('admin_notices_title')}</h1>
                        <p className="text-slate-500 font-bold mt-1">{t('admin_notices_desc')}</p>
                      </div>
                      <button
                        onClick={() => { setAdminEditingNotice({}); }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                      >
                        <PlusCircle size={18} /> {t('admin_add_notice')}
                      </button>
                    </header>

                    {adminEditingNotice ? (
                      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-black text-slate-900">{adminEditingNotice.id ? t('admin_edit_notice') : t('admin_add_notice')}</h3>

                        </div>
                        <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">{t('notice_title_label')}</label>
                            <input
                              type="text"
                              value={adminEditingNotice.title || ''}
                              onChange={(e) => setAdminEditingNotice({ ...adminEditingNotice, title: e.target.value })}
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                              placeholder="공지사항 제목을 입력하세요"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">{t('notice_content_label')}</label>
                            <textarea
                              value={adminEditingNotice.content || ''}
                              onChange={(e) => setAdminEditingNotice({ ...adminEditingNotice, content: e.target.value })}
                              rows={10}
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none resize-none"
                              placeholder="내용을 입력하세요"
                            />
                          </div>
                          <div className="flex items-center gap-3 px-1">
                            <input
                              type="checkbox"
                              id="priority-notice"
                              checked={adminEditingNotice.priority || false}
                              onChange={(e) => setAdminEditingNotice({ ...adminEditingNotice, priority: e.target.checked })}
                              className="w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-blue-600 transition-all focus:ring-0"
                            />
                            <label htmlFor="priority-notice" className="text-sm font-bold text-slate-600 cursor-pointer">{t('notice_priority_label')}</label>
                          </div>
                          <div className="flex items-center gap-4 pt-4">
                            <button
                              onClick={() => {
                                handleSaveNotice({
                                  ...adminEditingNotice,
                                  author: username,
                                  timestamp: adminEditingNotice.timestamp || new Date().toISOString()
                                });
                              }}
                              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                            >
                              {t('admin_save_notice')}
                            </button>
                            <button
                              onClick={() => setAdminEditingNotice(null)}
                              className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
                            >
                              {t('admin_cancel')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
                        <div className="divide-y divide-slate-50">
                          {notices?.length > 0 ? notices.map(notice => (
                            <div key={notice.id} className="p-8 hover:bg-slate-50 transition-all group">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-3">
                                    {notice.priority && <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">HOT</span>}
                                    <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{notice.title}</h4>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                    <span>{notice.author}</span>
                                    <span>•</span>
                                    <span>{new Date(notice.timestamp).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setAdminEditingNotice(notice)}
                                    className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all"
                                  >
                                    <Settings size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNotice(notice.id)}
                                    className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 transition-all"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="p-20 text-center text-slate-300">
                              <Bell size={48} className="mx-auto mb-4 opacity-10" />
                              <p className="font-black">{t('no_notices')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              {adminSubView === 'resources' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">리소스 관리</h1>
                      <p className="text-slate-500 font-bold mt-1">사이트에 사용되는 로고, 배너, 아이콘 및 텍스트를 변경할 수 있습니다.</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await axios.put(`${API_BASE}/admin/site-resources`, editingSiteResources);
                          setSiteResources({ ...editingSiteResources });
                          alert('리소스가 저장되었습니다.');
                        } catch (e) { alert('저장 실패'); }
                      }}
                      className="px-6 py-3 bg-[#0055D1] text-white rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                    >
                      <CheckCircle size={18} /> 저장하기
                    </button>
                  </header>

                  {/* 이미지 업로드 헬퍼 */}
                  {(() => {
                    const handleImageUpload = async (key: string, file: File) => {
                      setResourceUploading(key);
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await axios.post(`${API_BASE}/admin/upload-site-resource`, formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        setEditingSiteResources((prev: any) => ({ ...prev, [key]: res.data.path }));
                      } catch (e) { alert('업로드 실패'); }
                      setResourceUploading(null);
                    };

                    const ImageUploadCard = ({ label, resourceKey, description, previewClass, defaultUrl }: { label: string; resourceKey: string; description: string; previewClass?: string; defaultUrl?: string }) => {
                      const currentUrl = editingSiteResources[resourceKey] || defaultUrl;
                      const currentFilename = currentUrl ? decodeURIComponent(currentUrl.split('/').pop() || '') : '';
                      const isCustom = !!editingSiteResources[resourceKey];
                      return (
                        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-black text-slate-900">{label}</h4>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">{description}</p>
                            </div>
                            {isCustom && (
                              <button onClick={() => setEditingSiteResources((prev: any) => { const n = { ...prev }; delete n[resourceKey]; return n; })}
                                className="text-xs text-red-400 hover:text-red-600 font-bold">초기화</button>
                            )}
                          </div>
                          {/* 현재 파일 미리보기 */}
                          {currentUrl && (
                            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                              <img src={currentUrl} alt={label} className={previewClass || "w-16 h-16 object-contain rounded-xl border border-slate-100 bg-white p-1"} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${isCustom ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                                    {isCustom ? '커스텀' : '기본값'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 font-mono truncate mt-1" title={currentUrl}>{currentFilename}</p>
                              </div>
                            </div>
                          )}
                          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-4 cursor-pointer transition-all ${resourceUploading === resourceKey ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                            <Upload size={20} className="text-slate-400 mb-1" />
                            <span className="text-xs font-bold text-slate-500">{resourceUploading === resourceKey ? '업로드 중...' : currentUrl ? '새 이미지로 교체' : '이미지 선택'}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(resourceKey, e.target.files[0]); }} />
                          </label>
                        </div>
                      );
                    };

                    const TextInputCard = ({ label, resourceKey, placeholder, multiline, defaultValue }: { label: string; resourceKey: string; placeholder: string; multiline?: boolean; defaultValue?: string }) => {
                      const currentValue = editingSiteResources[resourceKey] || '';
                      const isCustom = !!editingSiteResources[resourceKey];
                      const displayPlaceholder = defaultValue || placeholder;
                      return (
                        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-slate-900">{label}</h4>
                            <div className="flex items-center gap-2">
                              {isCustom && (
                                <button onClick={() => setEditingSiteResources((prev: any) => { const n = { ...prev }; delete n[resourceKey]; return n; })}
                                  className="text-xs text-red-400 hover:text-red-600 font-bold">초기화</button>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${isCustom ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                                {isCustom ? '커스텀' : '기본값'}
                              </span>
                            </div>
                          </div>
                          {!isCustom && defaultValue && (
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                              <p className="text-xs text-slate-500 font-medium whitespace-pre-line">{defaultValue.replace(/\\n/g, '\n')}</p>
                            </div>
                          )}
                          {multiline ? (
                            <textarea
                              value={currentValue}
                              onChange={(e) => setEditingSiteResources((prev: any) => ({ ...prev, [resourceKey]: e.target.value }))}
                              placeholder={displayPlaceholder}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                              rows={3}
                            />
                          ) : (
                            <input
                              type="text"
                              value={currentValue}
                              onChange={(e) => setEditingSiteResources((prev: any) => ({ ...prev, [resourceKey]: e.target.value }))}
                              placeholder={displayPlaceholder}
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          )}
                        </div>
                      );
                    };

                    return (
                      <>
                        {/* 브랜딩 섹션 */}
                        <section className="space-y-4">
                          <h3 className="text-lg font-black text-slate-700 flex items-center gap-2"><Palette size={20} /> 브랜딩</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextInputCard label="서비스명" resourceKey="service_name" placeholder="Dadoke" defaultValue="Dadoke" />
                            <ImageUploadCard label="서비스 로고" resourceKey="logo_url" description="32×32px, PNG/SVG 권장" previewClass="w-10 h-10 object-contain rounded-lg border border-slate-100 bg-slate-50 p-0.5" />
                            <ImageUploadCard label="파비콘" resourceKey="favicon_url" description="32×32px, SVG/ICO/PNG 권장" previewClass="w-8 h-8 object-contain" defaultUrl="/vite.svg" />
                          </div>
                        </section>

                        {/* 히어로 배너 섹션 */}
                        <section className="space-y-4">
                          <h3 className="text-lg font-black text-slate-700 flex items-center gap-2"><ImageIcon size={20} /> 히어로 배너</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageUploadCard label="히어로 배너 이미지" resourceKey="hero_banner_url" description="16:9 비율, 2070×1380px 권장" previewClass="w-full h-24 object-cover rounded-xl border border-slate-100" defaultUrl="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400&auto=format&fit=crop" />
                            <TextInputCard label="히어로 타이틀 (한국어)" resourceKey="hero_title_ko" placeholder="줄바꿈: \\n, 강조: |텍스트|" multiline defaultValue={'선배가 들려주는\\n|실전 한국어 가이드|'} />
                            <TextInputCard label="히어로 설명 (한국어)" resourceKey="hero_desc_ko" placeholder="줄바꿈: \\n, 강조: |텍스트|" multiline defaultValue={'낯선 정점이 기적의 조각이 되는 순간,\\n|DADOKE|가 성장을 지원합니다.'} />
                            <TextInputCard label="히어로 타이틀 (베트남어)" resourceKey="hero_title_vi" placeholder="Hero title in Vietnamese" multiline defaultValue={'Hướng dẫn tiếng Hàn\\n|thực tế| từ tiền bối'} />
                            <TextInputCard label="히어로 설명 (베트남어)" resourceKey="hero_desc_vi" placeholder="Hero description in Vietnamese" multiline defaultValue={'Khoảnh khắc bir điểm xa lạ trở thành một mảnh phép màu,\\n|DADOKE| hỗ trợ sự trưởng thành của bạn.'} />
                          </div>
                        </section>

                        {/* 콘텐츠 & 아이콘 섹션 */}
                        <section className="space-y-4">
                          <h3 className="text-lg font-black text-slate-700 flex items-center gap-2"><Sparkles size={20} /> 콘텐츠 & 아이콘</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageUploadCard label="TOPIK AI 마스코트 GIF" resourceKey="topik_mascot_url" description="높이 82px, GIF/PNG 권장" defaultUrl="/images/topike.gif" />
                            <ImageUploadCard label="챗봇 아이콘" resourceKey="chatbot_icon_url" description="28×28px, 원형 아이콘" previewClass="w-8 h-8 rounded-full object-cover border border-slate-100" />
                          </div>
                        </section>

                        {/* 카테고리 아이콘 (확장 영역) */}
                        <section className="space-y-4">
                          <h3 className="text-lg font-black text-slate-700 flex items-center gap-2"><List size={20} /> 카테고리 아이콘 (선택)</h3>
                          <p className="text-xs text-slate-400 font-medium -mt-2">아이콘 미설정 시 기본 Lucide 아이콘이 사용됩니다.</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {['교육', '의료', '생활', '금융', '서비스', '쇼핑', 'IT', '제조', '요리', '미용', '농업', '가족', '취미'].map(cat => (
                              <div key={cat} className="bg-white rounded-xl border border-slate-100 p-3 space-y-2 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-slate-700">{cat}</span>
                                  {editingSiteResources.category_icons?.[cat] && (
                                    <button onClick={() => setEditingSiteResources((prev: any) => {
                                      const icons = { ...prev.category_icons };
                                      delete icons[cat];
                                      return { ...prev, category_icons: icons };
                                    })} className="text-[10px] text-red-400 hover:text-red-600 font-bold">초기화</button>
                                  )}
                                </div>
                                {editingSiteResources.category_icons?.[cat] && (
                                  <img src={editingSiteResources.category_icons[cat]} alt={cat} className="w-8 h-8 object-contain mx-auto" />
                                )}
                                <label className="flex items-center justify-center border border-dashed border-slate-200 rounded-lg py-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all">
                                  <Upload size={14} className="text-slate-400 mr-1" />
                                  <span className="text-[10px] font-bold text-slate-500">{resourceUploading === `cat_${cat}` ? '...' : '선택'}</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                    if (!e.target.files?.[0]) return;
                                    setResourceUploading(`cat_${cat}`);
                                    const fd = new FormData();
                                    fd.append('file', e.target.files[0]);
                                    try {
                                      const res = await axios.post(`${API_BASE}/admin/upload-site-resource`, fd, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                      });
                                      setEditingSiteResources((prev: any) => ({
                                        ...prev,
                                        category_icons: { ...(prev.category_icons || {}), [cat]: res.data.path }
                                      }));
                                    } catch { alert('업로드 실패'); }
                                    setResourceUploading(null);
                                  }} />
                                </label>
                              </div>
                            ))}
                          </div>
                        </section>
                      </>
                    );
                  })()}
                </div>
              )}

              {adminSubView === 'diagnosis' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">시스템 전반 진단 (System Diagnosis)</h1>
                      <p className="text-slate-500 font-bold mt-1">백엔드 스토리지, 매핑, 캐시 및 로그 무결성을 검사합니다.</p>
                    </div>
                    <button
                      onClick={handleRunDiagnosis}
                      disabled={isDiagnosing}
                      className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black transition-all shadow-lg ${isDiagnosing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-95'}`}
                    >
                      {isDiagnosing ? <Activity className="animate-spin" size={18} /> : <Terminal size={18} />}
                      {isDiagnosing ? "진단 중..." : "진단 실행하기"}
                    </button>
                  </header>

                  {diagnosisResults && (
                    <div className="space-y-8">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-lg">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">총 검사 수</p>
                          <h4 className="text-4xl font-black text-slate-900">{diagnosisResults.summary.total_checks}</h4>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-lg border-l-4 border-l-green-500">
                          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">정상 (PASS)</p>
                          <h4 className="text-4xl font-black text-green-600">{diagnosisResults.summary.passed}</h4>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-lg border-l-4 border-l-orange-500">
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">주의 (WARN)</p>
                          <h4 className="text-4xl font-black text-orange-500">{diagnosisResults.summary.warn}</h4>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-lg border-l-4 border-l-red-500">
                          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">오류 (FAIL)</p>
                          <h4 className="text-4xl font-black text-red-600">{diagnosisResults.summary.fail}</h4>
                        </div>
                      </div>

                      {/* Detailed Results */}
                      <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">진단 항목</th>
                              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">상태</th>
                              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">상세 결과</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {diagnosisResults.checks.map((check: any, idx: number) => (
                              <tr key={idx} className="hover:bg-blue-50/20 transition-all">
                                <td className="px-8 py-6">
                                  <span className="font-black text-slate-900">{check.name}</span>
                                </td>
                                <td className="px-8 py-6">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${check.status === 'PASS' ? 'bg-green-50 text-green-600 border-green-100' :
                                    check.status === 'WARN' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                      'bg-red-50 text-red-600 border-red-100'
                                    }`}>
                                    {check.status === 'PASS' ? <CheckCircle size={12} /> : check.status === 'WARN' ? <ShieldAlert size={12} /> : <XCircle size={12} />}
                                    {check.status}
                                  </span>
                                </td>
                                <td className="px-8 py-6 font-medium text-slate-600 text-sm">
                                  {check.details}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Recent Error Logs */}
                      {diagnosisResults.error_logs.length > 0 && (
                        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-8">
                            <ShieldAlert className="text-red-500" /> 발견된 최근 주요 로그 (최근 10건)
                          </h3>
                          <div className="space-y-4">
                            {diagnosisResults.error_logs.map((log: any, idx: number) => (
                              <div key={idx} className="p-6 rounded-3xl bg-slate-50 border border-transparent hover:border-red-100 hover:bg-white transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-black text-red-600 uppercase tracking-widest">{log.action}</span>
                                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-sm font-medium text-slate-700">{log.details}</p>
                                <div className="flex items-center gap-2 mt-3">
                                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500 uppercase">{log.username.charAt(0)}</div>
                                  <p className="text-[10px] font-bold text-slate-400 tracking-tight">ID: {log.username}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!diagnosisResults && !isDiagnosing && (
                    <div className="py-32 flex flex-col items-center justify-center text-slate-300 bg-white rounded-[3.5rem] border border-dashed border-slate-200 shadow-inner">
                      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                        <Terminal size={40} strokeWidth={1} className="opacity-20" />
                      </div>
                      <p className="font-black text-lg text-slate-400">시스템 점검을 시작할 준비가 되었습니다.</p>
                      <p className="text-xs font-bold text-slate-300 mt-2 uppercase tracking-widest">Press "Run Diagnosis" button above</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div >
        ) : (
          <main
            id="main-content"
            className="flex-1 h-full min-h-0 overflow-y-auto bg-white scroll-smooth relative"
            style={{ overscrollBehavior: 'none' }}
            onScroll={(e) => {
              const target = e.target as HTMLElement;

              // requestAnimationFrame 스로틀링: 프레임당 최대 1회만 상태 업데이트
              if (scrollRafRef.current) {
                cancelAnimationFrame(scrollRafRef.current);
              }
              scrollRafRef.current = requestAnimationFrame(() => {
                const scrollTop = target.scrollTop;

                // Sticky header logic (Shrink header to 2x notice height: 64px)
                setScrollProgress(Math.min(Math.max(scrollTop / 80, 0), 1));

                setShowStickySearch(viewMode !== 'market' || scrollTop > 80);

                // 무한 스크롤 체크: 하단에서 200px 지점 도달 시 추가 로드
                if (viewMode === 'market' && (selectedCategory || searchQuery || marketViewAll)) {
                  const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 200;
                  if (bottom) {
                    setVisibleMarketItemsCount(prev => prev + 20);
                  }
                }
              });
            }}
          >
            {/* 공지사항 상단 배너 및 메인 콘텐츠 영역 (Merged for Sticky Room) */}
            <div
              style={{
                paddingTop: isAdminMode ? (48 + headerHeight) : headerHeight,
                transition: 'padding-top 300ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {isNoticeVisible && (
                <div
                  onClick={() => setViewMode('notices')}
                  className="sticky z-[175] w-full bg-slate-900 text-white px-6 py-1 h-8 flex items-center justify-between animate-in slide-in-from-top duration-700 cursor-pointer hover:bg-slate-800 transition-all shadow-md border-b border-white/5"
                  style={{
                    top: stickyTopOffset,
                    transition: 'top 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shrink-0 opacity-80">NOTICE</span>
                      <p className="font-bold text-[13px] truncate">{notices.find(n => n.priority)?.title}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setViewMode('notices'); }}
                      className="text-[11px] font-black text-slate-400 hover:text-white transition-colors shrink-0 px-2 py-1"
                    >
                      {t('view_all')}
                    </button>
                  </div>
                </div>
              )}

              <div
                className="max-w-[1440px] mx-auto px-6 w-full pb-0"
                style={{ paddingTop: (viewMode === 'bookDetail' ? 8 : viewMode === 'viewer' ? 40 : 0) }}
              >
                {viewMode === 'market' && (
                  <section className={`pb-4 pt-6 w-full group transition-all duration-300 ${showStickySearch ? 'opacity-0 scale-95 pointer-events-none -translate-y-4' : 'opacity-100 scale-100'}`}>
                    <div className="max-w-4xl mx-auto">
                      <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-1 focus-within:border-[#0055D1] focus-within:shadow-xl focus-within:shadow-blue-200/30 transition-all overflow-hidden">
                        <div className="pl-5 text-slate-400">
                          <Search size={18} className="group-focus-within:text-[#0055D1] transition-colors" />
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t('main_search_placeholder')}
                          className="w-full px-4 py-2.5 bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus:outline-none font-bold text-base"
                        />
                        <button className="w-10 h-10 bg-[#0055D1] text-white rounded-xl flex items-center justify-center hover:bg-[#0044A7] transition-all active:scale-90 shadow-md shrink-0">
                          <Search size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* 
                   Sticky Category Menu Section
                   -----------------------------
                   Dynamic Transition: Default Vertical (icon on top) -> Scrolled Horizontal (icon next to label).
                   The 'py' transition is slightly animated (200ms) for smoothness, 
                   while the internal layout swap (flex-col -> flex-row) is snappy for performance.
                */}
                {viewMode !== 'viewer' && (
                  <section
                    className="sticky z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 -mx-6 px-6"
                    style={{
                      top: `${stickyTopOffset + (isNoticeVisible ? bannerTotalHeight : 0)}px`,
                      height: `${140 - 84 * scrollProgress}px`,
                      marginBottom: `${84 * scrollProgress}px`,
                      overflow: 'hidden',
                      willChange: 'height, top'
                    }}
                  >
                    <div className="flex items-center h-full w-full max-w-[1440px] mx-auto overflow-hidden">
                      {/* Swiper Categories Container */}
                      <div className="flex-1 min-w-0 relative">
                        <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
                        <Swiper
                          slidesPerView="auto"
                          spaceBetween={28}
                          freeMode={true}
                          slidesOffsetAfter={100}
                          modules={[FreeMode]}
                          className="category-swiper !px-2"
                        >
                          <SwiperSlide style={{ width: 'auto' }}>
                            <button
                              onClick={() => { setMarketViewAll('all'); setViewMode('market'); setSelectedCategory(null); setSearchQuery(''); }}
                              className="relative flex items-center justify-center rounded-xl font-black group"
                            >
                              {/* Stage 1: Default View - Fades out with scroll progress */}
                              <div
                                className="flex flex-col items-center gap-2 px-4 py-2"
                                style={{
                                  opacity: 1 - crossfade,
                                  transform: `scale(${1 - 0.1 * scrollProgress}) translateY(${scrollProgress * 8}px)`,
                                  pointerEvents: scrollProgress > 0.5 ? 'none' : 'auto',
                                  willChange: 'opacity, transform'
                                }}
                              >
                                <div className={`rounded-xl transition-all duration-200 ${(marketViewAll === 'all' && viewMode === 'market' && !selectedCategory && !searchQuery) ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'} p-2.5 group-hover:scale-105`}>
                                  <ShoppingBag size={24} strokeWidth={(marketViewAll === 'all' && viewMode === 'market') ? 2.5 : 2} />
                                </div>
                                <span className="whitespace-nowrap text-[12px] text-slate-500">{t('view_all')}</span>
                              </div>

                              {/* Stage 3: Scrolled View - Fades in with scroll progress */}
                              <div
                                className="absolute inset-0 flex items-center gap-2 px-3 py-1.5"
                                style={{
                                  opacity: crossfade,
                                  transform: `scale(${0.95 + 0.05 * scrollProgress}) translateY(${(1 - scrollProgress) * -8}px)`,
                                  pointerEvents: scrollProgress <= 0.5 ? 'none' : 'auto',
                                  willChange: 'opacity, transform'
                                }}
                              >
                                <div className={`rounded-lg transition-all ${(marketViewAll === 'all' && viewMode === 'market' && !selectedCategory && !searchQuery) ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-400'} p-1`}>
                                  <ShoppingBag size={16} strokeWidth={(marketViewAll === 'all' && viewMode === 'market') ? 2.5 : 2} />
                                </div>
                                <span className={`whitespace-nowrap font-black text-[11px] ${marketViewAll === 'all' && viewMode === 'market' ? 'text-[#0055D1]' : 'text-slate-500'}`}>{t('view_all')}</span>
                                {(marketViewAll === 'all' && viewMode === 'market' && !selectedCategory && !searchQuery) && (
                                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0055D1] rounded-full" />
                                )}
                              </div>
                            </button>
                          </SwiperSlide>
                          {([
                            { icon: <GraduationCap />, label: '학교/유학', cat: '교육' },
                            { icon: <Stethoscope />, label: '의료/건강', cat: '의료' },
                            { icon: <Home />, label: '생활/정착', cat: '생활' },
                            { icon: <Briefcase />, label: '금융/은행', cat: '금융' },
                            { icon: <Coffee />, label: '카페/알바', cat: '서비스' },
                            { icon: <ShoppingBag />, label: '쇼핑/배달', cat: '쇼핑' },
                            { icon: <Terminal />, label: 'IT/개발', cat: 'IT' },
                            { icon: <Settings />, label: '제조/건설', cat: '제조' },
                            { icon: <Utensils />, label: '요리/급식', cat: '요리' },
                            { icon: <Scissors />, label: '미용/서비스', cat: '미용' },
                            { icon: <Sprout />, label: '농업/귀농', cat: '농업' },
                            { icon: <Users />, label: '가족/사회', cat: '가족' },
                            { icon: <Dumbbell />, label: '취미/건강', cat: '취미' },
                          ] as const).map((item, idx) => {
                            const customIcon = siteResources.category_icons?.[item.cat];
                            const renderIcon = (size: number, strokeWidth: number) => customIcon
                              ? <img src={customIcon} alt={item.cat} style={{ width: size, height: size }} className="object-contain" />
                              : React.cloneElement(item.icon as React.ReactElement<any>, { size, strokeWidth });
                            return (
                              <SwiperSlide key={idx} style={{ width: 'auto' }}>
                                <button
                                  onClick={() => { setSelectedCategory(item.cat); setViewMode('market'); setMarketViewAll(null); setSearchQuery(''); }}
                                  className="relative flex items-center justify-center rounded-xl font-black group"
                                >
                                  {/* Stage 1: Default View - Fades out with scroll progress */}
                                  <div
                                    className="flex flex-col items-center gap-2 px-4 py-2"
                                    style={{
                                      opacity: 1 - crossfade,
                                      transform: `scale(${1 - 0.1 * scrollProgress}) translateY(${scrollProgress * 8}px)`,
                                      pointerEvents: scrollProgress > 0.5 ? 'none' : 'auto',
                                      willChange: 'opacity, transform'
                                    }}
                                  >
                                    <div className={`rounded-xl transition-all duration-200 ${(selectedCategory === item.cat && viewMode === 'market') ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'} p-2.5 group-hover:scale-105`}>
                                      {renderIcon(24, (selectedCategory === item.cat && viewMode === 'market') ? 2.5 : 2)}
                                    </div>
                                    <span className="whitespace-nowrap text-[12px] text-slate-500">{t(`categories.${item.cat}`)}</span>
                                  </div>

                                  {/* Stage 3: Scrolled View - Fades in with scroll progress */}
                                  <div
                                    className="absolute inset-0 flex items-center gap-2 px-3 py-1.5"
                                    style={{
                                      opacity: crossfade,
                                      transform: `scale(${0.95 + 0.05 * scrollProgress}) translateY(${(1 - scrollProgress) * -8}px)`,
                                      pointerEvents: scrollProgress <= 0.5 ? 'none' : 'auto',
                                      willChange: 'opacity, transform'
                                    }}
                                  >
                                    <div className={`rounded-lg transition-all ${(selectedCategory === item.cat && viewMode === 'market') ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-400'} p-1`}>
                                      {renderIcon(16, (selectedCategory === item.cat && viewMode === 'market') ? 2.5 : 2)}
                                    </div>
                                    <span className={`whitespace-nowrap font-black text-[11px] ${selectedCategory === item.cat && viewMode === 'market' ? 'text-[#0055D1]' : 'text-slate-500'}`}>{t(`categories.${item.cat}`)}</span>
                                    {(selectedCategory === item.cat && viewMode === 'market') && (
                                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0055D1] rounded-full" />
                                    )}
                                  </div>
                                </button>
                              </SwiperSlide>
                            )
                          })}
                        </Swiper>
                      </div>

                      {/* 
                          TOPIK AI Section
                          ----------------
                          A premium text-based button for AI features. 
                          Includes a pulsing status indicator to suggest "live" or active AI.
                      */}
                      <div className="flex-none pl-4 border-l border-slate-100 bg-transparent ml-2">
                        <button
                          onClick={() => setViewMode('ai')}
                          className="relative flex items-center justify-center overflow-hidden min-w-[80px]"
                          style={{ height: `${82 - 46 * scrollProgress}px`, willChange: 'height' }}
                        >
                          {/* Stage 1: Animated GIF - Fades out with scroll progress */}
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                              opacity: 1 - crossfade,
                              transform: `scale(${1 - 0.1 * scrollProgress}) translateY(${scrollProgress * -16}px)`,
                              pointerEvents: scrollProgress > 0.5 ? 'none' : 'auto',
                              willChange: 'opacity, transform'
                            }}
                          >
                            <img
                              src={siteResources.topik_mascot_url || "/images/topike.gif"}
                              alt="Topik AI"
                              className={`h-[82px] w-auto object-contain rounded-xl transition-all ${viewMode === 'ai' ? 'drop-shadow-lg shadow-orange-200' : 'opacity-95'}`}
                            />
                          </div>

                          {/* Stage 3: Text Badge - Fades in with scroll progress */}
                          <div
                            style={{
                              opacity: crossfade,
                              transform: `scale(${0.95 + 0.05 * scrollProgress}) translateY(${(1 - scrollProgress) * 16}px)`,
                              pointerEvents: scrollProgress <= 0.5 ? 'none' : 'auto',
                              willChange: 'opacity, transform'
                            }}
                          >
                            <div className={"px-4 py-1.5 rounded-xl text-[12px] font-black tracking-tight flex items-center gap-1.5 border transition-all duration-300 " + (viewMode === 'ai' ? "bg-orange-50 border-orange-200 shadow-sm shadow-orange-100 text-orange-600" : (scrollProgress > 0.5 ? "bg-transparent border-transparent text-slate-600" : "bg-slate-50 border-slate-100 opacity-80 group-hover:opacity-100 text-slate-600"))}>
                              <div className={`w-1 h-1 rounded-full ${viewMode === 'ai' ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'}`} />
                              <span>TOPIK AI</span>
                            </div>
                          </div>

                          {/* Active Indicator */}
                          {viewMode === 'ai' && (
                            <div
                              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-600 rounded-full"
                              style={{
                                opacity: crossfade,
                                transform: `translateX(-50%) translateY(${(1 - scrollProgress) * 8}px)`,
                                willChange: 'opacity, transform'
                              }}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {viewMode === 'market' && (
                  <div className="flex-1 flex flex-col">
                    {/* Hero Banner Section: 필터나 전체보기가 활성화되지 않았을 때만 표시 */}
                    {!(selectedCategory || searchQuery || marketViewAll) && (
                      <>
                        <section className="relative mt-8 mb-6 overflow-hidden rounded-[2.5rem] w-full shrink-0 animate-in fade-in zoom-in-95 duration-500">
                          <div className="absolute inset-0 z-0">
                            <img
                              src={siteResources.hero_banner_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop"}
                              alt="Education & Mentoring"
                              className="w-full h-full object-cover opacity-60"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
                          </div>

                          <div className="relative z-10 py-16 px-16 flex flex-col items-start justify-center text-left">
                            <div className="max-w-xl w-full space-y-6">
                              <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0055D1]/10 rounded-lg">
                                  <span className="w-1.5 h-1.5 bg-[#0055D1] rounded-full" />
                                  <p className="text-[#0055D1] font-bold uppercase tracking-widest text-[10px]">{t('premium_guide')}</p>
                                </div>
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.3] break-keep">
                                  {(siteResources[`hero_title_${language}`] || t('hero_title')).split('\n').map((line: string, i: number) => (
                                    <span key={i} className="block">
                                      {line.split('|').map((part: string, j: number) => (
                                        <span key={j} className={j % 2 === 1 ? "text-[#0055D1]" : ""}>
                                          {part}
                                        </span>
                                      ))}
                                    </span>
                                  ))}
                                </h2>
                                <div className="text-base md:text-lg text-slate-600 font-bold tracking-tight leading-[1.5] break-keep mt-4">
                                  {(siteResources[`hero_desc_${language}`] || t('hero_desc')).split('\n').map((line: string, i: number) => (
                                    <span key={i} className="block">
                                      {line.split('|').map((part: string, j: number) => (
                                        <span key={j} className={j % 2 === 1 ? "text-[#0055D1]" : ""}>
                                          {part}
                                        </span>
                                      ))}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </section>
                      </>
                    )}

                    <div className="w-full pb-20">
                      {(selectedCategory || searchQuery || marketViewAll) ? (
                        /* Unified Grid View (Category, Search, or View All) */
                        <section className="py-10">
                          <div className="flex items-center justify-between mb-8">
                            <div>
                              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                {selectedCategory ? `${t(`categories.${selectedCategory}`)} ${t('view_all')}` :
                                  searchQuery ? `'${searchQuery}' ${t('search_results')} ✨` :
                                    marketViewAll === 'trending' ? `${t('trending_now')} ${t('view_all')} 🔥` :
                                      marketViewAll === 'new' ? `${t('new_arrivals')} ${t('view_all')} ✨` :
                                        `${t('all_books_catalog')} ✨`}
                              </h3>
                              <p className="text-slate-500 text-sm mt-1">
                                {selectedCategory ? `${t(`categories.${selectedCategory}`)}${t('category_view_desc')}` :
                                  searchQuery ? `${t('search_found_prefix')} ${storeBooks.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase())).length}${t('search_found_suffix')}` :
                                    marketViewAll === 'trending' ? t('trending_view_desc') :
                                      marketViewAll === 'new' ? t('new_view_desc') :
                                        t('all_view_desc')}
                              </p>
                            </div>
                            <button
                              onClick={() => { setSelectedCategory(null); setSearchQuery(''); setMarketViewAll(null); }}
                              className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                            >
                              {t('back_to_all')} <ChevronRight size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {storeBooks
                              .filter(book => {
                                const matchesCategory = !selectedCategory || book.category === selectedCategory;
                                const matchesSearch = !searchQuery || (
                                  book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  book.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  book.author.toLowerCase().includes(searchQuery.toLowerCase())
                                );
                                return matchesCategory && matchesSearch;
                              })
                              .sort((a, b) => {
                                if (marketViewAll === 'trending' || (!marketViewAll && !selectedCategory && searchQuery)) {
                                  const statsA = globalReviewStats[a.id] || { average_rating: 0, total_count: 0 };
                                  const statsB = globalReviewStats[b.id] || { average_rating: 0, total_count: 0 };
                                  const scoreA = (statsA.average_rating * 10) + statsA.total_count;
                                  const scoreB = (statsB.average_rating * 10) + statsB.total_count;
                                  return scoreB - scoreA;
                                }
                                if (marketViewAll === 'new') {
                                  // Assume storeBooks is already somewhat ordered or compare by id/index
                                  return storeBooks.indexOf(b) - storeBooks.indexOf(a);
                                }
                                return 0; // Natural order
                              })
                              .slice(0, visibleMarketItemsCount)
                              .map((book) => (
                                <div
                                  key={book.id}
                                  onClick={() => { setSelectedBook(book); setViewMode('bookDetail'); }}
                                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer active:scale-[0.98]"
                                >
                                  <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                    {book.thumbnail ? (
                                      <img
                                        src={resolveThumbnail(book.thumbnail)}
                                        alt={book.title}
                                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <Book size={48} strokeWidth={1} />
                                      </div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                      <span className="text-xs font-black bg-blue-600 text-white px-2 py-1 rounded-md uppercase tracking-wider shadow-lg">
                                        {t(`categories.${book.category}`)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-5 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-black px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm flex items-center gap-1 ${book.type === '직무' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                                        {book.icon} {book.type === '직무' ? t('job') : t('life')}
                                      </span>
                                    </div>
                                    <h4 className="text-base font-bold text-slate-900 leading-snug group-hover:text-[#0055D1] transition-colors break-keep line-clamp-2">
                                      {book.title}
                                    </h4>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs text-slate-400 font-medium line-clamp-1">{book.author}</p>
                                      <span className="text-sm font-black text-[#0055D1] shrink-0">{book.price}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1 pt-2">
                                      <div className="flex items-center gap-1 text-yellow-400">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <Star
                                            key={s}
                                            size={12}
                                            fill={s <= (globalReviewStats[book.id]?.average_rating || 0.0) ? "currentColor" : "none"}
                                            className={s <= (globalReviewStats[book.id]?.average_rating || 0.0) ? "text-yellow-400" : "text-slate-200"}
                                          />
                                        ))}
                                        <span className="text-xs text-slate-400 font-bold ml-1">
                                          ({globalReviewStats[book.id]?.average_rating !== undefined ? globalReviewStats[book.id].average_rating.toFixed(1) : '0.0'})
                                        </span>
                                      </div>
                                      {(() => {
                                        const isPurchased = cachedBooks.some(cb =>
                                          cb.title.replace(/[^가-힣a-zA-Z0-9]/g, '') === book.title.replace(/[^가-힣a-zA-Z0-9]/g, '')
                                        );
                                        return (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); isPurchased ? setViewMode('library') : handlePurchase(book); }}
                                            className={`p-2 rounded-lg transition-all ${isPurchased ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white'}`}
                                            title={isPurchased ? t('paid_complete') : t('buy_now')}
                                          >
                                            {isPurchased ? <CheckCircle size={18} /> : <PlusCircle size={18} />}
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </section>
                      ) : (
                        <>
                          {/* Section: Trending Now */}
                          <section className="py-10">
                            <div className="flex items-center justify-between mb-8">
                              <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('trending_now')}</h3>
                                <p className="text-slate-500 text-sm mt-1">{t('mentor_desc')}</p>
                              </div>
                              <div />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                              {storeBooks
                                .sort((a, b) => {
                                  const statsA = globalReviewStats[a.id] || { average_rating: 0, total_count: 0 };
                                  const statsB = globalReviewStats[b.id] || { average_rating: 0, total_count: 0 };
                                  const scoreA = (statsA.average_rating * 10) + statsA.total_count;
                                  const scoreB = (statsB.average_rating * 10) + statsB.total_count;
                                  return scoreB - scoreA;
                                })
                                .slice(0, 10)
                                .map((book) => (
                                  <div
                                    key={book.id}
                                    onClick={() => { setSelectedBook(book); setViewMode('bookDetail'); }}
                                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer active:scale-[0.98]"
                                  >
                                    <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                      {book.thumbnail ? (
                                        <img
                                          src={resolveThumbnail(book.thumbnail)}
                                          alt={book.title}
                                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                          <Book size={48} strokeWidth={1} />
                                        </div>
                                      )}
                                      <div className="absolute top-3 left-3">
                                        <span className="text-xs font-black bg-blue-600 text-white px-2 py-1 rounded-md uppercase tracking-wider shadow-lg">
                                          {t(`categories.${book.category}`)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm flex items-center gap-1 ${book.type === '직무' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                                          {book.icon} {book.type === '직무' ? t('job') : t('life')}
                                        </span>
                                      </div>
                                      <h4 className="text-base font-bold text-slate-900 leading-snug group-hover:text-[#0055D1] transition-colors break-keep line-clamp-2">
                                        {book.title}
                                      </h4>
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs text-slate-400 font-medium line-clamp-1">{book.author}</p>
                                        <span className="text-sm font-black text-[#0055D1] shrink-0">{book.price}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-1 pt-2">
                                        <div className="flex items-center gap-1 text-yellow-400">
                                          {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                              key={s}
                                              size={12}
                                              fill={s <= (globalReviewStats[book.id]?.average_rating || 0.0) ? "currentColor" : "none"}
                                              className={s <= (globalReviewStats[book.id]?.average_rating || 0.0) ? "text-yellow-400" : "text-slate-200"}
                                            />
                                          ))}
                                          <span className="text-xs text-slate-400 font-bold ml-1">
                                            ({globalReviewStats[book.id]?.average_rating !== undefined ? globalReviewStats[book.id].average_rating.toFixed(1) : '0.0'})
                                          </span>
                                        </div>
                                        {(() => {
                                          const isPurchased = cachedBooks.some(cb =>
                                            cb.title.replace(/[^가-힣a-zA-Z0-9]/g, '') === book.title.replace(/[^가-힣a-zA-Z0-9]/g, '')
                                          );
                                          return (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); isPurchased ? setViewMode('library') : handlePurchase(book); }}
                                              className={`p-2 rounded-lg transition-all ${isPurchased ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white'}`}
                                              title={isPurchased ? t('paid_complete') : t('buy_now')}
                                            >
                                              {isPurchased ? <CheckCircle size={18} /> : <PlusCircle size={18} />}
                                            </button>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </section>

                          {/* Section: New Arrivals */}
                          <section className="py-10 mb-20">
                            <div className="flex items-center justify-between mb-8">
                              <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('new_arrivals')} ✨</h3>
                                <p className="text-slate-500 text-sm mt-1">{t('new_arrivals_desc')}</p>
                              </div>
                              <div />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                              {[...storeBooks]
                                .slice(-10).reverse().map((book, idx) => (
                                  <div
                                    key={`new-${idx}`}
                                    onClick={() => { setSelectedBook(book); setViewMode('bookDetail'); }}
                                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer active:scale-[0.98]"
                                  >
                                    <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                      {book.thumbnail ? (
                                        <img
                                          src={resolveThumbnail(book.thumbnail)}
                                          alt={book.title}
                                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                          <Book size={48} strokeWidth={1} />
                                        </div>
                                      )}
                                      <div className="absolute top-3 right-3">
                                        <div className="bg-orange-500 text-white p-1.5 rounded-lg shadow-lg animate-pulse flex items-center gap-1">
                                          <Sparkles size={14} fill="currentColor" />
                                          <span className="text-[10px] font-black uppercase tracking-tighter">{t('new_tag')}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                      <h4 className="text-base font-bold text-slate-900 leading-snug group-hover:text-[#0055D1] transition-colors line-clamp-2">
                                        {book.title}
                                      </h4>
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs text-slate-400 font-medium line-clamp-1">{book.author}</p>
                                        <span className="text-sm font-black text-[#0055D1] shrink-0">{book.price}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-1 pt-1">
                                        <div className="flex items-center gap-1 text-yellow-400">
                                          {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                              key={s}
                                              size={12}
                                              fill={s <= (globalReviewStats[book.id]?.average_rating || 0.0) ? "currentColor" : "none"}
                                              className={s <= (globalReviewStats[book.id]?.average_rating || 0.0) ? "text-yellow-400" : "text-slate-200"}
                                            />
                                          ))}
                                          <span className="text-xs text-slate-400 font-bold ml-1">
                                            ({globalReviewStats[book.id]?.average_rating !== undefined ? globalReviewStats[book.id].average_rating.toFixed(1) : '0.0'})
                                          </span>
                                        </div>
                                        {(() => {
                                          const isPurchased = cachedBooks.some(cb =>
                                            cb.title.replace(/[^가-힣a-zA-Z0-9]/g, '') === book.title.replace(/[^가-힣a-zA-Z0-9]/g, '')
                                          );
                                          return (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); isPurchased ? setViewMode('library') : handlePurchase(book); }}
                                              className={`p-2 rounded-lg transition-all ${isPurchased ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white'}`}
                                              title={isPurchased ? t('paid_complete') : t('buy_now')}
                                            >
                                              {isPurchased ? <CheckCircle size={18} /> : <PlusCircle size={18} />}
                                            </button>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </section>
                        </>
                      )}

                      {/* Horizontal Banner Section - Width matched to content */}
                      <div className="mt-12 w-full">
                        <div className="relative overflow-hidden bg-gradient-to-r from-[#0055D1] to-[#0085FF] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 group">
                          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                            <div className="space-y-4 text-center md:text-left break-keep">
                              <h3 className="text-xl md:text-2xl font-black leading-tight">{t('community_title')}</h3>
                              <p className="text-blue-100 text-xs font-bold opacity-80">{t('community_desc')}</p>
                            </div>
                            <button
                              onClick={() => setViewMode('community')}
                              className="px-8 py-4 bg-white text-[#0055D1] rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 shadow-xl whitespace-nowrap"
                            >
                              {t('community_go')}
                            </button>
                          </div>
                          {/* Decorative Elements */}
                          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {viewMode === 'bookDetail' && selectedBook && (
                  <div className="w-full mt-2 mb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Sticky Back Button Container */}
                    <div className="sticky z-30 bg-white/80 backdrop-blur-sm -mx-6 px-6 py-4 mb-6 border-b border-slate-50 flex items-center" style={{ top: isAdminMode ? '120px' : '72px' }}>
                      <button
                        onClick={() => setViewMode('market')}
                        className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-[#0055D1] transition-all group"
                      >
                        <ChevronRight size={16} className="rotate-180" />
                        {t('back_to_list')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                      {/* Left: Sticky Book Cover */}
                      <div className="md:col-span-1">
                        <div className="sticky top-32">
                          <div className="aspect-[3/4] bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-200 border border-slate-100 shadow-2xl relative overflow-hidden group">
                            {selectedBook.thumbnail ? (
                              <img
                                src={resolveThumbnail(selectedBook.thumbnail)}
                                alt={selectedBook.title}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`${selectedBook.thumbnail ? 'hidden' : ''} w-full h-full flex items-center justify-center text-slate-200`}>
                              <Book size={80} strokeWidth={1} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Right: Book Details */}
                      <div className="md:col-span-2 space-y-12">
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-widest">{t(`categories.${selectedBook.category}`)}</span>
                            <span className="text-xs font-bold text-slate-300">|</span>
                            <span className="text-xs font-bold text-slate-400">{selectedBook.author}</span>
                          </div>
                          <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight break-keep">
                            {selectedBook.title.includes('!') ? (
                              <>
                                <span className="block text-[#0055D1] text-xl md:text-2xl mb-2">{selectedBook.title.split('!')[0]}!</span>
                                <span className="block">{selectedBook.title.split('!')[1].trim()}</span>
                              </>
                            ) : (
                              selectedBook.title
                            )}
                          </h2>
                          <p className="text-sm md:text-lg text-slate-500 font-medium leading-relaxed break-keep">
                            {selectedBook.description}
                          </p>
                          <div className="flex items-center gap-2 text-yellow-400">
                            {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={20} fill={s <= reviewStats.averageRating ? "currentColor" : "none"} className={s <= reviewStats.averageRating ? "text-yellow-400" : "text-slate-200"} />)}
                            <span className="text-sm text-slate-400 font-bold ml-2">({reviewStats.averageRating.toFixed(1)}/5.0) {reviewStats.totalCount} {t('reviews_count')}</span>
                          </div>
                        </div>

                        <div className="pt-4">
                          <button
                            onClick={() => handlePurchase(selectedBook)}
                            className="px-12 py-4 bg-[#0055D1] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#0044A7] hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                          >
                            {t('buy_now')}
                          </button>
                        </div>

                        {/* Tabs Section */}
                        <div className="space-y-12">
                          <div className="space-y-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                              <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
                              {t('book_detail_intro')}
                            </h3>
                            <p className="text-slate-600 leading-loose font-medium">
                              {selectedBook.longDescription || selectedBook.description}
                            </p>
                          </div>

                          <div className="space-y-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                              <span className="w-1.5 h-6 bg-slate-900 rounded-full" />
                              {t('toc_guide')}
                            </h3>
                            {selectedBook.toc ? (
                              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-4">
                                {selectedBook.toc.map((chap: TOCItem, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-none px-4 group hover:bg-white rounded-xl transition-all">
                                    <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">{chap.title}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400 text-sm italic px-6">{t('toc_preparing')}</p>
                            )}
                          </div>
                        </div>

                        {/* Professional Review Section */}
                        <div className="space-y-8 pt-10 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                              <span className="w-1.5 h-6 bg-yellow-400 rounded-full" />
                              {t('reviews')}
                            </h3>
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl">
                              <Star className="text-yellow-400 fill-current" size={16} />
                              <span className="text-sm font-black text-slate-900">{reviewStats.averageRating.toFixed(1)}</span>
                              <span className="text-xs text-slate-400">/ 5.0</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-4">
                            <div className="col-span-1 bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                              <span className="text-4xl font-black text-slate-900 mb-2">{reviewStats.recommendationRate}%</span>
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">{t('recommended_by')}</span>
                            </div>
                            <div className="col-span-3 space-y-3">
                              {[5, 4, 3, 2, 1].map((val) => (
                                <div key={val} className="flex items-center gap-4">
                                  <span className="text-xs font-bold text-slate-400 w-4">{val}★</span>
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                      style={{ width: `${reviewStats.distribution[val as keyof typeof reviewStats.distribution]}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Professional Review Section */}
                            <div className="space-y-8 pt-10 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                  <span className="w-1.5 h-6 bg-yellow-400 rounded-full" />
                                  {t('real_reviews')}
                                </h3>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Real-time Backend Reviews */}
                                {bookReviews?.length > 0 ? (
                                  bookReviews.map((rev: any) => (
                                    <div key={rev.id} className="bg-white border border-slate-100 rounded-[2rem] p-8 space-y-4 shadow-sm hover:shadow-md transition-all relative group/review">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-black">
                                            {rev.username[0].toUpperCase()}
                                          </div>
                                          <div>
                                            <p className="text-sm font-black text-slate-900">{rev.username}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">
                                              {new Date(rev.created_at).toLocaleDateString()}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-yellow-400">
                                          {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} fill={i < rev.rating ? "currentColor" : "none"} className={i < rev.rating ? "text-yellow-400" : "text-slate-200"} />
                                          ))}
                                        </div>
                                      </div>
                                      <p className="text-sm text-slate-600 font-medium leading-relaxed break-keep">
                                        {rev.comment}
                                      </p>

                                      {/* Edit/Delete Actions for Authors */}
                                      {isLoggedIn && username === rev.username && (
                                        <div className="flex items-center gap-4 pt-2 border-t border-slate-50 opacity-0 group-hover/review:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => startEditingReview(rev)}
                                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                          >
                                            {t('edit')}
                                          </button>
                                          <button
                                            onClick={() => handleDeleteReview(rev.id)}
                                            className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                          >
                                            {t('delete')}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-2 py-12 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm font-medium">{t('no_reviews')}</p>
                                  </div>
                                )}
                              </div>

                              {/* Review Creation Form */}
                              {isLoggedIn ? (
                                <div id="review-form" className="mt-12 bg-blue-50/50 rounded-[2.5rem] p-10 border border-blue-100 space-y-6">
                                  <div className="space-y-1">
                                    <h4 className="text-lg font-black text-slate-900">
                                      {editingReviewId ? t('edit_review_title') : t('write_review_title')}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-bold">{t('review_form_desc')}</p>
                                  </div>
                                  <form onSubmit={handleSubmitReview} className="space-y-6">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('rating_label')}</label>
                                      <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => {
                                          const isFull = star <= newReviewRating;
                                          const isHalf = !isFull && star - 0.5 <= newReviewRating;
                                          return (
                                            <div key={star} className="relative group">
                                              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-white border border-slate-100 group-hover:border-yellow-200">
                                                <div className="relative text-slate-200">
                                                  <Star size={24} fill="none" />
                                                  {(isFull || isHalf) && (
                                                    <div
                                                      className="absolute inset-0 overflow-hidden text-yellow-400"
                                                      style={{ width: isFull ? '100%' : '50%' }}
                                                    >
                                                      <Star size={24} fill="currentColor" />
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              {/* Half star hotspots */}
                                              <div className="absolute inset-0 flex">
                                                <button
                                                  type="button"
                                                  onClick={() => setNewReviewRating(star - 0.5)}
                                                  className="flex-1 h-full z-10 cursor-pointer"
                                                  title={`${star - 0.5} stars`}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => setNewReviewRating(star)}
                                                  className="flex-1 h-full z-10 cursor-pointer"
                                                  title={`${star} stars`}
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                        <div className="ml-4 px-4 py-2 bg-yellow-400 text-white rounded-xl shadow-lg shadow-yellow-100 animate-in zoom-in duration-300">
                                          <span className="text-lg font-black">{newReviewRating.toFixed(1)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('experience_label')}</label>
                                      <textarea
                                        value={newReviewComment}
                                        onChange={(e) => setNewReviewComment(e.target.value)}
                                        placeholder={t('write_review_title')}
                                        className="w-full h-40 bg-white border border-slate-200 p-6 rounded-[1.5rem] text-slate-900 font-bold focus:border-blue-500 focus:outline-none transition-all resize-none shadow-sm"
                                        required
                                      />
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 disabled:bg-slate-200"
                                      >
                                        {editingReviewId ? t('update_review') : t('submit_review')}
                                      </button>
                                      {editingReviewId && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingReviewId(null);
                                            setNewReviewComment('');
                                            setNewReviewRating(5);
                                          }}
                                          className="px-8 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all"
                                        >
                                          {t('cancel')}
                                        </button>
                                      )}
                                    </div>
                                  </form>
                                </div>
                              ) : (
                                <div className="mt-12 bg-slate-50 rounded-[2.5rem] p-12 text-center border border-dashed border-slate-200">
                                  <p className="text-slate-500 font-bold mb-6">{t('login_to_review')}</p>
                                  <button
                                    onClick={() => setShowAuthModal(true)}
                                    className="px-10 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-slate-900 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                                  >
                                    {t('go_to_login')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {viewMode === 'library' && (
                  <div className="w-full mt-24 pb-40">
                    <div className="flex flex-col md:flex-row gap-12">
                      {/* Left Sidebar: My Page Tabs */}
                      <aside className="w-full md:w-64 space-y-2">
                        <h2 className="text-3xl font-black text-slate-900 mb-10 px-4">{t('my_page')}</h2>
                        <button
                          onClick={() => setMyPageTab('books')}
                          className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${myPageTab === 'books' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          <Library size={18} /> {t('my_books')}
                        </button>
                        <button
                          onClick={() => setMyPageTab('history')}
                          className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${myPageTab === 'history' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          <Star size={18} /> {t('purchase_history')}
                        </button>
                        <button
                          onClick={() => setMyPageTab('profile')}
                          className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${myPageTab === 'profile' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          <Users size={18} /> {t('edit_profile')}
                        </button>
                      </aside>

                      {/* Right Content Area */}
                      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 p-10 min-h-[600px] shadow-sm">
                        {myPageTab === 'books' && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                              <h3 className="text-xl font-bold text-slate-900">{t('my_books')}</h3>
                              <div className="flex items-center gap-4">
                                <input
                                  type="file"
                                  accept=".epub"
                                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                                  className="hidden"
                                  id="epub-upload"
                                />
                                <label
                                  htmlFor="epub-upload"
                                  className="text-xs font-bold text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
                                >
                                  {file ? file.name : t('choose_file')}
                                </label>
                                <button
                                  onClick={handleUpload}
                                  disabled={!file || loading}
                                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-600 disabled:bg-slate-200 transition-all active:scale-95"
                                >
                                  {t('upload')}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                              {cachedBooks?.length === 0 ? (
                                <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-4 opacity-30">
                                  <Library size={64} strokeWidth={1} />
                                  <p className="text-sm font-bold">{t('no_books')}</p>
                                </div>
                              ) : (
                                cachedBooks.map((book) => (
                                  <div key={book.book_hash} className="group cursor-pointer">
                                    <div
                                      onClick={() => { loadBook(book.book_hash); setViewMode('viewer'); }}
                                      className="aspect-[3/4] bg-slate-50 rounded-2xl mb-4 flex items-center justify-center text-slate-300 group-hover:shadow-xl transition-all border border-slate-100 group-hover:border-[#0055D1]/30 relative overflow-hidden"
                                    >
                                      {/* Use book.thumbnail if available (from state sync) or find matching storeBook */}
                                      {(() => {
                                        // 1. Try metadata from backend/cache
                                        // 2. Try matching from storeBooks by title
                                        // 3. Fallback to default icon
                                        const thumb = book.thumbnail || storeBooks.find(sb => {
                                          const cleanStoreTitle = sb.title.replace(/[^가-힣a-zA-Z0-9]/g, '');
                                          const cleanBookTitle = book.title.replace(/[^가-힣a-zA-Z0-9]/g, '');
                                          return cleanStoreTitle.includes(cleanBookTitle) || cleanBookTitle.includes(cleanStoreTitle);
                                        })?.thumbnail;

                                        return thumb ? (
                                          <img
                                            src={thumb}
                                            alt={book.title}
                                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                          />
                                        ) : (
                                          <Book size={48} strokeWidth={1} />
                                        );
                                      })()}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                        <button className="w-full py-2.5 bg-[#0055D1] text-white rounded-xl text-xs font-black shadow-lg">{t('start_reading')}</button>
                                      </div>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-[#0055D1] transition-colors">{book.title}</h3>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">Webbook Form</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deleteBook(book.book_hash); }}
                                        className="text-[10px] text-slate-300 hover:text-red-500 transition-colors font-bold uppercase"
                                      >
                                        {t('remove')}
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {myPageTab === 'history' && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            <div className="border-b border-slate-50 pb-6">
                              <h3 className="text-xl font-bold text-slate-900">{t('purchase_history')}</h3>
                              <p className="text-sm text-slate-400 mt-1">{t('history_desc')}</p>
                            </div>
                            <div className="space-y-4">
                              {cachedBooks.map((book, idx) => (
                                <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-[#0055D1]/30 hover:bg-white transition-all shadow-sm hover:shadow-md">
                                  <div className="flex items-center gap-6">
                                    <div className="w-16 h-20 bg-white rounded-xl overflow-hidden flex items-center justify-center text-slate-200 border border-slate-100 shadow-sm relative">
                                      {(() => {
                                        const thumb = book.thumbnail || storeBooks.find(sb => sb.title === book.title)?.thumbnail;
                                        return thumb ? (
                                          <img src={thumb} className="w-full h-full object-cover object-top" />
                                        ) : (
                                          <Book size={24} />
                                        );
                                      })()}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-slate-900 group-hover:text-[#0055D1] transition-colors">{book.title}</h4>
                                      <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[10px] bg-blue-600 px-2 py-0.5 rounded text-white font-black uppercase tracking-wider shadow-sm">{t('paid_complete')}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-black text-slate-900">Paid</p>
                                    <button
                                      onClick={() => { loadBook(book.book_hash); setViewMode('viewer'); }}
                                      className="text-xs font-black text-[#0055D1] hover:underline uppercase tracking-widest"
                                    >
                                      {t('open_webbook')}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {myPageTab === 'profile' && (
                          <div className="max-w-xl animate-in fade-in slide-in-from-right-4">
                            <div className="border-b border-slate-50 pb-6 mb-10">
                              <h3 className="text-xl font-bold text-slate-900">{t('edit_profile')}</h3>
                              <p className="text-sm text-slate-400 mt-1">{t('edit_profile_desc')}</p>
                              {username === 'admin' && (
                                <button
                                  onClick={() => { setIsAdminMode(true); setViewMode('market'); }}
                                  className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:shadow-xl transition-all font-bold text-xs"
                                >
                                  <Settings size={16} />
                                  <span>{t('run_admin_console')}</span>
                                </button>
                              )}
                            </div>
                            <form className="space-y-8" onSubmit={handleUpdateProfile}>
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-2">
                                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">{t('username_label')}</label>
                                  <input
                                    type="text"
                                    value={username}
                                    readOnly
                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-slate-500 font-bold cursor-not-allowed"
                                  />
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Name</label>
                                  <input
                                    type="text"
                                    value={profileFullName}
                                    onChange={(e) => setProfileFullName(e.target.value)}
                                    placeholder="성함을 입력하세요"
                                    className="w-full bg-white border border-slate-200 p-4 rounded-xl text-slate-900 font-bold focus:border-blue-500 focus:outline-none transition-all"
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Nationality</label>
                                  <input
                                    type="text"
                                    value={profileNationality}
                                    onChange={(e) => setProfileNationality(e.target.value)}
                                    placeholder="국적을 입력하세요"
                                    className="w-full bg-white border border-slate-200 p-4 rounded-xl text-slate-900 font-bold focus:border-blue-500 focus:outline-none transition-all"
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="grid grid-cols-1 gap-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">New Password (Optional)</label>
                                    <input
                                      type="password"
                                      value={profilePassword}
                                      onChange={(e) => setProfilePassword(e.target.value)}
                                      placeholder="••••••••"
                                      className="w-full bg-white border border-slate-200 p-4 rounded-xl text-slate-900 font-bold focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Confirm Password</label>
                                    <input
                                      type="password"
                                      value={profileConfirmPassword}
                                      onChange={(e) => setProfileConfirmPassword(e.target.value)}
                                      placeholder="••••••••"
                                      className="w-full bg-white border border-slate-200 p-4 rounded-xl text-slate-900 font-bold focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                  </div>
                                </div>
                              </div>
                              <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 disabled:bg-slate-200"
                              >
                                Update Profile
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === 'ai' && (
                  <div className="w-full mt-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="max-w-[1440px] mx-auto px-6">
                      <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-blue-50 rounded-[3rem] p-16 shadow-2xl flex flex-col items-center justify-center text-center space-y-8 min-h-[600px]">
                        {/* Background Decorative Gradients */}
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />

                        <div className="relative z-10 space-y-6">
                          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-200 mx-auto animate-bounce-subtle">
                            <Sparkles size={48} strokeWidth={1.5} />
                          </div>

                          <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-4 py-1 bg-blue-50 rounded-full border border-blue-100">
                              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Next Generation Analysis</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                              {t('ai_revolution')}
                            </h2>
                            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto break-keep leading-relaxed">
                              {t('ai_desc_1')} <br />
                              {t('ai_desc_2')}
                            </p>
                          </div>

                          <div className="flex items-center justify-center gap-6 pt-10">
                            <div className="flex flex-col items-center gap-2 bg-slate-50 p-6 rounded-3xl w-40 border border-slate-100">
                              <span className="text-2xl font-black text-slate-900">92%</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('accuracy')}</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 bg-slate-50 p-6 rounded-3xl w-40 border border-slate-100">
                              <span className="text-2xl font-black text-slate-900">24/7</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('realtime')}</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 bg-slate-50 p-6 rounded-3xl w-40 border border-slate-100">
                              <span className="text-2xl font-black text-slate-900">Beta</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('status')}</span>
                            </div>
                          </div>

                          <div className="pt-10">
                            <button className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95">
                              {t('notify_me')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === 'community' && (
                  <CommunityLounge t={t} />
                )}

                {viewMode === 'notices' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <header className="flex flex-col gap-4 border-b border-slate-100 pb-8">
                      <div className="flex items-center gap-3 text-[#0055D1] font-black text-[10px] uppercase tracking-[0.2em]">
                        <span className="w-8 h-[2px] bg-[#0055D1] rounded-full" />
                        {t('notice_list_title')}
                      </div>
                      <div className="flex items-center justify-between">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t('notice_list_title')}</h1>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-slate-400 font-bold text-xs border border-slate-100 shadow-sm">
                          <Bell size={14} />
                          <span>{notices?.length || 0} {t('notice_post_unit')}</span>
                        </div>
                      </div>
                      <p className="text-slate-500 font-bold max-w-2xl leading-relaxed">{t('notices_news_desc')}</p>
                    </header>

                    {(() => {
                      const NOTICES_PER_PAGE = 5;
                      const totalPages = Math.max(1, Math.ceil((notices?.length || 0) / NOTICES_PER_PAGE));
                      const currentPage = Math.min(noticesPage, totalPages);
                      const paginatedNotices = notices?.slice((currentPage - 1) * NOTICES_PER_PAGE, currentPage * NOTICES_PER_PAGE) || [];
                      return (
                        <>
                          <div className="grid grid-cols-1 gap-6">
                            {paginatedNotices.length > 0 ? (
                              paginatedNotices.map((notice: any) => (
                                <div key={notice.id} className="bg-white rounded-[1rem] p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group relative overflow-hidden">
                                  {notice.priority && (
                                    <div className="absolute top-0 right-0">
                                      <div className="bg-red-600 text-white text-[9px] font-black px-4 py-1.5 transform rotate-45 translate-x-4 -translate-y-1 shadow-md">{t('notice_type_hot')}</div>
                                    </div>
                                  )}
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-3 flex-1">
                                      <div className="flex items-center gap-3">
                                        {notice.priority && <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase tracking-tighter">{t('notice_type_priority')}</span>}
                                        <h2 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{notice.title}</h2>
                                      </div>
                                      <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                                      <div className="flex items-center gap-4 text-xs font-bold text-slate-400 pt-4 border-t border-slate-50 mt-4">
                                        <span className="flex items-center gap-1.5"><User size={14} /> {notice.author}</span>
                                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                        <span>{new Date(notice.timestamp).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-20 flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                                <Bell size={48} strokeWidth={1} className="opacity-20 mb-4" />
                                <p className="font-black text-sm">{t('no_notices')}</p>
                              </div>
                            )}
                          </div>

                          {/* Pagination */}
                          {totalPages >= 1 && (
                            <div className="flex items-center justify-center gap-2 mt-12">
                              <button
                                onClick={() => { setNoticesPage(p => Math.max(1, p - 1)); document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage <= 1}
                                className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                              >
                                <ChevronRight size={16} className="rotate-180" />
                              </button>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                  key={page}
                                  onClick={() => { setNoticesPage(page); document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all active:scale-95 ${page === currentPage
                                    ? 'bg-[#0055D1] text-white shadow-lg shadow-blue-200'
                                    : 'border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                >
                                  {page}
                                </button>
                              ))}
                              <button
                                onClick={() => { setNoticesPage(p => Math.min(totalPages, p + 1)); document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage >= totalPages}
                                className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* ===== About Page ===== */}
                {viewMode === 'about' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <header className="flex flex-col gap-4 border-b border-slate-100 pb-8">
                      <div className="flex items-center gap-3 text-[#0055D1] font-black text-[10px] uppercase tracking-[0.2em]">
                        <span className="w-8 h-[2px] bg-[#0055D1] rounded-full" />
                        About Us
                      </div>
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight">회사 소개</h1>
                      <p className="text-slate-500 font-bold max-w-2xl leading-relaxed">Dadoke는 전 세계 한국어 학습자를 위한 디지털 콘텐츠 플랫폼입니다.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-[1rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]"><Briefcase size={20} /></div>
                          <h3 className="text-lg font-black text-slate-900">회사 정보</h3>
                        </div>
                        <div className="space-y-3 text-sm text-slate-600 font-medium">
                          <p className="flex items-center gap-2"><span className="font-black text-slate-900">회사명</span> (주)북차카</p>
                          <p className="flex items-center gap-2"><span className="font-black text-slate-900">대표이사</span> 서정환</p>
                          <p className="flex items-center gap-2"><span className="font-black text-slate-900">사업자등록번호</span> 128-87-04362</p>
                          <p className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> 경기도 고양시 일산동구 일산로 138, 402-5호</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-[1rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]"><Globe size={20} /></div>
                          <h3 className="text-lg font-black text-slate-900">서비스 소개</h3>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          Dadoke는 EPUB 기반 전자책과 TOPIK AI 학습 도구를 결합한 올인원 한국어 학습 플랫폼입니다.
                          학교/유학, 의료/건강, 직장생활, 여행 등 실생활 카테고리별 맞춤 콘텐츠를 제공합니다.
                        </p>
                      </div>

                      <div className="bg-white rounded-[1rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]"><Sparkles size={20} /></div>
                          <h3 className="text-lg font-black text-slate-900">비전</h3>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          언어 장벽 없는 세상을 만들기 위해 AI 기술과 검증된 교육 콘텐츠를 결합하여
                          전 세계 누구나 쉽고 효율적으로 한국어를 배울 수 있는 환경을 구축합니다.
                        </p>
                      </div>

                      <div className="bg-white rounded-[1rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]"><Heart size={20} /></div>
                          <h3 className="text-lg font-black text-slate-900">핵심 가치</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['접근성', '품질', '혁신', '신뢰', '다양성'].map(v => (
                            <span key={v} className="px-3 py-1.5 bg-blue-50 text-[#0055D1] rounded-lg text-xs font-black">{v}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center mt-12">
                      <button onClick={() => setViewMode('market')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95">
                        Back to Market
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== Privacy Policy Page ===== */}
                {viewMode === 'privacy' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <header className="flex flex-col gap-4 border-b border-slate-100 pb-8">
                      <div className="flex items-center gap-3 text-[#0055D1] font-black text-[10px] uppercase tracking-[0.2em]">
                        <span className="w-8 h-[2px] bg-[#0055D1] rounded-full" />
                        Privacy Policy
                      </div>
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight">개인정보처리방침</h1>
                      <p className="text-slate-500 font-bold max-w-2xl leading-relaxed">
                        (주)북차카는 이용자의 개인정보를 소중히 보호합니다.
                      </p>
                      <p className="text-xs text-slate-400 font-bold">시행일: 2026년 1월 1일 | 최종 수정: 2026년 1월 1일</p>
                    </header>

                    <div className="space-y-6">
                      {[
                        { icon: <Eye size={20} />, title: '1. 수집하는 개인정보 항목', content: '회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.\n\n• 필수항목: 이메일 주소, 비밀번호, 닉네임\n• 선택항목: 프로필 이미지, 학습 목표 언어\n• 자동수집: 서비스 이용 기록, 접속 로그, 기기 정보' },
                        { icon: <Briefcase size={20} />, title: '2. 개인정보의 수집 및 이용 목적', content: '• 회원 관리: 가입, 본인 확인, 부정 이용 방지\n• 서비스 제공: 콘텐츠 제공, 구매 및 결제, 학습 이력 관리\n• 서비스 개선: 이용 통계 분석, 맞춤형 콘텐츠 추천\n• 고객 지원: 문의 응대, 공지사항 전달' },
                        { icon: <Clock size={20} />, title: '3. 개인정보의 보유 및 이용 기간', content: '회원 탈퇴 시 즉시 파기하며, 관계 법령에 의해 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.\n\n• 계약 또는 청약철회 기록: 5년 (전자상거래법)\n• 대금결제 및 재화 공급 기록: 5년 (전자상거래법)\n• 소비자 불만 또는 분쟁 기록: 3년 (전자상거래법)\n• 접속 기록: 3개월 (통신비밀보호법)' },
                        { icon: <Shield size={20} />, title: '4. 개인정보의 제3자 제공', content: '회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만, 법령에 의해 요구되는 경우는 예외로 합니다.' },
                        { icon: <Lock size={20} />, title: '5. 개인정보 보호 조치', content: '• 개인정보 암호화 (AES-256)\n• SSL/TLS 보안 통신\n• 접근 권한 최소화 및 정기 감사\n• 개인정보 처리 직원 교육 실시' },
                        { icon: <User size={20} />, title: '6. 이용자의 권리', content: '이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있으며, 회원 탈퇴를 통해 개인정보 처리 정지를 요청할 수 있습니다.' },
                      ].map((section, i) => (
                        <div key={i} className="bg-white rounded-[1rem] p-6 border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]">{section.icon}</div>
                            <h3 className="text-lg font-black text-slate-900">{section.title}</h3>
                          </div>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{section.content}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 rounded-[1rem] p-6 border border-dashed border-slate-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Mail size={16} className="text-slate-400" />
                        <span className="text-sm font-black text-slate-700">개인정보 관련 문의</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">개인정보보호책임자: 서정환 | 이메일: privacy@dadoke.com</p>
                    </div>

                    <div className="flex justify-center mt-12">
                      <button onClick={() => setViewMode('market')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95">
                        Back to Market
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== Terms of Service Page ===== */}
                {viewMode === 'terms' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <header className="flex flex-col gap-4 border-b border-slate-100 pb-8">
                      <div className="flex items-center gap-3 text-[#0055D1] font-black text-[10px] uppercase tracking-[0.2em]">
                        <span className="w-8 h-[2px] bg-[#0055D1] rounded-full" />
                        Terms of Service
                      </div>
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight">이용약관</h1>
                      <p className="text-slate-500 font-bold max-w-2xl leading-relaxed">
                        Dadoke 서비스 이용에 관한 약관입니다.
                      </p>
                      <p className="text-xs text-slate-400 font-bold">시행일: 2026년 1월 1일</p>
                    </header>

                    <div className="space-y-6">
                      {[
                        { icon: <FileText size={20} />, title: '제1조 (목적)', content: '이 약관은 (주)북차카(이하 "회사")가 운영하는 Dadoke 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.' },
                        { icon: <CheckCircle size={20} />, title: '제2조 (이용계약의 체결)', content: '① 이용계약은 이용자가 약관의 내용에 동의하고 회원가입 신청을 한 후, 회사가 이를 승낙함으로써 체결됩니다.\n② 회사는 다음 각 호에 해당하는 경우 승낙을 거부할 수 있습니다.\n  • 실명이 아니거나 타인의 명의를 이용한 경우\n  • 허위 정보를 기재한 경우\n  • 기타 회사가 정한 이용 요건을 충족하지 못한 경우' },
                        { icon: <Book size={20} />, title: '제3조 (서비스의 제공)', content: '회사는 다음과 같은 서비스를 제공합니다.\n\n• 전자책(EPUB) 열람 서비스\n• TOPIK AI 학습 서비스\n• 디지털 콘텐츠 마켓플레이스\n• 학습 커뮤니티\n• 기타 회사가 추가 개발하거나 제휴를 통해 제공하는 서비스' },
                        { icon: <ShieldAlert size={20} />, title: '제4조 (이용자의 의무)', content: '이용자는 다음 행위를 하여서는 안 됩니다.\n\n• 타인의 개인정보를 도용하는 행위\n• 서비스에서 얻은 정보를 무단으로 복제, 배포, 상업적으로 이용하는 행위\n• 회사 및 제3자의 저작권 등 지적재산권을 침해하는 행위\n• 회사의 서비스 운영을 방해하는 행위\n• 기타 관계 법령에 위배되는 행위' },
                        { icon: <Shield size={20} />, title: '제5조 (저작권 및 지적재산권)', content: '① 서비스에 게시된 콘텐츠의 저작권은 해당 저작권자에게 귀속됩니다.\n② 이용자는 서비스를 이용하여 얻은 콘텐츠를 저작권자의 사전 승낙 없이 복제, 전송, 배포, 출판 등의 방법으로 이용하거나 제3자에게 제공할 수 없습니다.' },
                        { icon: <XCircle size={20} />, title: '제6조 (서비스 이용 제한)', content: '회사는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고·일시정지·영구정지 등의 단계로 서비스 이용을 제한할 수 있습니다.' },
                        { icon: <HelpCircle size={20} />, title: '제7조 (면책조항)', content: '① 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.\n② 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.' },
                      ].map((section, i) => (
                        <div key={i} className="bg-white rounded-[1rem] p-6 border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]">{section.icon}</div>
                            <h3 className="text-lg font-black text-slate-900">{section.title}</h3>
                          </div>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{section.content}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center mt-12">
                      <button onClick={() => setViewMode('market')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95">
                        Back to Market
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== CS Center Page ===== */}
                {viewMode === 'csCenter' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <header className="flex flex-col gap-4 border-b border-slate-100 pb-8">
                      <div className="flex items-center gap-3 text-[#0055D1] font-black text-[10px] uppercase tracking-[0.2em]">
                        <span className="w-8 h-[2px] bg-[#0055D1] rounded-full" />
                        Customer Service
                      </div>
                      <h1 className="text-4xl font-black text-slate-900 tracking-tight">고객센터</h1>
                      <p className="text-slate-500 font-bold max-w-2xl leading-relaxed">궁금한 점이 있으시면 언제든 문의해 주세요.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-[1rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]"><Phone size={20} /></div>
                          <h3 className="text-lg font-black text-slate-900">전화 문의</h3>
                        </div>
                        <p className="text-2xl font-black text-[#0055D1]">1588-0000</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <Clock size={12} />
                          <span>평일 09:00 - 18:00 (점심 12:00 - 13:00)</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">토·일·공휴일 휴무</p>
                      </div>

                      <div className="bg-white rounded-[1rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]"><Mail size={20} /></div>
                          <h3 className="text-lg font-black text-slate-900">이메일 문의</h3>
                        </div>
                        <p className="text-lg font-black text-[#0055D1]">support@dadoke.com</p>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          이메일 문의는 24시간 접수 가능하며, 영업일 기준 1~2일 이내에 답변드립니다.
                        </p>
                      </div>

                      <div className="bg-white rounded-[1rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]"><MessageCircle size={20} /></div>
                          <h3 className="text-lg font-black text-slate-900">카카오톡 상담</h3>
                        </div>
                        <p className="text-lg font-black text-[#0055D1]">@dadoke</p>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          카카오톡에서 '다도케'를 검색하시면 실시간 채팅 상담이 가능합니다.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <Clock size={12} />
                          <span>평일 09:00 - 18:00</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-[1rem] p-8 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055D1]"><MapPin size={20} /></div>
                          <h3 className="text-lg font-black text-slate-900">오시는 길</h3>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          경기도 고양시 일산동구 일산로 138, 402-5호
                        </p>
                        <p className="text-xs text-slate-400 font-medium">방문 상담은 사전 예약 후 가능합니다.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-xl font-black text-slate-900">자주 묻는 질문</h2>
                      {[
                        { q: '구매한 도서는 어디서 확인하나요?', a: '상단 메뉴의 "내 서재"에서 구매한 모든 도서를 확인하고 읽으실 수 있습니다.' },
                        { q: '환불은 어떻게 하나요?', a: '구매 후 7일 이내, 콘텐츠를 열람하지 않은 경우 전액 환불이 가능합니다. 고객센터로 문의해 주세요.' },
                        { q: 'TOPIK AI는 무료인가요?', a: 'TOPIK AI 기본 기능은 무료로 제공되며, 프리미엄 학습 기능은 구독을 통해 이용하실 수 있습니다.' },
                        { q: '계정 정보를 변경하고 싶어요.', a: '로그인 후 우측 상단 프로필 메뉴에서 계정 설정을 변경하실 수 있습니다.' },
                      ].map((faq, i) => (
                        <div key={i} className="bg-white rounded-[1rem] p-6 border border-slate-100 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-[#0055D1] flex-none mt-0.5">
                              <HelpCircle size={14} />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 mb-2">{faq.q}</h4>
                              <p className="text-sm text-slate-600 font-medium leading-relaxed">{faq.a}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center mt-12">
                      <button onClick={() => setViewMode('market')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95">
                        Back to Market
                      </button>
                    </div>
                  </div>
                )}

                {viewMode === 'viewer' && (
                  <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40">
                    <div className="flex flex-col lg:flex-row gap-8 min-h-screen">
                      {/* Left Sidebar: Chapters (Integrated) */}
                      <div className="w-full lg:w-72 space-y-6">
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">{t('chapters')}</h3>
                          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {chapters.map((ch) => (
                              <button
                                key={ch.id}
                                onClick={() => setCurrentChapter(ch)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all ${currentChapter?.id === ch.id
                                  ? "bg-blue-600 text-white font-bold shadow-lg shadow-blue-100"
                                  : "text-slate-600 hover:bg-slate-50"
                                  }`}
                              >
                                {ch.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Viewer Side: Content */}
                      <div className="flex-1 bg-white rounded-[3rem] border border-slate-50 shadow-2xl p-8 md:p-16 relative overflow-hidden">
                        {/* Decorative reader elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50" />

                        {currentChapter ? (
                          <div className="relative z-10 space-y-12">
                            <header className="border-b-8 border-blue-600 pb-10 mb-16">
                              <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-widest">Webbook Guide</span>
                                <span className="text-slate-300 font-bold">|</span>
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{selectedBook?.title}</span>
                              </div>
                              <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight tracking-tight">
                                {currentChapter.title}
                                <span className="opacity-0 w-0 h-0 overflow-hidden absolute select-all">
                                  {encodeZeroWidth(username)}
                                </span>
                              </h2>
                            </header>

                            <div
                              className="protected-content prose prose-slate max-w-none"
                              style={{
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                MozUserSelect: 'none',
                                msUserSelect: 'none',
                                fontSize: '1.125rem',
                                lineHeight: '2',
                                letterSpacing: '-0.01em',
                                wordBreak: 'keep-all'
                              }}
                              onCopy={(e) => e.preventDefault()}
                              onCut={(e) => e.preventDefault()}
                              onDragStart={(e) => e.preventDefault()}
                            >
                              <ContentRenderer content={currentChapter.content} t={t} />
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-32">
                            <div className="bg-slate-50 p-12 rounded-[3rem] mb-6">
                              <Book size={80} strokeWidth={1} />
                            </div>
                            <p className="text-xl font-bold text-slate-400">도서를 불러오는 중...</p>
                          </div>
                        )}
                      </div>

                      {/* Reader Side: Meta/Index (Optional enhancement) - Removed Reader Status as requested */}
                      <div className="w-full lg:w-80 space-y-6">
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">About the Section</h3>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            본 가이드는 실제 현장에서 사용하는 한국어 전문 지식을 담고 있습니다. 무단 복제 시 법적 책임을 질 수 있습니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Truly Full Width Footer - Outside the 1440px container but inside main for scrolling */}
              <footer className="bg-slate-900 text-white py-16 px-6">
                <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      {siteResources.logo_url ? (
                        <img src={siteResources.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover transform -rotate-6" />
                      ) : (
                        <div className="w-10 h-10 bg-[#0055D1] rounded-xl flex items-center justify-center text-white text-base font-black transform -rotate-6">{(siteResources.service_name || 'Dadoke')[0]}</div>
                      )}
                      <span className="text-2xl font-black tracking-tighter uppercase italic text-white">{siteResources.service_name || 'Dadoke'}</span>
                    </div>
                    <div className="text-xs space-y-2 font-medium opacity-60">
                      <p className="font-bold text-white opacity-100 text-sm">(주)북차카</p>
                      <p>대표이사 : 서정환 | 사업자등록번호 : 128-87-04362</p>
                      <p>주소 : 경기도 고양시 일산동구 일산로 138, 402-5호</p>
                      <p className="pt-4">© 2026 (주)북차카. All rights reserved.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-10 gap-y-4 items-end">
                    <button onClick={() => setViewMode('about')} className="text-xs font-bold opacity-50 hover:opacity-100 transition-all uppercase tracking-widest text-white">About</button>
                    <button onClick={() => setViewMode('privacy')} className="text-xs font-bold opacity-50 hover:opacity-100 transition-all uppercase tracking-widest text-white">Privacy Policy</button>
                    <button onClick={() => setViewMode('terms')} className="text-xs font-bold opacity-50 hover:opacity-100 transition-all uppercase tracking-widest text-white">Terms of Service</button>
                    <button onClick={() => setViewMode('csCenter')} className="text-xs font-bold opacity-50 hover:opacity-100 transition-all uppercase tracking-widest text-white">CS Center</button>
                  </div>
                </div>
              </footer>
            </div>
          </main>
        )
        }
        {
          showAuthModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md relative animate-in zoom-in-95 duration-300">
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                >
                  <Trash2 size={24} className="rotate-45" />
                </button>

                <div className="text-center mb-10">
                  <h2 className="text-2xl font-black text-slate-900">{siteResources.service_name || 'Dadoke'}</h2>
                  <p className="text-slate-500 mt-2 font-medium">{t('auth_subtitle')}</p>
                </div>

                <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${authMode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t('login_tab')}
                  </button>
                  <button
                    onClick={() => { setAuthMode('register'); setAuthError(''); }}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${authMode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t('register_tab')}
                  </button>
                </div>

                <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder={t('username_placeholder')}
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl focus:outline-none transition-all font-medium"
                      required
                    />
                    <input
                      type="password"
                      placeholder={t('password_placeholder')}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl focus:outline-none transition-all font-medium"
                      required
                    />
                    {authMode === 'register' && (
                      <>
                        <input
                          type="text"
                          placeholder={t('name_placeholder')}
                          value={authFullName}
                          onChange={(e) => setAuthFullName(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl focus:outline-none transition-all font-medium"
                          required
                        />
                        <input
                          type="text"
                          placeholder={t('nationality_placeholder')}
                          value={authNationality}
                          onChange={(e) => setAuthNationality(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl focus:outline-none transition-all font-medium"
                          required
                        />
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder={t('email_placeholder')}
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="flex-1 px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl focus:outline-none transition-all font-medium"
                            required
                          />
                          <button
                            type="button"
                            onClick={handleSendVerificationCode}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                          >
                            {t('send_code_button')}
                          </button>
                        </div>
                        {isCodeSent && (
                          <input
                            type="text"
                            placeholder={t('verification_code_placeholder')}
                            value={authVerificationCode}
                            onChange={(e) => setAuthVerificationCode(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl focus:outline-none transition-all font-medium"
                            required
                          />
                        )}
                      </>
                    )}
                  </div>

                  {authError && (
                    <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold text-center animate-shake">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full mt-4 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
                  >
                    {authMode === 'login' ? t('login_button') : t('register_button')}
                  </button>
                </form>
              </div>
            </div>
          )
        }
        {/* ===== Floating Chatbot ===== */}
        {chatOpen && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setChatOpen(false)} />
            <div
              ref={chatBoxRef}
              className={`fixed bottom-24 right-6 bg-white rounded-[0.5rem] shadow-2xl border border-slate-200 flex flex-col z-[9999] overflow-hidden ${chatIsResizing ? '' : 'animate-in slide-in-from-bottom-4 fade-in duration-300'}`}
              style={{ width: `${chatSize.w}px`, height: `${chatSize.h}px` }}
            >
              {/* Resize Handle (top-left corner) */}
              <div
                className="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-10 group"
                onMouseDown={(e) => {
                  e.preventDefault();
                  chatResizing.current = true;
                  setChatIsResizing(true);
                  chatResizeStart.current = { x: e.clientX, y: e.clientY, w: chatSize.w, h: chatSize.h };
                }}
              >
                <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-300 group-hover:border-[#0055D1] rounded-tl-sm transition-colors" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-[#0055D1] text-white rounded-t-[0.5rem]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-sm font-black">
                    {siteResources.logo_url ? <img src={siteResources.logo_url} alt="" className="w-6 h-6 rounded object-cover" /> : (siteResources.service_name || 'D')[0]}
                  </div>
                  <div>
                    <p className="font-black text-sm">{siteResources.service_name || 'Dadoke'} 상담봇</p>
                    <p className="text-[10px] opacity-70 font-medium">무엇이든 물어보세요</p>
                  </div>
                </div>
                <button
                  onClick={() => { setChatMessages([]); setChatInput(''); }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  title="새 대화 시작"
                >
                  <Home size={16} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0 custom-scrollbar bg-slate-50">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0055D1] mb-4">
                      <MessageCircle size={24} />
                    </div>
                    <p className="text-sm font-black text-slate-700 mb-1">안녕하세요! 👋</p>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[240px]">
                      Dadoke 서비스, 도서, 결제, TOPIK AI 등<br />궁금한 점을 자유롭게 물어보세요.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      {['도서 추천해줘', '환불 정책이 뭐야?', 'TOPIK AI 소개'].map(q => (
                        <button
                          key={q}
                          onClick={() => { setChatInput(q); }}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-[#0055D1] transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                      ? 'bg-[#0055D1] text-white rounded-br-md'
                      : 'bg-white text-slate-700 border border-slate-100 shadow-sm rounded-bl-md'
                      }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 bg-white border-t border-slate-100">
                <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#0055D1] focus:bg-white transition-all"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="w-10 h-10 bg-[#0055D1] text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex-none"
                  >
                    <ChevronRight size={18} />
                  </button>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Floating Chat Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center z-[9999] transition-all duration-300 active:scale-90 ${chatOpen
            ? 'bg-slate-700 hover:bg-slate-800 rotate-0'
            : 'bg-[#0055D1] hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-200'
            }`}
        >
          {chatOpen ? (
            <XCircle size={24} className="text-white" />
          ) : siteResources.chatbot_icon_url ? (
            <img src={siteResources.chatbot_icon_url} alt="Chat" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <MessageCircle size={24} className="text-white" />
          )}
        </button>

        <Watermark text={username} />
      </div >
    </div >
  );
}

export default App;
