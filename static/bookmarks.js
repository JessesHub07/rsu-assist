// Bookmarks page: lists saved answers (star button on a bot reply in chat),
// each links back to the conversation it came from, and can be removed.

const listEl = document.getElementById("bookmarksList");
const emptyEl = document.getElementById("bookmarksEmpty");

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return "";
  }
}

function renderBookmarks(bookmarks) {
  listEl.innerHTML = "";
  emptyEl.hidden = bookmarks.length > 0;

  bookmarks.forEach((b) => {
    const card = document.createElement("div");
    card.className = "bookmark-card";
    card.innerHTML = `
      <div class="bookmark-card-top">
        <p class="bookmark-card-text"></p>
        <span class="bookmark-card-date"></span>
      </div>
      <div class="bookmark-card-actions"></div>
    `;
    card.querySelector(".bookmark-card-text").textContent = b.title;
    card.querySelector(".bookmark-card-date").textContent = formatDate(b.created_at);

    const actions = card.querySelector(".bookmark-card-actions");

    if (b.reference_id) {
      const openLink = document.createElement("a");
      openLink.className = "bookmark-action-btn";
      openLink.href = `/chat-ui?session=${encodeURIComponent(b.reference_id)}`;
      openLink.textContent = "Open conversation";
      actions.appendChild(openLink);
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "bookmark-action-btn bookmark-action-remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      removeBtn.disabled = true;
      try {
        await fetch(`/bookmarks/${b.id}`, { method: "DELETE" });
        card.remove();
        if (!listEl.children.length) emptyEl.hidden = false;
      } catch (err) {
        showToast("Couldn't remove that bookmark.");
        removeBtn.disabled = false;
      }
    });
    actions.appendChild(removeBtn);

    listEl.appendChild(card);
  });
}

async function loadBookmarks() {
  try {
    const res = await fetch("/bookmarks");
    if (res.status === 401) {
      emptyEl.textContent = "Sign in to view your bookmarks.";
      emptyEl.hidden = false;
      return;
    }
    const data = await res.json();
    renderBookmarks(data.bookmarks || []);
  } catch (err) {
    emptyEl.textContent = "Couldn't load your bookmarks.";
    emptyEl.hidden = false;
  }
}

loadSidebarUser();
loadBookmarks();
