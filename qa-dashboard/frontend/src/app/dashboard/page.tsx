'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Question } from '@/types';

export default function DashboardPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [answer, setAnswer] = useState<{ [key: number]: string }>({});
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{ [key: number]: string }>({});
  const [loadingSuggestion, setLoadingSuggestion] = useState<{ [key: number]: boolean }>({});
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    const adminStatus = localStorage.getItem('is_admin');

    setIsAdmin(adminStatus === '1');
    setUsername(storedUsername);

    loadQuestions();
    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_question') {
        setQuestions((prev) => [data.data, ...prev]);
      } else if (data.type === 'question_updated') {
        setQuestions((prev) =>
          prev.map((q) => (q.question_id === data.data.question_id ? data.data : q))
        );
      }
    };

    wsRef.current = ws;
  };

  const handleGetAISuggestion = async (questionId: number, questionText: string) => {
    if (!username) return;
    setLoadingSuggestion((prev) => ({ ...prev, [questionId]: true }));

    try {
      const response = await api.get(`/api/questions/${questionId}/suggest`);
      setAiSuggestions((prev) => ({
        ...prev,
        [questionId]: response.data.suggested_answer,
      }));
    } catch {
      console.error('Failed to get AI suggestion');
    } finally {
      setLoadingSuggestion((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleUseAISuggestion = (questionId: number) => {
    if (!username) return;
    const suggestion = aiSuggestions[questionId];
    if (suggestion) {
      setAnswer((prev) => ({ ...prev, [questionId]: suggestion }));
    }
  };

  const loadQuestions = async () => {
    try {
      const response = await api.get('/api/questions');
      setQuestions(response.data);
    } catch {
      console.error('Failed to load questions');
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newQuestion.trim()) {
      setError('Question cannot be empty');
      return;
    }

    try {
      await api.post('/api/questions', { message: newQuestion });
      setNewQuestion('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit question');
    }
  };

  const handleStatusChange = async (questionId: number, status: string) => {
    try {
      await api.patch(`/api/questions/${questionId}`, { status });
    } catch {
      console.error('Failed to update status');
    }
  };

  const handleSubmitAnswer = async (questionId: number) => {
    if (!username) return;
    const answerText = answer[questionId];
    if (!answerText?.trim()) return;

    try {
      await api.patch(`/api/questions/${questionId}`, {
        answer: answerText,
        status: 'Answered',
      });
      setAnswer((prev) => ({ ...prev, [questionId]: '' }));
    } catch {
      console.error('Failed to submit answer');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    router.push('/login');
  };

  const sortQuestions = (a: Question, b: Question) => {
    if (a.status === 'Escalated' && b.status !== 'Escalated') return -1;
    if (a.status !== 'Escalated' && b.status === 'Escalated') return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  };

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Hemut Q&A Dashboard</h1>
        <div>
          {username ? (
            <div className="flex items-center space-x-4">
              <span>
                {username} {isAdmin && <span>(Admin)</span>}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
            >
              Login
            </button>
          )}
        </div>
      </header>

      <section className="mb-6">
        <form onSubmit={handleSubmitQuestion} className="flex space-x-2">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Type your question here..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            Submit
          </button>
        </form>
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </section>

      <section className="space-y-4">
        {[...questions].sort(sortQuestions).map((q) => (
          <div key={q.question_id} className="p-4 border rounded space-y-2">
            <p>{q.message}</p>
            <p className="text-gray-500 text-sm">
              {new Date(q.timestamp).toLocaleString()}
            </p>
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${
                q.status === 'Answered'
                  ? 'bg-green-100 text-green-800'
                  : q.status === 'Escalated'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {q.status}
            </span>

            {q.answer && (
              <div className="mt-2">
                <p>
                  <strong>Answer:</strong> {q.answer}{' '}
                  {q.answered_by && <span>- {q.answered_by}</span>}
                </p>
              </div>
            )}

            {q.status !== 'Answered' && (
              <div className="flex flex-col space-y-2 mt-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={answer[q.question_id] || ''}
                    onChange={(e) =>
                      setAnswer({ ...answer, [q.question_id]: e.target.value })
                    }
                    placeholder="Type your answer..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    disabled={!username}
                  />
                  <button
                    onClick={() => handleSubmitAnswer(q.question_id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
                    disabled={!username}
                  >
                    Answer
                  </button>
                </div>

                {!username && (
                  <p className="text-sm text-red-600">
                    You must be logged in to answer questions.
                  </p>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleGetAISuggestion(q.question_id, q.message)}
                    disabled={!username || loadingSuggestion[q.question_id]}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm disabled:opacity-50"
                  >
                    {loadingSuggestion[q.question_id] ? '🤖 Generating...' : '🤖 AI Suggest'}
                  </button>

                  {aiSuggestions[q.question_id] && (
                    <button
                      onClick={() => handleUseAISuggestion(q.question_id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
                      disabled={!username}
                    >
                      Use Suggestion
                    </button>
                  )}
                </div>

                {aiSuggestions[q.question_id] && (
                  <p className="text-gray-700">
                    🤖 AI Suggested Answer: {aiSuggestions[q.question_id]}
                  </p>
                )}

                {isAdmin && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusChange(q.question_id, 'Escalated')}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                    >
                      Escalate
                    </button>
                    <button
                      onClick={() => handleStatusChange(q.question_id, 'Answered')}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                    >
                      Mark Answered
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
