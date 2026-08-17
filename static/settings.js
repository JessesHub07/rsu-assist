// Settings page: account details + password, appearance (theme), and chat
// preferences. Theme applies via the shared window.applyTheme() from
// sidebar.js so every other page stays in sync. Chat preferences are
// stored in localStorage and read by chat.js/sidebar.js on this device.

// ---------------------------------------------------------------------------
// Sub-nav panel switching
// ---------------------------------------------------------------------------

const subnavItems = document.querySelectorAll(".settings-subnav-item[data-panel]");
const panels = document.querySelectorAll(".settings-panel");

subnavItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    subnavItems.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    panels.forEach((p) => { p.hidden = p.id !== `panel-${btn.dataset.panel}`; });
    // Switching panels doesn't reset scroll on its own, so if a student was
    // scrolled down reading a taller panel (e.g. Chat's toggles) and then
    // taps another category, the newly shown panel can start off-screen
    // below the fold. Bring it into view instead of leaving them to scroll.
    document.getElementById(`panel-${btn.dataset.panel}`).scrollIntoView({ behavior: "auto", block: "start" });
  });
});

document.querySelectorAll(".settings-subnav-soon").forEach((btn) => {
  btn.addEventListener("click", () => showToast(`${btn.dataset.label} settings are coming soon.`));
});

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const themeOptionButtons = document.querySelectorAll(".theme-option");

function markActiveTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  themeOptionButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === current);
  });
}

themeOptionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    applyTheme(btn.dataset.theme);
    markActiveTheme();
  });
});

markActiveTheme();

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

const profileForm = document.getElementById("profileForm");
const profileFullName = document.getElementById("profileFullName");
const profileEmail = document.getElementById("profileEmail");
const readonlyFields = document.getElementById("readonlyFields");
const profileSaveStatus = document.getElementById("profileSaveStatus");
const profileSaveBtn = document.getElementById("profileSaveBtn");
const passwordSection = document.getElementById("passwordSection");

async function initAccountSection() {
  const user = await loadSidebarUser();

  if (!user) {
    profileForm.hidden = true;
    profileSaveStatus.textContent = "Sign in to edit your profile.";
    return;
  }

  document.getElementById("settingsAvatar").textContent = initials(user.full_name);
  document.getElementById("settingsProfileName").textContent = user.full_name;

  profileFullName.value = user.full_name || "";
  profileEmail.value = user.email || "";

  if (user.user_type === "student") {
    document.getElementById("settingsProfileMeta").textContent = `${user.matric_number} · ${user.department} · ${user.level}L`;
    readonlyFields.hidden = false;
    document.getElementById("profileMatric").value = user.matric_number || "";
    document.getElementById("profileDepartment").value = user.department || "";
    document.getElementById("profileLevel").value = `${user.level}L`;
    passwordSection.hidden = false;
  } else {
    document.getElementById("settingsProfileMeta").textContent = "Guest account";
  }
}

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const full_name = profileFullName.value.trim();
  const email = profileEmail.value.trim();

  if (!full_name) {
    profileSaveStatus.textContent = "Full name can't be empty.";
    return;
  }

  profileSaveBtn.disabled = true;
  profileSaveStatus.textContent = "Saving...";

  try {
    const res = await fetch("/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      profileSaveStatus.textContent = data.error || "Couldn't save your changes.";
    } else {
      profileSaveStatus.textContent = "Saved.";
      document.getElementById("userName").textContent = data.user.full_name;
      document.getElementById("userAvatar").textContent = initials(data.user.full_name);
      document.getElementById("settingsProfileName").textContent = data.user.full_name;
      document.getElementById("settingsAvatar").textContent = initials(data.user.full_name);
    }
  } catch (err) {
    profileSaveStatus.textContent = "Couldn't reach the server.";
  }
  profileSaveBtn.disabled = false;
});

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

const passwordForm = document.getElementById("passwordForm");
const passwordSaveStatus = document.getElementById("passwordSaveStatus");
const passwordSaveBtn = document.getElementById("passwordSaveBtn");

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const current_password = document.getElementById("currentPassword").value;
  const new_password = document.getElementById("newPassword").value;
  const confirm_password = document.getElementById("confirmNewPassword").value;

  if (new_password.length < 8) {
    passwordSaveStatus.textContent = "New password must be at least 8 characters.";
    return;
  }
  if (new_password !== confirm_password) {
    passwordSaveStatus.textContent = "New passwords don't match.";
    return;
  }

  passwordSaveBtn.disabled = true;
  passwordSaveStatus.textContent = "Updating...";

  try {
    const res = await fetch("/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password, new_password, confirm_password }),
    });
    const data = await res.json();
    if (!res.ok) {
      passwordSaveStatus.textContent = data.error || "Couldn't update your password.";
    } else {
      passwordSaveStatus.textContent = "Password updated.";
      passwordForm.reset();
    }
  } catch (err) {
    passwordSaveStatus.textContent = "Couldn't reach the server.";
  }
  passwordSaveBtn.disabled = false;
});

// ---------------------------------------------------------------------------
// Chat preferences
// ---------------------------------------------------------------------------

const CHAT_PREF_TOGGLES = [
  { id: "toggleSaveHistory", key: "rsu_pref_save_history" },
  { id: "toggleAutoScroll", key: "rsu_pref_auto_scroll" },
  { id: "toggleRememberContext", key: "rsu_pref_remember_context" },
  { id: "toggleSuggestedQuestions", key: "rsu_pref_suggested_questions" },
];

CHAT_PREF_TOGGLES.forEach(({ id, key }) => {
  const btn = document.getElementById(id);
  const setState = (on) => {
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-checked", on);
  };
  setState(prefOn(key));
  btn.addEventListener("click", () => {
    const next = !prefOn(key);
    localStorage.setItem(key, next);
    setState(next);
  });
});

document.getElementById("settingsContextNote").textContent =
  "Chats are automatically scoped to your department and level, this improves answer accuracy for your specific curriculum.";

// ---------------------------------------------------------------------------
// Documents / Bookmarks stats
// ---------------------------------------------------------------------------

async function loadDocumentsStat() {
  try {
    const res = await fetch("/documents");
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById("settingsDocCount").textContent = (data.documents || []).length;
  } catch (err) {
    // Leave the placeholder "-" if this fails, not critical to the page.
  }
}

async function loadBookmarksStat() {
  try {
    const res = await fetch("/bookmarks");
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById("settingsBookmarkCount").textContent = (data.bookmarks || []).length;
  } catch (err) {
    // Leave the placeholder "-" if this fails, not critical to the page.
  }
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 3))}@${domain}`;
}

async function loadSecurityPanel() {
  try {
    const res = await fetch("/me");
    const data = await res.json();
    const email = data.user && data.user.email;
    const emailEl = document.getElementById("settingsRecoveryEmail");
    const noEmailEl = document.getElementById("settingsNoRecoveryEmail");
    if (email) {
      emailEl.textContent = maskEmail(email);
    } else {
      emailEl.textContent = "None on file";
      noEmailEl.hidden = false;
    }
  } catch (err) {
    // Leave the placeholder "-" if this fails, not critical to the page.
  }
}

const signOutEverywhereBtn = document.getElementById("signOutEverywhereBtn");
const signOutEverywhereStatus = document.getElementById("signOutEverywhereStatus");

signOutEverywhereBtn.addEventListener("click", async () => {
  signOutEverywhereBtn.disabled = true;
  signOutEverywhereStatus.textContent = "Signing out other devices...";
  try {
    const res = await fetch("/sign-out-everywhere", { method: "POST" });
    const data = await res.json();
    signOutEverywhereStatus.textContent = res.ok
      ? "Done. Every other device has been signed out."
      : (data.error || "Couldn't do that right now.");
  } catch (err) {
    signOutEverywhereStatus.textContent = "Couldn't reach the server.";
  }
  signOutEverywhereBtn.disabled = false;
});

initAccountSection();
loadDocumentsStat();
loadBookmarksStat();
loadSecurityPanel();
