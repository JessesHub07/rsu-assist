// Settings page: currently just the theme control (the only setting that
// isn't tied to a student's own record). Applies via the shared
// window.applyTheme() from sidebar.js so every other page stays in sync.

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
loadSidebarUser();
