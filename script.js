/**
 * CodeSage — AI Code Explainer & Bug Fixer
 * script.js  (Frontend Logic)
 *
 * All AI calls go to our own Express server (/api/explain, /api/fix, /api/ask)
 * which then forwards them to the OpenRouter AI API.
 */

// ─── Base URL of our backend server ───────────────────────────────────────────
// When running locally both frontend + backend are on port 3000
const API_BASE = "";

// ─── DOM References ───────────────────────────────────────────────────────────
const tabs           = document.querySelectorAll(".tab");
const panels         = document.querySelectorAll(".panel");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText    = document.getElementById("loading-text");
const toastEl        = document.getElementById("toast");

// Explain panel
const explainInput   = document.getElementById("explain-input");
const explainLang    = document.getElementById("explain-lang");
const explainOutput  = document.getElementById("explain-output");
const btnExplain     = document.getElementById("btn-explain");

// Fix panel
const fixInput       = document.getElementById("fix-input");
const fixContext     = document.getElementById("fix-context");
const fixOutput      = document.getElementById("fix-output");
const btnFix         = document.getElementById("btn-fix");

// Ask panel
const chatWindow     = document.getElementById("chat-window");
const askInput       = document.getElementById("ask-input");
const btnAsk         = document.getElementById("btn-ask");

// Keeps the full conversation for the chatbox (multi-turn)
let chatHistory = [];


// ═══════════════════════════════════════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════════
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    // Remove active from all tabs + panels
    tabs.forEach(t   => { t.classList.remove("active"); t.setAttribute("aria-selected","false"); });
    panels.forEach(p => p.classList.remove("active"));

    // Activate clicked tab + matching panel
    tab.classList.add("active");
    tab.setAttribute("aria-selected","true");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Show / hide the full-screen loading overlay */
function showLoading(msg = "Thinking...") {
  loadingText.textContent = msg;
  loadingOverlay.removeAttribute("hidden");
}

function hideLoading() {
  loadingOverlay.setAttribute("hidden", "");
}

/** Show a small toast notification */
function showToast(message, type = "") {
  toastEl.textContent  = message;
  toastEl.className    = "toast show " + type;
  setTimeout(() => { toastEl.className = "toast"; }, 3500);
}

/**
 * Convert plain markdown-ish AI text into styled HTML.
 * Handles: ### headings, **bold**, `inline code`, ```code blocks```, bullet lists.
 */
function formatAIResponse(text) {
  let html = text
    // ``` code blocks (multi-line)
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
      `<pre>${escapeHtml(code.trim())}</pre>`)
    // ### headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    // ## headings
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // *italic*
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // `inline code`
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // numbered list items  "1. ..."
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    // bullet list items
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ol> or <ul> (simple heuristic: wrap all li)
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
    // Blank lines → paragraph breaks
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<p>${html}</p>`;
}

/** Escape HTML special characters (for <pre> blocks) */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Generic fetch wrapper for our backend API.
 * @param {string} endpoint  - e.g. "/api/explain"
 * @param {object} body      - JSON body to send
 * @returns {Promise<string>} - AI response text
 */
async function callAPI(endpoint, body) {
  const response = await fetch(API_BASE + endpoint, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error ${response.status}`);
  }

  const data = await response.json();
  return data.result; // Our server always returns { result: "..." }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURE 1 — CODE EXPLAINER
// ═══════════════════════════════════════════════════════════════════════════════
btnExplain.addEventListener("click", async () => {
  const code = explainInput.value.trim();
  const lang = explainLang.value;

  if (!code) { showToast("Please paste some code first.", "error"); return; }

  showLoading("Analysing your code...");
  btnExplain.disabled = true;

  try {
    const result = await callAPI("/api/explain", { code, lang });

    // Render result
    explainOutput.innerHTML = `
      <span class="badge badge-info">📖 Explanation</span>
      ${formatAIResponse(result)}
    `;
  } catch (err) {
    showToast("Error: " + err.message, "error");
    explainOutput.innerHTML = `<p style="color:var(--accent-fix)">⚠️ ${err.message}</p>`;
  } finally {
    hideLoading();
    btnExplain.disabled = false;
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURE 2 — BUG FIXER
// ═══════════════════════════════════════════════════════════════════════════════
btnFix.addEventListener("click", async () => {
  const code    = fixInput.value.trim();
  const context = fixContext.value.trim();

  if (!code) { showToast("Please paste the buggy code or error first.", "error"); return; }

  showLoading("Hunting bugs...");
  btnFix.disabled = true;

  try {
    const result = await callAPI("/api/fix", { code, context });

    fixOutput.innerHTML = `
      <span class="badge badge-bug">🐛 Bug Found</span>
      <span class="badge badge-fix" style="margin-left:6px">✅ Fix Suggested</span>
      ${formatAIResponse(result)}
    `;
  } catch (err) {
    showToast("Error: " + err.message, "error");
    fixOutput.innerHTML = `<p style="color:var(--accent-fix)">⚠️ ${err.message}</p>`;
  } finally {
    hideLoading();
    btnFix.disabled = false;
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURE 3 — ASK DOUBT (Chat)
// ═══════════════════════════════════════════════════════════════════════════════

/** Append a message bubble to the chat window */
function appendMessage(role, content) {
  const isUser = role === "user";

  const msgDiv = document.createElement("div");
  msgDiv.className = "chat-msg " + (isUser ? "user-msg" : "bot-msg");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = isUser ? "👤" : "🤖";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (isUser) {
    // User messages: plain text
    bubble.textContent = content;
  } else {
    // Bot messages: render formatted HTML
    bubble.innerHTML = formatAIResponse(content);
  }

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  chatWindow.appendChild(msgDiv);

  // Auto-scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/** Show animated "typing..." indicator in chat */
function showTypingIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "chat-msg bot-msg";
  indicator.id = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🤖";

  const bubble = document.createElement("div");
  bubble.className = "bubble typing-indicator";
  bubble.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;

  indicator.appendChild(avatar);
  indicator.appendChild(bubble);
  chatWindow.appendChild(indicator);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTypingIndicator() {
  const ind = document.getElementById("typing-indicator");
  if (ind) ind.remove();
}

/** Send the user's question to the AI */
async function sendQuestion() {
  const question = askInput.value.trim();
  if (!question) return;

  // Show user message
  appendMessage("user", question);
  askInput.value = "";
  askInput.style.height = "auto";

  // Add to history for multi-turn context
  chatHistory.push({ role: "user", content: question });

  // Show typing animation
  showTypingIndicator();
  btnAsk.disabled = true;

  try {
    const result = await callAPI("/api/ask", { history: chatHistory });

    removeTypingIndicator();
    appendMessage("bot", result);

    // Remember AI's answer for next turn
    chatHistory.push({ role: "assistant", content: result });
  } catch (err) {
    removeTypingIndicator();
    appendMessage("bot", "⚠️ Sorry, something went wrong: " + err.message);
    showToast("Error: " + err.message, "error");
  } finally {
    btnAsk.disabled = false;
    askInput.focus();
  }
}

// Send on button click
btnAsk.addEventListener("click", sendQuestion);

// Send on Enter key (Shift+Enter = newline)
askInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendQuestion();
  }
});

// Auto-resize textarea as user types
askInput.addEventListener("input", () => {
  askInput.style.height = "auto";
  askInput.style.height = Math.min(askInput.scrollHeight, 120) + "px";
});
