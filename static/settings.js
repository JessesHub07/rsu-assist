// Settings page: account (name/email) and theme. Applies theme changes via
// the shared window.applyTheme() from sidebar.js so every other page stays
// in sync.

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

async function initAccountSection() {
  const user = await loadSidebarUser();

  if (!user) {
    profileForm.hidden = true;
    profileSaveStatus.textContent = "Sign in to edit your profile.";
    return;
  }

  profileFullName.value = user.full_name || "";
  profileEmail.value = user.email || "";

  if (user.user_type === "student") {
    readonlyFields.hidden = false;
    document.getElementById("profileMatric").value = user.matric_number || "";
    document.getElementById("profileDepartment").value = user.department || "";
    document.getElementById("profileLevel").value = `${user.level}L`;
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
    }
  } catch (err) {
    profileSaveStatus.textContent = "Couldn't reach the server.";
  }
  profileSaveBtn.disabled = false;
});

initAccountSection();
