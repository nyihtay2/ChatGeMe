# ChatGeMe
**Three AI Minds. One Best Answer.**

A deployable starter web app with a responsive dark/neon chat interface, separate ChatGPT/Gemini/Meta Llama modes, and a triple-model workflow. Each model independently answers; ChatGPT then synthesizes the successful answers into one final response.

## Important provider distinction
- ChatGPT mode uses the OpenAI API (not a user's ChatGPT subscription).
- Gemini mode uses Google's Gemini API.
- Meta mode uses Meta's official Llama API (not the consumer Meta AI app).
- Provider API access and billing are separate from ChatGPT/Gemini/Meta consumer app subscriptions. Do not publish or share API keys.

## Run locally
1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and fill provider keys.
3. Run `npm install` then `npm start`.
4. Open `http://localhost:3000`.

## Deploy on Render
1. Create a GitHub repository and upload these project files.
2. In Render choose **New + → Web Service**, connect the repository.
3. Runtime: Node. Build command: `npm install`. Start command: `npm start`.
4. Add the environment variables from `.env.example` in Render → Environment.
5. Deploy. Open the generated `onrender.com` URL.

## Required environment variables
- `OPENAI_API_KEY` — required for ChatGPT and for final synthesis in triple mode.
- `GEMINI_API_KEY` — required for Gemini mode.
- `LLAMA_API_KEY` — required for Meta Llama mode.

Optional model overrides: `OPENAI_MODEL`, `GEMINI_MODEL`, `LLAMA_MODEL`. Confirm currently available model IDs in each provider's console before production deployment. The defaults are examples and may need adjustment based on account access and regional availability.

## Current MVP scope
Working: responsive chat UI, four AI modes, server-side provider key handling, parallel triple-model calls, synthesis, local browser chat history, status indicator, mobile layout, installable web-app manifest.

Not yet implemented: user accounts/cloud sync, image/file/audio/video input, generated images/videos, web search tools, database-backed history, rate limiting/quotas, payments, admin dashboard, native Android APK. These require additional services, permissions, and product decisions. Never treat a visual menu as an implemented feature.

## Security before public launch
Add authentication, per-user quotas, rate limiting, abuse protection, persistent database, privacy/retention policy, and billing controls before opening the service publicly. Keep provider keys only in Render environment variables.
