// ================================
// Authentication Check
// ================================

document.addEventListener("DOMContentLoaded", () => {

    if (!Auth.isLoggedIn()) {
        window.location.href = "login.html";
        return;
    }

    const user = Auth.getUser();

    console.log("Logged in user:", user);

});


/* ─────────────────────────────────────────────────────────────────────────────
   DevMate AI — Frontend Script v2.0
   Features: Chat history, markdown, syntax highlight, voice I/O, auto-scroll,
             copy, clear, dark/light theme, all AI tools, GitHub & file upload.
───────────────────────────────────────────────────────────────────────────── */

// const API_BASE = "http://localhost:3000/api";

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  currentTool: "ask",
  isLoading: false,
  messages: [],
  isRecording: false,
  speechRecognition: null,
  utterance: null,
  currentChatId:    null,
  lastUserMessage:  null,
  attachedFile:     null,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const dom = {
  sidebar:      $("sidebar"),
  sidebarOpen:  $("sidebarOpen"),
  sidebarClose: $("sidebarClose"),
  chatArea:     $("chatArea"),
  messages:     $("messages"),
  welcome:      $("welcomeScreen"),
  inputArea:    $("inputArea"),
  sendBtn:      $("sendBtn"),
  clearBtn:     $("clearBtn"),
  themeBtn:     $("themeBtn"),
  voiceBtn:     $("voiceBtn"),
  sunIcon:      $("sunIcon"),
  moonIcon:     $("moonIcon"),
  topbarTitle:  $("topbarTitle"),
  charCount:    $("charCount"),
  modeText:     $("modeText"),
  modeBadge:    $("modeBadge"),
  modeDot:      document.querySelector(".mode-dot"),
  githubField:  $("githubField"),
  repoInput:    $("repoInput"),
  uploadField:  $("uploadField"),
  fileInput:    $("fileInput"),
  fileLabelText:$("fileLabelText"),
  uploadAction: $("uploadAction"),
  toastContainer:   $("toastContainer"),
  chatHistoryList:  $("chatHistoryList"),
  chatHistoryEmpty: $("chatHistoryEmpty"),
  chatSearchInput:  $("chatSearchInput"),
  attachBtn:           $("attachBtn"),
  attachmentPreview:   $("attachmentPreview"),
  attachmentName:      $("attachmentName"),
  removeAttachmentBtn: $("removeAttachmentBtn"),
  shareModal:          $("shareModal"),
  shareLinkInput:      $("shareLinkInput"),
};

// ─── Tool config ──────────────────────────────────────────────────────────────

const TOOLS = {
  ask:      { label: "Ask AI",          endpoint: "/ask",          field: "question", placeholder: "Ask anything about code…" },
  explain:  { label: "Explain Code",    endpoint: "/explain",      field: "code",     placeholder: "Paste code to explain…" },
  bug:      { label: "Detect Bugs",     endpoint: "/detect-bugs",  field: "code",     placeholder: "Paste code to check for bugs…" },
  optimize: { label: "Optimize Code",   endpoint: "/optimize",     field: "code",     placeholder: "Paste code to optimize…" },
  review:   { label: "Code Review",     endpoint: "/review",       field: "code",     placeholder: "Paste code for a professional review…" },
  summarize:{ label: "Summarize",       endpoint: "/summarize",    field: "code",     placeholder: "Paste code to summarize…" },
  readme:   { label: "README Gen",      endpoint: "/readme",       field: "code",     placeholder: "Paste project code to generate a README…" },
  github:   { label: "GitHub Analysis", endpoint: "/github/analyze", field: "repoUrl", placeholder: "Paste code or describe the repo…" },
  upload:   { label: "Upload File",     endpoint: null,            field: null,       placeholder: "Optional: add notes about the file…" },
};

// ─── Init ─────────────────────────────────────────────────────────────────────

(async function init() {
  setupEventListeners();
  initTheme();
  initVoice();
  autoResizeTextarea();
  await checkServerStatus();
  await loadChatHistory();
})();

// ─── Event Listeners ──────────────────────────────────────────────────────────

function setupEventListeners() {
  // Sidebar toggle (mobile)
  dom.sidebarOpen.addEventListener("click", () => dom.sidebar.classList.add("open"));
  dom.sidebarClose.addEventListener("click", () => dom.sidebar.classList.remove("open"));

  // Nav items
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchTool(btn.dataset.tool));
  });

  // Quick actions on welcome screen
  document.querySelectorAll(".quick-action").forEach((btn) => {
    btn.addEventListener("click", () => switchTool(btn.dataset.action));
  });

  // New chat
  $("newChatBtn").addEventListener("click", clearChat);

  // Send
  dom.sendBtn.addEventListener("click", handleSend);

  // Enter to send (shift+enter = newline)
  dom.inputArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Char count + auto-resize
  dom.inputArea.addEventListener("input", () => {
    dom.charCount.textContent = dom.inputArea.value.length.toLocaleString();
    autoResizeTextarea();
  });

  // Clear
  dom.clearBtn.addEventListener("click", clearChat);

  // Theme
  dom.themeBtn.addEventListener("click", toggleTheme);

  // Voice
  dom.voiceBtn.addEventListener("click", toggleVoice);

  // File input change handler (ChatGPT style + old upload tool integration)
  dom.fileInput.addEventListener("change", () => {
    const file = dom.fileInput.files[0];
    if (file) {
      state.attachedFile = file;
      dom.fileLabelText.textContent = `📎 ${file.name}`;
      if (dom.attachmentName && dom.attachmentPreview) {
        dom.attachmentName.textContent = `📎 ${file.name}`;
        dom.attachmentPreview.classList.remove("hidden");
      }
    }
  });

  // Attach button click triggers fileInput
  dom.attachBtn.addEventListener("click", () => {
    dom.fileInput.click();
  });

  // Remove attachment click handler
  dom.removeAttachmentBtn.addEventListener("click", () => {
    state.attachedFile = null;
    dom.fileInput.value = "";
    dom.fileLabelText.textContent = "Choose a file (JS, PY, Java, C++, HTML, CSS, TXT…)";
    dom.attachmentPreview.classList.add("hidden");
  });

  // Close sidebar on outside click (mobile)
  dom.chatArea.addEventListener("click", () => {
    if (window.innerWidth < 768) dom.sidebar.classList.remove("open");
  });

  // Chat history search
  let _st;
  if (dom.chatSearchInput) {
    dom.chatSearchInput.addEventListener("input", () => {
      clearTimeout(_st);
      _st = setTimeout(() => searchChats(dom.chatSearchInput.value.trim()), 350);
    });
  }

  // Clear all chats button
  const _cab = document.getElementById("clearAllChatsBtn");
  if (_cab) _cab.addEventListener("click", () => {
    if (confirm("Delete ALL chat history? This cannot be undone.")) deleteAllChats();
  });

  // Close share modal
  const closeShareModalBtn = document.getElementById("closeShareModalBtn");
  if (closeShareModalBtn) {
    closeShareModalBtn.addEventListener("click", () => {
      dom.shareModal.classList.add("hidden");
    });
  }

  // Copy share link button
  const copyShareLinkBtn = document.getElementById("copyShareLinkBtn");
  if (copyShareLinkBtn) {
    copyShareLinkBtn.addEventListener("click", () => {
      dom.shareLinkInput.select();
      dom.shareLinkInput.setSelectionRange(0, 99999); // for mobile
      navigator.clipboard.writeText(dom.shareLinkInput.value);
      showToast("Link copied to clipboard!", "success");
    });
  }

  // Click outside modal card to close
  if (dom.shareModal) {
    dom.shareModal.addEventListener("click", (e) => {
      if (e.target === dom.shareModal) {
        dom.shareModal.classList.add("hidden");
      }
    });
  }
}

// ─── Tool Switching ───────────────────────────────────────────────────────────

function switchTool(tool) {
  if (!TOOLS[tool]) return;
  state.currentTool = tool;

  // Update nav active state
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tool === tool);
  });

  // Update topbar title
  dom.topbarTitle.textContent = TOOLS[tool].label;

  // Update textarea placeholder
  dom.inputArea.placeholder = TOOLS[tool].placeholder;

  // Show/hide extra fields
  dom.githubField.classList.toggle("hidden", tool !== "github");
  dom.uploadField.classList.toggle("hidden", tool !== "upload");

  // Scroll into view
  dom.inputArea.focus();

  // Close sidebar on mobile
  if (window.innerWidth < 768) dom.sidebar.classList.remove("open");
}

// ─── Send Handler ─────────────────────────────────────────────────────────────

async function handleSend() {
  if (state.isLoading) return;

  const tool = state.currentTool;

  if (state.attachedFile) {
    await handleAttachedFileUpload();
    return;
  }

  if (tool === "upload") {
    await handleUpload();
    return;
  }

  if (tool === "github") {
    await handleGitHub();
    return;
  }

  const input = dom.inputArea.value.trim();
  if (!input) {
    showToast("Please enter a question or code.", "error");
    return;
  }

  const config = TOOLS[tool];
  const body = { [config.field]: input };

  state.lastUserMessage = input;
  appendMessage("user", input);
  clearInput();
  await fetchAI(config.endpoint, body);
}

async function handleGitHub() {
  const repoUrl = dom.repoInput.value.trim();
  if (!repoUrl) {
    showToast("Please enter a GitHub repository URL.", "error");
    return;
  }

  appendMessage("user", `🔗 Analyzing repository: ${repoUrl}`);
  dom.repoInput.value = "";
  await fetchAI("/github/analyze", { repoUrl });
}

async function handleUpload() {
  const file = dom.fileInput.files[0];
  if (!file) {
    showToast("Please choose a file to upload.", "error");
    return;
  }

  const notes = dom.inputArea.value.trim();
  const action = dom.uploadAction.value;

  appendMessage("user", `📎 Uploaded: ${file.name}${notes ? `\n\n${notes}` : ""}`);
  clearInput();
  dom.fileLabelText.textContent = "Choose a file (JS, PY, Java, C++, HTML, CSS, TXT…)";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("action", action);
  dom.fileInput.value = "";

  setLoading(true);
  const loadingId = appendLoadingMessage();

  try {
    const _ut = localStorage.getItem("devmate_access") || "";
    const _uh = _ut ? { "Authorization": `Bearer ${_ut}` } : {};
    const res = await fetch(`${API_BASE}/upload`, { method: "POST", headers: _uh, body: formData });
    const data = await res.json();

    removeLoadingMessage(loadingId);

    if (!res.ok) throw new Error(data.error || "Upload failed");
    appendMessage("ai", data.answer, true);
    // Save upload interaction to chat history
    const _uMsg = `📎 ${data.filename || "file"}`;
    await saveChatMessage(_uMsg, data.answer, "/upload");
  } catch (err) {
    removeLoadingMessage(loadingId);
    appendMessage("ai", `❌ **Error:** ${err.message}`);
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function handleAttachedFileUpload() {
  const file = state.attachedFile;
  if (!file) return;

  const prompt = dom.inputArea.value.trim();
  
  // Clear attachment state and hide preview
  state.attachedFile = null;
  dom.fileInput.value = "";
  dom.fileLabelText.textContent = "Choose a file (JS, PY, Java, C++, HTML, CSS, TXT…)";
  dom.attachmentPreview.classList.add("hidden");

  // Determine user display message
  const displayMsg = `📎 ${file.name}${prompt ? `\n\n${prompt}` : ""}`;
  appendMessage("user", displayMsg);
  clearInput();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("prompt", prompt);
  // Re-use current action dropdown if it exists, otherwise default to explain
  formData.append("action", dom.uploadAction ? dom.uploadAction.value : "explain");

  // Get conversation history (recent 10 messages)
  const history = state.messages.slice(0, -1).slice(-10).map(m => ({
    role: m.role,
    content: m.content
  }));
  formData.append("history", JSON.stringify(history));

  setLoading(true);
  const loadingId = appendLoadingMessage();

  try {
    const _ut = localStorage.getItem("devmate_access") || "";
    const _uh = _ut ? { "Authorization": `Bearer ${_ut}` } : {};
    const res = await fetch(`${API_BASE}/upload`, { method: "POST", headers: _uh, body: formData });
    const data = await res.json();

    removeLoadingMessage(loadingId);

    if (!res.ok) throw new Error(data.error || "Upload failed");
    
    appendMessage("ai", data.answer, true);
    
    // Construct the database message containing file content for future memory
    let historyMsg;
    if (data.content) {
      historyMsg = `📎 ${file.name}\n\nFile Content:\n${data.content}\n\nUser Question:\n${prompt || "Explain this file"}`;
    } else {
      // Image has no text content
      historyMsg = `📎 ${file.name} (Image)\n\nUser Question:\n${prompt || "Describe this image"}`;
    }
    
    await saveChatMessage(historyMsg, data.answer, "/upload");
  } catch (err) {
    removeLoadingMessage(loadingId);
    appendMessage("ai", `❌ **Error:** ${err.message}`);
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

// ─── API Fetch ────────────────────────────────────────────────────────────────

async function fetchAI(endpoint, body) {
  setLoading(true);
  const loadingId = appendLoadingMessage();

  // Get conversation history (recent 10 messages, excluding the current user message at the end)
  const history = state.messages.slice(0, -1).slice(-10).map(m => ({
    role: m.role,
    content: m.content
  }));

  try {
    const _t = localStorage.getItem("devmate_access") || "";
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(_t ? { "Authorization": `Bearer ${_t}` } : {}),
      },
      body: JSON.stringify({ ...body, history }),
    });

    const data = await res.json();
    removeLoadingMessage(loadingId);

    if (!res.ok) throw new Error(data.error || "Server error");

    appendMessage("ai", data.answer, true);
    speakResponse(data.answer);
    if (state.lastUserMessage) {
      await saveChatMessage(state.lastUserMessage, data.answer, endpoint);
      state.lastUserMessage = null;
    }
  } catch (err) {
    removeLoadingMessage(loadingId);

    const isNetwork = err.message === "Failed to fetch";
    const msg = isNetwork
      ? "❌ **Cannot reach server.**\n\nMake sure the backend is running:\n```bash\ncd backend && npm start\n```"
      : `❌ **Error:** ${err.message}`;

    appendMessage("ai", msg);
    showToast(isNetwork ? "Server not reachable." : err.message, "error");
  } finally {
    setLoading(false);
  }
}

// ─── Message Rendering ────────────────────────────────────────────────────────

function appendMessage(role, content, isNew = false) {
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  state.messages.push({ role, content, id });

  // Hide welcome screen
  if (dom.welcome) dom.welcome.style.display = "none";

  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.id = id;

  const isUser = role === "user";

  div.innerHTML = `
    <div class="message-header">
      <div class="avatar ${isUser ? "user-avatar" : "ai-avatar"}">${isUser ? "U" : "AI"}</div>
      <span class="message-role">${isUser ? "You" : "DevMate AI"}</span>
      <div class="message-actions">
        <button class="msg-action-btn" title="Copy" onclick="copyMessage('${id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
        ${!isUser ? `<button class="msg-action-btn" title="Speak" onclick="speakMessage('${id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
        </button>` : ""}
      </div>
    </div>
    <div class="message-content ${isUser ? "user-content" : ""}" id="content-${id}"></div>
  `;

  dom.messages.appendChild(div);

  const contentEl = div.querySelector(`#content-${id}`);
  if (isUser) {
    if (content.startsWith("📎")) {
      const dbMatch = content.match(/^📎 ([^\n]+)\n\nFile Content:\n([\s\S]*?)\n\nUser Question:\n([\s\S]*)$/);
      const imgDbMatch = content.match(/^📎 ([^\n]+) \(Image\)\n\nUser Question:\n([\s\S]*)$/);
      const displayMatch = content.match(/^📎 ([^\n]+)(?:\n\n([\s\S]*))?$/);
      
      let filename = "";
      let promptText = "";
      
      if (dbMatch) {
        filename = dbMatch[1];
        promptText = dbMatch[3];
      } else if (imgDbMatch) {
        filename = imgDbMatch[1];
        promptText = imgDbMatch[2];
      } else if (displayMatch) {
        filename = displayMatch[1];
        promptText = displayMatch[2] || "";
      }
      
      if (filename) {
        contentEl.innerHTML = `
          <div class="attachment-pill-chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;vertical-align:middle;display:inline-block;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            <span style="vertical-align:middle;">${escapeHtml(filename)}</span>
          </div>
          ${promptText ? `<div class="prompt-text-chat" style="margin-top:8px;white-space:pre-wrap;">${escapeHtml(promptText)}</div>` : ""}
        `;
      } else {
        contentEl.textContent = content;
      }
    } else {
      contentEl.textContent = content;
    }
    scrollToBottom();
  } else {
    if (isNew) {
      typewriterRender(contentEl, content);
    } else {
      renderMarkdown(contentEl, content);
      scrollToBottom();
    }
  }

  return id;
}

function typewriterRender(el, text, onComplete) {
  let index = 0;
  el.innerHTML = "";
  
  const totalChars = text.length;
  // If the text is very long, speed up chunks so it finishes in a reasonable time (max 1.5s total)
  const chunkSize = Math.max(1, Math.ceil(totalChars / 120));
  const intervalMs = 15;
  
  const timer = setInterval(() => {
    if (index >= totalChars) {
      clearInterval(timer);
      renderMarkdown(el, text); // final perfect render
      if (onComplete) onComplete();
      scrollToBottom();
      return;
    }
    
    index += chunkSize;
    const currentText = text.substring(0, index);
    renderMarkdown(el, currentText);
    scrollToBottom();
  }, intervalMs);
}

function appendLoadingMessage() {
  const id = `loading-${Date.now()}`;
  const div = document.createElement("div");
  div.className = "message ai loading-message";
  div.id = id;
  div.innerHTML = `
    <div class="message-header">
      <div class="avatar ai-avatar">AI</div>
      <span class="message-role">DevMate AI</span>
    </div>
    <div class="message-content">
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
      <span style="color:var(--text-muted);font-size:.85rem">Thinking…</span>
    </div>
  `;
  dom.messages.appendChild(div);
  scrollToBottom();
  return id;
}

function removeLoadingMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function renderMarkdown(el, text) {
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: true });
    el.innerHTML = marked.parse(text);

    // Add copy buttons to code blocks
    el.querySelectorAll("pre").forEach((pre) => {
      const btn = document.createElement("button");
      btn.className = "copy-code-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", () => {
        const code = pre.querySelector("code")?.textContent || "";
        copyToClipboard(code);
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 2000);
      });
      pre.style.position = "relative";
      pre.appendChild(btn);
    });

    // Syntax highlighting
    if (window.hljs) {
      el.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  } else {
    el.textContent = text;
  }
}

// ─── Message Actions ──────────────────────────────────────────────────────────

function copyMessage(id) {
  const msg = state.messages.find((m) => m.id === id);
  if (!msg) return;
  copyToClipboard(msg.content);
  showToast("Copied to clipboard", "success");
}

function speakMessage(id) {
  const msg = state.messages.find((m) => m.id === id);
  if (!msg) return;
  speakText(msg.content.replace(/[#*`_~[\]]/g, "").replace(/```[\s\S]*?```/g, "code block"));
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  } else {
    legacyCopy(text);
  }
}

function legacyCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

// Make globally accessible (used by inline onclick)
window.copyMessage = copyMessage;
window.speakMessage = speakMessage;

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function clearInput() {
  dom.inputArea.value = "";
  dom.charCount.textContent = "0";
  autoResizeTextarea();
}

function clearChat() {
  state.messages = [];
  state.currentChatId  = null;
  state.lastUserMessage = null;
  dom.messages.innerHTML = "";
  if (dom.welcome) dom.welcome.style.display = "";
  clearInput();
  document.querySelectorAll(".ch-item").forEach(el => el.classList.remove("active"));
  showToast("Chat cleared", "info");
}

function setLoading(loading) {
  state.isLoading = loading;
  dom.sendBtn.disabled = loading;
  dom.inputArea.disabled = loading;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    dom.chatArea.scrollTo({ top: dom.chatArea.scrollHeight, behavior: "smooth" });
  });
}

function autoResizeTextarea() {
  const ta = dom.inputArea;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem("devmate-theme") || "dark";
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  applyTheme(current === "dark" ? "light" : "dark");
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("devmate-theme", theme);
  dom.sunIcon.style.display = theme === "dark" ? "block" : "none";
  dom.moonIcon.style.display = theme === "dark" ? "none" : "block";
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  toast.innerHTML = `<span>${icons[type] || ""}</span> ${msg}`;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "opacity .3s, transform .3s";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Server Status ────────────────────────────────────────────────────────────

async function checkServerStatus() {
  try {
    const res = await fetch(`${API_BASE.replace("/api", "")}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();

    const isLive = data.ai === "gemini" || data.aiMode === "gemini";

dom.modeText.textContent = isLive
  ? "DevMate Online"
  : "Server Offline";

dom.modeDot.classList.toggle("live", isLive);
  } catch {
    dom.modeText.textContent = "Server offline";
  }
}

// ─── Voice: Speech-to-Text ────────────────────────────────────────────────────

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    dom.voiceBtn.title = "Voice input not supported in this browser";
    dom.voiceBtn.style.opacity = "0.4";
    dom.voiceBtn.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map((r) => r[0].transcript)
      .join("");
    dom.inputArea.value = transcript;
    dom.charCount.textContent = transcript.length;
    autoResizeTextarea();
  };

  recognition.onend = () => {
    state.isRecording = false;
    dom.voiceBtn.classList.remove("recording");
  };

  recognition.onerror = (e) => {
    state.isRecording = false;
    dom.voiceBtn.classList.remove("recording");
    if (e.error !== "aborted") {
      showToast(`Microphone error: ${e.error}`, "error");
    }
  };

  state.speechRecognition = recognition;
}

function toggleVoice() {
  if (!state.speechRecognition) return;

  if (state.isRecording) {
    state.speechRecognition.stop();
    state.isRecording = false;
    dom.voiceBtn.classList.remove("recording");
  } else {
    try {
      state.speechRecognition.start();
      state.isRecording = true;
      dom.voiceBtn.classList.add("recording");
      showToast("Listening… speak now", "info");
    } catch {
      showToast("Could not start microphone. Check browser permissions.", "error");
    }
  }
}

// ─── Voice: Text-to-Speech ────────────────────────────────────────────────────

function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const clean = text
    .replace(/```[\s\S]*?```/g, " code block. ")
    .replace(/`[^`]+`/g, (m) => m.replace(/`/g, ""))
    .replace(/[#*_~[\]]/g, "")
    .replace(/\n+/g, ". ")
    .trim();

  if (!clean) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Prefer a natural English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => v.lang.startsWith("en") && v.localService);
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
}

function speakResponse(text) {
  // Only auto-speak if a TTS session is already active (don't auto-speak by default)
  // Users can manually trigger via the speaker icon button
}

// ═════════════════════════════════════════════════════════════════════════════
// CHAT MANAGEMENT — DevMate AI v3.1
// ═════════════════════════════════════════════════════════════════════════════

function getAuthHeaders() {
  const token = localStorage.getItem("devmate_access") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
}

// ── Date group label helper ───────────────────────────────────────────────────
function getDateLabel(dateStr) {
  const d     = new Date(dateStr);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest  = new Date(today); yest.setDate(yest.getDate() - 1);
  const week  = new Date(today); week.setDate(week.getDate() - 7);
  const chat  = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (chat >= today) return "Today";
  if (chat >= yest)  return "Yesterday";
  if (chat >= week)  return "Last 7 Days";
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

// ── Save messages to MongoDB chat ─────────────────────────────────────────────
async function saveChatMessage(userMsg, aiMsg, endpoint) {
  try {
    const tool = (endpoint || "ask").replace("/", "").split("/")[0] || "ask";

    if (!state.currentChatId) {
      const res = await fetch(`${API_BASE}/chats`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ title: "New Chat", tool }),
      });
      if (!res.ok) return;
      const d = await res.json();
      state.currentChatId = d.chat._id;
    }

    await fetch(`${API_BASE}/chats/${state.currentChatId}/messages`, {
      method: "POST", headers: getAuthHeaders(),
      body: JSON.stringify({ userMessage: userMsg, aiMessage: aiMsg, tool }),
    });

    await loadChatHistory();
    highlightActiveChat(state.currentChatId);
  } catch { /* never break AI flow */ }
}

// ── Load all chats into sidebar ───────────────────────────────────────────────
async function loadChatHistory() {
  try {
    const res = await fetch(`${API_BASE}/chats`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const { chats } = await res.json();
    renderChatList(chats || []);
  } catch { /* silent */ }
}

// ── Render chat list with date groups ────────────────────────────────────────
function renderChatList(chats) {
  const list  = dom.chatHistoryList;
  const empty = dom.chatHistoryEmpty;
  if (!list) return;

  list.querySelectorAll(".ch-item, .ch-date-label, .ch-section-divider").forEach(el => el.remove());

  if (!chats.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  const pinnedChats = chats.filter(c => c.isPinned);
  const unpinnedChats = chats.filter(c => !c.isPinned);

  // Helper to create a chat item element
  function createChatItem(chat) {
    const item = document.createElement("div");
    item.className = "ch-item";
    item.dataset.id = chat._id;
    if (chat._id === state.currentChatId) item.classList.add("active");

    item.innerHTML = `
      <div class="ch-item-body">
        <span class="ch-item-title">${escapeHtml(chat.title)}</span>
        <span class="ch-item-preview">${escapeHtml(chat.preview || "")}</span>
      </div>
      <div class="ch-item-actions">
        <button class="ch-action-btn ch-pin-btn" title="${chat.isPinned ? 'Unpin' : 'Pin'}">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="${chat.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" style="${chat.isPinned ? 'color: #fbbf24;' : ''}">
            <path d="M12 2v8M5 10h14M19 10l-2 5H7l-2-5M12 15v7"/>
          </svg>
        </button>
        <button class="ch-action-btn ch-share-btn" title="Share">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
        </button>
        <button class="ch-action-btn ch-rename-btn" title="Rename">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="ch-action-btn ch-delete-btn" title="Delete">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>`;

    item.querySelector(".ch-item-body").addEventListener("click", () => loadChat(chat._id));
    item.querySelector(".ch-pin-btn").addEventListener("click", e => { e.stopPropagation(); togglePinChat(chat._id, chat.isPinned); });
    item.querySelector(".ch-share-btn").addEventListener("click", e => { e.stopPropagation(); shareChat(chat._id); });
    item.querySelector(".ch-rename-btn").addEventListener("click", e => { e.stopPropagation(); renameChat(chat._id, chat.title); });
    item.querySelector(".ch-delete-btn").addEventListener("click", e => { e.stopPropagation(); deleteChat(chat._id); });

    return item;
  }

  // 1. Render Pinned Chats if any
  if (pinnedChats.length > 0) {
    const div = document.createElement("div");
    div.className = "ch-section-divider";
    div.textContent = "Pinned";
    list.appendChild(div);
    
    pinnedChats.forEach(chat => {
      list.appendChild(createChatItem(chat));
    });
  }

  // 2. Render Unpinned Chats grouped by date
  let lastLabel = "";
  unpinnedChats.forEach(chat => {
    const label = getDateLabel(chat.updatedAt);
    if (label !== lastLabel) {
      const div = document.createElement("div");
      div.className = "ch-date-label";
      div.textContent = label;
      list.appendChild(div);
      lastLabel = label;
    }
    list.appendChild(createChatItem(chat));
  });
}

// ── Load a previous chat ──────────────────────────────────────────────────────
async function loadChat(chatId) {
  try {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, { headers: getAuthHeaders() });
    if (!res.ok) { showToast("Could not load chat.", "error"); return; }
    const { chat } = await res.json();

    state.messages        = [];
    state.currentChatId   = chatId;
    state.lastUserMessage = null;
    dom.messages.innerHTML = "";
    if (dom.welcome) dom.welcome.style.display = "none";

    chat.messages.forEach(m => appendMessage(m.role, m.content));
    highlightActiveChat(chatId);
    if (window.innerWidth < 768) dom.sidebar.classList.remove("open");
  } catch { showToast("Could not load chat.", "error"); }
}

// ── Rename chat ───────────────────────────────────────────────────────────────
async function renameChat(chatId, current) {
  const title = prompt("Rename chat:", current);
  if (!title?.trim() || title.trim() === current) return;
  try {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      method: "PATCH", headers: getAuthHeaders(),
      body: JSON.stringify({ title: title.trim() }),
    });
    if (!res.ok) { showToast("Could not rename.", "error"); return; }
    showToast("Renamed!", "success");
    await loadChatHistory();
    highlightActiveChat(state.currentChatId);
  } catch { showToast("Could not rename.", "error"); }
}

// ── Delete one chat ───────────────────────────────────────────────────────────
async function deleteChat(chatId) {
  if (!confirm("Delete this chat permanently?")) return;
  try {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      method: "DELETE", headers: getAuthHeaders(),
    });
    if (!res.ok) { showToast("Could not delete.", "error"); return; }
    if (state.currentChatId === chatId) clearChat();
    showToast("Chat deleted.", "success");
    await loadChatHistory();
  } catch { showToast("Could not delete.", "error"); }
}

// ── Share chat ────────────────────────────────────────────────────────────────
async function shareChat(chatId) {
  try {
    const res = await fetch(`${API_BASE}/chats/${chatId}/share`, {
      method: "POST", headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Could not share chat.", "error");
      return;
    }
    const { shareId } = await res.json();
    
    // Generate share URL (handles custom port or defaults to 5500 / 3000)
    const shareUrl = `${window.location.origin}/share.html?s=${shareId}`;

    // Display modal
    if (dom.shareLinkInput && dom.shareModal) {
      dom.shareLinkInput.value = shareUrl;
      dom.shareModal.classList.remove("hidden");
    }
  } catch (err) {
    showToast("Could not share chat.", "error");
  }
}

// ── Pin / Unpin chat ──────────────────────────────────────────────────────────
async function togglePinChat(chatId, isCurrentlyPinned) {
  try {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      method: "PATCH", headers: getAuthHeaders(),
      body: JSON.stringify({ isPinned: !isCurrentlyPinned }),
    });
    if (!res.ok) {
      showToast("Could not toggle pin status.", "error");
      return;
    }
    showToast(isCurrentlyPinned ? "Unpinned!" : "Pinned!", "success");
    await loadChatHistory();
    highlightActiveChat(state.currentChatId);
  } catch {
    showToast("Could not toggle pin status.", "error");
  }
}

// ── Delete all chats ──────────────────────────────────────────────────────────
async function deleteAllChats() {
  try {
    await fetch(`${API_BASE}/chats`, { method: "DELETE", headers: getAuthHeaders() });
    clearChat();
    showToast("All chats deleted.", "success");
    await loadChatHistory();
  } catch { showToast("Could not delete chats.", "error"); }
}

// ── Search chats ──────────────────────────────────────────────────────────────
async function searchChats(q) {
  if (!q) { await loadChatHistory(); return; }
  try {
    const res = await fetch(`${API_BASE}/chats/search?q=${encodeURIComponent(q)}`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const { chats } = await res.json();
    renderChatList(chats || []);
  } catch { /* silent */ }
}

// ── Highlight active chat ─────────────────────────────────────────────────────
function highlightActiveChat(id) {
  document.querySelectorAll(".ch-item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === id);
  });
}

// ── HTML escape ───────────────────────────────────────────────────────────────
function escapeHtml(s = "") {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
