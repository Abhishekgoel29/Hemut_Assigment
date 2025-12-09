from langchain_openai import OpenAI, OpenAIEmbeddings
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.vectorstores import FAISS
from langchain.text_splitter import CharacterTextSplitter
from langchain.docstore.document import Document
import os

from typing import List, Optional

# Initialize OpenAI
openai_api_key = os.getenv("OPENAI_API_KEY")

# Knowledge base for RAG (you can expand this)
KNOWLEDGE_BASE = """
Q&A Dashboard Help:
- To submit a question, use the form at the top of the dashboard
- Questions can have three statuses: Pending, Escalated, or Answered
- Admins can mark questions as answered or escalate them
- All users can view and answer questions
- Real-time updates are provided via WebSocket

Common Technical Questions:
- Python is a high-level programming language known for simplicity
- FastAPI is a modern web framework for building APIs with Python
- Next.js is a React framework for building web applications
- WebSockets enable real-time bidirectional communication
- REST APIs use HTTP methods like GET, POST, PATCH, DELETE

Troubleshooting:
- If questions don't appear, check your internet connection
- Admins need to be logged in to access admin features
- Refresh the page if real-time updates stop working
"""

class RAGSystem:
    def __init__(self):
        self.llm = None
        self.vectorstore = None
        self.qa_chain = None
        self._initialize()
    
    def _initialize(self):
        """Initialize RAG system with knowledge base"""
        try:
            if not openai_api_key:
                print("Warning: OPENAI_API_KEY not set. RAG features disabled.")
                return
            
            # Initialize LLM
            self.llm = OpenAI(
                temperature=0.7,
                openai_api_key=openai_api_key,
                max_tokens=200
            )
            
            # Create documents from knowledge base
            text_splitter = CharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50
            )
            texts = text_splitter.split_text(KNOWLEDGE_BASE)
            docs = [Document(page_content=t) for t in texts]
            
            # Create vector store
            embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)
            self.vectorstore = FAISS.from_documents(docs, embeddings)
            
            # Create QA chain
            prompt_template = """You are a helpful assistant for a Q&A dashboard application.
Use the following context to answer the question. If you cannot answer based on the context,
provide a general helpful response.

Context: {context}

Question: {question}

Answer (be concise and helpful):"""
            
            prompt = PromptTemplate(
                template=prompt_template,
                input_variables=["context", "question"]
            )
            
            self.qa_chain = LLMChain(llm=self.llm, prompt=prompt)
            
            print("RAG system initialized successfully!")
            
        except Exception as e:
            print(f"Error initializing RAG system: {e}")
            self.llm = None
    
    def suggest_answer(self, question: str) -> Optional[str]:
        """Generate suggested answer using RAG"""
        if not self.llm or not self.vectorstore:
            return None
        
        try:
            # Retrieve relevant context
            docs = self.vectorstore.similarity_search(question, k=2)
            context = "\n".join([doc.page_content for doc in docs])
            
            # Generate answer
            answer = self.qa_chain.run(context=context, question=question)
            return answer.strip()
            
        except Exception as e:
            print(f"Error generating answer: {e}")
            return None
    
    def simple_suggest(self, question: str) -> Optional[str]:
        """Simple suggestion without RAG (fallback)"""
        if not self.llm:
            return None
        
        try:
            prompt = f"Provide a brief, helpful answer to this question: {question}"
            answer = self.llm(prompt)
            return answer.strip()
        except Exception as e:
            print(f"Error in simple suggest: {e}")
            return None

# Initialize RAG system
rag_system = RAGSystem()