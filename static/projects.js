// Projects list page: grid of project cards + a modal to create new ones.

const gridEl = document.getElementById("projectsGrid");
const emptyEl = document.getElementById("projectsEmpty");
const newBtn = document.getElementById("newProjectBtn");
const modalBackdrop = document.getElementById("projectModalBackdrop");
const modalCancel = document.getElementById("projectModalCancel");
const projectForm = document.getElementById("projectForm");
const modalError = document.getElementById("projectModalError");
const modalSaveBtn = document.getElementById("projectModalSave");

function statusClass(status) {
  return "project-status-" + status.toLowerCase().replace(/\s+/g, "-");
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return "";
  }
}

function renderProjects(list) {
  gridEl.innerHTML = "";
  emptyEl.hidden = list.length > 0;

  list.forEach((p) => {
    const card = document.createElement("a");
    card.className = "project-card";
    card.href = `/project-ui/${p.id}`;

    const tags = (p.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

    card.innerHTML = `
      <div class="project-card-top">
        <div class="project-folder-icon">&#128193;</div>
        <span class="project-status-badge ${statusClass(p.status)}"></span>
      </div>
      <div class="project-card-title"></div>
      <div class="project-card-desc"></div>
      <div class="project-card-tags"></div>
      <div class="project-card-meta"></div>
    `;
    card.querySelector(".project-status-badge").textContent = p.status;
    card.querySelector(".project-card-title").textContent = p.name;
    card.querySelector(".project-card-desc").textContent = p.description || "No description yet.";
    const tagsEl = card.querySelector(".project-card-tags");
    tags.forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "project-tag";
      chip.textContent = t;
      tagsEl.appendChild(chip);
    });
    card.querySelector(".project-card-meta").textContent = `Updated ${formatDate(p.updated_at)}`;

    gridEl.appendChild(card);
  });
}

async function loadProjects() {
  try {
    const res = await fetch("/projects");
    if (res.status === 401) {
      emptyEl.textContent = "Sign in to create and view projects.";
      emptyEl.hidden = false;
      newBtn.hidden = true;
      return;
    }
    const data = await res.json();
    renderProjects(data.projects || []);
  } catch (err) {
    emptyEl.textContent = "Couldn't load your projects.";
    emptyEl.hidden = false;
  }
}

function openModal() {
  projectForm.reset();
  modalError.hidden = true;
  modalBackdrop.hidden = false;
}

function closeModal() {
  modalBackdrop.hidden = true;
}

newBtn.addEventListener("click", openModal);
modalCancel.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

projectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("projectName").value.trim();
  if (!name) {
    modalError.textContent = "Give your project a name.";
    modalError.hidden = false;
    return;
  }

  modalSaveBtn.disabled = true;
  try {
    const res = await fetch("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: document.getElementById("projectDescription").value.trim(),
        status: document.getElementById("projectStatus").value,
        tags: document.getElementById("projectTags").value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      modalError.textContent = data.error || "Couldn't create the project.";
      modalError.hidden = false;
      modalSaveBtn.disabled = false;
      return;
    }
    window.location.href = `/project-ui/${data.project.id}`;
  } catch (err) {
    modalError.textContent = "Couldn't reach the server.";
    modalError.hidden = false;
    modalSaveBtn.disabled = false;
  }
});

loadSidebarUser();
loadProjects();
