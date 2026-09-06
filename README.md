<div align="center">
  <div style="background-color: #2563eb; width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#ffffff" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
  </div>
  <h1>OpsEcho | AI Incident Commander</h1>
  <p>Real-time incident response platform powered by Gemini Multimodal Live API.</p>
</div>

## Overview

OpsEcho is a modern incident management platform that revolutionizes how teams handle system outages and critical alerts. Instead of disjointed Slack calls and manual note-taking, OpsEcho provides a dedicated **Voice Response Room** where an AI Observer listens in real-time.

Using the **Gemini Multimodal Live API** and **Agora**, OpsEcho continuously transcribes the conversation, extracting facts, hypotheses, and action items instantly, allowing engineers to focus purely on resolving the issue.

### ✨ Key Features
- **Real-Time Voice Rooms**: Low-latency voice channels powered by Agora RTC.
- **AI-Powered STT (Speech-to-Text)**: Local audio is streamed directly to Gemini's Multimodal Live API, providing lightning-fast, highly accurate transcriptions mapped to each user.
- **Live Intel Extraction**: As the team talks, the AI autonomously extracts actionable insights (Facts, Hypotheses, Action Items) and posts them to the dashboard.
- **Real-Time Synchronization**: Built with Socket.io for instant state updates across all clients.
- **Serverless Ready**: Designed to be seamlessly deployed on Vercel.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS (v4), Framer Motion
- **Backend**: Express.js, Socket.io
- **Database**: Prisma ORM (SQLite for local dev, PostgreSQL for production)
- **AI**: `@google/genai` (Gemini Multimodal Live API)
- **Voice Infrastructure**: Agora RTC SDK

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- A [Google Gemini API Key](https://aistudio.google.com/)
- An [Agora App ID & Certificate](https://console.agora.io/)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/opsecho.git
cd opsecho
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following keys:
```env
# Database (SQLite for local)
DATABASE_URL="file:./dev.db"

# JWT Auth
JWT_SECRET="your-super-secret-jwt-key"

# Agora Configuration
AGORA_APP_ID="your_agora_app_id"
AGORA_APP_CERTIFICATE="your_agora_app_certificate"

# Google Gemini Configuration
GEMINI_API_KEY="your_gemini_api_key"
```

### 4. Setup Database
```bash
npx prisma generate
npx prisma db push
```

### 5. Start the Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

---

## ☁️ Deployment (Vercel)

OpsEcho is pre-configured for deployment on Vercel. 

1. **Push your code** to GitHub.
2. Log in to **Vercel** and import the repository.
3. In the Vercel deployment settings, expand the **Environment Variables** section and add all your variables (ensure `DATABASE_URL` points to a remote PostgreSQL database like Supabase, Neon, or Vercel Postgres).
4. Click **Deploy**.

> **Note**: Vercel Serverless Functions do not support persistent WebSockets. OpsEcho is configured to gracefully fallback to HTTP Long-Polling for Socket.io when deployed on Vercel.

---

## 🧠 How the AI Observer Works

1. **Voice Capture**: When a user joins the incident room, `useGeminiSTT.ts` captures raw PCM audio via the browser's `getUserMedia` API.
2. **Streaming STT**: The audio is streamed over a secure WebSocket directly to Google's Gemini Multimodal Live API (bypassing the fragile browser `SpeechRecognition` API).
3. **Broadcasting**: Gemini returns accurate text transcripts. The client broadcasts `TRANSCRIPT_FINAL` to the backend via Socket.io.
4. **Analysis**: The backend (`aiProcessor.ts`) intercepts the final transcripts and pushes the conversation history to the Gemini text model, prompting it to extract structured JSON data (Facts, Hypotheses, Action Items).
5. **Real-time Updates**: The extracted Intel is saved to the database and pushed to all active clients instantly.
