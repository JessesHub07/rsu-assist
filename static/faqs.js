// FAQs page: fetches the department/level-scoped FAQ list, renders it as
// category pills + an expandable Q&A accordion, with client-side search.

const faqSearch = document.getElementById("faqSearch");
const faqPillsEl = document.getElementById("faqCategoryPills");
const faqListEl = document.getElementById("faqList");
const faqEmptyEl = document.getElementById("faqEmpty");
const faqAskBtn = document.getElementById("faqAskBtn");

let allCategories = [];
let activeCategory = "all";

function selectCategory(category) {
  activeCategory = category;
  faqPillsEl.querySelectorAll(".faq-pill").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.category === category);
  });
  render();
}

function renderPills() {
  faqPillsEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "faq-pill" + (activeCategory === "all" ? " active" : "");
  allBtn.textContent = "All";
  allBtn.dataset.category = "all";
  allBtn.addEventListener("click", () => selectCategory("all"));
  faqPillsEl.appendChild(allBtn);

  allCategories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "faq-pill" + (activeCategory === cat.category ? " active" : "");
    btn.textContent = cat.category;
    btn.dataset.category = cat.category;
    btn.addEventListener("click", () => selectCategory(cat.category));
    faqPillsEl.appendChild(btn);
  });
}

function matchesSearch(item, query) {
  if (!query) return true;
  const haystack = `${item.question} ${item.answer}`.toLowerCase();
  return haystack.includes(query);
}

function render() {
  const query = faqSearch.value.trim().toLowerCase();
  faqListEl.innerHTML = "";
  let totalShown = 0;

  allCategories.forEach((cat) => {
    if (activeCategory !== "all" && activeCategory !== cat.category) return;

    const items = cat.items.filter((item) => matchesSearch(item, query));
    if (items.length === 0) return;

    totalShown += items.length;

    const heading = document.createElement("h2");
    heading.className = "faq-category-heading";
    heading.textContent = cat.category;
    faqListEl.appendChild(heading);

    const group = document.createElement("div");
    group.className = "faq-category-group";

    items.forEach((item) => {
      const wrap = document.createElement("div");
      wrap.className = "faq-item";

      const q = document.createElement("button");
      q.type = "button";
      q.className = "faq-question";
      q.innerHTML = `<span></span><span class="faq-chevron">&#9662;</span>`;
      q.querySelector("span").textContent = item.question;

      const a = document.createElement("div");
      a.className = "faq-answer";
      a.textContent = item.answer;
      a.hidden = true;

      q.addEventListener("click", () => {
        const isOpen = wrap.classList.toggle("open");
        a.hidden = !isOpen;
      });

      wrap.appendChild(q);
      wrap.appendChild(a);
      group.appendChild(wrap);
    });

    faqListEl.appendChild(group);
  });

  faqEmptyEl.hidden = totalShown > 0;
}

faqSearch.addEventListener("input", render);

faqAskBtn.addEventListener("click", () => {
  window.location.href = "/chat-ui";
});

async function loadFaqs() {
  try {
    const res = await fetch("/faqs");
    const data = await res.json();
    allCategories = data.categories || [];
    renderPills();
    render();
  } catch (err) {
    faqListEl.innerHTML = "";
    faqEmptyEl.textContent = "Couldn't load FAQs right now.";
    faqEmptyEl.hidden = false;
  }
}

loadSidebarUser();
loadFaqs();
