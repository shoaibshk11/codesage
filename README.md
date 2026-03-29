# ⟨/⟩ CodeSage — AI Code Explainer & Bug Fixer

A beginner-friendly web app powered by AI that can:
- 🔍 **Explain** any code in simple, step-by-step language
- 🐛 **Fix bugs** and explain what went wrong
- 💬 **Answer coding questions** in a conversational chatbox

**Tech stack:** HTML · CSS · JavaScript · Node.js (Express) · OpenRouter AI API

---

## 🚀 How to Run the Project

### Step 1 — Install Node.js
Download from https://nodejs.org/ (choose the LTS version)

### Step 2 — Download / clone the project
```
my-project/
  ├── index.html
  ├── style.css
  ├── script.js
  ├── server.js
  ├── package.json
  ├── .env.example
  └── README.md
```

### Step 3 — Install dependencies
Open a terminal in the project folder and run:
```bash
npm install
```

### Step 4 — Add your API key
1. Rename `.env.example` to `.env`
2. Open `.env` and replace `your_api_key_here` with your real key

### Step 5 — Start the server
```bash
npm start
```
You should see:
```
🚀 CodeSage server running!
📡 Open: http://localhost:3000
```

### Step 6 — Open the app
Visit http://localhost:3000 in your browser. That's it!

---

## 🔑 How to Get a Free API Key

1. Go to **https://openrouter.ai/**
2. Click **Sign Up** (it's free)
3. Go to **Dashboard → Keys → Create Key**
4. Copy the key (starts with `sk-or-...`)
5. Paste it into your `.env` file:
   ```
   OPENROUTER_API_KEY=sk-or-your-real-key-here
   ```

The free tier includes access to models like `meta-llama/llama-3.1-8b-instruct:free`.

---

## 💡 Suggested Improvements

| Improvement | How |
|---|---|
| **Syntax highlighting** | Add [highlight.js](https://highlightjs.org/) to colour code blocks |
| **Copy button** | Add a clipboard button on code output blocks |
| **Dark/light mode toggle** | Add a CSS class toggle with a button |
| **Save history** | Use `localStorage` to persist chat history across page refreshes |
| **Multiple languages** | Show detected language badge using a library like [linguist-js](https://www.npmjs.com/package/linguist-js) |
| **Better AI model** | Swap to `openai/gpt-4o-mini` on OpenRouter for higher quality (low cost) |
| **Rate limiting** | Add `express-rate-limit` to prevent API abuse |
| **Authentication** | Add a simple password or login so only you can use it |
| **Deploy online** | Deploy to [Railway](https://railway.app/) or [Render](https://render.com/) for free hosting |

---

## 📁 File Structure

```
index.html   — The full frontend UI (tabs, textareas, output boxes)
style.css    — All styling (dark theme, animations, responsive layout)
script.js    — Frontend logic (tab switching, API calls, chat)
server.js    — Express backend (AI API integration, route handlers)
package.json — Node.js project metadata and dependencies
.env.example — Template for environment variables
```

---

Made with ❤️ for beginner developers
