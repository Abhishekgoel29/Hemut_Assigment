import random

MOCK_RESPONSES = [
    "Based on common knowledge, this is a helpful response to your question.",
    "Here's a suggested answer that addresses the key points of your question.",
    "This is a generated response that provides relevant information.",
    "Consider this perspective on your question for a comprehensive answer.",
]

class MockRAGSystem:
    # def suggest_answer(self, question: str) -> str:
    #     """Generate mock suggested answer"""
    #     return f"{random.choice(MOCK_RESPONSES)} Your question was: '{question[:50]}...'"
    
    # def simple_suggest(self, question: str) -> str:
    #     return self.suggest_answer(question)
    
    def __init__(self):
        self.vectorstore = True  # or None if you want fallback
    def suggest_answer(self, question: str):
        return f"Mock answer for: {question}"
    def simple_suggest(self, question: str):
        return f"Simple mock answer for: {question}"

mock_rag_system = MockRAGSystem()