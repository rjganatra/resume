const $ = (selector) => document.querySelector(selector);

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "section";
}

function initials(name) {
  return String(name || "RG")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "RG";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function bestSummary(data) {
  const preferred = data.sections.find(section => /summary|profile|about|objective/i.test(section.title));
  if (preferred?.text && preferred.text.length > 25) return preferred.text;

  for (const section of data.sections) {
    if (section.text && section.text.length > 45) return section.text;
    if (section.entries?.[0]?.bullets?.[0]) return section.entries[0].bullets[0];
  }

  return "Finance professional focused on credit appraisal, asset management, MSME lending, portfolio monitoring and analytical decision-making.";
}

function contactItem(label, value, href) {
  if (!value) return "";
  const safe = escapeHtml(value);
  const content = href ? `<a href="${href}" target="_blank" rel="noreferrer">${safe}</a>` : safe;
  return `<div class="contact-item"><span>${escapeHtml(label)}</span><strong>${content}</strong></div>`;
}

function renderTimeline(section) {
  return `<div class="section-card">
    ${section.entries.map(entry => `
      <article class="entry">
        <div class="entry-head">
          <div>
            <h3>${escapeHtml(entry.title)}</h3>
            ${entry.subtitle || entry.location ? `<div class="meta">${escapeHtml([entry.subtitle, entry.location].filter(Boolean).join(" • "))}</div>` : ""}
          </div>
          ${entry.date ? `<span class="date">${escapeHtml(entry.date)}</span>` : ""}
        </div>
        ${entry.bullets?.length ? `<ul>${entry.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        ${entry.body ? `<p class="plain-text">${escapeHtml(entry.body)}</p>` : ""}
      </article>
    `).join("")}
  </div>`;
}

function renderSection(section, index) {
  const id = slugify(section.title);
  let body;

  if (section.type === "timeline") {
    body = renderTimeline(section);
  } else if (section.type === "chips") {
    body = `<div class="section-card chips">${section.items.map(item => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>`;
  } else if (section.type === "list") {
    body = `<div class="section-card">
      ${section.text ? `<p class="plain-text">${escapeHtml(section.text)}</p>` : ""}
      ${section.items?.length ? `<ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    </div>`;
  } else {
    body = `<div class="section-card"><p class="plain-text">${escapeHtml(section.text || "")}</p></div>`;
  }

  return `<section class="resume-section" id="${id}">
    <div class="section-label">
      <span class="section-number">${String(index + 1).padStart(2, "0")}</span>
      <h2>${escapeHtml(section.title)}</h2>
    </div>
    ${body}
  </section>`;
}

async function main() {
  const response = await fetch("./resume-data.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load resume data.");
  const data = await response.json();

  const name = data.name || "Raj Ganatra";
  const contacts = data.contacts || {};
  const summary = bestSummary(data);

  document.title = `${name} | Resume`;
  $("#name").textContent = name;
  $("#brand-name").textContent = name;
  $("#mark").textContent = initials(name);
  $("#positioning").textContent = summary;

  if (contacts.linkedin) $("#linkedin-link").href = contacts.linkedin;
  else $("#linkedin-link").style.display = "none";

  if (contacts.email) $("#email-link").href = `mailto:${contacts.email}`;
  else $("#email-link").style.display = "none";

  $("#contact-card").innerHTML = `<div class="contact-list">
    ${contactItem("Email", contacts.email, contacts.email ? `mailto:${contacts.email}` : "")}
    ${contactItem("Phone", contacts.phone, contacts.phone ? `tel:${contacts.phone}` : "")}
    ${contactItem("LinkedIn", contacts.linkedin ? "Open profile" : "", contacts.linkedin)}
    ${contactItem("Resume", "View PDF", "./resume.pdf")}
  </div>`;

  $("#nav").innerHTML = data.sections.map(section =>
    `<a href="#${slugify(section.title)}">${escapeHtml(section.title)}</a>`
  ).join("");

  $("#overview-grid").innerHTML = data.sections.map((section, index) =>
    `<a class="overview-card" href="#${slugify(section.title)}">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(section.title)}</strong>
    </a>`
  ).join("");

  $("#sections").innerHTML = data.sections.map(renderSection).join("");

  $("#menu-button")?.addEventListener("click", () => $("#nav").classList.toggle("open"));

  const navLinks = [...document.querySelectorAll("nav a")];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-30% 0px -60% 0px" });

  document.querySelectorAll(".resume-section").forEach(section => observer.observe(section));
}

main().catch(error => {
  console.error(error);
  $("#name").textContent = "Raj Ganatra";
  $("#positioning").textContent = "Could not load resume data. Please rerun the GitHub Action.";
});