const $ = (selector) => document.querySelector(selector);

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "CV";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function renderContact(label, value, href) {
  if (!value) return "";
  const safeValue = escapeHtml(value);
  return `<div class="contact-row"><strong>${label}:</strong> ${href ? `<a href="${href}" target="_blank" rel="noreferrer">${safeValue}</a>` : safeValue}</div>`;
}

function renderTimeline(section) {
  const entries = section.entries.map(entry => `
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
  `).join("");

  return `<div class="section-card timeline">${entries}</div>`;
}

function renderSection(section) {
  const id = slugify(section.title);

  let body = "";
  if (section.type === "timeline") {
    body = renderTimeline(section);
  } else if (section.type === "chips") {
    body = `<div class="section-card chips">${section.items.map(item => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>`;
  } else if (section.type === "list") {
    body = `<div class="section-card">
      ${section.text ? `<p class="plain-text">${escapeHtml(section.text)}</p>` : ""}
      <ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>`;
  } else {
    body = `<div class="section-card"><p class="plain-text">${escapeHtml(section.text || "")}</p></div>`;
  }

  return `<section class="resume-section" id="${id}">
    <h2 class="section-title">${escapeHtml(section.title)}</h2>
    ${body}
  </section>`;
}

async function main() {
  const response = await fetch("./resume-data.json", { cache: "no-store" });
  const data = await response.json();

  document.title = `${data.name} | Resume`;
  $("#name").textContent = data.name;
  $("#headline").textContent = data.headline || "Interactive Resume";
  $("#monogram").textContent = initials(data.name);
  $("#hero-title").textContent = `${data.name}'s interactive resume`;

  const summary = data.sections.find(section => /summary|profile|about/i.test(section.title));
  if (summary?.text) $("#hero-summary").textContent = summary.text;

  const contacts = data.contacts || {};
  $("#contact-list").innerHTML = [
    renderContact("Email", contacts.email, contacts.email ? `mailto:${contacts.email}` : ""),
    renderContact("Phone", contacts.phone, contacts.phone ? `tel:${contacts.phone}` : ""),
    renderContact("LinkedIn", contacts.linkedin, contacts.linkedin)
  ].join("");

  if (contacts.linkedin) {
    $("#linkedin-link").href = contacts.linkedin;
  } else {
    $("#linkedin-link").style.display = "none";
  }

  if (contacts.email) {
    $("#email-link").href = `mailto:${contacts.email}`;
  } else {
    $("#email-link").style.display = "none";
  }

  const nav = $("#nav");
  nav.innerHTML = data.sections.map(section => {
    const id = slugify(section.title);
    return `<a href="#${id}">${escapeHtml(section.title)}</a>`;
  }).join("");

  $("#sections").innerHTML = data.sections.map(renderSection).join("");

  const navLinks = [...document.querySelectorAll("nav a")];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-25% 0px -65% 0px" });

  document.querySelectorAll(".resume-section").forEach(section => observer.observe(section));
}

main().catch(error => {
  console.error(error);
  document.body.innerHTML = `<main><h1>Could not load resume website</h1><p>${escapeHtml(error.message)}</p></main>`;
});