/**
 * CodeSage — AI Code Explainer & Bug Fixer
 * server.js  (Express Backend)
 *
 * Provides three API endpoints that relay requests to OpenRouter (free AI API):
 *   POST /api/explain  — explain code in beginner-friendly language
 *   POST /api/fix      — find and fix bugs in code
 *   POST /api/ask      — answer coding questions (multi-turn chat)
 *
 * How to get a FREE API key:
 *   1. Go to https://openrouter.ai/
 *   2. Sign up (free)
 *   3. Create an API key
 *   4. Add it to your .env file as OPENROUTER_API_KEY=your_key_here
 */

// ─── Load environment variables from .env file ────────────────────────────────
require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const fetch   = require("node-fetch"); // built-in in Node 18+, installed for older Node

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());                    // Allow frontend (same origin or different port) to call us
app.use(express.json());            // Parse JSON request bodies
app.use(express.static("."));       // Serve index.html, style.css, script.js from same folder

// ─── Your API key (loaded from .env) ──────────────────────────────────────────
// 👇 IMPORTANT: Replace "your_api_key_here" in .env with your real OpenRouter key
const API_KEY   = process.env.OPENROUTER_API_KEY || "your_api_key_here";

// The model to use (free tier on OpenRouter)
// You can change this to any model listed at https://openrouter.ai/models
const AI_MODEL  = "meta-llama/llama-3.1-8b-instruct:free";  // Free model

// OpenRouter API URL
const AI_API_URL = "https://openrouter.ai/api/v1/chat/completions";


// ═══════════════════════════════════════════════════════════════════════════════
//  HELPER: Call the OpenRouter AI API
//  messages = array of { role: "user"|"assistant"|"system", content: "..." }
// ═══════════════════════════════════════════════════════════════════════════════
async function callAI(messages) {
  const response = await fetch(AI_API_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      // Required by OpenRouter to track your app
      "HTTP-Referer":  "http://localhost:3000",
      "X-Title":       "CodeSage",
    },
    body: JSON.stringify({
      model:      AI_MODEL,
      messages:   messages,
      max_tokens: 1500,  // Max length of AI reply
      temperature: 0.3,  // Lower = more focused/deterministic answers
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("OpenRouter API error:", errBody);
    throw new Error(`AI API returned status ${response.status}. Check your API key.`);
  }

  const data = await response.json();

  // Extract the text reply from OpenAI-compatible response format
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Empty response from AI. Try again.");

  return reply.trim();
}


// ═══════════════════════════════════════════════════════════════════════════════
//  ROUTE 1: POST /api/explain
//  Body: { code: string, lang: string }
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/explain", async (req, res) => {
  const { code, lang } = req.body;

  if (!code || code.trim().length === 0) {
    return res.status(400).json({ error: "No code provided." });
  }

  const language = (lang && lang !== "auto") ? `written in ${lang}` : "";

  // Build the prompt for the AI
  const prompt = `
You are CodeSage, a friendly coding tutor for beginners.
Explain the following code ${language} in a simple, step-by-step way that a beginner can understand.

Follow this structure:
1. **What does this code do?** (one short sentence overview)
2. **Step-by-step explanation** (go through each important part)
3. **Key concepts used** (briefly mention any important programming concepts)
4. **Beginner tip** (a short tip or note for beginners)

Here is the code:
\`\`\`
${code}
\`\`\`

Keep the language simple. Avoid complex jargon. Use analogies if helpful.
`.trim();

  try {
    const result = await callAI([
      {
        role:    "system",
        content: "You are CodeSage, a friendly and patient coding tutor who always explains things in simple language that a complete beginner can understand."
      },
      {
        role:    "user",
        content: prompt
      }
    ]);

    res.json({ result });
  } catch (err) {
    console.error("Error in /api/explain:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
//  ROUTE 2: POST /api/fix
//  Body: { code: string, context: string }
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/fix", async (req, res) => {
  const { code, context } = req.body;

  if (!code || code.trim().length === 0) {
    return res.status(400).json({ error: "No code provided." });
  }

  const contextStr = context ? `\nWhat the code is supposed to do: ${context}` : "";

  const prompt = `
You are CodeSage, a debugging expert and patient teacher.
Analyse the following buggy code or error message and help fix it.${contextStr}

Please respond in this exact format:
1. **🐛 What's the bug?** (explain what is wrong in simple terms)
2. **Why did this happen?** (brief beginner-friendly explanation of the root cause)
3. **✅ Fixed code** (provide the corrected code inside a code block)
4. **What changed?** (list the specific changes you made)
5. **Tip to avoid this in future** (a practical beginner tip)

Here is the buggy code / error:
\`\`\`
${code}
\`\`\`
`.trim();

  try {
    const result = await callAI([
      {
        role:    "system",
        content: "You are CodeSage, an expert debugger and patient coding teacher. Always explain bugs in simple terms beginners can understand."
      },
      {
        role:    "user",
        content: prompt
      }
    ]);

    res.json({ result });
  } catch (err) {
    console.error("Error in /api/fix:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
//  ROUTE 3: POST /api/ask
//  Body: { history: [ { role, content }, ... ] }
//  history is the full conversation so the AI has context.
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/ask", async (req, res) => {
  const { history } = req.body;

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: "No message provided." });
  }

  // System message sets the AI's personality for the chat
  const systemMsg = {
    role:    "system",
    content: `You are CodeSage, a friendly coding mentor for beginners.
Always explain things in simple, plain English.
Use short sentences and real-world analogies where possible.
If showing code, use code blocks.
Be encouraging and supportive — the user is learning!`
  };

  // Prepend system message to conversation history
  const messages = [systemMsg, ...history];

  try {
    const result = await callAI(messages);
    res.json({ result });
  } catch (err) {
    console.error("Error in /api/ask:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// ─── Health-check endpoint ─────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:   "ok",
    model:    AI_MODEL,
    apiKeySet: API_KEY !== "your_api_key_here",
  });
});


// ─── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🚀 CodeSage server running!");
  console.log(`  📡 Open: http://localhost:${PORT}`);
  console.log(`  🤖 Model: ${AI_MODEL}`);
  console.log(`  🔑 API key set: ${API_KEY !== "your_api_key_here" ? "✅ Yes" : "❌ No — add to .env"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});
