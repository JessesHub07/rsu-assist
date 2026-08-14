// Home dashboard: greeting, real usage stats, quick actions, recent chats.
// Stats are derived from the existing /history and /documents endpoints
// rather than a dedicated summary route.

const homeGreetingEl = document.getElementById("homeGreeting");
const homeSubtextEl = document.getElementById("homeSubtext");
const statConversationsEl = document.getElementById("statConversations");
const statDocumentsEl = document.getElementById("statDocuments");
const statLevelCardEl = document.getElementById("statLevelCard");
const statLevelEl = document.getElementById("statLevel");
const recentListEl = document.getElementById("homeRecentList");
const recentEmptyEl = document.getElementById("homeRecentEmpty");

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch (e) {
    return "";
  }
}

async function loadStats() {
  try {
    const [historyRes, documentsRes] = await Promise.all([
      fetch("/history"),
      fetch("/documents"),
    ]);
    const historyData = await historyRes.json();
    const documentsData = documentsRes.ok ? await documentsRes.json() : { documents: [] };

    const sessions = historyData.sessions || [];
    statConversationsEl.textContent = sessions.length;
    statDocumentsEl.textContent = (documentsData.documents || []).length;

    recentListEl.innerHTML = "";
    const recent = sessions.slice(0, 5);
    recentEmptyEl.hidden = recent.length > 0;
    recent.forEach((s) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "home-recent-item";
      item.innerHTML = `<span class="preview"></span><span class="time"></span>`;
      item.querySelector(".preview").textContent = s.preview || "(conversation)";
      item.querySelector(".time").textContent = formatTime(s.last_active_at);
      item.addEventListener("click", () => openSession(s.session_id));
      recentListEl.appendChild(item);
    });
  } catch (err) {
    recentEmptyEl.textContent = "Couldn't load your activity right now.";
    recentEmptyEl.hidden = false;
  }
}

async function initHomePage() {
  const user = await loadSidebarUser();

  if (user) {
    const firstName = user.full_name.split(" ")[0];
    homeGreetingEl.textContent = `Welcome back, ${firstName}`;
    if (user.user_type === "student") {
      homeSubtextEl.textContent = `${user.department} · here's what's going on with your account.`;
      statLevelEl.textContent = `${user.level}L`;
      statLevelCardEl.hidden = false;
    } else {
      homeSubtextEl.textContent = "Here's what's going on with your account.";
    }
    loadStats();
  } else {
    homeGreetingEl.textContent = "Welcome to RSU Assist";
    homeSubtextEl.textContent = "Sign in to see your activity and saved documents.";
    recentEmptyEl.textContent = "Sign in to see your recent conversations.";
    recentEmptyEl.hidden = false;
  }
}

initHomePage();
