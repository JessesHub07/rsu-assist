// My Documents page: upload PDFs (private, permanently learned into this
// student's own chat context) and list previously uploaded ones.

const dropzoneEl = document.getElementById("documentsDropzone");
const fileInputEl = document.getElementById("documentFileInput");
const uploadStatusEl = document.getElementById("documentsUploadStatus");
const listEl = document.getElementById("documentsList");
const emptyEl = document.getElementById("documentsEmpty");

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return "";
  }
}

function renderDocuments(docs) {
  listEl.innerHTML = "";
  emptyEl.hidden = docs.length > 0;

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
    listEl.appendChild(card);
  });
}

async function loadDocuments() {
  try {
    const res = await fetch("/documents");
    if (res.status === 401) {
      emptyEl.textContent = "Sign in to upload and view your documents.";
      emptyEl.hidden = false;
      dropzoneEl.hidden = true;
      return;
    }
    const data = await res.json();
    renderDocuments(data.documents || []);
  } catch (err) {
    emptyEl.textContent = "Couldn't load your documents.";
    emptyEl.hidden = false;
  }
}

async function uploadFile(file) {
  if (file.type !== "application/pdf") {
    uploadStatusEl.textContent = "Only PDF files are supported.";
    return;
  }

  uploadStatusEl.textContent = `Uploading ${file.name}...`;
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.error) {
      uploadStatusEl.textContent = `Error: ${data.error}`;
      return;
    }
    uploadStatusEl.textContent = `${data.filename} learned (${data.chunks_added} sections).`;
    loadDocuments();
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

loadSidebarUser();
loadDocuments();
