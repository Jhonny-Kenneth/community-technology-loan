/* =========================================================
   COMMUNITY TECHNOLOGY LOAN
   City of Orlando
   Frontend Application
   ========================================================= */

   "use strict";

   /* =========================================================
      APPLICATION STATE
      ========================================================= */
   
   const state = {
       authenticated: false,
       currentPage: "Dashboard",
       currentUser: null,
   
       devices: [
           {
               id: 1,
               assetTag: "ORL-LT-0042",
               serialNumber: "DL5540ORL0042",
               type: "Laptop",
               manufacturer: "Dell",
               model: "Latitude 5540",
               status: "Available",
               center: "Englewood",
               assignedTo: "",
               purchaseDate: "2025-01-15",
               vendor: "Dell Technologies",
               warranty: "2028-01-15"
           },
           {
               id: 2,
               assetTag: "ORL-LT-0043",
               serialNumber: "DL5540ORL0043",
               type: "Laptop",
               manufacturer: "Dell",
               model: "Latitude 5540",
               status: "Assigned",
               center: "Englewood",
               assignedTo: "Community Services",
               purchaseDate: "2025-01-15",
               vendor: "Dell Technologies",
               warranty: "2028-01-15"
           },
           {
               id: 3,
               assetTag: "ORL-TB-0018",
               serialNumber: "IPAD10ORL0018",
               type: "Tablet",
               manufacturer: "Apple",
               model: "iPad 10th Gen",
               status: "Available",
               center: "Hankins",
               assignedTo: "",
               purchaseDate: "2025-02-10",
               vendor: "Apple",
               warranty: "2026-02-10"
           },
           {
               id: 4,
               assetTag: "ORL-DK-0011",
               serialNumber: "HP800G9ORL0011",
               type: "Desktop",
               manufacturer: "HP",
               model: "EliteDesk 800 G9",
               status: "Maintenance",
               center: "Barnett",
               assignedTo: "",
               purchaseDate: "2024-11-05",
               vendor: "CDW",
               warranty: "2027-11-05"
           },
           {
               id: 5,
               assetTag: "ORL-MN-0025",
               serialNumber: "DELLP2425ORL25",
               type: "Monitor",
               manufacturer: "Dell",
               model: "P2425H",
               status: "Available",
               center: "Englewood",
               assignedTo: "",
               purchaseDate: "2025-03-20",
               vendor: "Dell Technologies",
               warranty: "2028-03-20"
           },
           {
               id: 6,
               assetTag: "ORL-LT-0044",
               serialNumber: "DL5540ORL0044",
               type: "Laptop",
               manufacturer: "Dell",
               model: "Latitude 5540",
               status: "Assigned",
               center: "Hankins",
               assignedTo: "Digital Literacy Program",
               purchaseDate: "2025-01-20",
               vendor: "Dell Technologies",
               warranty: "2028-01-20"
           }
       ],
   
       centers: [
           {
               id: 1,
               name: "Englewood Neighborhood Center",
               address: "6123 La Costa Drive, Orlando, FL",
               phone: "(407) 555-0142",
               active: true
           },
           {
               id: 2,
               name: "Hankins Park",
               address: "1348 Lake Highland Drive, Orlando, FL",
               phone: "(407) 555-0187",
               active: true
           },
           {
               id: 3,
               name: "Barnett Park",
               address: "4801 W Colonial Drive, Orlando, FL",
               phone: "(407) 555-0135",
               active: true
           }
       ],
   
       loans: [
           {
               id: 1,
               assetTag: "ORL-LT-0043",
               device: "Dell Latitude 5540",
               borrower: "Community Services",
               center: "Englewood",
               status: "Active",
               loanDate: "2026-09-10",
               returnDate: "2026-10-10"
           },
           {
               id: 2,
               assetTag: "ORL-LT-0044",
               device: "Dell Latitude 5540",
               borrower: "Digital Literacy Program",
               center: "Hankins",
               status: "Active",
               loanDate: "2026-09-15",
               returnDate: "2026-10-15"
           },
           {
               id: 3,
               assetTag: "ORL-TB-0015",
               device: "iPad 10th Gen",
               borrower: "Youth Services",
               center: "Barnett",
               status: "Returned",
               loanDate: "2026-08-12",
               returnDate: "2026-09-01"
           }
       ],
   
       users: [
           {
               id: 1,
               name: "Admin User",
               email: "admin@orlando.gov",
               role: "ADMIN",
               status: "Active",
               lastLogin: "2026-09-28 09:15 AM"
           },
           {
               id: 2,
               name: "Staff User",
               email: "staff@orlando.gov",
               role: "STAFF",
               status: "Active",
               lastLogin: "2026-09-28 08:42 AM"
           }
       ]
   };
   
   
   /* =========================================================
      DEMO AUTHENTICATION
      ========================================================= */
   
   const demoAccounts = [
       {
           email: "admin@orlando.gov",
           password: "Admin123!",
           name: "Admin User",
           role: "ADMIN"
       },
       {
           email: "staff@orlando.gov",
           password: "Staff123!",
           name: "Staff User",
           role: "STAFF"
       }
   ];
   
   
   /* =========================================================
      APPLICATION START
      ========================================================= */
   
   document.addEventListener("DOMContentLoaded", () => {
   
       console.log("Community Technology Loan Frontend initialized.");
   
       loadSavedSession();
   
       if (state.authenticated) {
           renderApplication();
       } else {
           renderLogin();
       }
   });
   
   
   /* =========================================================
      SESSION
      ========================================================= */
   
   function loadSavedSession() {
   
       const savedUser = sessionStorage.getItem("ctl_current_user");
   
       if (!savedUser) {
           return;
       }
   
       try {
   
           state.currentUser = JSON.parse(savedUser);
           state.authenticated = true;
   
       } catch (error) {
   
           console.error("Unable to restore session.");
   
           sessionStorage.removeItem("ctl_current_user");
       }
   }
   
   
   function saveSession(user) {
   
       state.currentUser = user;
       state.authenticated = true;
   
       sessionStorage.setItem(
           "ctl_current_user",
           JSON.stringify(user)
       );
   }
   
   
   function logout() {
   
       state.authenticated = false;
       state.currentUser = null;
       state.currentPage = "Dashboard";
   
       sessionStorage.removeItem("ctl_current_user");
   
       renderLogin();
   }
   
   
   /* =========================================================
      LOGIN
      ========================================================= */
   
   function renderLogin() {
   
       const app = document.getElementById("app");
   
       if (!app) {
           return;
       }
   
       app.innerHTML = `
           <div class="login-container">
   
               <div class="login-card">
   
                   <div class="login-logo">
   
                       <h1>Tech Loan</h1>
   
                       <span>
                           City of Orlando
                       </span>
   
                   </div>
   
                   <h2>Staff Sign In</h2>
   
                   <p class="login-description">
                       Community Technology Loan Project
                       inventory management system.
                   </p>
   
                   <div
                       id="login-error"
                       class="form-error"
                       style="display:none;"
                       role="alert"
                   ></div>
   
                   <form id="login-form">
   
                       <div class="form-group">
   
                           <label for="login-email">
                               Email
                           </label>
   
                           <input
                               id="login-email"
                               name="email"
                               type="email"
                               autocomplete="username"
                               placeholder="Enter your email"
                               required
                           >
   
                       </div>
   
                       <div class="form-group">
   
                           <label for="login-password">
                               Password
                           </label>
   
                           <input
                               id="login-password"
                               name="password"
                               type="password"
                               autocomplete="current-password"
                               placeholder="Enter your password"
                               required
                           >
   
                       </div>
   
                       <button
                           type="submit"
                           class="login-button"
                       >
                           Sign In
                       </button>
   
                   </form>
   
                   <div class="login-footer">
   
                       Internal City of Orlando
                       Technology Loan System
   
                   </div>
   
               </div>
   
           </div>
       `;
   
       const form = document.getElementById("login-form");
   
       form.addEventListener("submit", handleLogin);
   }
   
   
   function handleLogin(event) {
   
       event.preventDefault();
   
       const email =
           document.getElementById("login-email").value.trim();
   
       const password =
           document.getElementById("login-password").value;
   
       const errorBox =
           document.getElementById("login-error");
   
       const account = demoAccounts.find(
           user =>
               user.email.toLowerCase() === email.toLowerCase() &&
               user.password === password
       );
   
       if (!account) {
   
           errorBox.textContent =
               "Invalid email or password. Please try again.";
   
           errorBox.style.display = "block";
   
           return;
       }
   
       saveSession({
           name: account.name,
           email: account.email,
           role: account.role
       });
   
       state.currentPage = "Dashboard";
   
       renderApplication();
   }
   
   
   /* =========================================================
      MAIN APPLICATION
      ========================================================= */
   
   function renderApplication() {
   
       const app = document.getElementById("app");
   
       if (!app) {
           return;
       }
   
       app.innerHTML = `
   
           <div class="app-container">
   
               ${renderSidebar()}
   
               <main
                   class="main-content"
                   id="main-content"
               ></main>
   
           </div>
       `;
   
       setupNavigation();
   
       renderPage(state.currentPage);
   }
   
   
   /* =========================================================
      SIDEBAR
      ========================================================= */
   
   function renderSidebar() {
   
       const isAdmin =
           state.currentUser &&
           state.currentUser.role === "ADMIN";
   
       return `
   
           <aside class="sidebar">
   
               <div class="logo">
   
                   <h2>Tech Loan</h2>
   
                   <span>
                       City of Orlando
                   </span>
   
               </div>
   
               <nav
                   class="navigation"
                   aria-label="Main navigation"
               >
   
                   ${navItem("Dashboard", "dashboard")}
   
                   ${navItem(
                       "Device Inventory",
                       "inventory"
                   )}
   
                   ${navItem(
                       "Outreach Centers",
                       "centers"
                   )}
   
                   ${navItem(
                       "Loans",
                       "loans"
                   )}
   
                   ${
                       isAdmin
                           ? navItem("Users", "users")
                           : ""
                   }
   
                   ${
                       isAdmin
                           ? navItem("Settings", "settings")
                           : ""
                   }
   
               </nav>
   
               <div class="sidebar-bottom">
   
                   <div class="user-info">
   
                       <strong>
                           ${escapeHTML(
                               state.currentUser?.name ||
                               "Staff User"
                           )}
                       </strong>
   
                       <span>
                           ${escapeHTML(
                               state.currentUser?.role ||
                               "STAFF"
                           )}
                       </span>
   
                   </div>
   
                   <a
                       href="#logout"
                       class="nav-item logout-link"
                       data-page="Logout"
                   >
                       Logout
                   </a>
   
               </div>
   
           </aside>
       `;
   }
   
   
   function navItem(label, page) {
   
       const active =
           state.currentPage === label
               ? "active"
               : "";
   
       return `
           <a
               href="#${page}"
               class="nav-item ${active}"
               data-page="${label}"
           >
               ${label}
           </a>
       `;
   }
   
   
   /* =========================================================
      NAVIGATION
      ========================================================= */
   
   function setupNavigation() {
   
       const links =
           document.querySelectorAll(
               "[data-page]"
           );
   
       links.forEach(link => {
   
           link.addEventListener(
               "click",
               event => {
   
                   event.preventDefault();
   
                   const page =
                       link.dataset.page;
   
                   if (page === "Logout") {
   
                       logout();
   
                       return;
                   }
   
                   navigateTo(page);
               }
           );
       });
   }
   
   
   function navigateTo(page) {
   
       if (
           (page === "Users" || page === "Settings") &&
           state.currentUser?.role !== "ADMIN"
       ) {
   
           renderUnauthorized();
   
           return;
       }
   
       state.currentPage = page;
   
       renderApplication();
   }
   
   
   /* =========================================================
      PAGE ROUTER
      ========================================================= */
   
   function renderPage(page) {
   
       switch (page) {
   
           case "Dashboard":
               renderDashboard();
               break;
   
           case "Device Inventory":
               renderInventory();
               break;
   
           case "Outreach Centers":
               renderCenters();
               break;
   
           case "Loans":
               renderLoans();
               break;
   
           case "Users":
               renderUsers();
               break;
   
           case "Settings":
               renderSettings();
               break;
   
           default:
               renderDashboard();
       }
   }
   
   
   /* =========================================================
      PAGE HEADER
      ========================================================= */
   
   function pageHeader(title, subtitle = "") {
   
       return `
           <header class="top-header">
   
               <div>
   
                   <span class="organization">
                       CITY OF ORLANDO ·
                       COMMUNITY TECHNOLOGY LOAN PROJECT
                   </span>
   
                   <h1>
                       ${escapeHTML(title)}
                   </h1>
   
                   ${
                       subtitle
                           ? `<p class="page-subtitle">
                               ${escapeHTML(subtitle)}
                              </p>`
                           : ""
                   }
   
               </div>
   
           </header>
       `;
   }
   
   
   /* =========================================================
      DASHBOARD
      ========================================================= */
   
   function renderDashboard() {
   
       const content =
           document.getElementById("main-content");
   
       const total =
           state.devices.length;
   
       const available =
           state.devices.filter(
               d => d.status === "Available"
           ).length;
   
       const assigned =
           state.devices.filter(
               d => d.status === "Assigned"
           ).length;
   
       const maintenance =
           state.devices.filter(
               d => d.status === "Maintenance"
           ).length;
   
       content.innerHTML = `
   
           ${pageHeader(
               "Dashboard",
               "Technology inventory overview and recent activity."
           )}
   
           <section class="dashboard-cards">
   
               ${statCard(
                   "Total Devices",
                   total
               )}
   
               ${statCard(
                   "Available",
                   available
               )}
   
               ${statCard(
                   "Assigned",
                   assigned
               )}
   
               ${statCard(
                   "Maintenance",
                   maintenance
               )}
   
           </section>
   
           <section class="content-card">
   
               <div class="card-header">
   
                   <h2>
                       Recent Device Activity
                   </h2>
   
                   <button
                       class="text-button"
                       data-action="inventory"
                   >
                       View All →
                   </button>
   
               </div>
   
               <div class="table-container">
   
                   <table>
   
                       <thead>
   
                           <tr>
                               <th>Asset Tag</th>
                               <th>Type</th>
                               <th>Model</th>
                               <th>Status</th>
                               <th>Center</th>
                           </tr>
   
                       </thead>
   
                       <tbody>
   
                           ${state.devices
                               .slice(0, 5)
                               .map(deviceRow)
                               .join("")}
   
                       </tbody>
   
                   </table>
   
               </div>
   
           </section>
   
           <section class="content-card">
   
               <div class="card-header">
   
                   <h2>
                       Quick Actions
                   </h2>
   
               </div>
   
               <div class="quick-actions">
   
                   <button
                       type="button"
                       data-action="inventory"
                   >
                       View Device Inventory
                   </button>
   
                   <button
                       type="button"
                       data-action="add-device"
                   >
                       Add New Device
                   </button>
   
                   <button
                       type="button"
                       data-action="centers"
                   >
                       Outreach Centers
                   </button>
   
                   <button
                       type="button"
                       data-action="loans"
                   >
                       Manage Loans
                   </button>
   
               </div>
   
           </section>
       `;
   
       setupPageActions();
   }
   
   
   /* =========================================================
      STAT CARD
      ========================================================= */
   
   function statCard(label, value) {
   
       return `
           <div class="dashboard-card">
   
               <span>
                   ${escapeHTML(label)}
               </span>
   
               <strong>
                   ${value}
               </strong>
   
           </div>
       `;
   }
   
   
   /* =========================================================
      DEVICE INVENTORY
      ========================================================= */
   
   function renderInventory() {
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               "Device Inventory",
               "Search, filter, and manage technology assets."
           )}
   
           <section class="content-card">
   
               <div class="inventory-toolbar">
   
                   <div class="search-wrapper">
   
                       <label for="device-search">
                           Search devices
                       </label>
   
                       <input
                           type="search"
                           id="device-search"
                           placeholder="Search asset tag, model, serial number..."
                       >
   
                   </div>
   
                   <div>
   
                       <label for="type-filter">
                           Device Type
                       </label>
   
                       <select id="type-filter">
   
                           <option value="">
                               All Types
                           </option>
   
                           <option value="Laptop">
                               Laptop
                           </option>
   
                           <option value="Tablet">
                               Tablet
                           </option>
   
                           <option value="Desktop">
                               Desktop
                           </option>
   
                           <option value="Monitor">
                               Monitor
                           </option>
   
                       </select>
   
                   </div>
   
                   <div>
   
                       <label for="status-filter">
                           Status
                       </label>
   
                       <select id="status-filter">
   
                           <option value="">
                               All Statuses
                           </option>
   
                           <option value="Available">
                               Available
                           </option>
   
                           <option value="Assigned">
                               Assigned
                           </option>
   
                           <option value="Maintenance">
                               Maintenance
                           </option>
   
                           <option value="Retired">
                               Retired
                           </option>
   
                       </select>
   
                   </div>
   
                   <div class="toolbar-actions">
   
                       <button
                           class="secondary-button"
                           id="clear-filters"
                       >
                           Clear Filters
                       </button>
   
                       <button
                           class="primary-button"
                           data-action="add-device"
                       >
                           + Add Device
                       </button>
   
                   </div>
   
               </div>
   
           </section>
   
           <section class="content-card">
   
               <div class="card-header">
   
                   <h2>
                       Devices
                   </h2>
   
                   <span
                       id="inventory-count"
                       class="record-count"
                   >
                       ${state.devices.length} records
                   </span>
   
               </div>
   
               <div class="table-container">
   
                   <table id="inventory-table">
   
                       <thead>
   
                           <tr>
                               <th>Asset ID</th>
                               <th>Device Type</th>
                               <th>Manufacturer</th>
                               <th>Model</th>
                               <th>Serial Number</th>
                               <th>Status</th>
                               <th>Outreach Center</th>
                               <th>Actions</th>
                           </tr>
   
                       </thead>
   
                       <tbody id="inventory-body">
   
                           ${state.devices
                               .map(inventoryRow)
                               .join("")}
   
                       </tbody>
   
                   </table>
   
               </div>
   
           </section>
       `;
   
       setupPageActions();
       setupInventoryFilters();
   }
   
   
   function inventoryRow(device) {
   
       return `
           <tr>
   
               <td>
                   <button
                       class="table-link"
                       data-action="device-details"
                       data-id="${device.id}"
                   >
                       ${escapeHTML(device.assetTag)}
                   </button>
               </td>
   
               <td>
                   ${escapeHTML(device.type)}
               </td>
   
               <td>
                   ${escapeHTML(device.manufacturer)}
               </td>
   
               <td>
                   ${escapeHTML(device.model)}
               </td>
   
               <td>
                   ${escapeHTML(device.serialNumber)}
               </td>
   
               <td>
                   ${statusBadge(device.status)}
               </td>
   
               <td>
                   ${escapeHTML(device.center)}
               </td>
   
               <td>
   
                   <button
                       class="small-button"
                       data-action="device-details"
                       data-id="${device.id}"
                   >
                       View
                   </button>
   
                   <button
                       class="small-button"
                       data-action="edit-device"
                       data-id="${device.id}"
                   >
                       Edit
                   </button>
   
               </td>
   
           </tr>
       `;
   }
   
   
   function setupInventoryFilters() {
   
       const search =
           document.getElementById("device-search");
   
       const type =
           document.getElementById("type-filter");
   
       const status =
           document.getElementById("status-filter");
   
       const clear =
           document.getElementById("clear-filters");
   
       function filterDevices() {
   
           const searchValue =
               search.value.toLowerCase().trim();
   
           const typeValue =
               type.value;
   
           const statusValue =
               status.value;
   
           const filtered =
               state.devices.filter(device => {
   
                   const matchesSearch =
                       !searchValue ||
                       device.assetTag.toLowerCase().includes(searchValue) ||
                       device.serialNumber.toLowerCase().includes(searchValue) ||
                       device.model.toLowerCase().includes(searchValue) ||
                       device.manufacturer.toLowerCase().includes(searchValue);
   
                   const matchesType =
                       !typeValue ||
                       device.type === typeValue;
   
                   const matchesStatus =
                       !statusValue ||
                       device.status === statusValue;
   
                   return (
                       matchesSearch &&
                       matchesType &&
                       matchesStatus
                   );
               });
   
           document.getElementById(
               "inventory-body"
           ).innerHTML =
               filtered.length
                   ? filtered.map(inventoryRow).join("")
                   : `
                       <tr>
                           <td colspan="8">
                               <div class="empty-state">
                                   <strong>
                                       No devices found
                                   </strong>
                                   <p>
                                       Try changing your search or filters.
                                   </p>
                               </div>
                           </td>
                       </tr>
                   `;
   
           document.getElementById(
               "inventory-count"
           ).textContent =
               `${filtered.length} records`;
   
           setupPageActions();
       }
   
       search.addEventListener(
           "input",
           filterDevices
       );
   
       type.addEventListener(
           "change",
           filterDevices
       );
   
       status.addEventListener(
           "change",
           filterDevices
       );
   
       clear.addEventListener(
           "click",
           () => {
   
               search.value = "";
               type.value = "";
               status.value = "";
   
               filterDevices();
           }
       );
   }
   
   
   /* =========================================================
      DEVICE DETAILS
      ========================================================= */
   
   function renderDeviceDetails(id) {
   
       const device =
           state.devices.find(
               d => d.id === Number(id)
           );
   
       if (!device) {
   
           showToast(
               "Device not found.",
               "error"
           );
   
           return;
       }
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               "Device Details",
               `Asset ${device.assetTag}`
           )}
   
           <section class="content-card">
   
               <div class="card-header">
   
                   <h2>
                       ${escapeHTML(device.model)}
                   </h2>
   
                   <div class="button-group">
   
                       <button
                           class="secondary-button"
                           data-action="inventory"
                       >
                           ← Back to Inventory
                       </button>
   
                       <button
                           class="primary-button"
                           data-action="edit-device"
                           data-id="${device.id}"
                       >
                           Edit Device
                       </button>
   
                   </div>
   
               </div>
   
               <div class="details-grid">
   
                   ${detailItem(
                       "Asset Tag",
                       device.assetTag
                   )}
   
                   ${detailItem(
                       "Serial Number",
                       device.serialNumber
                   )}
   
                   ${detailItem(
                       "Device Type",
                       device.type
                   )}
   
                   ${detailItem(
                       "Manufacturer",
                       device.manufacturer
                   )}
   
                   ${detailItem(
                       "Model",
                       device.model
                   )}
   
                   ${detailItem(
                       "Status",
                       statusBadge(device.status)
                   )}
   
                   ${detailItem(
                       "Outreach Center",
                       device.center
                   )}
   
                   ${detailItem(
                       "Assigned User / Department",
                       device.assignedTo || "Not assigned"
                   )}
   
                   ${detailItem(
                       "Purchase Date",
                       device.purchaseDate
                   )}
   
                   ${detailItem(
                       "Vendor",
                       device.vendor
                   )}
   
                   ${detailItem(
                       "Warranty",
                       device.warranty
                   )}
   
               </div>
   
           </section>
       `;
   
       setupPageActions();
   }
   
   
   /* =========================================================
      ADD DEVICE
      ========================================================= */
   
   function renderAddDevice() {
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               "Add New Device",
               "Create a new technology inventory record."
           )}
   
           <section class="content-card">
   
               <form
                   id="device-form"
                   class="device-form"
               >
   
                   ${deviceFormFields()}
   
                   <div class="form-actions">
   
                       <button
                           type="button"
                           class="secondary-button"
                           data-action="inventory"
                       >
                           Cancel
                       </button>
   
                       <button
                           type="submit"
                           class="primary-button"
                       >
                           Save Device
                       </button>
   
                   </div>
   
               </form>
   
           </section>
       `;
   
       setupDeviceForm();
       setupPageActions();
   }
   
   
   function deviceFormFields(device = {}) {
   
       return `
   
           <div class="form-grid">
   
               ${formInput(
                   "Asset Tag",
                   "assetTag",
                   device.assetTag || "",
                   true
               )}
   
               ${formInput(
                   "Serial Number",
                   "serialNumber",
                   device.serialNumber || "",
                   true
               )}
   
               <div class="form-group">
   
                   <label for="device-type">
                       Device Type
                   </label>
   
                   <select
                       id="device-type"
                       name="type"
                       required
                   >
   
                       <option value="">
                           Select type
                       </option>
   
                       ${selectOption(
                           "Laptop",
                           device.type
                       )}
   
                       ${selectOption(
                           "Tablet",
                           device.type
                       )}
   
                       ${selectOption(
                           "Desktop",
                           device.type
                       )}
   
                       ${selectOption(
                           "Monitor",
                           device.type
                       )}
   
                   </select>
   
               </div>
   
               ${formInput(
                   "Manufacturer",
                   "manufacturer",
                   device.manufacturer || "",
                   true
               )}
   
               ${formInput(
                   "Model",
                   "model",
                   device.model || "",
                   true
               )}
   
               <div class="form-group">
   
                   <label for="device-status">
                       Status
                   </label>
   
                   <select
                       id="device-status"
                       name="status"
                       required
                   >
   
                       ${selectOption(
                           "Available",
                           device.status || "Available"
                       )}
   
                       ${selectOption(
                           "Assigned",
                           device.status
                       )}
   
                       ${selectOption(
                           "Maintenance",
                           device.status
                       )}
   
                       ${selectOption(
                           "Retired",
                           device.status
                       )}
   
                   </select>
   
               </div>
   
               <div class="form-group">
   
                   <label for="device-center">
                       Outreach Center
                   </label>
   
                   <select
                       id="device-center"
                       name="center"
                       required
                   >
   
                       <option value="">
                           Select center
                       </option>
   
                       ${state.centers
                           .map(center =>
                               selectOption(
                                   center.name
                                       .replace(
                                           " Neighborhood Center",
                                           ""
                                       ),
                                   device.center
                               )
                           )
                           .join("")}
   
                       <option value="Englewood">
                           Englewood
                       </option>
   
                       <option value="Hankins">
                           Hankins
                       </option>
   
                       <option value="Barnett">
                           Barnett
                       </option>
   
                   </select>
   
               </div>
   
               ${formInput(
                   "Assigned User / Department",
                   "assignedTo",
                   device.assignedTo || ""
               )}
   
               ${formInput(
                   "Purchase Date",
                   "purchaseDate",
                   device.purchaseDate || "",
                   false,
                   "date"
               )}
   
               ${formInput(
                   "Vendor",
                   "vendor",
                   device.vendor || ""
               )}
   
               ${formInput(
                   "Warranty Expiration",
                   "warranty",
                   device.warranty || "",
                   false,
                   "date"
               )}
   
           </div>
       `;
   }
   
   
   function formInput(
       label,
       name,
       value = "",
       required = false,
       type = "text"
   ) {
   
       return `
           <div class="form-group">
   
               <label for="${name}">
                   ${escapeHTML(label)}
                   ${required ? "<span>*</span>" : ""}
               </label>
   
               <input
                   id="${name}"
                   name="${name}"
                   type="${type}"
                   value="${escapeAttribute(value)}"
                   ${required ? "required" : ""}
               >
   
           </div>
       `;
   }
   
   
   function selectOption(value, selectedValue) {
   
       const selected =
           value === selectedValue
               ? "selected"
               : "";
   
       return `
           <option
               value="${escapeAttribute(value)}"
               ${selected}
           >
               ${escapeHTML(value)}
           </option>
       `;
   }
   
   
   function setupDeviceForm(editId = null) {
   
       const form =
           document.getElementById("device-form");
   
       if (!form) {
           return;
       }
   
       form.addEventListener(
           "submit",
           event => {
   
               event.preventDefault();
   
               const formData =
                   new FormData(form);
   
               const data =
                   Object.fromEntries(formData.entries());
   
               const duplicateAsset =
                   state.devices.some(
                       device =>
                           device.assetTag.toLowerCase() ===
                           data.assetTag.toLowerCase() &&
                           device.id !== Number(editId)
                   );
   
               if (duplicateAsset) {
   
                   showToast(
                       "Asset Tag already exists.",
                       "error"
                   );
   
                   return;
               }
   
               const duplicateSerial =
                   state.devices.some(
                       device =>
                           device.serialNumber.toLowerCase() ===
                           data.serialNumber.toLowerCase() &&
                           device.id !== Number(editId)
                   );
   
               if (duplicateSerial) {
   
                   showToast(
                       "Serial Number already exists.",
                       "error"
                   );
   
                   return;
               }
   
               if (editId) {
   
                   const device =
                       state.devices.find(
                           d => d.id === Number(editId)
                       );
   
                   if (device) {
   
                       Object.assign(
                           device,
                           data
                       );
   
                       saveDevices();
   
                       showToast(
                           "Device updated successfully.",
                           "success"
                       );
   
                       setTimeout(
                           () =>
                               renderDeviceDetails(editId),
                           500
                       );
                   }
   
               } else {
   
                   const newDevice = {
   
                       id:
                           Date.now(),
   
                       assetTag:
                           data.assetTag,
   
                       serialNumber:
                           data.serialNumber,
   
                       type:
                           data.type,
   
                       manufacturer:
                           data.manufacturer,
   
                       model:
                           data.model,
   
                       status:
                           data.status,
   
                       center:
                           data.center,
   
                       assignedTo:
                           data.assignedTo || "",
   
                       purchaseDate:
                           data.purchaseDate || "",
   
                       vendor:
                           data.vendor || "",
   
                       warranty:
                           data.warranty || ""
   
                   };
   
                   state.devices.push(
                       newDevice
                   );
   
                   saveDevices();
   
                   showToast(
                       "Device added successfully.",
                       "success"
                   );
   
                   setTimeout(
                       () =>
                           renderInventory(),
                       500
                   );
               }
           }
       );
   }
   
   
   /* =========================================================
      EDIT DEVICE
      ========================================================= */
   
   function renderEditDevice(id) {
   
       const device =
           state.devices.find(
               d => d.id === Number(id)
           );
   
       if (!device) {
           showToast(
               "Device not found.",
               "error"
           );
           return;
       }
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               "Edit Device",
               `Update ${device.assetTag}`
           )}
   
           <section class="content-card">
   
               <form
                   id="device-form"
                   class="device-form"
               >
   
                   ${deviceFormFields(device)}
   
                   <div class="form-actions">
   
                       <button
                           type="button"
                           class="secondary-button"
                           data-action="device-details"
                           data-id="${device.id}"
                       >
                           Cancel
                       </button>
   
                       <button
                           type="submit"
                           class="primary-button"
                       >
                           Save Changes
                       </button>
   
                   </div>
   
               </form>
   
           </section>
       `;
   
       setupDeviceForm(id);
       setupPageActions();
   }
   
   
   /* =========================================================
      OUTREACH CENTERS
      ========================================================= */
   
   function renderCenters() {
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               "Outreach Centers",
               "Community locations participating in the technology loan program."
           )}
   
           <section class="center-grid">
   
               ${state.centers
                   .map(center => {
   
                       const deviceCount =
                           state.devices.filter(
                               d =>
                                   d.center ===
                                   center.name.replace(
                                       " Neighborhood Center",
                                       ""
                                   )
                           ).length;
   
                       return `
   
                           <div class="center-card">
   
                               <div class="center-card-header">
   
                                   <h2>
                                       ${escapeHTML(center.name)}
                                   </h2>
   
                                   <span class="status available">
                                       ${
                                           center.active
                                               ? "Active"
                                               : "Inactive"
                                       }
                                   </span>
   
                               </div>
   
                               <p>
                                   ${escapeHTML(center.address)}
                               </p>
   
                               <p>
                                   ${escapeHTML(center.phone)}
                               </p>
   
                               <div class="center-stat">
   
                                   <strong>
                                       ${deviceCount}
                                   </strong>
   
                                   <span>
                                       Devices
                                   </span>
   
                               </div>
   
                               <button
                                   class="secondary-button"
                                   data-action="center-details"
                                   data-id="${center.id}"
                               >
                                   View Center
                               </button>
   
                           </div>
                       `;
                   })
                   .join("")}
   
           </section>
       `;
   
       setupPageActions();
   }
   
   
   function renderCenterDetails(id) {
   
       const center =
           state.centers.find(
               c => c.id === Number(id)
           );
   
       if (!center) {
           showToast(
               "Center not found.",
               "error"
           );
           return;
       }
   
       const centerName =
           center.name.replace(
               " Neighborhood Center",
               ""
           );
   
       const devices =
           state.devices.filter(
               device =>
                   device.center === centerName
           );
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               center.name,
               "Outreach center information and assigned devices."
           )}
   
           <section class="content-card">
   
               <div class="card-header">
   
                   <h2>
                       Center Information
                   </h2>
   
                   <button
                       class="secondary-button"
                       data-action="centers"
                   >
                       ← Back
                   </button>
   
               </div>
   
               <div class="details-grid">
   
                   ${detailItem(
                       "Center Name",
                       center.name
                   )}
   
                   ${detailItem(
                       "Address",
                       center.address
                   )}
   
                   ${detailItem(
                       "Phone",
                       center.phone
                   )}
   
                   ${detailItem(
                       "Status",
                       center.active
                           ? statusBadge("Available", "Active")
                           : statusBadge("Retired", "Inactive")
                   )}
   
               </div>
   
           </section>
   
           <section class="content-card">
   
               <div class="card-header">
   
                   <h2>
                       Associated Devices
                   </h2>
   
               </div>
   
               <div class="table-container">
   
                   <table>
   
                       <thead>
                           <tr>
                               <th>Asset Tag</th>
                               <th>Type</th>
                               <th>Model</th>
                               <th>Status</th>
                           </tr>
                       </thead>
   
                       <tbody>
   
                           ${
                               devices.length
                                   ? devices
                                       .map(device => `
                                           <tr>
                                               <td>
                                                   ${escapeHTML(
                                                       device.assetTag
                                                   )}
                                               </td>
                                               <td>
                                                   ${escapeHTML(
                                                       device.type
                                                   )}
                                               </td>
                                               <td>
                                                   ${escapeHTML(
                                                       device.model
                                                   )}
                                               </td>
                                               <td>
                                                   ${statusBadge(
                                                       device.status
                                                   )}
                                               </td>
                                           </tr>
                                       `)
                                       .join("")
                                   : `
                                       <tr>
                                           <td colspan="4">
                                               No devices assigned to this center.
                                           </td>
                                       </tr>
                                   `
                           }
   
                       </tbody>
   
                   </table>
   
               </div>
   
           </section>
       `;
   
       setupPageActions();
   }
   
   
   /* =========================================================
      LOANS
      ========================================================= */
   
   function renderLoans() {
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               "Loan Management",
               "Track technology loans and expected returns."
           )}
   
           <section class="content-card">
   
               <div class="card-header">
   
                   <h2>
                       Current Loans
                   </h2>
   
                   <span class="record-count">
                       ${state.loans.length} records
                   </span>
   
               </div>
   
               <div class="table-container">
   
                   <table>
   
                       <thead>
   
                           <tr>
                               <th>Device</th>
                               <th>Asset ID</th>
                               <th>Borrower / Department</th>
                               <th>Outreach Center</th>
                               <th>Status</th>
                               <th>Loan Date</th>
                               <th>Expected Return</th>
                               <th>Actions</th>
                           </tr>
   
                       </thead>
   
                       <tbody>
   
                           ${state.loans
                               .map(loan => `
   
                                   <tr>
   
                                       <td>
                                           ${escapeHTML(
                                               loan.device
                                           )}
                                       </td>
   
                                       <td>
                                           ${escapeHTML(
                                               loan.assetTag
                                           )}
                                       </td>
   
                                       <td>
                                           ${escapeHTML(
                                               loan.borrower
                                           )}
                                       </td>
   
                                       <td>
                                           ${escapeHTML(
                                               loan.center
                                           )}
                                       </td>
   
                                       <td>
                                           ${loanStatusBadge(
                                               loan.status
                                           )}
                                       </td>
   
                                       <td>
                                           ${escapeHTML(
                                               loan.loanDate
                                           )}
                                       </td>
   
                                       <td>
                                           ${escapeHTML(
                                               loan.returnDate
                                           )}
                                       </td>
   
                                       <td>
                                           <button
                                               class="small-button"
                                               data-action="loan-message"
                                           >
                                               View
                                           </button>
                                       </td>
   
                                   </tr>
   
                               `)
                               .join("")}
   
                       </tbody>
   
                   </table>
   
               </div>
   
           </section>
       `;
   
       setupPageActions();
   }
   
   
   /* =========================================================
      USERS
      ========================================================= */
   
   function renderUsers() {
   
       if (state.currentUser?.role !== "ADMIN") {
   
           renderUnauthorized();
   
           return;
       }
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               "User Management",
               "Manage system users and role-based access."
           )}
   
           <section class="content-card">
   
               <div class="card-header">
   
                   <h2>
                       System Users
                   </h2>
   
                   <button
                       class="primary-button"
                       data-action="add-user"
                   >
                       + Add User
                   </button>
   
               </div>
   
               <div class="table-container">
   
                   <table>
   
                       <thead>
   
                           <tr>
                               <th>Name</th>
                               <th>Email</th>
                               <th>Role</th>
                               <th>Status</th>
                               <th>Last Login</th>
                               <th>Actions</th>
                           </tr>
   
                       </thead>
   
                       <tbody>
   
                           ${state.users
                               .map(user => `
   
                                   <tr>
   
                                       <td>
                                           ${escapeHTML(
                                               user.name
                                           )}
                                       </td>
   
                                       <td>
                                           ${escapeHTML(
                                               user.email
                                           )}
                                       </td>
   
                                       <td>
                                           <span class="role-badge">
                                               ${escapeHTML(
                                                   user.role
                                               )}
                                           </span>
                                       </td>
   
                                       <td>
                                           ${user.status === "Active"
                                               ? statusBadge(
                                                   "Available",
                                                   "Active"
                                               )
                                               : statusBadge(
                                                   "Retired",
                                                   "Inactive"
                                               )}
                                       </td>
   
                                       <td>
                                           ${escapeHTML(
                                               user.lastLogin
                                           )}
                                       </td>
   
                                       <td>
   
                                           <button
                                               class="small-button"
                                               data-action="edit-user"
                                               data-id="${user.id}"
                                           >
                                               Edit
                                           </button>
   
                                       </td>
   
                                   </tr>
   
                               `)
                               .join("")}
   
                       </tbody>
   
                   </table>
   
               </div>
   
           </section>
       `;
   
       setupPageActions();
   }
   
   
   /* =========================================================
      SETTINGS
      ========================================================= */
   
   function renderSettings() {
   
       if (state.currentUser?.role !== "ADMIN") {
   
           renderUnauthorized();
   
           return;
       }
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               "System Settings",
               "Administrative configuration for the technology loan system."
           )}
   
           <section class="settings-grid">
   
               <div class="settings-card">
   
                   <h2>
                       User Roles
                   </h2>
   
                   <p>
                       Configure role-based access for Staff
                       and Admin users.
                   </p>
   
                   <button
                       class="secondary-button"
                       data-action="users"
                   >
                       Manage Users
                   </button>
   
               </div>
   
               <div class="settings-card">
   
                   <h2>
                       Inventory Settings
                   </h2>
   
                   <p>
                       Configure device types, inventory
                       requirements, and asset identification.
                   </p>
   
                   <button
                       class="secondary-button"
                       data-action="settings-message"
                   >
                       Configure
                   </button>
   
               </div>
   
               <div class="settings-card">
   
                   <h2>
                       Status Options
                   </h2>
   
                   <p>
                       Available, Assigned, Maintenance,
                       and Retired.
                   </p>
   
                   <button
                       class="secondary-button"
                       data-action="settings-message"
                   >
                       Manage Statuses
                   </button>
   
               </div>
   
               <div class="settings-card">
   
                   <h2>
                       System Preferences
                   </h2>
   
                   <p>
                       General application preferences and
                       administrative options.
                   </p>
   
                   <button
                       class="secondary-button"
                       data-action="settings-message"
                   >
                       Open Preferences
                   </button>
   
               </div>
   
           </section>
       `;
   
       setupPageActions();
   }
   
   
   /* =========================================================
      UNAUTHORIZED
      ========================================================= */
   
   function renderUnauthorized() {
   
       const content =
           document.getElementById("main-content");
   
       content.innerHTML = `
   
           ${pageHeader(
               "Unauthorized Access",
               "You do not have permission to access this section."
           )}
   
           <section class="content-card">
   
               <div class="empty-state">
   
                   <h2>
                       Access Restricted
                   </h2>
   
                   <p>
                       This area is available only to
                       authorized administrators.
                   </p>
   
                   <button
                       class="primary-button"
                       data-action="dashboard"
                   >
                       Return to Dashboard
                   </button>
   
               </div>
   
           </section>
       `;
   
       setupPageActions();
   }
   
   
   /* =========================================================
      PAGE ACTIONS
      ========================================================= */
   
   function setupPageActions() {
   
       document
           .querySelectorAll("[data-action]")
           .forEach(element => {
   
               element.addEventListener(
                   "click",
                   event => {
   
                       event.preventDefault();
   
                       const action =
                           element.dataset.action;
   
                       const id =
                           element.dataset.id;
   
                       handleAction(
                           action,
                           id
                       );
                   }
               );
           });
   }
   
   
   function handleAction(action, id) {
   
       switch (action) {
   
           case "dashboard":
               navigateTo("Dashboard");
               break;
   
           case "inventory":
               navigateTo("Device Inventory");
               break;
   
           case "centers":
               navigateTo("Outreach Centers");
               break;
   
           case "loans":
               navigateTo("Loans");
               break;
   
           case "users":
               navigateTo("Users");
               break;
   
           case "settings":
               navigateTo("Settings");
               break;
   
           case "add-device":
               renderAddDevice();
               break;
   
           case "device-details":
               renderDeviceDetails(id);
               break;
   
           case "edit-device":
               renderEditDevice(id);
               break;
   
           case "center-details":
               renderCenterDetails(id);
               break;
   
           case "add-user":
               showToast(
                   "User creation will be connected to the backend during integration.",
                   "info"
               );
               break;
   
           case "edit-user":
               showToast(
                   "User editing will be connected to the backend during integration.",
                   "info"
               );
               break;
   
           case "loan-message":
               showToast(
                   "Loan details selected.",
                   "info"
               );
               break;
   
           case "settings-message":
               showToast(
                   "Settings configuration selected.",
                   "info"
               );
               break;
   
           default:
               console.log(
                   "Unhandled action:",
                   action
               );
       }
   }
   
   
   /* =========================================================
      HELPERS
      ========================================================= */
   
   function deviceRow(device) {
   
       return `
           <tr>
   
               <td>
                   ${escapeHTML(device.assetTag)}
               </td>
   
               <td>
                   ${escapeHTML(device.type)}
               </td>
   
               <td>
                   ${escapeHTML(device.model)}
               </td>
   
               <td>
                   ${statusBadge(device.status)}
               </td>
   
               <td>
                   ${escapeHTML(device.center)}
               </td>
   
           </tr>
       `;
   }
   
   
   function statusBadge(status, customText = null) {
   
       const className =
           status.toLowerCase();
   
       return `
           <span
               class="status ${escapeAttribute(className)}"
           >
               ${escapeHTML(
                   customText || status
               )}
           </span>
       `;
   }
   
   
   function loanStatusBadge(status) {
   
       let className = "available";
   
       if (status === "Active") {
           className = "assigned";
       }
   
       if (status === "Pending") {
           className = "maintenance";
       }
   
       if (status === "Returned") {
           className = "available";
       }
   
       return `
           <span class="status ${className}">
               ${escapeHTML(status)}
           </span>
       `;
   }
   
   
   function detailItem(label, value) {
   
       return `
           <div class="detail-item">
   
               <span>
                   ${escapeHTML(label)}
               </span>
   
               <strong>
                   ${value}
               </strong>
   
           </div>
       `;
   }
   
   
   /* =========================================================
      LOCAL STORAGE
      ========================================================= */
   
   function saveDevices() {
   
       localStorage.setItem(
           "ctl_devices",
           JSON.stringify(state.devices)
       );
   }
   
   
   function loadDevices() {
   
       const saved =
           localStorage.getItem(
               "ctl_devices"
           );
   
       if (!saved) {
           return;
       }
   
       try {
   
           state.devices =
               JSON.parse(saved);
   
       } catch (error) {
   
           console.error(
               "Unable to load saved devices."
           );
       }
   }
   
   
   /* =========================================================
      TOAST NOTIFICATIONS
      ========================================================= */
   
   function showToast(
       message,
       type = "info"
   ) {
   
       let container =
           document.getElementById(
               "toast-container"
           );
   
       if (!container) {
   
           container =
               document.createElement("div");
   
           container.id =
               "toast-container";
   
           container.className =
               "toast-container";
   
           document.body.appendChild(
               container
           );
       }
   
       const toast =
           document.createElement("div");
   
       toast.className =
           `toast toast-${type}`;
   
       toast.textContent =
           message;
   
       container.appendChild(
           toast
       );
   
       setTimeout(
           () => {
   
               toast.classList.add(
                   "toast-hide"
               );
   
               setTimeout(
                   () =>
                       toast.remove(),
                   300
               );
   
           },
           3000
       );
   }
   
   
   /* =========================================================
      SECURITY / HTML ESCAPING
      ========================================================= */
   
   function escapeHTML(value) {
   
       return String(value ?? "")
           .replaceAll("&", "&amp;")
           .replaceAll("<", "&lt;")
           .replaceAll(">", "&gt;")
           .replaceAll('"', "&quot;")
           .replaceAll("'", "&#039;");
   }
   
   
   function escapeAttribute(value) {
   
       return escapeHTML(value);
   }
   
   
   /* =========================================================
      INITIAL DATA LOAD
      ========================================================= */
   
   loadDevices();
   
   console.log(
       "Community Technology Loan application ready."
   );