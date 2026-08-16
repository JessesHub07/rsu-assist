// Project detail page: project info (edit/delete), the chats that live
// inside this project, and documents scoped to this project only.

const projectId = document.body.dataset.projectId;

const bodyEl = document.getElementById("projectDetailBody");
const notFoundEl = document.getElementById("projectNotFound");

const nameEl = document.getElementById("projectDetailName");
const statusEl = document.getElementById("projectDetailStatus");
const descEl = document.getElementById("projectDetailDesc");
const tagsEl = document.getElementById("projectDetailTags");
const newChatBtn = document.getElementById("projectNewChatBtn");

const chatListEl = document.getElementById("projectChatList");
const chatEmptyEl = document.getElementById("projectChatEmpty");

const dropzoneEl = document.getElementById("projectDropzone");
const fileInputEl = document.getElementById("projectFileInput");
const uploadStatusEl = document.getElementById("projectUploadStatus");
const documentsListEl = document.getElementById("projectDocumentsList");
const documentsEmptyEl = document.getElementById("projectDocumentsEmpty");

const editBtn = document.getElementById("editProjectBtn");
const deleteBtn = document.getElementById("deleteProjectBtn");
const modalBackdrop = document.getElementById("projectModalBackdrop");
const modalCancel = document.getElementById("projectModalCancel");
const editForm = document.getElementById("projectEditForm");
const modalError = document.getElementById("projectModalError");
const modalSaveBtn = document.getElementById("projectModalSave");

let currentProject = null;

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

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function renderProject(project) {
  currentProject = project;
  nameEl.textContent = project.name;
  statusEl.textContent = project.status;
  statusEl.className = `project-status-badge ${statusClass(project.status)}`;
  descEl.textContent = project.description || "No description yet.";

  tagsEl.innerHTML = "";
  (project.tags || "").split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => {
    const chip = document.createElement("span");
    chip.className = "project-tag";
    chip.textContent = t;
    tagsEl.appendChild(chip);
  });
}

function renderChats(sessions) {
  chatListEl.innerHTML = "";
  chatEmptyEl.hidden = sessions.length > 0;
  sessions.forEach((s) => {
    const item = document.createElement("a");
    item.className = "project-chat-item";
    item.href = `/chat-ui?project=${projectId}&session=${encodeURIComponent(s.session_id)}`;
    item.innerHTML = `<span class="preview"></span><span class="time"></span>`;
    item.querySelector(".preview").textContent = s.preview || "(conversation)";
    item.querySelector(".time").textContent = formatTime(s.last_active_at);
    chatListEl.appendChild(item);
  });
}

function renderDocuments(docs) {
  documentsListEl.innerHTML = "";
  documentsEmptyEl.hidden = docs.length > 0;
  docs.forEach((doc) => {
    const card = document.createElement("div");
    card.className = "document-card";
    card.innerHTML = `
      <div class="document-icon">PDF</div>
      <div class="document-info">
        <div class="document-name"></div>
        <div class="document-meta"></div>
      </div>
    `;
    card.querySelector(".document-name").textContent = doc.filename;
    card.querySelector(".document-meta").textContent =
      `${doc.chunk_count} section${doc.chunk_count === 1 ? "" : "s"} learned · ${formatDate(doc.uploaded_at)}`;
    documentsListEl.appendChild(card);
  });
}

async function loadProject() {
  try {
    const res = await fetch(`/projects/${projectId}`);
    if (!res.ok) {
      notFoundEl.hidden = false;
      return;
    }
    const data = await res.json();
    renderProject(data.project);
    renderChats(data.sessions || []);
    renderDocuments(data.documents || []);
    bodyEl.hidden = false;
  } catch (err) {
    notFoundEl.hidden = false;
  }
}

newChatBtn.href = `/chat-ui?project=${projectId}`;

// ---------------------------------------------------------------------------
// Upload (scoped to this project)
// ---------------------------------------------------------------------------

async function uploadFile(file) {
  if (file.type !== "application/pdf") {
    uploadStatusEl.textContent = "Only PDF files are supported.";
    return;
  }
  uploadStatusEl.textContent = `Uploading ${file.name}...`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("project_id", projectId);

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.error) {
      uploadStatusEl.textContent = `Error: ${data.error}`;
      return;
    }
    uploadStatusEl.textContent = `${data.filename} learned (${data.chunks_added} sections).`;
    loadProject();
  } catch (err) {
    uploadStatusEl.textContent = "Upload failed. Please try again.";
  }
}

fileInputEl.addEventListener("change", () => {
  const file = fileInputEl.files[0];
  if (file) uploadFile(file);
  fileInputEl.value = "";
});

["dragenter", "dragover"].forEach((evt) => {
  dropzoneEl.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzoneEl.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((evt) => {
  dropzoneEl.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzoneEl.classList.remove("drag-over");
  });
});

dropzoneEl.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

// ---------------------------------------------------------------------------
// Edit / delete
// ---------------------------------------------------------------------------

editBtn.addEventListener("click", () => {
  document.getElementById("projectName").value = currentProject.name;
  document.getElementById("projectDescription").value = currentProject.description || "";
  document.getElementById("projectStatus").value = currentProject.status;
  document.getElementById("projectTags").value = currentProject.tags || "";
  modalError.hidden = true;
  modalBackdrop.hidden = false;
});

modalCancel.addEventListener("click", () => { modalBackdrop.hidden = true; });
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) modalBackdrop.hidden = true;
});

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("projectName").value.trim();
  if (!name) {
    modalError.textContent = "Give your project a name.";
    modalError.hidden = false;
    return;
  }

  modalSaveBtn.disabled = true;
  try {
    const res = await fetch(`/projects/${projectId}`, {
      method: "PATCH",
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
      modalError.textContent = data.error || "Couldn't save your changes.";
      modalSaveBtn.disabled = false;
      return;
    }
    renderProject(data.project);
    modalBackdrop.hidden = true;
    modalSaveBtn.disabled = false;
  } catch (err) {
    modalError.textContent = "Couldn't reach the server.";
    modalError.hidden = false;
    modalSaveBtn.disabled = false;
  }
});

deleteBtn.addEventListener("click", async () => {
  if (!confirm(`Delete "${currentProject.name}"? Its chats and documents will move back to your general history, not be deleted.`)) {
    return;
  }
  try {
    await fetch(`/projects/${projectId}`, { method: "DELETE" });
    window.location.href = "/projects-ui";
  } catch (err) {
    showToast("Couldn't delete the project. Try again.");
  }
});

loadSidebarUser();
loadProject();
