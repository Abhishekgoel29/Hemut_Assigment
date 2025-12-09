export interface Question {
  question_id: number;
  message: string;
  status: 'Pending' | 'Escalated' | 'Answered';
  timestamp: string;
  answer?: string;
  answered_by?: string;
}

export interface User {
  user_id: number;
  username: string;
  email: string;
  is_admin: number;
}