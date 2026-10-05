/* =========================================================
   COMMUNITY TECHNOLOGY LOAN
   API CLIENT
   ========================================================= */

"use strict";

/**
 * Generic API request helper.
 *
 * Uses API_BASE_URL from js/config.js
 *
 * Example:
 *   apiRequest("/devices")
 *   apiRequest("/devices/1")
 *
 * The JWT token is stored in sessionStorage after authentication.
 */

async function apiRequest(endpoint, options = {}) {
    if (typeof API_BASE_URL === "undefined") {
        throw new Error("API_BASE_URL is not defined.");
    }

    const token = sessionStorage.getItem("jwt_token");

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    // Add JWT authentication when a token exists.
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    /*
     * Handle unauthorized requests separately.
     */
    if (response.status === 401) {
        sessionStorage.removeItem("jwt_token");

        throw new Error(
            "Unauthorized request. A valid JWT token is required."
        );
    }

    /*
     * Handle other HTTP errors.
     */
    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `API Error ${response.status}: ${errorText}`
        );
    }

    /*
     * Some endpoints may return JSON while others
     * may return plain text or an empty response.
     */
    const contentType = response.headers.get("content-type");

    if (
        contentType &&
        contentType.includes("application/json")
    ) {
        return await response.json();
    }

    return await response.text();
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

/**
 * Store JWT token in the browser session.
 */
function setAuthToken(token) {
    if (!token) {
        throw new Error("A valid JWT token is required.");
    }

    sessionStorage.setItem("jwt_token", token);
}


/**
 * Get the currently stored JWT token.
 */
function getAuthToken() {
    return sessionStorage.getItem("jwt_token");
}


/**
 * Remove the current JWT token.
 */
function clearAuthToken() {
    sessionStorage.removeItem("jwt_token");
}


/**
 * Check whether a JWT token exists.
 */
function isAuthenticated() {
    return Boolean(getAuthToken());
}


/* =========================================================
   DEVICES
   ========================================================= */

/**
 * Get all devices.
 */
async function getDevices() {
    return await apiRequest("/devices");
}


/**
 * Get a single device.
 */
async function getDevice(deviceId) {
    return await apiRequest(`/devices/${deviceId}`);
}


/**
 * Create a device.
 */
async function createDevice(device) {
    return await apiRequest("/devices", {
        method: "POST",
        body: JSON.stringify(device)
    });
}


/**
 * Update a device.
 */
async function updateDevice(deviceId, device) {
    return await apiRequest(`/devices/${deviceId}`, {
        method: "PUT",
        body: JSON.stringify(device)
    });
}


/**
 * Delete a device.
 */
async function deleteDevice(deviceId) {
    return await apiRequest(`/devices/${deviceId}`, {
        method: "DELETE"
    });
}


/* =========================================================
   OUTREACH CENTERS
   ========================================================= */

/**
 * Get all outreach centers.
 */
async function getCenters() {
    return await apiRequest("/centers");
}


/**
 * Get a single outreach center.
 */
async function getCenter(centerId) {
    return await apiRequest(`/centers/${centerId}`);
}


/**
 * Create an outreach center.
 */
async function createCenter(center) {
    return await apiRequest("/centers", {
        method: "POST",
        body: JSON.stringify(center)
    });
}


/**
 * Update an outreach center.
 */
async function updateCenter(centerId, center) {
    return await apiRequest(`/centers/${centerId}`, {
        method: "PUT",
        body: JSON.stringify(center)
    });
}


/**
 * Delete an outreach center.
 */
async function deleteCenter(centerId) {
    return await apiRequest(`/centers/${centerId}`, {
        method: "DELETE"
    });
}


/* =========================================================
   LOANS
   ========================================================= */

/**
 * Get all loans.
 */
async function getLoans() {
    return await apiRequest("/loans");
}


/**
 * Get a single loan.
 */
async function getLoan(loanId) {
    return await apiRequest(`/loans/${loanId}`);
}


/**
 * Create a loan.
 */
async function createLoan(loan) {
    return await apiRequest("/loans", {
        method: "POST",
        body: JSON.stringify(loan)
    });
}


/**
 * Update a loan.
 */
async function updateLoan(loanId, loan) {
    return await apiRequest(`/loans/${loanId}`, {
        method: "PUT",
        body: JSON.stringify(loan)
    });
}


/**
 * Delete a loan.
 */
async function deleteLoan(loanId) {
    return await apiRequest(`/loans/${loanId}`, {
        method: "DELETE"
    });
}


/* =========================================================
   LOAN REASONS
   ========================================================= */

/**
 * Get all loan reasons.
 */
async function getLoanReasons() {
    return await apiRequest("/loan-reasons");
}


/* =========================================================
   MAINTENANCE
   ========================================================= */

/**
 * Get maintenance records.
 */
async function getMaintenanceRecords() {
    return await apiRequest("/maintenance");
}


/**
 * Get a single maintenance record.
 */
async function getMaintenanceRecord(maintenanceId) {
    return await apiRequest(
        `/maintenance/${maintenanceId}`
    );
}


/**
 * Create a maintenance record.
 */
async function createMaintenanceRecord(record) {
    return await apiRequest("/maintenance", {
        method: "POST",
        body: JSON.stringify(record)
    });
}


/**
 * Update a maintenance record.
 */
async function updateMaintenanceRecord(
    maintenanceId,
    record
) {
    return await apiRequest(
        `/maintenance/${maintenanceId}`,
        {
            method: "PUT",
            body: JSON.stringify(record)
        }
    );
}


/* =========================================================
   API CONNECTION TEST
   ========================================================= */

/**
 * Test whether the backend is reachable.
 *
 * This does not assume a specific endpoint.
 * Use it only after confirming the health/status endpoint
 * in the backend README/Postman documentation.
 */
async function testApiConnection(endpoint = "/") {
    return await apiRequest(endpoint);
}