import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    async def get_feedback(self, context: str, user_input: str):
        """
        교재의 문맥(context)과 사용자의 입력(user_input)을 바탕으로 첨삭 및 풀이를 제공합니다.
        """
        if not self.client:
            return "GEMINI_API_KEY가 설정되지 않았습니다."

        prompt = f"""
당신은 전문 교육 컨설턴트이자 학습 도우미입니다. 
다음 [교재 문맥]을 바탕으로 사용자가 작성한 [학습 답변]을 검토하고 피드백을 주세요.

[교재 문맥]:
{context}

[학습 답변]:
{user_input}

요구사항:
1. 답변이 교재의 내용과 일치하는지 확인하세요.
2. 문법적 오류가 있다면 수정해주세요.
3. 더 나은 표현이나 심화 학습을 위한 힌트를 제공하세요.
4. 친절하고 격려하는 말투로 작성하세요.

피드백:
"""
        try:
            response = await self.client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"AI 피드백 생성 중 오류 발생: {str(e)}"
