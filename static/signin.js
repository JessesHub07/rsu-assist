const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

const tabPills = document.getElementById("tabPills");
const tabSignin = document.getElementById("tabSignin");
const tabSignup = document.getElementById("tabSignup");
const signinForm = document.getElementById("signinForm");
const signupForm = document.getElementById("signupForm");
const forgotForm = document.getElementById("forgotForm");
const mainSwitchLine = document.getElementById("mainSwitchLine");
const switchPrompt = document.getElementById("switchPrompt");
const switchLink = document.getElementById("switchLink");
const formError = document.getElementById("formError");

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

const EYE_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.4 17.4C15.7 18.5 13.9 19 12 19c-7 0-11-7-11-7a19.4 19.4 0 0 1 5-5.9M9.9 4.6A10.6 10.6 0 0 1 12 4.5c7 0 11 7.5 11 7.5a19.3 19.3 0 0 1-3.1 4.1M14.1 14.1a3 3 0 1 1-4.2-4.2"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

document.querySelectorAll(".toggle-password").forEach((btn) => {
  btn.innerHTML = EYE_ICON;
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.innerHTML = isHidden ? EYE_OFF_ICON : EYE_ICON;
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
  const isForgot = mode === "forgot";

  tabPills.hidden = isForgot;
  mainSwitchLine.hidden = isForgot;
  tabSignin.classList.toggle("active", isSignin);
  tabSignup.classList.toggle("active", mode === "signup");
  tabSignin.setAttribute("aria-selected", isSignin);
  tabSignup.setAttribute("aria-selected", mode === "signup");
  signinForm.hidden = !isSignin;
  signupForm.hidden = mode !== "signup";
  forgotForm.hidden = !isForgot;
  switchPrompt.textContent = isSignin ? "Don't have an account?" : "Already have an account?";
  switchLink.textContent = isSignin ? "Sign up" : "Sign in";

  if (isForgot) resetForgotForm();
}

tabSignin.addEventListener("click", () => setMode("signin"));
tabSignup.addEventListener("click", () => setMode("signup"));
switchLink.addEventListener("click", (e) => {
  e.preventDefault();
  setMode(signinForm.hidden ? "signin" : "signup");
});
document.getElementById("forgotLink").addEventListener("click", (e) => {
  e.preventDefault();
  setMode("forgot");
});
document.getElementById("backToSigninLink").addEventListener("click", (e) => {
  e.preventDefault();
  setMode("signin");
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

// ---------------------------------------------------------------------------
// Forgot password (matric number -> emailed OTP -> new password)
// ---------------------------------------------------------------------------

const forgotOtpFields = document.getElementById("forgotOtpFields");
const forgotStatus = document.getElementById("forgotStatus");
const forgotSubmit = document.getElementById("forgotSubmit");
let otpRequested = false;

function resetForgotForm() {
  otpRequested = false;
  forgotForm.reset();
  forgotOtpFields.hidden = true;
  forgotStatus.hidden = true;
  forgotSubmit.textContent = "Send reset code";
}

function showForgotStatus(message) {
  forgotStatus.textContent = message;
  forgotStatus.hidden = false;
}

forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const matric_number = document.getElementById("forgotMatric").value.trim();

  if (!matric_number) {
    showError("Enter your matric number.");
    return;
  }

  if (!otpRequested) {
    forgotSubmit.disabled = true;
    forgotSubmit.textContent = "Sending...";
    try {
      const res = await fetch("/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matric_number }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Something went wrong. Please try again.");
        forgotSubmit.disabled = false;
        forgotSubmit.textContent = "Send reset code";
        return;
      }
      showForgotStatus(data.message || "If that matric number is on record, a reset code has been sent.");
      otpRequested = true;
      forgotOtpFields.hidden = false;
      forgotSubmit.textContent = "Reset password";
    } catch (err) {
      showError("Couldn't reach the server. Please try again.");
    }
    forgotSubmit.disabled = false;
    return;
  }

  const otp = document.getElementById("forgotOtp").value.trim();
  const new_password = document.getElementById("forgotNewPassword").value;
  const confirm_password = document.getElementById("forgotConfirmPassword").value;

  if (!otp) {
    showError("Enter the code we emailed you.");
    return;
  }
  if (new_password.length < 8) {
    showError("New password must be at least 8 characters.");
    return;
  }
  if (new_password !== confirm_password) {
    showError("Passwords don't match.");
    return;
  }

  forgotSubmit.disabled = true;
  forgotSubmit.textContent = "Resetting...";
  try {
    const res = await fetch("/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matric_number, otp, new_password, confirm_password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "Something went wrong. Please try again.");
      forgotSubmit.disabled = false;
      forgotSubmit.textContent = "Reset password";
      return;
    }
    showForgotStatus("Password reset. You can sign in with your new password now.");
    setTimeout(() => setMode("signin"), 1800);
  } catch (err) {
    showError("Couldn't reach the server. Please try again.");
    forgotSubmit.disabled = false;
    forgotSubmit.textContent = "Reset password";
  }
});
