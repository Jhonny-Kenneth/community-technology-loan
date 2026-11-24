"use strict";
const state: any = {
  page: "dashboard",
  user: JSON.parse(sessionStorage.getItem("ctl_current_user") || "null"),
  devices: [],
  centers: [],
  settings: { theme: localStorage.getItem("ctl_theme") || "system" },
};
const app = document.getElementById("app");
const esc = (v = "") =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
const pct = (n) => `${Math.round(Number(n || 0))}%`;
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(state.settings.theme);
  state.user && getAuthToken() ? renderShell() : renderAuth();
});
function applyTheme(theme) {
  state.settings.theme = theme;
  localStorage.setItem("ctl_theme", theme);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = FrontendDomain.resolveTheme(
    theme,
    matchMedia("(prefers-color-scheme: dark)").matches,
  );
}
function toggleTheme() {
  const dark =
    document.documentElement.dataset.theme === "dark" ||
    (state.settings.theme === "system" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  applyTheme(dark ? "light" : "dark");
}
function message(error) {
  return FrontendDomain.parseApiErrorMessage(error);
}
function notice(text, kind = "success") {
  const n = document.getElementById("notice");
  if (n) {
    n.className = `notice ${kind}`;
    n.textContent = text;
    n.hidden = false;
  }
}
function renderAuth(mode = "login") {
  const signup = mode === "signup";
  app.innerHTML = `<main class="auth-page"><section class="auth-brand"><div class="brand-mark">TL</div><p class="eyebrow">City of Orlando</p><h1>Technology that stays in circulation.</h1><p>Securely manage community devices, lending, maintenance, approvals, and lifecycle value.</p><div class="trust-row"><span>Tenant isolated</span><span>Audited approvals</span><span>Live health</span></div></section><section class="auth-panel"><button class="theme-fab" id="theme-toggle" aria-label="Toggle day and night mode">◐</button><div class="auth-card"><p class="eyebrow">Community Technology Loan</p><h2>${signup ? "Request staff access" : "Welcome back"}</h2><p class="muted">${signup ? "An administrator will review your request before you can sign in." : "Sign in to your organization workspace."}</p><div id="notice" class="notice" hidden></div><form id="auth-form">${signup ? `<label>Full name<input name="name" autocomplete="name" required maxlength="120"></label>` : ""}<label>Organization ID<input name="tenantId" value="eigen-it" required maxlength="120"></label><label>Work email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" minlength="${signup ? 12 : 8}" autocomplete="${signup ? "new-password" : "current-password"}" required></label>${signup ? `<p class="field-help">Use 12+ characters with uppercase, lowercase, and a number.</p>` : ""}<button class="primary wide" type="submit">${signup ? "Submit access request" : "Sign in"}</button></form><button class="text-button" id="auth-switch">${signup ? "Already approved? Sign in" : "New staff member? Request access"}</button></div></section></main>`;
  document.getElementById("auth-switch").onclick = () =>
    renderAuth(signup ? "login" : "signup");
  document.getElementById("theme-toggle").onclick = toggleTheme;
  document.getElementById("auth-form").onsubmit = async (e) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLFormElement;
    const form = Object.fromEntries(new FormData(target));
    const b = target.querySelector<HTMLButtonElement>("button[type=submit]");
    b.disabled = true;
    try {
      if (signup) {
        const r = await apiRequest("/v1/auth/signup", {
          method: "POST",
          body: JSON.stringify(form),
        });
        target.reset();
        notice(r.message);
      } else {
        const r = await apiRequest("/v1/auth/login", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setAuthToken(r.token);
        state.user = r.user;
        sessionStorage.setItem("ctl_current_user", JSON.stringify(r.user));
        renderShell();
      }
    } catch (x) {
      notice(message(x), "error");
    } finally {
      b.disabled = false;
    }
  };
}
function nav(page, label, icon) {
  return `<button class="nav-link ${state.page === page ? "active" : ""}" data-page="${page}"><span>${icon}</span>${label}</button>`;
}
function renderShell() {
  app.innerHTML = `<aside class="sidebar"><div class="logo"><span class="brand-mark small">TL</span><div><strong>Tech Loan</strong><small>Operations</small></div></div><nav>${nav("dashboard", "Overview", "⌂")}${nav("inventory", "Inventory", "▦")}${nav("loans", "Loans", "⇄")}${nav("reports", "Reports", "◒")}${state.user?.role === "ADMIN" ? nav("settings", "Admin settings", "⚙") : ""}</nav><div class="sidebar-foot"><button class="theme-button" id="theme-toggle">◐ <span>Day / night</span></button><div class="user-chip"><span>${esc((state.user?.name || "U")[0])}</span><div><strong>${esc(state.user?.name)}</strong><small>${esc(state.user?.role)}</small></div></div><button class="text-button" id="logout">Sign out</button></div></aside><main class="workspace"><header class="topbar"><div><p class="eyebrow">Community outreach operations</p><h1 id="page-title">Overview</h1></div><div class="live-pill"><i></i> System live</div></header><div id="notice" class="notice" hidden></div><section id="content" aria-live="polite"></section></main>`;
  document
    .querySelectorAll<HTMLElement>("[data-page]")
    .forEach((b) => (b.onclick = () => loadPage(b.dataset.page)));
  document.getElementById("logout").onclick = () => {
    clearAuthToken();
    sessionStorage.clear();
    state.user = null;
    renderAuth();
  };
  document.getElementById("theme-toggle").onclick = toggleTheme;
  loadPage(state.page);
}
async function loadPage(page) {
  state.page = page;
  document
    .querySelectorAll<HTMLElement>(".nav-link")
    .forEach((n) => n.classList.toggle("active", n.dataset.page === page));
  document.getElementById("page-title").textContent = {
    dashboard: "Overview",
    inventory: "Inventory",
    loans: "Loans",
    reports: "Reports & analytics",
    settings: "Admin settings",
  }[page];
  const c = document.getElementById("content");
  c.innerHTML = '<div class="loading-block">Loading current data…</div>';
  try {
    if (page === "dashboard") await renderDashboard();
    if (page === "inventory") await renderInventory();
    if (page === "loans") await renderLoans();
    if (page === "reports") await renderReports();
    if (page === "settings") await renderSettings();
  } catch (e) {
    c.innerHTML = `<div class="empty"><h2>Unable to load this view</h2><p>${esc(message(e))}</p><button class="secondary" id="retry">Try again</button></div>`;
    document.getElementById("retry").onclick = () => loadPage(page);
  }
}
const metric = (label, value, detail, tone = "blue") =>
  `<article class="metric ${tone}"><p>${label}</p><strong>${value}</strong><small>${detail}</small></article>`;
async function summary() {
  return (await apiRequest("/v1/reports/summary")).data;
}
function bars(rows = []) {
  const max = Math.max(1, ...rows.map((x) => x.total));
  return rows.length
    ? `<div class="bars">${rows.map((x) => `<div><span>${esc(x.name)}</span><div><i style="width:${(x.total / max) * 100}%"></i></div><strong>${x.available}/${x.total}</strong></div>`).join("")}</div>`
    : `<div class="empty compact">No center data yet.</div>`;
}
async function renderDashboard() {
  const [r, m] = await Promise.all([summary(), apiRequest("/v1/monitoring")]);
  document.getElementById("content").innerHTML =
    `<div class="hero"><div><p class="eyebrow">Today’s operational picture</p><h2>${r.inventory.available} devices ready for community use</h2><p>Live inventory, loan, maintenance, and asset-value signals from one tenant-scoped source.</p></div><div class="gauge" style="--value:${r.loans.utilizationRate}"><div><strong>${pct(r.loans.utilizationRate)}</strong><span>utilized</span></div></div></div><div class="metrics">${metric("Total inventory", r.inventory.total, `${r.inventory.available} available`)}${metric("Active loans", r.loans.active, `${r.loans.overdue} overdue`, r.loans.overdue ? "amber" : "blue")}${metric("In maintenance", r.inventory.maintenance, "Devices unavailable", "violet")}${metric("Current book value", money(r.depreciation.currentBookValue), `${pct(r.depreciation.percentDepreciated)} depreciated`, "green")}</div><div class="split"><section class="panel"><div class="panel-head"><div><p class="eyebrow">Fleet distribution</p><h3>Availability by center</h3></div></div>${bars(r.byCenter)}</section><section class="panel health"><div class="panel-head"><div><p class="eyebrow">Observability</p><h3>Service health</h3></div><span class="status-good">Healthy</span></div><dl><div><dt>Database</dt><dd>${esc(m.data.database)}</dd></div><div><dt>Average latency</dt><dd>${m.data.averageLatencyMs} ms</dd></div><div><dt>Requests served</dt><dd>${m.data.requests}</dd></div><div><dt>Server errors</dt><dd>${m.data.serverErrors}</dd></div></dl></section></div>`;
}
async function renderInventory() {
  const [d, c] = await Promise.all([getDevices(), getCenters()]);
  state.devices = d.data;
  state.centers = c.data;
  document.getElementById("content").innerHTML =
    `<div class="section-actions"><p>${d.data.length} assets in this view</p><button class="primary" id="add-device">Add device</button></div><section class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Asset</th><th>Device</th><th>Status</th><th>Acquired</th><th>Cost</th><th>Depreciation</th></tr></thead><tbody>${d.data.map((x) => `<tr><td><strong>${esc(x.assetTag)}</strong><small>${esc(x.serialNumber)}</small></td><td>${esc(x.manufacturer)} ${esc(x.model)}<small>${esc(x.deviceType)}</small></td><td><span class="badge ${x.status.toLowerCase()}">${esc(x.status.replace("_", " "))}</span></td><td>${esc(x.purchaseDate || "—")}</td><td>${money(x.purchaseCost)}</td><td>${x.depreciationRate == null ? "Default" : pct(x.depreciationRate)}</td></tr>`).join("")}</tbody></table></div></section>`;
  document.getElementById("add-device").onclick = showDeviceDialog;
}
function showDeviceDialog() {
  document
    .getElementById("content")
    .insertAdjacentHTML(
      "beforeend",
      `<dialog id="device-dialog"><form id="device-form"><div class="dialog-head"><div><p class="eyebrow">Inventory record</p><h2>Add a device</h2></div><button type="button" class="icon-button" id="close-dialog">×</button></div><div class="form-grid"><label>Asset tag<input name="assetTag" required></label><label>Serial number<input name="serialNumber" required></label><label>Type<select name="deviceType"><option>LAPTOP</option><option>TABLET</option><option>HOTSPOT</option></select></label><label>Center<select name="centerId">${state.centers.map((c) => `<option value="${c.centerId}">${esc(c.centerName)}</option>`)}</select></label><label>Manufacturer<input name="manufacturer" required></label><label>Model<input name="model" required></label><label>Purchase date<input name="purchaseDate" type="date"></label><label>Purchase cost<input name="purchaseCost" type="number" min="0" step="0.01" value="0"></label><label>Annual depreciation %<input name="depreciationRate" type="number" min="0" max="100" step="0.1" placeholder="Use default"></label></div><div class="dialog-actions"><button type="button" class="secondary" id="cancel-dialog">Cancel</button><button type="submit" class="primary">Save device</button></div></form></dialog>`,
    );
  const d = document.getElementById("device-dialog") as HTMLDialogElement;
  d.showModal();
  document.getElementById("close-dialog").onclick = document.getElementById(
    "cancel-dialog",
  ).onclick = () => d.close();
  document.getElementById("device-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement));
    try {
      await createDevice({
        ...f,
        centerId: Number(f.centerId),
        purchaseCost: Number(f.purchaseCost),
        depreciationRate: f.depreciationRate
          ? Number(f.depreciationRate)
          : null,
        purchaseDate: f.purchaseDate || null,
        status: "AVAILABLE",
      });
      d.close();
      loadPage("inventory");
    } catch (x) {
      alert(message(x));
    }
  };
}
async function renderLoans() {
  const r = await getLoans();
  document.getElementById("content").innerHTML =
    `<div class="metrics">${metric("Active", r.data.filter((x) => x.loanStatus === "ACTIVE").length, "Currently circulating")}${metric("Overdue", r.data.filter((x) => x.loanStatus === "OVERDUE").length, "Needs follow-up", "amber")}${metric("Returned", r.data.filter((x) => x.loanStatus === "RETURNED").length, "Completed loans", "green")}</div><section class="panel table-panel"><div class="table-wrap"><table><thead><tr><th>Loan</th><th>Participant code</th><th>Checkout</th><th>Due</th><th>Status</th></tr></thead><tbody>${r.data.map((x) => `<tr><td>#${x.loanId}<small>Device #${x.deviceId}</small></td><td>${esc(x.participantCode)}</td><td>${new Date(x.checkoutDate).toLocaleDateString()}</td><td>${new Date(x.dueDate).toLocaleDateString()}</td><td><span class="badge ${x.loanStatus.toLowerCase()}">${x.loanStatus}</span></td></tr>`).join("")}</tbody></table></div></section>`;
}
async function renderReports() {
  const r = await summary();
  document.getElementById("content").innerHTML =
    `<div class="report-gauges"><article class="panel gauge-card"><div class="gauge large" style="--value:${r.loans.utilizationRate}"><div><strong>${pct(r.loans.utilizationRate)}</strong><span>utilization</span></div></div><h3>Fleet utilization</h3><p>${r.inventory.checkedOut} checked out · ${r.inventory.total} total</p></article><article class="panel gauge-card"><div class="gauge large green-gauge" style="--value:${100 - r.depreciation.percentDepreciated}"><div><strong>${pct(100 - r.depreciation.percentDepreciated)}</strong><span>value retained</span></div></div><h3>Asset value retained</h3><p>${money(r.depreciation.currentBookValue)} current book value</p></article><article class="panel gauge-card"><div class="gauge large amber-gauge" style="--value:${r.loans.active ? Math.min(100, (r.loans.overdue / r.loans.active) * 100) : 0}"><div><strong>${r.loans.overdue}</strong><span>overdue</span></div></div><h3>Loan health</h3><p>${r.loans.active} active loans</p></article></div><div class="split"><section class="panel"><div class="panel-head"><div><p class="eyebrow">Depreciation</p><h3>Asset lifecycle value</h3></div></div><dl class="value-list"><div><dt>Acquisition value</dt><dd>${money(r.depreciation.acquisitionValue)}</dd></div><div><dt>Accumulated depreciation</dt><dd>${money(r.depreciation.depreciatedValue)}</dd></div><div><dt>Current book value</dt><dd>${money(r.depreciation.currentBookValue)}</dd></div></dl></section><section class="panel"><div class="panel-head"><div><p class="eyebrow">Distribution</p><h3>Inventory by center</h3></div></div>${bars(r.byCenter)}</section></div><section class="panel insight"><p class="eyebrow">Operational insight</p><h3>${r.loans.overdue ? `${r.loans.overdue} overdue loan${r.loans.overdue === 1 ? "" : "s"} need attention.` : "No overdue loans need attention."}</h3><p>${r.inventory.maintenance} device${r.inventory.maintenance === 1 ? " is" : "s are"} in maintenance, while ${pct(r.loans.utilizationRate)} of the fleet is currently utilized.</p></section>`;
}
async function renderSettings() {
  if (state.user?.role !== "ADMIN")
    throw new Error("Administrator access required");
  const [s, a, m] = await Promise.all([
    apiRequest("/v1/settings"),
    apiRequest("/v1/admin/approvals"),
    apiRequest("/v1/monitoring"),
  ]);
  state.settings = s.data;
  document.getElementById("content").innerHTML =
    `<div class="settings-grid"><section class="panel"><div class="panel-head"><div><p class="eyebrow">Access control</p><h3>Pending approvals</h3></div><span class="count">${a.data.length}</span></div><div class="approval-list">${a.data.length ? a.data.map((x) => `<article><div><strong>${esc(x.name)}</strong><small>${esc(x.email)}</small></div><div><button class="secondary" data-user="${x.userId}" data-decision="REJECTED">Reject</button><button class="primary" data-user="${x.userId}" data-decision="APPROVED">Approve</button></div></article>`).join("") : `<div class="empty compact">No requests awaiting review.</div>`}</div></section><section class="panel"><div class="panel-head"><div><p class="eyebrow">Inventory accounting</p><h3>Depreciation defaults</h3></div></div><form id="settings-form"><label>Default annual straight-line rate<input name="defaultDepreciationRate" type="number" min="0" max="100" step="0.1" value="${s.data.defaultDepreciationRate}" required></label><label>Default theme<select name="theme"><option value="system">Follow device</option><option value="light">Day</option><option value="dark">Night</option></select></label><button class="primary" type="submit">Save settings</button></form></section><section class="panel health"><div class="panel-head"><div><p class="eyebrow">Monitoring</p><h3>Application telemetry</h3></div><span class="status-good">Healthy</span></div><dl><div><dt>Uptime</dt><dd>${m.data.uptimeSeconds}s</dd></div><div><dt>Requests</dt><dd>${m.data.requests}</dd></div><div><dt>Average latency</dt><dd>${m.data.averageLatencyMs} ms</dd></div><div><dt>5xx errors</dt><dd>${m.data.serverErrors}</dd></div></dl></section></div>`;
  (document.querySelector("#settings-form select[name=theme]") as HTMLSelectElement).value =
    s.data.theme;
  document.getElementById("settings-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement));
    await apiRequest("/v1/settings", {
      method: "PUT",
      body: JSON.stringify({
        defaultDepreciationRate: Number(f.defaultDepreciationRate),
        theme: f.theme,
      }),
    });
    applyTheme(f.theme);
    notice("Settings saved.");
  };
  document.querySelectorAll<HTMLElement>("[data-decision]").forEach(
    (b) =>
      (b.onclick = async () => {
        await apiRequest(`/v1/admin/approvals/${b.dataset.user}`, {
          method: "POST",
          body: JSON.stringify({ decision: b.dataset.decision }),
        });
        notice(`Account ${b.dataset.decision.toLowerCase()}.`);
        renderSettings();
      }),
  );
}
