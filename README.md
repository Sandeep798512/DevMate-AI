# DevMate AI 🤖

> A state-of-the-art AI-powered developer assistant featuring JWT authentication, persistent chat memory, multi-tool AI panels, file upload analysis, GitHub repository scanning, and ChatGPT-style progressive typewriter answers.

![DevMate AI](https://img.shields.io/badge/DevMate-AI-6366f1?style=for-the-badge&logo=openai&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-API-8E75C2?style=for-the-badge&logo=google-gemini&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## ✨ Features

| Feature | Description |
| :--- | :--- |
| 💬 **Ask AI** | Chat about complex algorithms, programming constructs, or design patterns. |
| 🔐 **Secure Authentication** | Full JWT signup & login flows with **Email Verification via OTP** (Gmail App password integration) and Guest session bypass. |
| 🧠 **Real Conversation Memory** | Maintaining full historical chat turn memory dynamically structured to strictly alternate `user` and `model` role contexts. |
| 📌 **Chat Pinning** | Keep your crucial developer workflows pinned to the top of the sidebar under the Pinned header. |
| 🔗 **Share Chat** | Generate shareable links to chat transcripts, rendering beautiful, read-only static conversations with a unique code. |
| ✍️ **Typewriter animation** | Responses render progressively character-by-character for a native chat feel. |
| 📖 **Explain Code** | Instant step-by-step structural explanation of code snippets. |
| 🐛 **Detect Bugs** | Comprehensive scanning for logical flaws, type safety, memory leaks, and vulnerabilities. |
| ⚡ **Optimize Code** | Refactor code to maximize time/space complexity with detailed time complexity metrics. |
| ✅ **Code Review** | High-fidelity reviews checking for modularity, readability, performance, security, and document coverage. |
| 📚 **README Generator** | Instantly generates highly professional, developer-grade Markdown readmes for your codebases. |
| 🔗 **GitHub Analysis** | Enter any public repository link to parse structure, index files, and review code quality. |
| 📁 **File Upload** | Upload and analyze JS, TS, Python, Java, C++, HTML, CSS, JSON, Markdown, PDFs, Images, and more. |
| 🎙️ **Voice I/O** | Speech Recognition (Speech-to-Text) voice inputs coupled with Synthesized (Text-to-Speech) read-aloud features. |
| 🌙 **Theme Engine** | Responsive Dark and Light themes persisting state locally. |

---

## 🛠️ Tech Stack

### Frontend
- **Vanilla HTML5 & CSS3** — Flexbox layout, CSS variables, glassmorphic auth elements, and custom scrollbars.
- **Vanilla JavaScript (ES2022)** — Dynamic DOM rendering, asynchronous API interactions, session caching, and browser audio capture.
- **Marked.js** — Markdown content parser.
- **Highlight.js** — Rich syntax highlighting with custom copy buttons.
- **Web Speech API** — Native voice inputs and TTS synthesis.

### Backend
- **Node.js & Express.js** — Asynchronous REST API routing, CORS handling, and static file mapping.
- **MongoDB Atlas & Mongoose** — Secure database clusters saving persistent User records, OTP sessions, Chat threads, and Messages.
- **Google Gemini API (SDK)** — Powers the intelligence panel with advanced code generation.
- **JSON Web Tokens (JWT)** — Token authorizations utilizing Access & Refresh key verification cycles.
- **Nodemailer** — Verification email pipeline using secure SMTP configurations.
- **Multer** — Safe upload handling mapped outside the runtime directories to avoid server reload loops.

---

## 📂 Folder Structure

```
devmate-ai/
├── backend/
│   ├── config/
│   │   └── db.js               # MongoDB Mongoose database connection
│   ├── middleware/
│   │   ├── auth.js             # JWT verification, session checking
│   │   ├── errorHandler.js     # Centralized error handler
│   │   └── validate.js         # Input validation rules
│   ├── models/
│   │   ├── Chat.js             # Chat session database model (isPinned schema)
│   │   ├── OTP.js              # OTP signup verification codes
│   │   └── User.js             # User accounts schema (encrypted password, verify flags)
│   ├── routes/
│   │   ├── ai.js               # Core Gemini query processing
│   │   ├── auth.js             # Login, signup, verification, refresh, guest routes
│   │   ├── chats.js            # Chat creation, updates, deletes, shares
│   │   └── upload.js           # Multer file parsing middleware
│   ├── utils/
│   │   ├── aiService.js        # Gemini API configurations & history context templates
│   │   └── contextManager.js   # Local file contextualizers & GitHub analyzer
│   ├── .env.example
│   ├── package.json
│   └── server.js               # App entrypoint
│
├── frontend/
│   ├── css/
│   │   └── auth.css            # Auth screen styling (glassmorphic layout)
│   ├── js/
│   │   ├── auth.js             # Core session manager & silent refresh handler
│   │   ├── forgot.js           # Password reset OTP handler
│   │   ├── login.js            # User login and guest routing
│   │   └── signup.js           # Signup submission validation
│   ├── index.html              # Main workspace workspace dashboard
│   ├── share.html              # Public static conversation viewer
│   ├── style.css               # Main application design system
│   └── script.js               # Main workspace interaction script
│
└── README.md
```

---

## 🚀 Installation & Local Setup

### Prerequisites
- **Node.js** v18.x or higher
- **npm** (Node Package Manager)
- A **MongoDB Atlas** database cluster
- A **Google Gemini API Key**

### 1. Set Up Backend Env Variables
Navigate to the `/backend` folder and create a `.env` file from the example:
```bash
cd backend
cp .env.example .env
```
Fill out the variables:
```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
PORT=3000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5500
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 2. Boot Backend Server
Install backend dependencies and run Nodemon:
```bash
npm install
npm run dev
```
You should see:
```
🚀 DevMate AI v3.1 — http://localhost:3000
   AI    : ✅ Gemini
   DB    : ✅ MongoDB
   Email : ✅ Gmail
   Auth  : ✅ JWT
   Chats : ✅ Chat management enabled
```

### 3. Run Frontend
Open `frontend/index.html` inside your browser using a local web server (such as the VS Code **Live Server** extension on `http://localhost:5500`).

---

## ☁️ Deployment

### 1. Deploy Backend (e.g. Render)
- Select **New Web Service** on Render, and link the repository.
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `node server.js`
- Configure all environment variables matching your local `.env`. Ensure `FRONTEND_ORIGIN` points to your final frontend URL (e.g., `https://your-app.vercel.app`).

### 2. Deploy Frontend (e.g. Vercel)
- Create a Vercel static project.
- Root Directory: `frontend`
- Set `API_BASE` dynamically to point to your live Render backend inside:
  - `frontend/js/auth.js`
  - `frontend/js/login.js`
  - `frontend/js/signup.js`
  - `frontend/js/forgot.js`

```javascript
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000/api"
  : "https://your-render-backend-url.onrender.com/api";
```

---

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Sandeep Gaud**

If you found this project useful, feel free to ⭐ the repository and share your feedback.