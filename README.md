# Foundry Shared AI Chat

A mobile-friendly, share-by-link group chat with an OpenAI chatbot. It uses a plain HTML/CSS/JavaScript front end, Vercel serverless functions, and Supabase Postgres for persistent messages.

## What it does

- Creates a private-by-link chat room
- Lets several people use the same room from phones or computers
- Stores chat history in Supabase
- Adds an AI reply after each human message
- Keeps OpenAI and Supabase service keys on the server
- Uses a room key in the URL fragment (`#room=...&key=...`), which browsers do not send as part of normal HTTP requests
- Polls every 2.5 seconds, which is lightweight and reliable for a small shared room

## Deploy it

### 1. Create the Supabase database

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Paste the contents of `supabase.sql` and run it.
4. Copy the project URL and the **service_role** key from the project API settings.

Never put the service-role key in `index.html`, GitHub, or any client-side code.

### 2. Deploy to Vercel

The easiest options are to put this folder in a GitHub repository and import it into Vercel, or run:

```bash
npm install -g vercel
vercel
```

Add these environment variables in **Vercel > Project > Settings > Environment Variables**:

```text
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Optional variables are shown in `.env.example`.

Redeploy after adding the variables.

### 3. Create and share a room

Open the deployed website and select **Create a shared room**. Enter your name, then use **Share room** to copy the invite link. Anyone with the complete link can enter the room.

## Local development

Create `.env.local` from `.env.example`, fill in the values, and run:

```bash
npm install -g vercel
vercel dev
```

Open the local URL Vercel displays.

## Security notes

- The OpenAI key and Supabase service-role key are only used inside serverless functions.
- The database has Row Level Security enabled and grants no direct browser access.
- The invite link is the room credential. Anyone who receives it can read and post in that room.
- Do not use this starter for patient data, credentials, regulated records, or other sensitive information without adding real user authentication, audit controls, retention rules, and organizational security review.
- A basic per-browser rate limit is included. For a fully public deployment, add stronger distributed rate limiting and abuse monitoring.

## Customize the bot

Set `BOT_INSTRUCTIONS` in Vercel to change the bot's role or personality. You can also change `OPENAI_MODEL`, reasoning level, verbosity, and output-token limit.

## Main files

- `index.html` — responsive chat interface
- `api/room.js` — creates a room and access key
- `api/messages.js` — securely reads room messages
- `api/send.js` — saves a user message, calls OpenAI, and saves the bot reply
- `supabase.sql` — database schema and permissions
