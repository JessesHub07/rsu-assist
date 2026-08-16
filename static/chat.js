// Chat-page-specific behavior. Sidebar/header/theme/history plumbing lives
// in sidebar.js (shared across pages that include templates/_sidebar.html).

const messagesEl = document.getElementById("messages");
const emptyStateEl = document.getElementById("emptyState");
const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("messageInput");
const attachmentInputEl = document.getElementById("attachmentInput");
const attachmentPreviewEl = document.getElementById("attachmentPreview");
const attachmentNameEl = document.getElementById("attachmentName");
const attachmentRemoveEl = document.getElementById("attachmentRemove");
const projectBannerEl = document.getElementById("projectBanner");
const projectBannerNameEl = document.getElementById("projectBannerName");

// A chat opened from inside a project (?project=<id>) is scoped to it: it
// doesn't use the general chat's remembered session, and a fresh visit
// always starts a new project chat unless a specific ?session= is given
// (that's how a project's chat list, and bookmarks, reopen a past one).
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("project");
let sessionId = urlParams.get("session") || (projectId ? null : localStorage.getItem("rsu_session_id"));
let pendingAttachment = null;

// ---------------------------------------------------------------------------
// Empty state <-> messages
// ---------------------------------------------------------------------------

function showEmptyState() {
  emptyStateEl.hidden = false;
  messagesEl.hidden = true;
  messagesEl.innerHTML = "";
}

function showMessages() {
  emptyStateEl.hidden = true;
  messagesEl.hidden = false;
}

// Minimal, safe markdown: escapes HTML first (so nothing in the text can
// inject markup), then turns **bold** into <strong>. Nothing else from
// markdown is supported on purpose, this is just enough to match what
// Claude's replies actually use.
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdownLite(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function appendBubble(text, role, attachmentLabel) {
  showMessages();
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  if (attachmentLabel) {
    const chip = document.createElement("div");
    chip.className = "bubble-attachment";
    chip.textContent = attachmentLabel;
    bubble.appendChild(chip);
  }
  if (text) {
    const textNode = document.createElement("div");
    textNode.innerHTML = renderMarkdownLite(text);
    bubble.appendChild(textNode);
  }
  if (role === "bot" && text) {
    const bookmarkBtn = document.createElement("button");
    bookmarkBtn.type = "button";
    bookmarkBtn.className = "bubble-bookmark-btn";
    bookmarkBtn.setAttribute("aria-label", "Save this answer");
    bookmarkBtn.innerHTML = "&#9734;";
    bookmarkBtn.addEventListener("click", () => saveBookmark(text, bookmarkBtn));
    bubble.appendChild(bookmarkBtn);
  }
  messagesEl.appendChild(bubble);
  if (prefOn("rsu_pref_auto_scroll")) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  return bubble;
}

async function saveBookmark(text, btn) {
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    const res = await fetch("/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_type: "answer", reference_id: sessionId, title: text }),
    });
    if (!res.ok) throw new Error();
    btn.innerHTML = "&#9733;";
    btn.classList.add("saved");
    btn.setAttribute("aria-label", "Saved to Bookmarks");
  } catch (err) {
    btn.disabled = false;
    showToast("Couldn't save that bookmark. Try again.");
  }
}

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

function sendChip(text) {
  inputEl.value = text;
  formEl.requestSubmit();
}

// ---------------------------------------------------------------------------
// Auto-growing message box (textarea grows with content instead of
// scrolling text sideways; Enter sends, Shift+Enter inserts a newline)
// ---------------------------------------------------------------------------

const INPUT_MAX_HEIGHT = 140;

function autoResizeInput() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, INPUT_MAX_HEIGHT) + "px";
}

inputEl.addEventListener("input", autoResizeInput);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    formEl.requestSubmit();
  }
});

function renderChips(chips) {
  const container = document.getElementById("suggestedChips");
  container.innerHTML = "";
  chips.forEach((text) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.innerHTML = `<span></span><span class="chip-arrow">&rarr;</span>`;
    btn.querySelector("span").textContent = text;
    btn.addEventListener("click", () => sendChip(text));
    container.appendChild(btn);
  });
}

// ---------------------------------------------------------------------------
// Session loading
// ---------------------------------------------------------------------------

async function tryLoadSession(id) {
  try {
    const res = await fetch(`/session/${encodeURIComponent(id)}`);
    const data = await res.json();
    const msgs = data.messages || [];
    if (msgs.length === 0) return false;
    messagesEl.innerHTML = "";
    msgs.forEach((m) => appendBubble(m.content, m.role === "user" ? "user" : "bot"));
    return true;
  } catch (err) {
    return false;
  }
}
window.tryLoadSession = tryLoadSession;

function startNewChat() {
  sessionId = null;
  showEmptyState();
}
window.startNewChat = startNewChat;

async function initProjectBanner() {
  if (!projectId) return;
  try {
    const res = await fetch(`/projects/${projectId}`);
    if (!res.ok) return;
    const data = await res.json();
    projectBannerNameEl.textContent = data.project.name;
    projectBannerEl.href = `/project-ui/${projectId}`;
    projectBannerEl.hidden = false;
  } catch (err) {
    // Not critical, the chat still works without the banner.
  }
}

// ---------------------------------------------------------------------------
// Current user / greeting
// ---------------------------------------------------------------------------

async function initChatPage() {
  const greetingHeading = document.getElementById("greetingHeading");
  const greetingSubtext = document.getElementById("greetingSubtext");
  let chips = [
    "How do I apply to RSU?",
    "What faculties does RSU have?",
    "Where is the Computer Engineering department?",
  ];

  const user = await loadSidebarUser();
  initProjectBanner();

  if (user) {
    const firstName = user.full_name.split(" ")[0];
    greetingHeading.textContent = `Hi ${firstName}`;
    greetingSubtext.textContent = "How can I help you today?";

    if (user.user_type === "student") {
      chips = [
        `What are my ${user.level}L courses this semester?`,
        "When are my exams?",
        "What's the SIWES process for me?",
        "Who is the HOD?",
      ];
    }
  } else {
    greetingHeading.textContent = "Welcome to RSU Assist";
    greetingSubtext.textContent = "How can I help you today?";
  }

  if (prefOn("rsu_pref_suggested_questions")) {
    renderChips(chips);
  }

  if (sessionId) {
    const loaded = await tryLoadSession(sessionId);
    if (!loaded) showEmptyState();
  } else {
    showEmptyState();
  }

  const prefill = localStorage.getItem("rsu_prefill_message");
  if (prefill) {
    localStorage.removeItem("rsu_prefill_message");
    inputEl.value = prefill;
    formEl.requestSubmit();
  }
}

// ---------------------------------------------------------------------------
// Attachment picker (ephemeral, per-message: an image or PDF to ask about
// right now, not saved to the permanent knowledge base — that's what the
// My Documents page is for)
// ---------------------------------------------------------------------------

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

function clearAttachment() {
  pendingAttachment = null;
  attachmentInputEl.value = "";
  attachmentPreviewEl.hidden = true;
  attachmentNameEl.textContent = "";
}

attachmentInputEl.addEventListener("change", () => {
  const file = attachmentInputEl.files[0];
  if (!file) return;

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    showToast("Attach an image (PNG/JPEG/WebP/GIF) or a PDF.");
    attachmentInputEl.value = "";
    return;
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    showToast("That file is too large (max 5MB).");
    attachmentInputEl.value = "";
    return;
  }

  pendingAttachment = file;
  attachmentNameEl.textContent = file.name;
  attachmentPreviewEl.hidden = false;
});

attachmentRemoveEl.addEventListener("click", clearAttachment);

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = inputEl.value.trim();
  const attachment = pendingAttachment;
  if (!message && !attachment) return;

  appendBubble(message, "user", attachment ? attachment.name : null);
  inputEl.value = "";
  autoResizeInput();
  clearAttachment();
  const typingBubble = appendBubble("typing...", "bot typing");

  const formData = new FormData();
  formData.append("message", message);
  if (sessionId) formData.append("session_id", sessionId);
  if (projectId) formData.append("project_id", projectId);
  if (attachment) formData.append("attachment", attachment);
  formData.append("save_history", prefOn("rsu_pref_save_history"));
  formData.append("remember_context", prefOn("rsu_pref_remember_context"));

  try {
    const res = await fetch("/chat", { method: "POST", body: formData });
    const data = await res.json();

    if (data.session_id) {
      sessionId = data.session_id;
      if (!projectId) localStorage.setItem("rsu_session_id", sessionId);
    }

    typingBubble.remove();
    appendBubble(data.reply || data.error || "Sorry, something went wrong.", "bot");
  } catch (err) {
    typingBubble.remove();
    appendBubble("Sorry, I couldn't reach the server.", "bot");
  }
});

initChatPage();
