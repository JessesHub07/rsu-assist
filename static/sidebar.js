// Shared sidebar/header behavior used by every page that includes
// templates/_sidebar.html (chat, FAQs, and future screens): theme toggle,
// collapse/mobile drawer, toast, current-user footer, and chat history.

const root = document.documentElement;

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("rsu_theme") || "light";
root.setAttribute("data-theme", savedTheme);
themeToggle.textContent = savedTheme === "light" ? "\u{1F319}" : "☀️";
themeToggle.setAttribute("aria-label", savedTheme === "light" ? "Switch to dark mode" : "Switch to light mode");

themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  themeToggle.textContent = next === "light" ? "\u{1F319}" : "☀️";
  themeToggle.setAttribute("aria-label", next === "light" ? "Switch to dark mode" : "Switch to light mode");
  localStorage.setItem("rsu_theme", next);
});

// ---------------------------------------------------------------------------
// Sidebar collapse (desktop) / mobile drawer
// ---------------------------------------------------------------------------

const appShell = document.getElementById("appShell");
const collapseToggle = document.getElementById("collapseToggle");

if (localStorage.getItem("rsu_sidebar_collapsed") === "true") {
  appShell.classList.add("sidebar-collapsed");
}

collapseToggle.addEventListener("click", () => {
  const collapsed = appShell.classList.toggle("sidebar-collapsed");
  localStorage.setItem("rsu_sidebar_collapsed", collapsed);
});

const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebarBackdrop");

function closeMobileSidebar() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("open");
  backdrop.hidden = true;
}

document.getElementById("sidebarToggle").addEventListener("click", () => {
  sidebar.classList.add("open");
  backdrop.hidden = false;
  backdrop.classList.add("open");
});

backdrop.addEventListener("click", closeMobileSidebar);

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

const toastEl = document.getElementById("toast");

function showToast(text) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.hidden = true; }, 2500);
}

// ---------------------------------------------------------------------------
// Current user / sidebar footer
// ---------------------------------------------------------------------------

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

function initialsFromDept(dept) {
  if (!dept) return "RSU";
  return dept.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3);
}

async function loadSidebarUser() {
  const sidebarDept = document.getElementById("sidebarDept");
  const footer = document.getElementById("sidebarFooter");

  try {
    const res = await fetch("/me");
    const data = await res.json();

    if (data.user) {
      document.getElementById("userAvatar").textContent = initials(data.user.full_name);
      document.getElementById("userName").textContent = data.user.full_name;

      if (data.user.user_type === "student") {
        sidebarDept.textContent = data.user.department;
        const badge = document.getElementById("levelBadge");
        badge.textContent = `${initialsFromDept(data.user.department)} · ${data.user.level}L`;
        badge.hidden = false;
      } else {
        sidebarDept.textContent = "Guest";
        document.getElementById("levelBadge").hidden = true;
      }
      footer.hidden = false;
    }
    return data.user;
  } catch (err) {
    return null;
  }
}

document.getElementById("signoutBtn").addEventListener("click", async () => {
  await fetch("/logout", { method: "POST" });
  window.location.href = "/";
});

// ---------------------------------------------------------------------------
// Chat history
// ---------------------------------------------------------------------------

const historyToggle = document.getElementById("historyToggle");
const historyPanel = document.getElementById("historyPanel");
const historyChevron = document.getElementById("historyChevron");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

async function loadHistory() {
  try {
    const res = await fetch("/history");
    const data = await res.json();
    historyList.innerHTML = "";
    const sessions = data.sessions || [];
    historyEmpty.hidden = sessions.length > 0;
    sessions.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item";
      btn.innerHTML = `<span class="h-preview"></span><span class="h-time"></span>`;
      btn.querySelector(".h-preview").textContent = s.preview || "(conversation)";
      btn.querySelector(".h-time").textContent = formatTime(s.last_active_at);
      btn.addEventListener("click", () => openSession(s.session_id));
      historyList.appendChild(btn);
    });
  } catch (err) {
    historyEmpty.textContent = "Couldn't load chat history.";
    historyEmpty.hidden = false;
  }
}

async function openSession(id) {
  localStorage.setItem("rsu_session_id", id);
  if (typeof window.tryLoadSession === "function") {
    const loaded = await window.tryLoadSession(id);
    if (!loaded) {
      showToast("Couldn't load that conversation.");
      return;
    }
    closeMobileSidebar();
  } else {
    window.location.href = "/chat-ui";
  }
}

historyToggle.addEventListener("click", () => {
  const isHidden = historyPanel.hidden;
  historyPanel.hidden = !isHidden;
  historyChevron.classList.toggle("open", isHidden);
  if (isHidden) loadHistory();
});

// ---------------------------------------------------------------------------
// Coming-soon nav items
// ---------------------------------------------------------------------------

document.querySelectorAll(".nav-soon").forEach((btn) => {
  btn.addEventListener("click", () => showToast(`${btn.dataset.label} is coming soon.`));
});

// ---------------------------------------------------------------------------
// New chat
// ---------------------------------------------------------------------------

document.getElementById("newChatBtn").addEventListener("click", () => {
  localStorage.removeItem("rsu_session_id");
  if (typeof window.startNewChat === "function") {
    window.startNewChat();
    closeMobileSidebar();
  } else {
    window.location.href = "/chat-ui";
  }
});
