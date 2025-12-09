### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `GET /api/me` - Get current user (requires auth)

### Questions
- `POST /api/questions` - Submit new question
- `GET /api/questions` - Get all questions
- `PATCH /api/questions/{id}` - Update question (admin only)

### WebSocket
- `WS /ws` - Real-time question updates




Backend (FastAPI):
* ✅ User authentication (register/login) with JWT
* ✅ SQLAlchemy database models (Users, Questions)
* ✅ REST API endpoints for all operations
* ✅ WebSocket support for real-time updates
* ✅ Webhook integration for notifications
* ✅ Admin vs Guest permissions
* ✅ Form validation
* ✅ Added Rag longchain for auto suggestion

Frontend (Next.js):
* ✅ 3 pages: Login, Register, Dashboard
* ✅ Real-time question updates via WebSocket
* ✅ Guest access (can view/post/answer)
* ✅ Admin features (mark answered, escalate)
* ✅ Client-side form validation
* ✅ Responsive Tailwind CSS design






5. **Run the backend:**
```bash
cd app
python main.py
```
Or using uvicorn:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000




### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create .env.local file:**
```bash
cp .env.example .env.local
# Edit .env.local with your settings
```

4. **Run the development server:**
```bash
npm run dev
```

Frontend will be available at: `http://localhost:3000`






## Testing the Application

1. **Register a new admin user:**
   - Go to `http://localhost:3000/register`
   - Create an account (all users are admins by default)

2. **Login:**
   - Go to `http://localhost:3000/login`
   - Login with your credentials

3. **Test as guest:**
   - Click "Continue as Guest" from login page
   - Guests can view, post, and answer questions
   - Guests cannot mark questions as answered or escalate

4. **Test real-time updates:**
    Go to `http://localhost:3000/dashboard`
   - Open dashboard in two browser windows
   - Submit a question in one window
   - See it appear instantly in the other window
