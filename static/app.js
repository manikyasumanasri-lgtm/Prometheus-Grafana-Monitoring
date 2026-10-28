// CloudPulse Monitoring Dashboard Controller

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const promStatusPill = document.getElementById("prom-status-pill");
    const amStatusPill = document.getElementById("am-status-pill");
    const banner = document.getElementById("service-alert-banner");
    const bannerMsg = document.getElementById("service-alert-msg");
    const refreshBtn = document.getElementById("refresh-btn");
    const autoRefreshCheck = document.getElementById("auto-refresh-check");
    const lastUpdatedText = document.getElementById("last-updated-text");

    // Metric Values & Badges
    const valTotalRequests = document.getElementById("val-total-requests");
    const valRequestRate = document.getElementById("val-request-rate");
    const valErrorRate = document.getElementById("val-error-rate");
    const valLatency = document.getElementById("val-latency");

    const cardErrorRate = document.getElementById("card-error-rate");
    const cardLatency = document.getElementById("card-latency");

    const targetsTableBody = document.getElementById("targets-table-body");
    const targetsCountBadge = document.getElementById("targets-count-badge");
    const promAlertsList = document.getElementById("prom-alerts-list");
    const alertsCountBadge = document.getElementById("alerts-count-badge");
    const webhookAlertsList = document.getElementById("webhook-alerts-list");
    const webhookCountBadge = document.getElementById("webhook-count-badge");

    // Simulator Elements
    const btnSimTraffic = document.getElementById("btn-sim-traffic");
    const btnSimError = document.getElementById("btn-sim-error");
    const btnSimSlow = document.getElementById("btn-sim-slow");
    const simLog = document.getElementById("sim-log");
    const clearLogBtn = document.getElementById("clear-log-btn");

    let refreshTimer = null;
    const REFRESH_INTERVAL_MS = 5000;

    // Helper: Append log to simulator window
    function appendLog(message, type = "info") {
        const entry = document.createElement("div");
        const timeStr = new Date().toLocaleTimeString();
        entry.className = `log-entry log-${type}`;
        entry.textContent = `[${timeStr}] ${message}`;
        simLog.appendChild(entry);
        simLog.scrollTop = simLog.scrollHeight;
    }

    if (clearLogBtn) {
        clearLogBtn.addEventListener("click", () => {
            simLog.innerHTML = `<div class="log-entry log-info">[Log Cleared] Simulator ready.</div>`;
        });
    }

    // Simulator Handlers
    btnSimTraffic.addEventListener("click", async () => {
        btnSimTraffic.disabled = true;
        appendLog("Sending synthetic batch of 5 requests to /api/simulate/traffic...", "info");
        try {
            const requests = Array.from({ length: 5 }, () => fetch("/api/simulate/traffic"));
            const results = await Promise.all(requests);
            const okCount = results.filter(r => r.ok).length;
            appendLog(`Batch completed: ${okCount}/5 requests responded with HTTP 200 OK`, "ok");
            // Trigger refresh after short delay so scrape captures it
            setTimeout(fetchDashboardData, 1200);
        } catch (err) {
            appendLog(`Traffic simulation failed: ${err.message}`, "err");
        } finally {
            btnSimTraffic.disabled = false;
        }
    });

    btnSimError.addEventListener("click", async () => {
        btnSimError.disabled = true;
        appendLog("Simulating HTTP 500 Internal Server Error via /api/simulate/error...", "err");
        try {
            const res = await fetch("/api/simulate/error");
            appendLog(`Error endpoint responded with HTTP ${res.status} Internal Error (expected for alert testing)`, "err");
            setTimeout(fetchDashboardData, 1200);
        } catch (err) {
            appendLog(`Failed to reach error endpoint: ${err.message}`, "err");
        } finally {
            btnSimError.disabled = false;
        }
    });

    btnSimSlow.addEventListener("click", async () => {
        btnSimSlow.disabled = true;
        appendLog("Triggering slow endpoint (simulating 1.2s latency) via /api/simulate/slow...", "slow");
        const start = performance.now();
        try {
            const res = await fetch("/api/simulate/slow");
            const duration = Math.round(performance.now() - start);
            appendLog(`Slow request finished in ${duration}ms with HTTP ${res.status}`, "slow");
            setTimeout(fetchDashboardData, 1200);
        } catch (err) {
            appendLog(`Slow simulation failed: ${err.message}`, "err");
        } finally {
            btnSimSlow.disabled = false;
        }
    });

    // Main Data Fetcher
    async function fetchDashboardData() {
        refreshBtn.classList.add("loading");
        try {
            const resp = await fetch("/api/dashboard-data");
            if (!resp.ok) {
                throw new Error(`CloudPulse API returned HTTP ${resp.status}`);
            }
            const data = await resp.json();
            renderDashboard(data);
        } catch (err) {
            renderUnreachableState(err.message);
        } finally {
            refreshBtn.classList.remove("loading");
            lastUpdatedText.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
        }
    }

    // Render Unreachable / Error State
    function renderUnreachableState(errorMsg) {
        promStatusPill.className = "status-pill disconnected";
        promStatusPill.innerHTML = `<span class="status-dot"></span><span class="label">Prometheus: Offline</span>`;

        amStatusPill.className = "status-pill disconnected";
        amStatusPill.innerHTML = `<span class="status-dot"></span><span class="label">Alertmanager: Offline</span>`;

        banner.classList.remove("hidden");
        bannerMsg.textContent = `Dashboard API communication failure: ${errorMsg}. Live metrics cannot be queried.`;

        markMetricUnavailable(valTotalRequests);
        markMetricUnavailable(valRequestRate);
        markMetricUnavailable(valErrorRate);
        markMetricUnavailable(valLatency);

        targetsTableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Data unavailable. Unable to communicate with Prometheus.</td></tr>`;
        targetsCountBadge.textContent = "Unavailable";
        targetsCountBadge.className = "badge badge-danger";

        promAlertsList.innerHTML = `<div class="empty-state">Prometheus unavailable. Cannot evaluate alert states.</div>`;
        alertsCountBadge.textContent = "Offline";
        alertsCountBadge.className = "badge badge-danger";
    }

    function markMetricUnavailable(element) {
        element.textContent = "Unavailable";
        element.classList.add("unavailable");
    }

    function renderMetricValue(element, value, suffix = "") {
        if (value === null || value === undefined) {
            element.textContent = "Unavailable";
            element.classList.add("unavailable");
        } else {
            element.textContent = `${value}${suffix}`;
            element.classList.remove("unavailable");
        }
    }

    // Render Complete Live State
    function renderDashboard(data) {
        const prom = data.prometheus || {};
        const am = data.alertmanager || {};

        // 1. Prometheus Status Pill & Banner
        if (prom.connected) {
            promStatusPill.className = "status-pill connected";
            promStatusPill.innerHTML = `<span class="status-dot"></span><span class="label">Prometheus: Connected</span>`;
            banner.classList.add("hidden");
        } else {
            promStatusPill.className = "status-pill disconnected";
            promStatusPill.innerHTML = `<span class="status-dot"></span><span class="label">Prometheus: Unreachable</span>`;
            banner.classList.remove("hidden");
            bannerMsg.textContent = `Prometheus is unreachable at ${prom.url}. Live metrics and scrape targets cannot be queried.`;
        }

        // 2. Alertmanager Status Pill
        if (am.connected) {
            amStatusPill.className = "status-pill connected";
            amStatusPill.innerHTML = `<span class="status-dot"></span><span class="label">Alertmanager: Connected</span>`;
        } else {
            amStatusPill.className = "status-pill disconnected";
            amStatusPill.innerHTML = `<span class="status-dot"></span><span class="label">Alertmanager: Unreachable</span>`;
        }

        // 3. Metrics Cards (Only populated from real Prometheus query results)
        if (prom.connected && prom.metrics) {
            const m = prom.metrics;
            renderMetricValue(valTotalRequests, m.total_requests !== null ? Math.round(m.total_requests) : null);
            renderMetricValue(valRequestRate, m.request_rate !== null ? m.request_rate.toFixed(2) : null);
            
            if (m.error_rate_pct !== null) {
                renderMetricValue(valErrorRate, m.error_rate_pct.toFixed(1));
                if (m.error_rate_pct > 10) {
                    cardErrorRate.classList.add("alert-active");
                } else {
                    cardErrorRate.classList.remove("alert-active");
                }
            } else {
                markMetricUnavailable(valErrorRate);
                cardErrorRate.classList.remove("alert-active");
            }

            if (m.p95_latency_ms !== null) {
                renderMetricValue(valLatency, m.p95_latency_ms.toFixed(1));
                if (m.p95_latency_ms > 1000) {
                    cardLatency.classList.add("alert-active");
                } else {
                    cardLatency.classList.remove("alert-active");
                }
            } else {
                markMetricUnavailable(valLatency);
                cardLatency.classList.remove("alert-active");
            }
        } else {
            markMetricUnavailable(valTotalRequests);
            markMetricUnavailable(valRequestRate);
            markMetricUnavailable(valErrorRate);
            markMetricUnavailable(valLatency);
            cardErrorRate.classList.remove("alert-active");
            cardLatency.classList.remove("alert-active");
        }

        // 4. Scrape Targets Table
        if (prom.connected && Array.isArray(prom.targets) && prom.targets.length > 0) {
            const upCount = prom.targets.filter(t => t.health === "up").length;
            targetsCountBadge.textContent = `${upCount} / ${prom.targets.length} UP`;
            targetsCountBadge.className = upCount === prom.targets.length ? "badge badge-success" : "badge badge-warning";

            targetsTableBody.innerHTML = prom.targets.map(t => {
                const isUp = t.health === "up";
                const badgeClass = isUp ? "badge badge-success" : "badge badge-danger";
                const durationMs = t.lastScrapeDuration ? (t.lastScrapeDuration * 1000).toFixed(1) + " ms" : "--";
                const lastScrapeFormatted = t.lastScrape ? new Date(t.lastScrape).toLocaleTimeString() : "--";
                return `
                    <tr>
                        <td><strong>${escapeHtml(t.job)}</strong></td>
                        <td><code>${escapeHtml(t.instance)}</code></td>
                        <td><span class="${badgeClass}">${isUp ? "UP" : "DOWN"}</span></td>
                        <td>${lastScrapeFormatted}</td>
                        <td><code>${durationMs}</code></td>
                    </tr>
                `;
            }).join("");
        } else if (prom.connected) {
            targetsTableBody.innerHTML = `<tr><td colspan="5" class="table-empty">No active targets configured in Prometheus.</td></tr>`;
            targetsCountBadge.textContent = "0 Targets";
            targetsCountBadge.className = "badge badge-neutral";
        } else {
            targetsTableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Prometheus target data unavailable.</td></tr>`;
            targetsCountBadge.textContent = "Offline";
            targetsCountBadge.className = "badge badge-danger";
        }

        // 5. Prometheus Active Alert Rules
        if (prom.connected && Array.isArray(prom.alerts)) {
            const firingAlerts = prom.alerts.filter(a => a.state === "firing");
            const pendingAlerts = prom.alerts.filter(a => a.state === "pending");
            alertsCountBadge.textContent = `${firingAlerts.length} Firing / ${prom.alerts.length} Total`;
            alertsCountBadge.className = firingAlerts.length > 0 ? "badge badge-danger" : "badge badge-success";

            if (prom.alerts.length === 0) {
                promAlertsList.innerHTML = `<div class="empty-state">No firing or pending alerts. All monitored metrics within healthy thresholds.</div>`;
            } else {
                promAlertsList.innerHTML = prom.alerts.map(a => {
                    const labels = a.labels || {};
                    const annotations = a.annotations || {};
                    const severity = labels.severity || "warning";
                    const isFiring = a.state === "firing";
                    const badgeClass = isFiring ? "badge badge-danger" : "badge badge-warning";
                    
                    return `
                        <div class="alert-item ${severity}">
                            <div class="alert-top">
                                <span class="alert-name">${escapeHtml(labels.alertname || "Alert")}</span>
                                <span class="${badgeClass}">${escapeHtml(a.state.toUpperCase())}</span>
                            </div>
                            <div class="alert-summary">${escapeHtml(annotations.summary || "No summary provided")}</div>
                            <div class="alert-desc">${escapeHtml(annotations.description || "")}</div>
                        </div>
                    `;
                }).join("");
            }
        } else if (prom.connected) {
            promAlertsList.innerHTML = `<div class="empty-state">No alerts reported by Prometheus.</div>`;
            alertsCountBadge.textContent = "0 Active";
            alertsCountBadge.className = "badge badge-neutral";
        } else {
            promAlertsList.innerHTML = `<div class="empty-state">Prometheus unavailable. Cannot evaluate alert states.</div>`;
            alertsCountBadge.textContent = "Unavailable";
            alertsCountBadge.className = "badge badge-danger";
        }

        // 6. Alertmanager Webhook Notifications
        const webhooks = data.recent_webhook_alerts || [];
        webhookCountBadge.textContent = `${webhooks.length} Received`;
        webhookCountBadge.className = webhooks.length > 0 ? "badge badge-neutral" : "badge badge-neutral";

        if (webhooks.length === 0) {
            webhookAlertsList.innerHTML = `<div class="empty-state">No webhook notifications received yet. When an alert fires in Alertmanager, it routes here.</div>`;
        } else {
            webhookAlertsList.innerHTML = webhooks.map(w => {
                const statusClass = w.status === "firing" ? "critical" : "resolved";
                const badgeClass = w.status === "firing" ? "badge badge-danger" : "badge badge-success";
                return `
                    <div class="alert-item ${statusClass}">
                        <div class="alert-top">
                            <span class="alert-name">${escapeHtml(w.alertname)}</span>
                            <span class="${badgeClass}">${escapeHtml(w.status.toUpperCase())} &bull; ${escapeHtml(w.received_at)}</span>
                        </div>
                        <div class="alert-summary">${escapeHtml(w.summary)}</div>
                        <div class="alert-desc">${escapeHtml(w.description)}</div>
                    </div>
                `;
            }).join("");
        }
    }

    // Utility: XSS prevention
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Auto Refresh Management
    function setupAutoRefresh() {
        if (autoRefreshCheck.checked) {
            if (!refreshTimer) {
                refreshTimer = setInterval(fetchDashboardData, REFRESH_INTERVAL_MS);
            }
        } else {
            if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        }
    }

    autoRefreshCheck.addEventListener("change", setupAutoRefresh);
    refreshBtn.addEventListener("click", fetchDashboardData);

    // Initial load
    fetchDashboardData();
    setupAutoRefresh();
});
