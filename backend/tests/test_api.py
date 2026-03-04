import requests
import re

r = requests.post('http://localhost:8000/upload', files={
    'file': open('storage/따라오게, 신입! 김반장의 실전 팩토리 한국어 - 김반장.epub', 'rb')
})
data = r.json()
ch = data['chapters'][2]  # chapter1

# Find the S2. 실전 활동 section
content = ch['content']
s2_idx = content.find('S2. 실전 활동')
if s2_idx == -1:
    print("S2. 실전 활동 section not found")
else:
    # Get content from S2. 실전 활동 to next h2 or end
    next_h2 = content.find('<h2', s2_idx + 10)
    if next_h2 == -1:
        next_h2 = len(content)
    
    s2_content = content[s2_idx:s2_idx+3000]
    print("=== S2. 실전 활동 SECTION ===")
    print(s2_content)
