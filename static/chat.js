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

let sessionId = localStorage.getItem("rsu_session_id");
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
    textNode.textContent = text;
    bubble.appendChild(textNode);
  }
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

function sendChip(text) {
  inputEl.value = text;
  formEl.requestSubmit();
}

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

// ---------------------------------------------------------------------------
// Current user / greeting
// ---------------------------------------------------------------------------

async function initChatPage() {
  const greetingHeading = document.getElementById("greetingHeading");
  const greetingSubtext = document.getElementById("greetingSubtext");
  const headerTitle = document.getElementById("headerTitle");
  const headerSubtitle = document.getElementById("headerSubtitle");
  let chips = [
    "How do I apply to RSU?",
    "What faculties does RSU have?",
    "Where is the Computer Engineering department?",
  ];

  const user = await loadSidebarUser();

  if (user) {
    const firstName = user.full_name.split(" ")[0];
    headerTitle.textContent = "RSU Assist";
    greetingHeading.textContent = `Hi ${firstName}`;
    greetingSubtext.textContent = "What would you like to know today?";

    if (user.user_type === "student") {
      headerSubtitle.textContent = `${user.department} · ${user.level}L`;
      chips = [
        `What are my ${user.level}L courses this semester?`,
        "When are my exams?",
        "What's the SIWES process for me?",
        "Who is the HOD?",
      ];
    } else {
      headerSubtitle.textContent = "Browsing as a guest";
    }
  } else {
    greetingHeading.textContent = "Welcome to RSU Assist";
    greetingSubtext.textContent = "What would you like to know today?";
  }

  renderChips(chips);

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
  clearAttachment();
  const typingBubble = appendBubble("typing...", "bot typing");

  const formData = new FormData();
  formData.append("message", message);
  if (sessionId) formData.append("session_id", sessionId);
  if (attachment) formData.append("attachment", attachment);

  try {
    const res = await fetch("/chat", { method: "POST", body: formData });
    const data = await res.json();

    if (data.session_id) {
      sessionId = data.session_id;
      localStorage.setItem("rsu_session_id", sessionId);
    }

    typingBubble.remove();
    appendBubble(data.reply || data.error || "Sorry, something went wrong.", "bot");
  } catch (err) {
    typingBubble.remove();
    appendBubble("Sorry, I couldn't reach the server.", "bot");
  }
});

initChatPage();
