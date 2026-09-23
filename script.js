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
  let activeCategory = "game";
  let draftMedia = [];

  const CATEGORIES = [
    { key: "game", label: "Game Projects" },
    { key: "art", label: "Technical Art / 3D Art" }
  ];
  function categoryOf(p) { return p.category === "art" ? "art" : "game"; }

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

  const CONTACT_ICONS = {
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.96.57.1.78-.25.78-.55v-2.14c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.29-1.68-1.29-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.6.24 2.77.12 3.06.74.8 1.18 1.82 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.07.78 2.16v3.2c0 .31.21.66.79.55A10.51 10.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45Z"/></svg>',
    itch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.42 2.5 2 5.9v2.15c0 1.05.9 2.2 2 2.2s2-.98 2-2.2c0 1.22 1 2.2 2 2.2s1.94-.98 2-2.2c.06 1.22 1 2.2 2 2.2s1.94-.98 2-2.2c.06 1.22 1 2.2 2 2.2s2-1.15 2-2.2V5.9L19.58 2.5H4.42Zm.1 2h14.96l1.1 1.55H3.42l1.1-1.55ZM4 11.5c-.63 0-1.24-.16-1.78-.44L2 12v8.15c0 .74.83 1.35 1.85 1.35h16.3c1.02 0 1.85-.6 1.85-1.35V12l-.22-.94a4 4 0 0 1-1.78.44c-.98 0-1.87-.4-2.5-1.05a3.5 3.5 0 0 1-2.5 1.05c-.98 0-1.87-.4-2.5-1.05a3.5 3.5 0 0 1-2.5 1.05c-.98 0-1.87-.4-2.5-1.05A3.48 3.48 0 0 1 4 11.5Zm3.5 2c1.1 0 2 .3 2.85.78-.05 1.9-.2 3.45-.85 4.6-.5-1.1-1.6-1.9-2.9-1.9-1.5 0-2.7 1.03-3 2.4-.4-.2-.6-.5-.6-.78v-4.1c1.1.6 2.4.98 3.5 1Zm9 0c1.1-.03 2.4-.4 3.5-1v4.1c0 .28-.2.58-.6.78-.3-1.37-1.5-2.4-3-2.4-1.3 0-2.4.8-2.9 1.9-.65-1.15-.8-2.7-.85-4.6.85-.48 1.75-.78 2.85-.78Z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 6 9 6.5L21 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.5 3.5h4l1.5 5-2.5 2a13 13 0 0 0 6 6l2-2.5 5 1.5v4c0 1-1 2-2.5 2C10 22 2 14 2 6c0-1.5 1-2.5 2.5-2.5Z" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function normalizeHref(kind, raw) {
    const v = String(raw).trim();
    if (kind === "email") return v.startsWith("mailto:") ? v : "mailto:" + v;
    if (kind === "phone") return v.startsWith("tel:") ? v : "tel:" + v.replace(/[^\d+]/g, "");
    return /^https?:\/\//i.test(v) ? v : "https://" + v;
  }

  function renderContact() {
    const wrap = $("contactLinks");
    const entries = [
      { kind: "github", label: "GitHub", value: site.github },
      { kind: "linkedin", label: "LinkedIn", value: site.linkedin },
      { kind: "itch", label: "itch.io", value: site.itch },
      { kind: "email", label: "Email", value: site.email },
      { kind: "phone", label: "Phone", value: site.phone }
    ].filter(e => e.value);

    if (!entries.length) {
      wrap.innerHTML = '<p class="contact-empty">No links yet — ' +
        (isAdmin() ? 'click "Edit links" above to add some.' : 'check back soon.') + '</p>';
      return;
    }
    wrap.innerHTML = entries.map(e => {
      const href = normalizeHref(e.kind, e.value);
      const external = e.kind !== "email" && e.kind !== "phone";
      return `<a class="contact-link" href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noopener"' : ""}>${CONTACT_ICONS[e.kind]}<span>${e.label}</span></a>`;
    }).join("");
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

  // A file dropped this session isn't in the repo yet, so show it from the
  // in-memory blob URL until it's been committed to assets/media/.
  function resolveSrc(src) {
    return (typeof previewUrls !== "undefined" && previewUrls.get(src)) || src;
  }

  function mediaHtml(item) {
    if (item.type === "youtube") {
      return `<div class="embed"><iframe src="https://www.youtube.com/embed/${escapeHtml(item.src)}" title="Video" allowfullscreen loading="lazy"></iframe></div>`;
    }
    if (item.type === "video") {
      return `<video src="${escapeHtml(resolveSrc(item.src))}" controls preload="metadata" playsinline></video>`;
    }
    return `<img src="${escapeHtml(resolveSrc(item.src))}" alt="" loading="lazy">`;
  }

  /* ===================================================================
     PROJECT GRID
     =================================================================== */
  const grid = $("grid"), filtersEl = $("filters"), emptyState = $("emptyState"), categoryTabsEl = $("categoryTabs");

  function renderCategoryTabs() {
    categoryTabsEl.innerHTML = "";
    CATEGORIES.forEach(cat => {
      const count = projects.filter(p => categoryOf(p) === cat.key).length;
      const b = document.createElement("button");
      b.className = "cat-tab" + (cat.key === activeCategory ? " active" : "");
      b.innerHTML = `${escapeHtml(cat.label)} <span class="cat-count">${count}</span>`;
      b.addEventListener("click", () => {
        if (activeCategory === cat.key) return;
        activeCategory = cat.key;
        activeTag = "All";
        renderCategoryTabs(); renderFilters(); renderGrid();
      });
      categoryTabsEl.appendChild(b);
    });
  }

  function renderFilters() {
    const inCategory = projects.filter(p => categoryOf(p) === activeCategory);
    const set = new Set();
    inCategory.forEach(p => (p.tags || []).forEach(t => set.add(t)));
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

    const catBadge = document.createElement("span");
    const cat = categoryOf(project);
    catBadge.className = "cart-category" + (cat === "art" ? " art" : "");
    catBadge.textContent = cat === "art" ? "Technical Art" : "Game";
    card.appendChild(catBadge);

    const label = document.createElement("div");
    label.className = "cart-label";
    if (cover && cover.type === "image") {
      label.innerHTML = `<img src="${escapeHtml(resolveSrc(cover.src))}" alt="" loading="lazy">`;
    } else if (cover && cover.type === "youtube") {
      label.innerHTML = `<img src="https://img.youtube.com/vi/${escapeHtml(cover.src)}/hqdefault.jpg" alt="" loading="lazy">`;
    } else if (cover && cover.type === "video") {
      label.innerHTML = `<video src="${escapeHtml(resolveSrc(cover.src))}" muted preload="metadata"></video>`;
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
          saveDraft(); renderCategoryTabs(); renderFilters(); renderGrid();
          toast("Deleted — remember to export");
        }
      });
      card.appendChild(admin);
    }
    return card;
  }

  function renderGrid() {
    let visible = projects.filter(p => categoryOf(p) === activeCategory);
    if (activeTag !== "All") visible = visible.filter(p => (p.tags || []).includes(activeTag));
    grid.innerHTML = "";
    visible.forEach(p => grid.appendChild(cardTemplate(p)));
    emptyState.hidden = visible.length !== 0;
    const catLabel = CATEGORIES.find(c => c.key === activeCategory).label.toLowerCase();
    emptyState.textContent = isAdmin()
      ? `No ${catLabel} yet — hit the + button to add one.`
      : `No ${catLabel} yet — check back soon.`;
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
    $("editContactsBtn").hidden = !admin;
    enableEditing(admin);
    renderCategoryTabs();
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

  /* Files the user dropped that are too big to embed (videos, large GIFs).
     We keep the File object so we can preview it during this session, and
     record the path it will live at once committed to the repo. */
  const pendingFiles = new Map();   // "assets/media/clip.mp4" -> File
  const previewUrls = new Map();    // path -> blob: URL for this session

  const MEDIA_DIR = "assets/media/";
  const EMBED_LIMIT = 900 * 1024;   // above this, an image gets compressed
  const HARD_EMBED_LIMIT = 2.5 * 1024 * 1024; // above this after compression, route to assets/

  function humanSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function safeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9.\-]+/g, "-").replace(/-+/g, "-");
  }

  function uniquePath(name) {
    let base = MEDIA_DIR + safeName(name);
    let path = base, n = 2;
    const taken = p => pendingFiles.has(p) || draftMedia.some(m => m.src === p);
    while (taken(path)) {
      const dot = base.lastIndexOf(".");
      path = dot > -1 ? base.slice(0, dot) + "-" + n + base.slice(dot) : base + "-" + n;
      n++;
    }
    return path;
  }

  /* Shrink an image with a canvas so it can be embedded without bloating
     data.js. GIFs are skipped — canvas would flatten the animation. */
  function compressImage(file) {
    return new Promise(resolve => {
      if (file.type === "image/gif") { resolve(null); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        let { width: w, height: h } = img;
        if (w > MAX || h > MAX) {
          const scale = MAX / Math.max(w, h);
          w = Math.round(w * scale); h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const hasAlpha = file.type === "image/png";
        resolve(canvas.toDataURL(hasAlpha ? "image/webp" : "image/jpeg", 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  function readAsDataUrl(file) {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
    });
  }

  async function ingestFiles(fileList) {
    const files = Array.from(fileList || []).filter(f =>
      f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) { toast("No images or videos in that drop"); return; }

    toast("Processing " + files.length + " file" + (files.length === 1 ? "" : "s") + "...");

    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      let item = null;

      if (!isVideo) {
        // Try to embed the image directly into data.js.
        let dataUrl = file.size > EMBED_LIMIT ? await compressImage(file) : null;
        if (!dataUrl && file.size <= HARD_EMBED_LIMIT) dataUrl = await readAsDataUrl(file);
        if (dataUrl && dataUrl.length * 0.75 <= HARD_EMBED_LIMIT) {
          item = { type: "image", src: dataUrl, name: file.name, bytes: Math.round(dataUrl.length * 0.75) };
        }
      }

      if (!item) {
        // Too big to embed, or a video: route it into assets/media/.
        const path = uniquePath(file.name);
        pendingFiles.set(path, file);
        previewUrls.set(path, URL.createObjectURL(file));
        item = {
          type: isVideo ? "video" : "image",
          src: path, name: file.name, bytes: file.size, pending: true
        };
      }
      draftMedia.push(item);
    }
    renderMediaList();
  }

  /* ---------- media list UI ---------- */
  function renderMediaList() {
    mediaList.innerHTML = "";
    draftMedia.forEach((m, i) => {
      const row = document.createElement("div");
      row.className = "media-item";

      const displaySrc = previewUrls.get(m.src) || m.src;
      const thumb = document.createElement("div");
      thumb.className = "media-thumb";
      if (m.type === "youtube") {
        thumb.innerHTML = `<img src="https://img.youtube.com/vi/${escapeHtml(m.src)}/default.jpg" alt="">`;
      } else if (m.type === "video") {
        thumb.innerHTML = previewUrls.has(m.src)
          ? `<video src="${escapeHtml(displaySrc)}" muted preload="metadata"></video>`
          : "\u25B6";
      } else {
        thumb.innerHTML = `<img src="${escapeHtml(displaySrc)}" alt="">`;
      }

      const info = document.createElement("div");
      info.className = "media-info";
      const label = m.name || (m.type === "youtube" ? "YouTube video" : m.src.split("/").pop());
      const bits = [m.type];
      if (m.bytes) bits.push(humanSize(m.bytes));
      if (m.pending) bits.push('<span class="pending">needs upload</span>');
      else if (m.src.startsWith("data:")) bits.push("embedded");
      info.innerHTML = `<span class="media-name">${escapeHtml(label)}</span><span class="media-sub">${bits.join(" · ")}</span>`;

      const up = document.createElement("button");
      up.type = "button"; up.className = "mv-btn"; up.innerHTML = "&uarr;";
      up.disabled = i === 0;
      up.addEventListener("click", () => { swapMedia(i, i - 1); });

      const down = document.createElement("button");
      down.type = "button"; down.className = "mv-btn"; down.innerHTML = "&darr;";
      down.disabled = i === draftMedia.length - 1;
      down.addEventListener("click", () => { swapMedia(i, i + 1); });

      const del = document.createElement("button");
      del.type = "button"; del.className = "del-media"; del.textContent = "Remove";
      del.addEventListener("click", () => {
        const removed = draftMedia.splice(i, 1)[0];
        if (removed && removed.pending && !draftMedia.some(x => x.src === removed.src)) {
          pendingFiles.delete(removed.src);
          const u = previewUrls.get(removed.src);
          if (u) { URL.revokeObjectURL(u); previewUrls.delete(removed.src); }
        }
        renderMediaList();
      });

      row.append(thumb, info, up, down, del);
      mediaList.appendChild(row);
    });
    renderMeter();
  }

  function swapMedia(a, b) {
    const t = draftMedia[a]; draftMedia[a] = draftMedia[b]; draftMedia[b] = t;
    renderMediaList();
  }

  function renderMeter() {
    const meter = $("mediaMeter");
    if (!draftMedia.length) { meter.hidden = true; return; }
    const embedded = draftMedia.filter(m => String(m.src).startsWith("data:"))
      .reduce((s, m) => s + (m.bytes || 0), 0);
    const pendingCount = draftMedia.filter(m => m.pending).length;
    const parts = [`<strong>${draftMedia.length}</strong> item${draftMedia.length === 1 ? "" : "s"}`];
    if (embedded) parts.push(`${humanSize(embedded)} embedded in data.js`);
    if (pendingCount) parts.push(`${pendingCount} file${pendingCount === 1 ? "" : "s"} to upload to <code>assets/media/</code>`);
    meter.innerHTML = parts.join(" · ");
    meter.hidden = false;
    meter.classList.toggle("over", embedded > 4 * 1024 * 1024);
  }

  /* ---------- dropzone wiring ---------- */
  const dropzone = $("dropzone"), mediaFile = $("mediaFile");

  dropzone.addEventListener("click", () => mediaFile.click());
  dropzone.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); mediaFile.click(); }
  });
  mediaFile.addEventListener("change", e => { ingestFiles(e.target.files); e.target.value = ""; });

  ["dragenter", "dragover"].forEach(ev =>
    dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach(ev =>
    dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove("dragover"); }));
  dropzone.addEventListener("drop", e => {
    if (e.dataTransfer && e.dataTransfer.files.length) ingestFiles(e.dataTransfer.files);
  });

  // Stop the browser from navigating away if a file is dropped outside the zone.
  ["dragover", "drop"].forEach(ev =>
    window.addEventListener(ev, e => { if (e.target !== dropzone) e.preventDefault(); }));

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

  const categoryPicker = $("categoryPicker"), categoryField = $("categoryField");
  categoryPicker.querySelectorAll(".cat-option").forEach(btn => {
    btn.addEventListener("click", () => {
      categoryPicker.querySelectorAll(".cat-option").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      categoryField.value = btn.dataset.value;
    });
  });
  function setCategoryPicker(value) {
    categoryPicker.querySelectorAll(".cat-option").forEach(b => b.classList.toggle("active", b.dataset.value === value));
    categoryField.value = value;
  }

  function openProjectForm(project) {
    addForm.reset();
    draftMedia = project ? JSON.parse(JSON.stringify(project.media || [])) : [];
    renderMediaList();
    $("addTitle").textContent = project ? "Edit project" : "Add a project";
    $("addSubmitBtn").textContent = project ? "Save changes" : "Add to portfolio";
    addForm.editingId.value = project ? project.id : "";
    setCategoryPicker(project ? categoryOf(project) : "game");
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
      category: d.get("category") === "art" ? "art" : "game",
      media: draftMedia.slice(),
      playUrl: (d.get("playUrl") || "").trim(),
      codeUrl: (d.get("codeUrl") || "").trim()
    };

    const idx = projects.findIndex(p => p.id === editingId);
    if (idx > -1) projects[idx] = project; else projects.unshift(project);

    saveDraft(); renderCategoryTabs(); renderFilters(); renderGrid(); close(addOverlay);
    toast(idx > -1 ? "Updated — remember to export" : "Added — remember to export");
  });

  /* ===================================================================
     CONTACT LINKS EDITING
     =================================================================== */
  const contactOverlay = $("contactOverlay"), contactForm = $("contactForm");

  $("editContactsBtn").addEventListener("click", () => {
    if (!isAdmin()) return;
    ["github", "linkedin", "itch", "email", "phone"].forEach(k => {
      if (contactForm[k]) contactForm[k].value = site[k] || "";
    });
    open(contactOverlay);
  });

  contactForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!isAdmin()) { close(contactOverlay); return; }
    const d = new FormData(contactForm);
    ["github", "linkedin", "itch", "email", "phone"].forEach(k => { site[k] = (d.get(k) || "").trim(); });
    saveDraft();
    renderContact();
    close(contactOverlay);
    toast("Saved locally — remember to export");
  });

  /* ===================================================================
     EXPORT  (this is what makes changes visible to other people)
     =================================================================== */
  // Collect every file across all projects that still needs committing.
  function allPendingPaths() {
    const set = new Set();
    projects.forEach(p => (p.media || []).forEach(m => { if (m.pending) set.add(m.src); }));
    return Array.from(set);
  }

  // "pending" is a local editing flag — it shouldn't ship in data.js.
  function cleanProjects() {
    return projects.map(p => Object.assign({}, p, {
      media: (p.media || []).map(m => {
        const c = Object.assign({}, m);
        delete c.pending;
        return c;
      })
    }));
  }

  function buildDataFile() {
    return `/* =====================================================================
   SITE DATA — generated from the live editor.
   Replace data.js in your GitHub repo with this file to publish changes.
   ===================================================================== */

const SITE = ${JSON.stringify(site, null, 2)};

const PROJECTS = ${JSON.stringify(cleanProjects(), null, 2)};
`;
  }

  $("exportBtn").addEventListener("click", () => {
    $("exportOut").value = buildDataFile();

    const pending = allPendingPaths();
    const box = $("pendingBox");
    if (pending.length) {
      box.innerHTML = `<h4>Also upload these ${pending.length} file${pending.length === 1 ? "" : "s"}</h4>
        <p>Videos and large images aren't embedded in data.js — they'd make it enormous. Create a folder called <code>assets/media/</code> in your repo and upload the original files there, named exactly:</p>
        <ul>${pending.map(p => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
        <p style="margin-top:10px">Use the <strong>Download files</strong> button below to save them with the right names, then drag them into GitHub.</p>`;
      box.hidden = false;
      $("downloadFilesBtn").hidden = false;
    } else {
      box.hidden = true;
      $("downloadFilesBtn").hidden = true;
    }
    open($("exportOverlay"));
  });

  // Re-save the dropped files under their repo filenames.
  $("downloadFilesBtn").addEventListener("click", () => {
    const entries = Array.from(pendingFiles.entries());
    if (!entries.length) { toast("No files to download"); return; }
    entries.forEach(([path, file], i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = path.split("/").pop();
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, i * 350);
    });
    toast("Downloading " + entries.length + " file" + (entries.length === 1 ? "" : "s"));
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
  renderCategoryTabs();
  renderFilters();
  refreshAuthUI();
  typeBoot();
  observeReveals();
})();
