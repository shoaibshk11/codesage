/**
 * CodeSage — AI Code Explainer & Bug Fixer
 * server.js  (Express Backend)
 *
 * Uses Hugging Face Inference API (FREE)
 *
 * How to get a FREE Hugging Face API key:
 *   1. Go to https://huggingface.co/
 *   2. Sign up (free)
 *   3. Go to https://huggingface.co/settings/tokens
 *   4. Click "New Token" → name it anything → Role: "Read" → Create
 *   5. Copy the token (starts with hf_...)
 *   6. Add to Railway Variables as:  HF_API_KEY = hf_your_token_here
 */

require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const fetch   = require("node-fetch");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("."));

// Hugging Face API Key
const HF_API_KEY = process.env.HF_API_KEY || "";
console.log("🔑 HF API Key loaded:", HF_API_KEY ? `${HF_API_KEY.substring(0, 8)}...` : "❌ NOT SET — add HF_API_KEY to Railway Variables");

const HF_MODEL   = "meta-llama/Llama-3.1-8B-Instruct:cerebras";
const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
console.log(`🤖 Model: ${HF_MODEL}`);

async function callAI(messages) {
  const response = await fetch(HF_API_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${HF_API_KEY}`,
    },
    body: JSON.stringify({
      model:       HF_MODEL,
      messages:    messages,
      max_tokens:  1200,
      temperature: 0.3,
      stream:      false,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("HuggingFace API error:", errBody);
    if (response.status === 401) throw new Error("Invalid HF API key. Check your HF_API_KEY variable.");
    if (response.status === 503) throw new Error("Model is loading, please try again in 20 seconds.");
    if (response.status === 429) throw new Error("Rate limit hit. Please wait a moment and try again.");
    throw new Error(`AI API returned status ${response.status}.`);
  }

  const data  = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Empty response from AI. Try again.");
  return reply.trim();
}

app.post("/api/explain", async (req, res) => {
  const { code, lang } = req.body;
  if (!code || !code.trim()) return res.status(400).json({ error: "No code provided." });
  const language = (lang && lang !== "auto") ? `written in ${lang}` : "";
  const prompt = `You are CodeSage, a friendly coding tutor for beginners.\nExplain the following code ${language} in a simple, step-by-step way.\n\nStructure:\n1. **What does this code do?**\n2. **Step-by-step explanation**\n3. **Key concepts used**\n4. **Beginner tip**\n\nCode:\n\`\`\`\n${code}\n\`\`\`\nKeep it simple. No jargon.`;
  try {
    const result = await callAI([
      { role: "system", content: "You are CodeSage, a friendly coding tutor who explains code simply for beginners." },
      { role: "user",   content: prompt }
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
      { role: "user",   content: prompt }
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
  res.json({ status: "ok", model: HF_MODEL, apiKeySet: !!HF_API_KEY });
});

app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🚀 CodeSage server running!");
  console.log(`  📡 Open: http://localhost:${PORT}`);
  console.log(`  🤖 Model: ${HF_MODEL}`);
  console.log(`  🔑 HF Key set: ${HF_API_KEY ? "✅ Yes" : "❌ No — add HF_API_KEY"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});