(function () {
  "use strict";

  /* ===================================================================
     CONFIG
     =================================================================== */
  const ADMIN_USERNAME = "blotis";
  // SHA-256 hash of the admin password (never the plaintext).
  const ADMIN_PASSWORD_HASH = "0cbdd693637b533d77883b4784d05e69aa5d3bca3313983252915a1ef73b719b";

  const AUTH_KEY = "bs_admin";
  const SITE_KEY = "bs_site_draft";
  const PROJ_KEY = "bs_projects_draft";

  /* ===================================================================
     STATE
     Published content lives in data.js. While logged in, edits are held
     as a local draft until exported back into data.js.
     =================================================================== */
  let site = Object.assign({}, typeof SITE !== "undefined" ? SITE : {});
  let projects = JSON.parse(JSON.stringify(typeof PROJECTS !== "undefined" ? PROJECTS : []));
  let activeTag = "All";
  let draftMedia = [];

  try {
    const s = localStorage.getItem(SITE_KEY);
    if (s) site = Object.assign(site, JSON.parse(s));
    const p = localStorage.getItem(PROJ_KEY);
    if (p) projects = JSON.parse(p);
  } catch (e) {}

  function saveDraft() {
    try {
      localStorage.setItem(SITE_KEY, JSON.stringify(site));
      localStorage.setItem(PROJ_KEY, JSON.stringify(projects));
    } catch (e) {
      toast("Couldn't save locally — storage may be full.");
    }
  }

  function isAdmin() { return localStorage.getItem(AUTH_KEY) === "true"; }

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const $ = id => document.getElementById(id);
  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ===================================================================
     TEXT RENDERING + INLINE EDITING
     =================================================================== */
  function renderText() {
    document.querySelectorAll("[data-edit]").forEach(el => {
      const key = el.dataset.edit;
      const value = site[key] != null ? site[key] : "";
      if (el.dataset.multiline === "true") {
        el.innerHTML = String(value).split(/\n{2,}/).map(p => `<p>${escapeHtml(p)}</p>`).join("");
      } else {
        el.textContent = value;
      }
    });
    document.title = (site.name || "Portfolio") + " Portfolio";
    renderContact();
  }

  function renderContact() {
    const wrap = $("contactLinks");
    const links = [
      { label: "Email", value: site.email, href: v => "mailto:" + v },
      { label: "LinkedIn", value: site.linkedin, href: v => v },
      { label: "GitHub", value: site.github, href: v => v },
      { label: "itch.io", value: site.itch, href: v => v }
    ].filter(l => l.value);

    if (!links.length) {
      wrap.innerHTML = '<p class="contact-empty">Add your email and profile links in data.js (or while logged in) to show contact buttons here.</p>';
      return;
    }
    wrap.innerHTML = links.map(l =>
      `<a class="contact-link" href="${escapeHtml(l.href(l.value))}" target="_blank" rel="noopener">${l.label}</a>`
    ).join("");
  }

  function enableEditing(on) {
    document.querySelectorAll("[data-edit]").forEach(el => {
      if (on) {
        el.setAttribute("contenteditable", "plaintext-only");
        el.classList.add("editable");
        el.title = "Click to edit";
      } else {
        el.removeAttribute("contenteditable");
        el.classList.remove("editable");
        el.removeAttribute("title");
      }
    });
  }

  document.addEventListener("blur", e => {
    const el = e.target;
    if (!el.dataset || !el.dataset.edit || !isAdmin()) return;
    const key = el.dataset.edit;
    const next = el.dataset.multiline === "true"
      ? el.innerText.replace(/\n{3,}/g, "\n\n").trim()
      : el.textContent.trim();
    if (next !== site[key]) {
      site[key] = next;
      saveDraft();
      renderText();
      enableEditing(true);
      toast("Saved locally — remember to export");
    }
  }, true);

  /* ===================================================================
     MEDIA HELPERS
     =================================================================== */
  function detectMedia(src) {
    const s = String(src).trim();
    const yt = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return { type: "youtube", src: yt[1] };
    if (/^[\w-]{11}$/.test(s) && !s.includes(".")) return { type: "youtube", src: s };
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(s)) return { type: "video", src: s };
    return { type: "image", src: s };
  }

  function coverOf(project) {
    if (project.cover) return { type: "image", src: project.cover };
    const media = project.media || [];
    return media.find(m => m.type === "image") || media[0] || null;
  }

  function mediaHtml(item) {
    if (item.type === "youtube") {
      return `<div class="embed"><iframe src="https://www.youtube.com/embed/${escapeHtml(item.src)}" title="Video" allowfullscreen loading="lazy"></iframe></div>`;
    }
    if (item.type === "video") {
      return `<video src="${escapeHtml(item.src)}" controls preload="metadata" playsinline></video>`;
    }
    return `<img src="${escapeHtml(item.src)}" alt="" loading="lazy">`;
  }

  /* ===================================================================
     PROJECT GRID
     =================================================================== */
  const grid = $("grid"), filtersEl = $("filters"), emptyState = $("emptyState");

  function renderFilters() {
    const set = new Set();
    projects.forEach(p => (p.tags || []).forEach(t => set.add(t)));
    const tags = ["All", ...set];
    if (tags.length <= 1) { filtersEl.innerHTML = ""; return; }
    filtersEl.innerHTML = "";
    tags.forEach(tag => {
      const b = document.createElement("button");
      b.className = "chip" + (tag === activeTag ? " active" : "");
      b.textContent = tag;
      b.addEventListener("click", () => { activeTag = tag; renderFilters(); renderGrid(); });
      filtersEl.appendChild(b);
    });
  }

  function cardTemplate(project) {
    const card = document.createElement("div");
    card.className = "cartridge";

    const cover = coverOf(project);
    const mediaCount = (project.media || []).length;
    const videoCount = (project.media || []).filter(m => m.type !== "image").length;

    const label = document.createElement("div");
    label.className = "cart-label";
    if (cover && cover.type === "image") {
      label.innerHTML = `<img src="${escapeHtml(cover.src)}" alt="" loading="lazy">`;
    } else if (cover && cover.type === "youtube") {
      label.innerHTML = `<img src="https://img.youtube.com/vi/${escapeHtml(cover.src)}/hqdefault.jpg" alt="" loading="lazy">`;
    } else if (cover && cover.type === "video") {
      label.innerHTML = `<video src="${escapeHtml(cover.src)}" muted preload="metadata"></video>`;
    } else {
      label.innerHTML = `<span class="fallback-glyph">${escapeHtml((project.title || "?").slice(0, 2).toUpperCase())}</span>`;
    }
    if (mediaCount) {
      const badge = document.createElement("span");
      badge.className = "media-badge";
      badge.textContent = videoCount ? "▶ " + mediaCount : mediaCount + " media";
      label.appendChild(badge);
    }

    const body = document.createElement("div");
    body.className = "cart-body";
    body.innerHTML = `
      <p class="cart-title">${escapeHtml(project.title)}</p>
      ${project.role ? `<p class="cart-role">${escapeHtml(project.role)}</p>` : ""}
      <p class="cart-tagline">${escapeHtml(project.tagline || "")}</p>
      <div class="cart-tags">${(project.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
    `;

    card.appendChild(label);
    card.appendChild(body);
    card.addEventListener("click", () => openDetail(project));

    if (isAdmin()) {
      const admin = document.createElement("div");
      admin.className = "card-admin";
      admin.innerHTML = `<button class="edit-btn">Edit</button><button class="del-btn">Delete</button>`;
      admin.querySelector(".edit-btn").addEventListener("click", e => { e.stopPropagation(); openProjectForm(project); });
      admin.querySelector(".del-btn").addEventListener("click", e => {
        e.stopPropagation();
        if (confirm(`Delete "${project.title}"? This can't be undone.`)) {
          projects = projects.filter(p => p.id !== project.id);
          saveDraft(); renderFilters(); renderGrid();
          toast("Deleted — remember to export");
        }
      });
      card.appendChild(admin);
    }
    return card;
  }

  function renderGrid() {
    const visible = activeTag === "All" ? projects : projects.filter(p => (p.tags || []).includes(activeTag));
    grid.innerHTML = "";
    visible.forEach(p => grid.appendChild(cardTemplate(p)));
    emptyState.hidden = visible.length !== 0;
    emptyState.textContent = isAdmin()
      ? "No projects yet — hit the + button to add your first one."
      : "Projects coming soon.";
    observeReveals();
  }

  /* ===================================================================
     DETAIL VIEW
     =================================================================== */
  const detailOverlay = $("detailOverlay"), detailContent = $("detailContent");

  function openDetail(project) {
    const media = project.media || [];
    detailContent.innerHTML = `
      <h3 class="detail-title">${escapeHtml(project.title)}</h3>
      <p class="detail-meta">${[project.year, project.engine, project.role].filter(Boolean).map(escapeHtml).join("  ·  ")}</p>
      ${media.length ? `<div class="detail-media">${media.map(mediaHtml).join("")}</div>` : ""}
      <p class="detail-desc">${escapeHtml(project.description || project.tagline || "")}</p>
      <div class="detail-links">
        ${project.playUrl ? `<a class="btn btn-primary" href="${escapeHtml(project.playUrl)}" target="_blank" rel="noopener">Play / watch</a>` : ""}
        ${project.codeUrl ? `<a class="btn btn-ghost" href="${escapeHtml(project.codeUrl)}" target="_blank" rel="noopener">View source</a>` : ""}
      </div>`;
    open(detailOverlay);
  }

  function open(el) { el.hidden = false; }
  function close(el) {
    el.hidden = true;
    el.querySelectorAll("video").forEach(v => v.pause());
  }

  document.querySelectorAll("[data-close]").forEach(b =>
    b.addEventListener("click", () => close(b.closest(".modal-overlay"))));
  document.querySelectorAll(".modal-overlay").forEach(o =>
    o.addEventListener("click", e => { if (e.target === o) close(o); }));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelectorAll(".modal-overlay:not([hidden])").forEach(close);
  });
  document.querySelectorAll("[data-scroll]").forEach(b =>
    b.addEventListener("click", () => document.querySelector(b.dataset.scroll).scrollIntoView({ behavior: "smooth" })));

  /* ===================================================================
     AUTH
     =================================================================== */
  const authControl = $("authControl"), loginOverlay = $("loginOverlay"),
        loginForm = $("loginForm"), loginError = $("loginError"),
        addOverlay = $("addOverlay"), adminBar = $("adminBar");

  function refreshAuthUI() {
    const admin = isAdmin();
    authControl.textContent = admin ? "Log out" : "Admin login";
    authControl.classList.toggle("is-admin", admin);
    adminBar.hidden = !admin;
    $("fabAdd").style.display = admin ? "" : "none";
    enableEditing(admin);
    renderGrid();
  }

  authControl.addEventListener("click", () => {
    if (isAdmin()) {
      localStorage.removeItem(AUTH_KEY);
      refreshAuthUI();
      toast("Logged out");
    } else {
      loginError.hidden = true; loginForm.reset(); open(loginOverlay);
    }
  });

  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const d = new FormData(loginForm);
    const hash = await sha256(d.get("password") || "");
    if ((d.get("username") || "").trim() === ADMIN_USERNAME && hash === ADMIN_PASSWORD_HASH) {
      localStorage.setItem(AUTH_KEY, "true");
      close(loginOverlay);
      refreshAuthUI();
      toast("Logged in — click any text to edit");
    } else {
      loginError.hidden = false;
    }
  });

  /* ===================================================================
     ADD / EDIT PROJECT
     =================================================================== */
  const addForm = $("addForm"), mediaList = $("mediaList");

  function renderMediaList() {
    mediaList.innerHTML = "";
    draftMedia.forEach((m, i) => {
      const row = document.createElement("div");
      row.className = "media-item";
      const short = m.src.length > 60 ? m.src.slice(0, 57) + "..." : m.src;
      row.innerHTML = `<span class="mtype">${m.type}</span><span class="msrc">${escapeHtml(short)}</span>`;
      const del = document.createElement("button");
      del.type = "button"; del.textContent = "Remove";
      del.addEventListener("click", () => { draftMedia.splice(i, 1); renderMediaList(); });
      row.appendChild(del);
      mediaList.appendChild(row);
    });
  }

  $("addMediaBtn").addEventListener("click", () => {
    const input = $("mediaInput");
    const val = input.value.trim();
    if (!val) return;
    draftMedia.push(detectMedia(val));
    input.value = "";
    renderMediaList();
  });
  $("mediaInput").addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); $("addMediaBtn").click(); }
  });

  $("mediaFile").addEventListener("change", e => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > 3 * 1024 * 1024) {
        toast(file.name + " is over 3 MB — skipped");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => { draftMedia.push({ type: "image", src: reader.result }); renderMediaList(); };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  });

  function openProjectForm(project) {
    addForm.reset();
    draftMedia = project ? JSON.parse(JSON.stringify(project.media || [])) : [];
    renderMediaList();
    $("addTitle").textContent = project ? "Edit project" : "Add a project";
    $("addSubmitBtn").textContent = project ? "Save changes" : "Add to portfolio";
    addForm.editingId.value = project ? project.id : "";
    if (project) {
      ["title", "year", "tagline", "description", "engine", "role", "playUrl", "codeUrl"].forEach(k => {
        if (addForm[k]) addForm[k].value = project[k] || "";
      });
      addForm.tags.value = (project.tags || []).join(", ");
    }
    open(addOverlay);
  }

  $("fabAdd").addEventListener("click", () => {
    if (isAdmin()) openProjectForm(null);
    else { loginError.hidden = true; loginForm.reset(); open(loginOverlay); }
  });

  addForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!isAdmin()) { close(addOverlay); return; }
    const d = new FormData(addForm);
    const editingId = d.get("editingId");
    const title = (d.get("title") || "Untitled").trim();

    const project = {
      id: editingId || (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project") + "-" + Date.now().toString(36).slice(-4),
      title: title,
      year: (d.get("year") || "").trim(),
      engine: (d.get("engine") || "").trim(),
      role: (d.get("role") || "").trim(),
      tagline: (d.get("tagline") || "").trim(),
      description: (d.get("description") || "").trim(),
      tags: (d.get("tags") || "").split(",").map(s => s.trim()).filter(Boolean),
      media: draftMedia.slice(),
      playUrl: (d.get("playUrl") || "").trim(),
      codeUrl: (d.get("codeUrl") || "").trim()
    };

    const idx = projects.findIndex(p => p.id === editingId);
    if (idx > -1) projects[idx] = project; else projects.unshift(project);

    saveDraft(); renderFilters(); renderGrid(); close(addOverlay);
    toast(idx > -1 ? "Updated — remember to export" : "Added — remember to export");
  });

  /* ===================================================================
     EXPORT  (this is what makes changes visible to other people)
     =================================================================== */
  function buildDataFile() {
    return `/* =====================================================================
   SITE DATA — generated from the live editor.
   Replace data.js in your GitHub repo with this file to publish changes.
   ===================================================================== */

const SITE = ${JSON.stringify(site, null, 2)};

const PROJECTS = ${JSON.stringify(projects, null, 2)};
`;
  }

  $("exportBtn").addEventListener("click", () => {
    $("exportOut").value = buildDataFile();
    open($("exportOverlay"));
  });

  $("downloadDataBtn").addEventListener("click", () => {
    const blob = new Blob([buildDataFile()], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.js";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Downloaded data.js");
  });

  $("copyDataBtn").addEventListener("click", () => {
    const out = $("exportOut");
    if (navigator.clipboard) navigator.clipboard.writeText(out.value).then(() => toast("Copied"));
    else { out.select(); document.execCommand("copy"); toast("Copied"); }
  });

  $("discardBtn").addEventListener("click", () => {
    if (!confirm("Discard all local changes and reload the published version from data.js?")) return;
    localStorage.removeItem(SITE_KEY);
    localStorage.removeItem(PROJ_KEY);
    location.reload();
  });

  /* ===================================================================
     SCROLL REVEAL + BOOT TEXT
     =================================================================== */
  let revealObserver;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal,.cartridge").forEach(el => el.classList.add("in-view"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) { en.target.classList.add("in-view"); revealObserver.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
    }
    document.querySelectorAll(".reveal:not(.in-view),.cartridge:not(.in-view)").forEach(el => revealObserver.observe(el));
  }

  function typeBoot() {
    const el = $("bootText");
    const lines = ["> whoami", site.name || "", site.role || "", "", "> load portfolio"];
    let text = "", li = 0, ci = 0;
    (function tick() {
      if (li >= lines.length) {
        const n = projects.length;
        el.textContent = text + `\n${n} project${n === 1 ? "" : "s"} loaded.\nREADY.`;
        return;
      }
      const cur = lines[li];
      if (ci <= cur.length) { el.textContent = text + cur.slice(0, ci) + "\u2588"; ci++; setTimeout(tick, 22); }
      else { text += cur + "\n"; li++; ci = 0; setTimeout(tick, 140); }
    })();
  }

  /* ===================================================================
     INIT
     =================================================================== */
  renderText();
  renderFilters();
  refreshAuthUI();
  typeBoot();
  observeReveals();
})();
