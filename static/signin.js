const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

const tabSignin = document.getElementById("tabSignin");
const tabSignup = document.getElementById("tabSignup");
const signinForm = document.getElementById("signinForm");
const signupForm = document.getElementById("signupForm");
const switchPrompt = document.getElementById("switchPrompt");
const switchLink = document.getElementById("switchLink");
const formError = document.getElementById("formError");

const savedTheme = localStorage.getItem("rsu_theme") || "light";
root.setAttribute("data-theme", savedTheme);
themeToggle.textContent = savedTheme === "light" ? "Dark Mode" : "Light Mode";

themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  themeToggle.textContent = next === "light" ? "Dark Mode" : "Light Mode";
  localStorage.setItem("rsu_theme", next);
});

document.querySelectorAll(".toggle-password").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
});

function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function setMode(mode) {
  clearError();
  const isSignin = mode === "signin";
  tabSignin.classList.toggle("active", isSignin);
  tabSignup.classList.toggle("active", !isSignin);
  tabSignin.setAttribute("aria-selected", isSignin);
  tabSignup.setAttribute("aria-selected", !isSignin);
  signinForm.hidden = !isSignin;
  signupForm.hidden = isSignin;
  switchPrompt.textContent = isSignin ? "Don't have an account?" : "Already have an account?";
  switchLink.textContent = isSignin ? "Sign up" : "Sign in";
}

tabSignin.addEventListener("click", () => setMode("signin"));
tabSignup.addEventListener("click", () => setMode("signup"));
switchLink.addEventListener("click", (e) => {
  e.preventDefault();
  setMode(signinForm.hidden ? "signin" : "signup");
});

async function submitJSON(url, payload, btn, busyText) {
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = busyText;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "Something went wrong. Please try again.");
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }
    window.location.href = data.redirect || "/chat-ui";
  } catch (err) {
    showError("Couldn't reach the server. Please try again.");
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

signinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearError();
  const full_name = document.getElementById("signinFullName").value.trim();
  const identifier = document.getElementById("identifier").value.trim();
  const password = document.getElementById("password").value;

  if (!full_name) {
    showError("Enter your full name.");
    return;
  }

  submitJSON("/login", { full_name, identifier, password }, document.getElementById("signinSubmit"), "Signing in...");
});

signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearError();
  const full_name = document.getElementById("signupFullName").value.trim();
  const matric_number = document.getElementById("signupMatric").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirm_password = document.getElementById("signupConfirm").value;

  if (!full_name) {
    showError("Enter your full name.");
    return;
  }
  if (password.length < 8) {
    showError("Password must be at least 8 characters.");
    return;
  }
  if (password !== confirm_password) {
    showError("Passwords don't match.");
    return;
  }

  submitJSON(
    "/signup",
    { full_name, matric_number, password, confirm_password },
    document.getElementById("signupSubmit"),
    "Setting up..."
  );
});
