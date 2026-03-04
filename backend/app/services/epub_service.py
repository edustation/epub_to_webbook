import sys
import os
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup, NavigableString, Tag
import uuid
import base64
import re
import json
import logging

logger = logging.getLogger("dadoke-epub-service")

# Increase recursion limit for deep HTML structures in large EPUBs
sys.setrecursionlimit(5000)

def html_to_ast(element) -> list:
    """
    BeautifulSoup 요소를 React에서 사용할 수 있는 JSON AST로 변환합니다.
    반환 형식: [{ type: 'tag', props: {...}, children: [...] }, ...]
    """
    result = []
    
    if element is None:
        return result
    
    for child in element.children:
        if isinstance(child, NavigableString):
            # 텍스트 노드
            text = str(child)
            if text.strip():  # 빈 텍스트 무시
                result.append({
                    "type": "text",
                    "content": text
                })
        elif isinstance(child, Tag):
            # 태그 노드
            node = {
                "type": child.name,
                "props": {},
                "children": []
            }
            
            # 속성 변환
            # CSS 선택자나 접근성을 위해 필요한 주요 속성들을 보존
            preserved_attrs = ['id', 'src', 'href', 'width', 'height', 'alt', 'title', 'type', 'colspan', 'rowspan']
            for attr, value in child.attrs.items():
                if attr == "class":
                    if isinstance(value, list):
                        node["props"]["className"] = " ".join(value)
                    else:
                        node["props"]["className"] = value
                elif attr == "style":
                    node["props"]["style"] = value
                elif attr.startswith("data-"):
                    node["props"][attr] = value
                elif attr in preserved_attrs:
                    # camelCase 변환이 필요한 속성들
                    if attr == 'colspan': node["props"]['colSpan'] = value
                    elif attr == 'rowspan': node["props"]['rowSpan'] = value
                    else: node["props"][attr] = value
                else:
                    # 기타 속성도 최대한 camelCase로 변환하여 유지
                    camel_attr = attr
                    if "-" in attr:
                        parts = attr.split("-")
                        camel_attr = parts[0] + "".join(p.capitalize() for p in parts[1:])
                    node["props"][camel_attr] = value
            
            # 자식 요소 재귀 처리
            node["children"] = html_to_ast(child)
            
            result.append(node)
    
    return result

class EpubService:
    @staticmethod
    def _scope_css(css_text: str, scope_class: str = ".epub-scope") -> str:
        """
        CSS 셀렉터 앞에 scope_class를 추가하여 스타일 유출을 방지합니다.
        @media 등의 중첩 규칙을 재귀적으로 처리합니다.
        """
        if not css_text:
            return ""
        
        # 1. 주석 제거
        css_text = re.sub(r'/\*.*?\*/', '', css_text, flags=re.DOTALL)
        
        def process_rules(text):
            result = []
            start = 0
            while True:
                open_brace = text.find('{', start)
                if open_brace == -1:
                    break
                
                selector_part = text[start:open_brace].strip()
                # matching close brace 찾기
                level = 1
                curr = open_brace + 1
                while level > 0 and curr < len(text):
                    if text[curr] == '{': level += 1
                    elif text[curr] == '}': level -= 1
                    curr += 1
                
                block_part = text[open_brace+1 : curr-1]
                
                if selector_part:
                    is_at_rule = selector_part.startswith('@')
                    
                    if is_at_rule:
                        if selector_part.lower().startswith(('@media', '@supports')):
                            inner_scoped = process_rules(block_part)
                            result.append(f"{selector_part} {{ {inner_scoped} }}")
                        else:
                            result.append(f"{selector_part} {{ {block_part} }}")
                    else:
                        selectors = selector_part.split(',')
                        scoped_selectors = []
                        for s in selectors:
                            s = s.strip()
                            if not s: continue
                            
                            if s in ['html', 'body', ':root']:
                                scoped_selectors.append(scope_class)
                            elif s.startswith(scope_class):
                                # Already scoped, don't scope again
                                scoped_selectors.append(s)
                            elif s.startswith(('body.', 'html.', 'body#', 'html#')):
                                scoped_selectors.append(s.replace('body', scope_class).replace('html', scope_class))
                            else:
                                scoped_selectors.append(f"{scope_class} {s}")
                        
                        result.append(f"{', '.join(scoped_selectors)} {{ {block_part} }}")
                
                start = curr
            
            return "\n".join(result)

        return process_rules(css_text)

    @staticmethod
    def parse_epub(file_path: str, filename: str = None):
        """
        EPUB 파일을 파싱하여 챕터별 구조화된 데이터를 반환합니다.
        ebooklib이 구조적 문제(누락된 리소스 등)로 실패할 경우 ZipFile 기반 폴백을 사용합니다.
        """
        logger.info(f"Starting to parse EPUB: {file_path}")
        try:
            book = epub.read_epub(file_path)
            # Normal ebooklib-based parsing
            return EpubService._parse_epub_with_ebooklib(book, file_path, filename)
        except Exception as e:
            logger.warning(f"ebooklib failed, attempting resilient parsing for {file_path}: {e}")
            return EpubService._parse_epub_resilient(file_path, filename)

    @staticmethod
    def _parse_epub_with_ebooklib(book, file_path, filename):
        chapters = []
        if not filename:
            filename = os.path.basename(file_path)
        
        styles = []
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_STYLE:
                styles.append(item.get_content().decode('utf-8'))
        combined_css = "\n".join(styles)

        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                content = item.get_content().decode('utf-8')
                chapter_data = EpubService._parse_chapter_content(content, item.get_id(), item.get_name(), combined_css)
                chapters.append(chapter_data)
        
        book_title = book.get_metadata('DC', 'title') or [[filename]]
        book_title = book_title[0][0]
        
        return {"title": book_title, "chapters": chapters}

    @staticmethod
    def _parse_epub_resilient(file_path, filename):
        """ZipFile을 직접 사용하여 EPUB 내용을 추출하는 폴백 로직"""
        import zipfile
        from lxml import etree
        
        chapters = []
        if not filename:
            filename = os.path.basename(file_path)
            
        with zipfile.ZipFile(file_path, 'r') as z:
            # 1. content.opf 찾기
            try:
                container = z.read('META-INF/container.xml')
                root = etree.fromstring(container)
                opf_path = root.xpath('//ns:rootfile/@full-path', namespaces={'ns': 'urn:oasis:names:tc:opendocument:xmlns:container'})[0]
            except:
                # 폴백: 일반적인 경로 시도
                opf_path = 'OEBPS/content.opf' if 'OEBPS/content.opf' in z.namelist() else None
                if not opf_path:
                    # 모든 .opf 파일 탐색
                    for name in z.namelist():
                        if name.endswith('.opf'):
                            opf_path = name
                            break
            
            if not opf_path:
                raise Exception("Could not find content.opf in EPUB")

            opf_content = z.read(opf_path)
            opf_root = etree.fromstring(opf_content)
            ns = {'dc': 'http://purl.org/dc/elements/1.1/', 'opf': 'http://www.idpf.org/2007/opf'}
            
            # 제목 추출
            book_title = opf_root.xpath('//dc:title/text()', namespaces=ns)
            book_title = book_title[0] if book_title else filename
            
            # CSS 수집
            css_items = opf_root.xpath('//opf:item[@media-type="text/css"]/@href', namespaces=ns)
            opf_dir = os.path.dirname(opf_path)
            combined_css = ""
            for css_href in css_items:
                css_full_path = os.path.join(opf_dir, css_href).replace('\\', '/')
                if css_full_path in z.namelist():
                    combined_css += z.read(css_full_path).decode('utf-8') + "\n"

            # Spine을 따라 챕터 로딩
            item_map = {item.get('id'): item.get('href') for item in opf_root.xpath('//opf:item', namespaces=ns)}
            spine_ids = opf_root.xpath('//opf:itemref/@idref', namespaces=ns)
            
            for item_id in spine_ids:
                href = item_map.get(item_id)
                if not href: continue
                
                doc_path = os.path.join(opf_dir, href).replace('\\', '/')
                if doc_path in z.namelist() and (doc_path.endswith('.xhtml') or doc_path.endswith('.html')):
                    content = z.read(doc_path).decode('utf-8')
                    chapter_data = EpubService._parse_chapter_content(content, item_id, doc_path, combined_css)
                    chapters.append(chapter_data)
                    
        return {"title": book_title, "chapters": chapters}

    @staticmethod
    def _parse_chapter_content(content, chapter_id, chapter_name, combined_css):
        soup = BeautifulSoup(content, 'html.parser')
        
        # 이미지/SVG src 및 href 변환 (EPUB 내부 경로 기준)
        opf_dir = os.path.dirname(chapter_name)
        
        # 1. img 태그 처리
        for img in soup.find_all('img'):
            src = img.get('src', '')
            if src and not src.startswith(('http://', 'https://', 'data:')):
                # 상대 경로를 표준화된 절대 경로(EPUB 내부 기준)로 변경
                # e.g. OEBPS/xhtml/ch1.xhtml + ../images/img1.jpg -> OEBPS/images/img1.jpg
                full_internal_path = os.path.normpath(os.path.join(opf_dir, src)).replace('\\', '/')
                img['src'] = f"/image/{full_internal_path}"
        
        # 2. SVG image 태그 처리 (xlink:href, href)
        for svg_img in soup.find_all('image'):
            href = svg_img.get('xlink:href') or svg_img.get('href', '')
            if href and not href.startswith(('http://', 'https://', 'data:')):
                full_internal_href = os.path.normpath(os.path.join(opf_dir, href)).replace('\\', '/')
                new_url = f"/image/{full_internal_href}"
                if svg_img.get('xlink:href'):
                    svg_img['xlink:href'] = new_url
                else:
                    svg_img['href'] = new_url
        
        # 인터랙티브 요소 및 가공
        for p in soup.find_all(['p', 'div', 'table', 'h1', 'h2', 'h3']):
            if not p.get('id'):
                p['id'] = f"content-{uuid.uuid4().hex[:8]}"
            if 'question' in p.get('class', []) or 'exercise' in p.get('class', []):
                p['data-interactive'] = 'true'
        
        # 정답 추출 및 빈칸 변환 (기존 로직 유지)
        EpubService._process_interactive_elements(soup)
        
        # 1. 기존의 모든 style 태그들 스코핑 처리 (Leakage 방지 핵심)
        for style_tag in soup.find_all('style'):
            if style_tag.string:
                style_tag.string = EpubService._scope_css(style_tag.string)
        
        # 2. 외부 결합 CSS 삽입 및 스코핑
        if combined_css and soup.body:
            scoped_css = EpubService._scope_css(combined_css)
            # 중복 삽입 방지 (이미 첫 부분에 삽입되었는지 확인)
            style_node = soup.new_tag('style')
            style_node.string = scoped_css
            soup.body.insert(0, style_node)

        # 제목 추출
        title = None
        if soup.title and soup.title.string: title = soup.title.string.strip()
        if not title:
            for heading_tag in ['h1', 'h2', 'h3']:
                heading = soup.find(heading_tag)
                if heading and heading.get_text(strip=True):
                    title = heading.get_text(strip=True)
                    break
        if not title:
            title = os.path.splitext(chapter_name.split('/')[-1])[0]
        
        return {
            "id": chapter_id,
            "title": title,
            "content": html_to_ast(soup.body) if soup.body else [],
            "html": str(soup.body) if soup.body else str(soup)
        }

    @staticmethod
    def _process_interactive_elements(soup):
        # 기존 parse_epub 로직에서 interactive 처리 부분을 별도 메서드로 추출하여 재사용
        answers = []
        for tip in soup.find_all(['div', 'p']):
            text = tip.get_text()
            if '정답:' in text or '정답 :' in text:
                match = re.search(r'정답\s*:\s*(.+)', text)
                if match:
                    answer_text = match.group(1).strip()
                    answers.extend([a.strip() for a in answer_text.split(',')])
                tip['style'] = 'display: none !important;'
                tip['class'] = tip.get('class', []) + ['hidden-answer']

        activity_index = 0
        for text_node in soup.find_all(string=re.compile(r'_{3,}')):
            parent = text_node.parent
            if parent:
                blanks = list(re.finditer(r'_{3,}', str(text_node)))
                if blanks:
                    new_html = str(text_node)
                    for blank in reversed(blanks):
                        answer = answers[activity_index] if activity_index < len(answers) else ""
                        activity_id = f"activity-{uuid.uuid4().hex[:8]}"
                        replacement = f'<span class="activity-blank" data-activity-id="{activity_id}" data-answer="{answer}"></span>'
                        new_html = new_html[:blank.start()] + replacement + new_html[blank.end():]
                        activity_index += 1
                    fragment = BeautifulSoup(new_html, 'html.parser')
                    replacement_content = list(fragment.body.children) if fragment.body else list(fragment.children)
                    if replacement_content: text_node.replace_with(*replacement_content)

        for u_tag in soup.find_all('u'):
            text_content = u_tag.get_text(strip=True)
            if not text_content or re.match(r'^[\s_]+$', text_content):
                answer = answers[activity_index] if activity_index < len(answers) else ""
                activity_id = f"activity-{uuid.uuid4().hex[:8]}"
                new_span = soup.new_tag('span')
                new_span['class'] = 'activity-blank'
                new_span['data-activity-id'] = activity_id
                new_span['data-answer'] = answer
                u_tag.replace_with(new_span)
                activity_index += 1

        for blank_span in soup.find_all('span', class_='blank'):
            answer = answers[activity_index] if activity_index < len(answers) else ""
            blank_span['class'] = 'activity-blank'
            blank_span['data-activity-id'] = f"activity-{uuid.uuid4().hex[:8]}"
            blank_span['data-answer'] = answer
            blank_span.string = ''
            activity_index += 1

    @staticmethod
    def get_image(file_path: str, image_path: str):
        """
        EPUB 파일에서 이미지를 추출하여 바이트로 반환합니다.
        Resilient attempt using ZipFile if ebooklib fails.
        """
        try:
            book = epub.read_epub(file_path)
            return EpubService._extract_image_from_book(book, image_path)
        except Exception as e:
            logger.debug(f"get_image failed with ebooklib, using resilient fallback for {image_path}")
            import zipfile
            with zipfile.ZipFile(file_path, 'r') as z:
                # 1. Try exact path
                if image_path in z.namelist():
                    content = z.read(image_path)
                    return content, EpubService._guess_media_type(image_path)
                
                # 2. Try prefix (like OEBPS/)
                for name in z.namelist():
                    if name.endswith(image_path):
                        return z.read(name), EpubService._guess_media_type(name)
                
                # 3. Try filename only
                requested_filename = image_path.split('/')[-1].lower()
                for name in z.namelist():
                    if name.split('/')[-1].lower() == requested_filename:
                        return z.read(name), EpubService._guess_media_type(name)
        return None, None

    @staticmethod
    def _extract_image_from_book(book, image_path):
        requested_filename = image_path.split('/')[-1].lower()
        for item in book.get_items():
            if item.get_type() in (ebooklib.ITEM_IMAGE, ebooklib.ITEM_COVER):
                item_name = item.get_name()
                if (item_name == image_path or 
                    item_name.endswith('/' + image_path) or 
                    item_name.endswith(image_path) or
                    item_name.split('/')[-1].lower() == requested_filename):
                    return item.get_content(), item.media_type
        return None, None

    @staticmethod
    def _guess_media_type(filename):
        ext = filename.split('.')[-1].lower()
        if ext in ('jpg', 'jpeg'): return 'image/jpeg'
        if ext == 'png': return 'image/png'
        if ext == 'gif': return 'image/gif'
        if ext == 'svg': return 'image/svg+xml'
        return 'application/octet-stream'

    @staticmethod
    def get_chapter_content(file_path: str, chapter_id: str):
        """
        특정 챕터의 가공된 HTML 콘텐츠를 반환합니다.
        """
        try:
            book = epub.read_epub(file_path)
            item = book.get_item_with_id(chapter_id)
            if not item: return None
            content = item.get_content().decode('utf-8')
        except:
            # Resilient fallback: parse again to get chapters list and find by id
            info = EpubService.parse_epub(file_path)
            for ch in info['chapters']:
                if ch['id'] == chapter_id:
                    return ch['html']
            return None
            
        soup = BeautifulSoup(content, 'html.parser')
        return str(soup.body) if soup.body else str(soup)

    @staticmethod
    def get_all_images(file_path: str) -> dict:
        """
        EPUB 파일에서 모든 이미지를 추출하여 딕셔너리로 반환합니다.
        """
        images = {}
        try:
            book = epub.read_epub(file_path)
            for item in book.get_items():
                if item.get_type() in (ebooklib.ITEM_IMAGE, ebooklib.ITEM_COVER):
                    images[item.get_name()] = item.get_content()
        except:
            import zipfile
            with zipfile.ZipFile(file_path, 'r') as z:
                for name in z.namelist():
                    if any(name.lower().endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.gif', '.svg')):
                        images[name] = z.read(name)
        
        return images
