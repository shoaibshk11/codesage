/**
 * CodeSage — AI Code Explainer & Bug Fixer
 * server.js (Express Backend)
 *
 * Uses Hugging Face Inference API (FREE)
 *
 * How to get a FREE Hugging Face API key:
 * 1. Go to https://huggingface.co/
 * 2. Sign up (free)
 * 3. Go to https://huggingface.co/settings/tokens
 * 4. Click "New Token" → name it anything → Role: "Read" → Create
 * 5. Copy the token (starts with hf_...)
 * 6. Add to Railway Variables as: HF_API_KEY = hf_your_token_here
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Hugging Face API Key
const HF_API_KEY = process.env.HF_API_KEY || "";
console.log("🔑 HF API Key loaded:", HF_API_KEY ? `${HF_API_KEY.substring(0, 8)}...` : "❌ NOT SET — add HF_API_KEY to Railway Variables");

// Primary + fallback models.
// NOTE: avoid pinning a specific inference provider (e.g. ":cerebras") —
// those catalogs change without notice and will 404 even though the base
// model still exists. Letting the router pick a provider is more durable.
const HF_MODELS = [
  "Qwen/Qwen2.5-Coder-32B-Instruct",   // primary: strong, free-tier, code-specialized
  "meta-llama/Llama-3.1-8B-Instruct",  // fallback: solid general-purpose, widely hosted
];

const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";

console.log(`🤖 Models (in order): ${HF_MODELS.join(" -> ")}`);

async function callModel(model, messages) {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${HF_API_KEY}`,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 1200,
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    const err = new Error(`AI API returned status ${response.status}.`);
    err.status = response.status;
    err.body = errBody;
    throw err;
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) {
    const err = new Error("Empty response from AI. Try again.");
    err.status = "empty";
    throw err;
  }
  return reply.trim();
}

async function callAI(messages) {
  let lastErr;

  for (let i = 0; i < HF_MODELS.length; i++) {
    const model = HF_MODELS[i];
    try {
      const reply = await callModel(model, messages);
      if (i > 0) console.warn(`⚠️ Used fallback model: ${model}`);
      return reply;
    } catch (err) {
      lastErr = err;
      console.error(`HuggingFace API error on model "${model}":`, err.body || err.message);

      // Only fall through to the next model on errors that suggest THIS
      // model/provider combo is unavailable. Don't burn through fallbacks
      // on auth or rate-limit errors that will affect every model the same way.
      const retryableStatuses = [404, 503];
      if (!retryableStatuses.includes(err.status) || i === HF_MODELS.length - 1) {
        break;
      }
      console.log(`↪️ Retrying with next model...`);
    }
  }

  // Translate the final error into a friendly message
  if (lastErr.status === 401) throw new Error("Invalid HF API key. Check your HF_API_KEY variable.");
  if (lastErr.status === 503) throw new Error("Model is loading, please try again in 20 seconds.");
  if (lastErr.status === 429) throw new Error("Rate limit hit. Please wait a moment and try again.");
  if (lastErr.status === "empty") throw new Error("Empty response from AI. Try again.");
  throw lastErr;
}

app.post("/api/explain", async (req, res) => {
  const { code, lang } = req.body;
  if (!code || !code.trim()) return res.status(400).json({ error: "No code provided." });

  const language = (lang && lang !== "auto") ? `written in ${lang}` : "";
  const prompt = `You are CodeSage, a friendly coding tutor for beginners.\nExplain the following code ${language} in a simple, step-by-step way.\n\nStructure:\n1. **What does this code do?**\n2. **Step-by-step explanation**\n3. **Key concepts used**\n4. **Beginner tip**\n\nCode:\n\`\`\`\n${code}\n\`\`\`\nKeep it simple. No jargon.`;

  try {
    const result = await callAI([
      { role: "system", content: "You are CodeSage, a friendly coding tutor who explains code simply for beginners." },
      { role: "user", content: prompt }
    ]);
    res.json({ result });
  } catch (err) {
    console.error("Error in /api/explain:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/fix", async (req, res) => {
  const { code, context } = req.body;
  if (!code || !code.trim()) return res.status(400).json({ error: "No code provided." });

  const contextStr = context ? `\nExpected behavior: ${context}` : "";
  const prompt = `You are CodeSage, a debugging expert.\nAnalyse this buggy code and fix it.${contextStr}\n\nFormat:\n1. **What's the bug?**\n2. **Why did this happen?**\n3. **Fixed code** (in a code block)\n4. **What changed?**\n5. **Tip to avoid this**\n\nBuggy code:\n\`\`\`\n${code}\n\`\`\``;

  try {
    const result = await callAI([
      { role: "system", content: "You are CodeSage, an expert debugger who explains bugs in simple beginner-friendly terms." },
      { role: "user", content: prompt }
    ]);
    res.json({ result });
  } catch (err) {
    console.error("Error in /api/fix:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ask", async (req, res) => {
  const { history } = req.body;
  if (!history || !Array.isArray(history) || history.length === 0) return res.status(400).json({ error: "No message provided." });

  const systemMsg = { role: "system", content: "You are CodeSage, a friendly coding mentor for beginners. Always explain in simple plain English. Use analogies. Show code in code blocks. Be encouraging!" };

  try {
    const result = await callAI([systemMsg, ...history]);
    res.json({ result });
  } catch (err) {
    console.error("Error in /api/ask:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", models: HF_MODELS, apiKeySet: !!HF_API_KEY });
});

app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" 🚀 CodeSage server running!");
  console.log(` 📡 Open: http://localhost:${PORT}`);
  console.log(` 🤖 Models: ${HF_MODELS.join(", ")}`);
  console.log(` 🔑 HF Key set: ${HF_API_KEY ? "✅ Yes" : "❌ No — add HF_API_KEY"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});