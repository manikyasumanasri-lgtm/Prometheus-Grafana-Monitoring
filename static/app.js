/**
 * CloudPulse Enterprise DevOps Observability Dashboard Controller
 * Integrates Prometheus PromQL telemetry, Alertmanager notifications,
 * and Chart.js real-time visualizers.
 */

document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------------------
    // 1. Navigation & View Routing State
    // -------------------------------------------------------------------------
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    const viewPanels = document.querySelectorAll(".view-panel");
    const mobileToggle = document.getElementById("mobile-toggle");
    const sidebar = document.getElementById("sidebar");

    function switchView(targetViewId) {
        navItems.forEach(item => {
            if (item.dataset.view === targetViewId) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        viewPanels.forEach(panel => {
            if (panel.id === `view-${targetViewId}`) {
                panel.classList.add("active");
            } else {
                panel.classList.remove("active");
            }
        });

        // Trigger chart resize if charts are inside newly active view
        window.dispatchEvent(new Event("resize"));
    }

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if (view) {
                switchView(view);
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove("open");
                }
            }
        });
    });

    if (mobileToggle) {
        mobileToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }

    // -------------------------------------------------------------------------
    // 2. DOM Elements References
    // -------------------------------------------------------------------------
    const topHealthPill = document.getElementById("top-health-pill");
    const topHealthText = document.getElementById("top-health-text");
    const connectionBanner = document.getElementById("connection-banner");
    const connectionBannerMsg = document.getElementById("connection-banner-msg");
    const refreshBtn = document.getElementById("refresh-btn");
    const autoRefreshSelect = document.getElementById("auto-refresh-select");
    const timeRangeSelect = document.getElementById("time-range-select");
    const lastSyncText = document.getElementById("last-sync-text");
    const footerSync = document.getElementById("footer-sync");
    const footerUptime = document.getElementById("footer-uptime");

    // Notification Popover
    const bellBtn = document.getElementById("bell-btn");
    const bellBadge = document.getElementById("bell-badge");
    const notificationPopover = document.getElementById("notification-popover");
    const popoverAlertsList = document.getElementById("popover-alerts-list");
    const popoverClearBtn = document.getElementById("popover-clear-btn");

    // Hero Overview Elements
    const valHeroCpu = document.getElementById("val-hero-cpu");
    const progHeroCpu = document.getElementById("prog-hero-cpu");
    const subHeroCpu = document.getElementById("sub-hero-cpu");
    const badgeHeroCpu = document.getElementById("badge-hero-cpu");

    const valHeroMem = document.getElementById("val-hero-mem");
    const progHeroMem = document.getElementById("prog-hero-mem");
    const subHeroMem = document.getElementById("sub-hero-mem");
    const badgeHeroMem = document.getElementById("badge-hero-mem");

    const valHeroDisk = document.getElementById("val-hero-disk");
    const progHeroDisk = document.getElementById("prog-hero-disk");
    const subHeroDisk = document.getElementById("sub-hero-disk");

    const valHeroNet = document.getElementById("val-hero-net");
    const subHeroNet = document.getElementById("sub-hero-net");

    const valHeroAlerts = document.getElementById("val-hero-alerts");
    const badgeHeroAlerts = document.getElementById("badge-hero-alerts");
    const subHeroAlerts = document.getElementById("sub-hero-alerts");
    const progHeroAlerts = document.getElementById("prog-hero-alerts");
    const navBadgeAlerts = document.getElementById("nav-badge-alerts");

    const valHeroServices = document.getElementById("val-hero-services");
    const targetsBadge = document.getElementById("targets-badge");
    const navBadgeServices = document.getElementById("nav-badge-services");

    // Monitoring Services Cards Elements
    const servicesGlobalDot = document.getElementById("services-global-dot");
    const servicesGlobalText = document.getElementById("services-global-text");

    const statusPillProm = document.getElementById("status-pill-prom");
    const statusTextProm = document.getElementById("status-text-prom");
    const diagValProm = document.getElementById("diag-val-prom");
    const btnLaunchProm = document.getElementById("btn-launch-prom");

    const statusPillGrafana = document.getElementById("status-pill-grafana");
    const statusTextGrafana = document.getElementById("status-text-grafana");
    const diagValGrafana = document.getElementById("diag-val-grafana");
    const btnLaunchGrafana = document.getElementById("btn-launch-grafana");

    const statusPillAm = document.getElementById("status-pill-am");
    const statusTextAm = document.getElementById("status-text-am");
    const diagValAm = document.getElementById("diag-val-am");
    const btnLaunchAm = document.getElementById("btn-launch-am");

    const statusPillNe = document.getElementById("status-pill-ne");
    const statusTextNe = document.getElementById("status-text-ne");
    const diagValNe = document.getElementById("diag-val-ne");
    const btnLaunchNe = document.getElementById("btn-launch-ne");

    // Overview Target, Disk & Alerts Elements
    const ovDiskBar = document.getElementById("ov-disk-bar");
    const ovDiskLblUsed = document.getElementById("ov-disk-lbl-used");
    const ovDiskLblPct = document.getElementById("ov-disk-lbl-pct");
    const ovDiskLblFree = document.getElementById("ov-disk-lbl-free");
    const ovDiskTotalVal = document.getElementById("ov-disk-total-val");
    const ovRecentAlerts = document.getElementById("overview-recent-alerts");
    const ovAlertsSummaryBadge = document.getElementById("ov-alerts-summary-badge");

    // Overview Targets Table
    const overviewTargetsTbody = document.getElementById("overview-targets-tbody");
    const servicesTargetsTbody = document.getElementById("services-targets-tbody");

    // CPU View
    const valCpuCurrent = document.getElementById("val-cpu-current");
    const valCpuLoad1 = document.getElementById("val-cpu-load1");
    const valCpuLoad5 = document.getElementById("val-cpu-load5");
    const valCpuLoad15 = document.getElementById("val-cpu-load15");

    // Memory View
    const valMemPct = document.getElementById("val-mem-pct");
    const valMemTotal = document.getElementById("val-mem-total");
    const valMemUsed = document.getElementById("val-mem-used");
    const valMemAvail = document.getElementById("val-mem-avail");

    // Disk View
    const valDiskPct = document.getElementById("val-disk-pct");
    const valDiskTotal = document.getElementById("val-disk-total");
    const valDiskUsed = document.getElementById("val-disk-used");
    const valDiskAvail = document.getElementById("val-disk-avail");
    const diskMainProg = document.getElementById("disk-main-prog");
    const diskLblUsed = document.getElementById("disk-lbl-used");
    const diskLblPct = document.getElementById("disk-lbl-pct");
    const diskLblFree = document.getElementById("disk-lbl-free");

    // Network View
    const valNetRx = document.getElementById("val-net-rx");
    const valNetTx = document.getElementById("val-net-tx");
    const valNetReqs = document.getElementById("val-net-reqs");
    const valNetTotalReqs = document.getElementById("val-net-total-reqs");

    // Alerts View
    const promAlertsContainer = document.getElementById("prom-alerts-container");
    const webhookAlertsContainer = document.getElementById("webhook-alerts-container");
    const promAlertsCount = document.getElementById("prom-alerts-count");
    const webhookAlertsCount = document.getElementById("webhook-alerts-count");
    const alertFilterBtns = document.querySelectorAll(".alert-filter-group .filter-btn");

    // Simulator Elements
    const simTerminal = document.getElementById("sim-terminal");
    const simClearLogBtn = document.getElementById("sim-clear-log-btn");
    const simBtnTraffic = document.getElementById("sim-btn-traffic");
    const simBtnError = document.getElementById("sim-btn-error");
    const simBtnSlow = document.getElementById("sim-btn-slow");
    const simBtnCpu = document.getElementById("sim-btn-cpu");
    const simBtnMem = document.getElementById("sim-btn-mem");
    const simBtnClear = document.getElementById("sim-btn-clear");

    const btnQuickTraffic = document.getElementById("btn-quick-traffic");
    const btnQuickError = document.getElementById("btn-quick-error");
    const btnQuickCpu = document.getElementById("btn-quick-cpu");
    const btnTriggerCpuStress = document.getElementById("btn-trigger-cpu-stress");
    const btnTriggerMemTest = document.getElementById("btn-trigger-mem-test");

    // Global Search
    const globalSearch = document.getElementById("global-search");

    let autoRefreshTimer = null;
    let latestDashboardData = null;
    let activeAlertFilter = "all";

    // -------------------------------------------------------------------------
    // 3. Terminal Log Output Helper
    // -------------------------------------------------------------------------
    function appendTerminal(message, type = "info") {
        if (!simTerminal) return;
        const line = document.createElement("div");
        const timeStr = new Date().toLocaleTimeString();
        line.className = `terminal-line log-${type}`;
        line.textContent = `[${timeStr}] ${message}`;
        simTerminal.appendChild(line);
        simTerminal.scrollTop = simTerminal.scrollHeight;
    }

    if (simClearLogBtn) {
        simClearLogBtn.addEventListener("click", () => {
            simTerminal.innerHTML = `<div class="terminal-line log-info">[Console Reset] Ready for simulator commands.</div>`;
        });
    }

    // -------------------------------------------------------------------------
    // 4. Chart.js Real-Time Telemetry Visualizers
    // -------------------------------------------------------------------------
    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        scales: {
            x: {
                grid: { color: "rgba(255, 255, 255, 0.04)" },
                ticks: { color: "#64748B", font: { family: "JetBrains Mono", size: 10 } }
            },
            y: {
                grid: { color: "rgba(255, 255, 255, 0.04)" },
                ticks: { color: "#64748B", font: { family: "JetBrains Mono", size: 10 } }
            }
        },
        plugins: {
            legend: {
                labels: { color: "#94A3B8", font: { family: "Inter", size: 11 } }
            }
        }
    };

    let overviewTrendChart = null;
    let overviewCpuChart = null;
    let overviewMemoryChart = null;
    let overviewNetworkChart = null;
    let cpuChart = null;
    let memoryChart = null;
    let networkChart = null;

    function initCharts() {
        if (typeof Chart === "undefined") {
            console.warn("Chart.js not loaded. Live timeseries graphs will be disabled.");
            return;
        }

        // 1. Overview CPU Dedicated Chart
        const ovCpuCanvas = document.getElementById("overview-cpu-chart");
        if (ovCpuCanvas) {
            overviewCpuChart = new Chart(ovCpuCanvas, {
                type: "line",
                data: {
                    labels: [],
                    datasets: [{
                        label: "CPU Utilization %",
                        borderColor: "#7C3AED",
                        backgroundColor: "rgba(124, 58, 237, 0.15)",
                        data: [],
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        ...chartDefaults.scales,
                        y: { ...chartDefaults.scales.y, min: 0, max: 100 }
                    }
                }
            });
        }

        // 2. Overview Memory Dedicated Chart
        const ovMemCanvas = document.getElementById("overview-memory-chart");
        if (ovMemCanvas) {
            overviewMemoryChart = new Chart(ovMemCanvas, {
                type: "line",
                data: {
                    labels: [],
                    datasets: [{
                        label: "Memory Utilization %",
                        borderColor: "#06B6D4",
                        backgroundColor: "rgba(6, 182, 212, 0.15)",
                        data: [],
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        ...chartDefaults.scales,
                        y: { ...chartDefaults.scales.y, min: 0, max: 100 }
                    }
                }
            });
        }

        // 3. Overview Network Dedicated Chart
        const ovNetCanvas = document.getElementById("overview-network-chart");
        if (ovNetCanvas) {
            overviewNetworkChart = new Chart(ovNetCanvas, {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "Rx (Inbound Bytes/s)",
                            borderColor: "#22C55E",
                            backgroundColor: "rgba(34, 197, 94, 0.1)",
                            data: [],
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: "Tx (Outbound Bytes/s)",
                            borderColor: "#3B82F6",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            data: [],
                            tension: 0.3,
                            fill: true
                        }
                    ]
                },
                options: { ...chartDefaults }
            });
        }

        // 4. Legacy Overview Trend Chart (if present)
        const ovCanvas = document.getElementById("overview-trend-chart");
        if (ovCanvas) {
            overviewTrendChart = new Chart(ovCanvas, {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "CPU Usage %",
                            borderColor: "#7C3AED",
                            backgroundColor: "rgba(124, 58, 237, 0.1)",
                            data: [],
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: "Memory Usage %",
                            borderColor: "#06B6D4",
                            backgroundColor: "rgba(6, 182, 212, 0.1)",
                            data: [],
                            tension: 0.3,
                            fill: true
                        }
                    ]
                },
                options: { ...chartDefaults }
            });
        }

        // 5. CPU Dedicated View Chart
        const cpuCanvas = document.getElementById("cpu-chart");
        if (cpuCanvas) {
            cpuChart = new Chart(cpuCanvas, {
                type: "line",
                data: {
                    labels: [],
                    datasets: [{
                        label: "CPU Utilization %",
                        borderColor: "#7C3AED",
                        backgroundColor: "rgba(124, 58, 237, 0.15)",
                        data: [],
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        ...chartDefaults.scales,
                        y: { ...chartDefaults.scales.y, min: 0, max: 100 }
                    }
                }
            });
        }

        // 6. Memory Dedicated View Chart
        const memCanvas = document.getElementById("memory-chart");
        if (memCanvas) {
            memoryChart = new Chart(memCanvas, {
                type: "line",
                data: {
                    labels: [],
                    datasets: [{
                        label: "Memory Utilization %",
                        borderColor: "#06B6D4",
                        backgroundColor: "rgba(6, 182, 212, 0.15)",
                        data: [],
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        ...chartDefaults.scales,
                        y: { ...chartDefaults.scales.y, min: 0, max: 100 }
                    }
                }
            });
        }

        // 7. Network Dedicated View Chart
        const netCanvas = document.getElementById("network-chart");
        if (netCanvas) {
            networkChart = new Chart(netCanvas, {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "Rx (Inbound Bytes/s)",
                            borderColor: "#22C55E",
                            backgroundColor: "rgba(34, 197, 94, 0.1)",
                            data: [],
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: "Tx (Outbound Bytes/s)",
                            borderColor: "#3B82F6",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            data: [],
                            tension: 0.3,
                            fill: true
                        }
                    ]
                },
                options: { ...chartDefaults }
            });
        }
    }

    // -------------------------------------------------------------------------
    // 5. Query Historical PromQL Data for Charts
    // -------------------------------------------------------------------------
    async function updateTimeseriesCharts() {
        if (!overviewTrendChart && !overviewCpuChart && !overviewMemoryChart && !overviewNetworkChart && !cpuChart && !memoryChart && !networkChart) return;
        const rangeSeconds = parseInt(timeRangeSelect ? timeRangeSelect.value : "900", 10);
        const end = Math.floor(Date.now() / 1000);
        const start = end - rangeSeconds;
        const step = Math.max(5, Math.floor(rangeSeconds / 30)) + "s";

        try {
            // CPU Range Query
            const cpuQuery = encodeURIComponent('100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)');
            const cpuUrl = `/api/prometheus/query_range?query=${cpuQuery}&start=${start}&end=${end}&step=${step}`;
            
            // Memory Range Query
            const memQuery = encodeURIComponent('((node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes) * 100');
            const memUrl = `/api/prometheus/query_range?query=${memQuery}&start=${start}&end=${end}&step=${step}`;

            // Network Rx & Tx Queries
            const rxQuery = encodeURIComponent('sum(rate(node_network_receive_bytes_total[1m]))');
            const txQuery = encodeURIComponent('sum(rate(node_network_transmit_bytes_total[1m]))');
            const rxUrl = `/api/prometheus/query_range?query=${rxQuery}&start=${start}&end=${end}&step=${step}`;
            const txUrl = `/api/prometheus/query_range?query=${txQuery}&start=${start}&end=${end}&step=${step}`;

            const [cpuRes, memRes, rxRes, txRes] = await Promise.allSettled([
                fetch(cpuUrl).then(r => r.json()),
                fetch(memUrl).then(r => r.json()),
                fetch(rxUrl).then(r => r.json()),
                fetch(txUrl).then(r => r.json())
            ]);

            // Helper to extract timestamp labels and values
            function parseMatrix(resObj) {
                if (resObj.status !== "fulfilled" || !resObj.value?.data?.result?.[0]?.values) {
                    return { labels: [], values: [] };
                }
                const pairs = resObj.value.data.result[0].values;
                const labels = pairs.map(p => new Date(p[0] * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                const values = pairs.map(p => Math.round(parseFloat(p[1]) * 100) / 100);
                return { labels, values };
            }

            const cpuData = parseMatrix(cpuRes);
            const memData = parseMatrix(memRes);
            const rxData = parseMatrix(rxRes);
            const txData = parseMatrix(txRes);

            // Update Overview CPU Chart
            if (overviewCpuChart && cpuData.labels.length > 0) {
                overviewCpuChart.data.labels = cpuData.labels;
                overviewCpuChart.data.datasets[0].data = cpuData.values;
                overviewCpuChart.update();
            }

            // Update Overview Memory Chart
            if (overviewMemoryChart && memData.labels.length > 0) {
                overviewMemoryChart.data.labels = memData.labels;
                overviewMemoryChart.data.datasets[0].data = memData.values;
                overviewMemoryChart.update();
            }

            // Update Overview Network Chart
            if (overviewNetworkChart && (rxData.labels.length || txData.labels.length)) {
                overviewNetworkChart.data.labels = rxData.labels.length ? rxData.labels : txData.labels;
                overviewNetworkChart.data.datasets[0].data = rxData.values;
                overviewNetworkChart.data.datasets[1].data = txData.values;
                overviewNetworkChart.update();
            }

            // Update CPU Dedicated View Chart
            if (cpuChart && cpuData.labels.length > 0) {
                cpuChart.data.labels = cpuData.labels;
                cpuChart.data.datasets[0].data = cpuData.values;
                cpuChart.update();
            }

            // Update Memory Dedicated View Chart
            if (memoryChart && memData.labels.length > 0) {
                memoryChart.data.labels = memData.labels;
                memoryChart.data.datasets[0].data = memData.values;
                memoryChart.update();
            }

            // Update Legacy Overview Trend Chart
            if (overviewTrendChart) {
                const labels = cpuData.labels.length ? cpuData.labels : memData.labels;
                overviewTrendChart.data.labels = labels;
                overviewTrendChart.data.datasets[0].data = cpuData.values;
                overviewTrendChart.data.datasets[1].data = memData.values;
                overviewTrendChart.update();
            }

            // Update Network Dedicated View Chart
            if (networkChart && (rxData.labels.length || txData.labels.length)) {
                networkChart.data.labels = rxData.labels.length ? rxData.labels : txData.labels;
                networkChart.data.datasets[0].data = rxData.values;
                networkChart.data.datasets[1].data = txData.values;
                networkChart.update();
            }

        } catch (err) {
            console.debug("Chart timeseries update skipped:", err.message);
        }
    }

    // -------------------------------------------------------------------------
    // 6. Main Dashboard Telemetry Fetcher
    // -------------------------------------------------------------------------
    async function fetchDashboardData() {
        if (refreshBtn) refreshBtn.classList.add("loading");
        try {
            const resp = await fetch("/api/dashboard-data");
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status} - Observability API Error`);
            }
            const data = await resp.json();
            latestDashboardData = data;
            renderDashboard(data);
            updateTimeseriesCharts();
        } catch (err) {
            renderUnreachableState(err.message);
        } finally {
            if (refreshBtn) refreshBtn.classList.remove("loading");
            const timeStr = new Date().toLocaleTimeString();
            if (lastSyncText) lastSyncText.textContent = timeStr;
            if (footerSync) footerSync.textContent = `Last sync: ${timeStr}`;
        }
    }

    // -------------------------------------------------------------------------
    // 7. Render Unreachable State (Honest fallback)
    // -------------------------------------------------------------------------
    function renderUnreachableState(errMsg) {
        if (connectionBanner) {
            connectionBanner.classList.remove("hidden");
            connectionBannerMsg.textContent = `Observability Stack Connection Interrupted: ${errMsg}. Live metrics unavailable.`;
        }
        if (topHealthPill) {
            topHealthPill.className = "health-pill critical";
            topHealthText.textContent = "OFFLINE";
        }

        // Set Hero values to Unavailable
        [valHeroCpu, valHeroMem, valHeroDisk, valHeroNet, valHeroAlerts, valHeroServices].forEach(el => {
            if (el) el.textContent = "--";
        });
        if (overviewTargetsTbody) {
            overviewTargetsTbody.innerHTML = `<tr><td colspan="5" class="table-empty">Cannot communicate with Prometheus backend.</td></tr>`;
        }
    }

    // -------------------------------------------------------------------------
    // 8. Render Complete Live Telemetry State
    // -------------------------------------------------------------------------
    function renderDashboard(data) {
        if (connectionBanner) connectionBanner.classList.add("hidden");

        const prom = data.prometheus || {};
        const am = data.alertmanager || {};
        const host = prom.host_metrics || {};
        const app = prom.metrics || {};
        const env = data.environment || {};
        const services = data.services_health || {};
        const webhooks = data.recent_webhook_alerts || [];

        // 1. Overall System Health Pill
        const health = env.system_health || "HEALTHY";
        if (topHealthPill) {
            topHealthPill.className = `health-pill ${health.toLowerCase()}`;
            topHealthText.textContent = health;
        }

        // 2. CPU Metrics
        const cpuVal = host.cpu_utilization_pct;
        if (cpuVal !== null && cpuVal !== undefined) {
            valHeroCpu.textContent = cpuVal.toFixed(1);
            progHeroCpu.style.width = `${Math.min(cpuVal, 100)}%`;
            if (valCpuCurrent) valCpuCurrent.textContent = `${cpuVal.toFixed(1)}%`;

            if (cpuVal > 80) {
                badgeHeroCpu.className = "hero-badge badge-danger";
                badgeHeroCpu.textContent = "High Load";
            } else if (cpuVal > 60) {
                badgeHeroCpu.className = "hero-badge badge-warning";
                badgeHeroCpu.textContent = "Moderate";
            } else {
                badgeHeroCpu.className = "hero-badge badge-neutral";
                badgeHeroCpu.textContent = "Normal";
            }
        } else {
            valHeroCpu.textContent = "--";
            if (valCpuCurrent) valCpuCurrent.textContent = "--%";
        }

        const l1 = host.load_1m !== null ? host.load_1m.toFixed(2) : "--";
        subHeroCpu.textContent = `Load 1m: ${l1} · 2 vCPUs`;
        if (valCpuLoad1) valCpuLoad1.textContent = l1;
        if (valCpuLoad5) valCpuLoad5.textContent = host.load_5m !== null ? host.load_5m.toFixed(2) : "--";
        if (valCpuLoad15) valCpuLoad15.textContent = host.load_15m !== null ? host.load_15m.toFixed(2) : "--";

        // 3. Memory Metrics
        const memPct = host.memory_utilization_pct;
        const memTotalMb = host.memory_total_bytes ? Math.round(host.memory_total_bytes / (1024 * 1024)) : null;
        const memUsedMb = host.memory_used_bytes ? Math.round(host.memory_used_bytes / (1024 * 1024)) : null;
        const memAvailMb = host.memory_available_bytes ? Math.round(host.memory_available_bytes / (1024 * 1024)) : null;

        if (memPct !== null && memPct !== undefined) {
            valHeroMem.textContent = memPct.toFixed(1);
            progHeroMem.style.width = `${Math.min(memPct, 100)}%`;
            if (valMemPct) valMemPct.textContent = `${memPct.toFixed(1)}%`;
            subHeroMem.textContent = `${memUsedMb || '--'} MB / ${memTotalMb || '--'} MB`;

            if (memPct > 85) {
                badgeHeroMem.className = "hero-badge badge-danger";
                badgeHeroMem.textContent = "Critical";
            } else if (memPct > 70) {
                badgeHeroMem.className = "hero-badge badge-warning";
                badgeHeroMem.textContent = "Elevated";
            } else {
                badgeHeroMem.className = "hero-badge badge-neutral";
                badgeHeroMem.textContent = "Optimal";
            }
        }
        if (valMemTotal) valMemTotal.textContent = memTotalMb ? `${memTotalMb} MB` : "--";
        if (valMemUsed) valMemUsed.textContent = memUsedMb ? `${memUsedMb} MB` : "--";
        if (valMemAvail) valMemAvail.textContent = memAvailMb ? `${memAvailMb} MB` : "--";

        // 4. Disk Metrics
        const diskPct = host.disk_utilization_pct;
        const diskTotalGb = host.disk_total_bytes ? (host.disk_total_bytes / (1024 ** 3)).toFixed(1) : null;
        const diskUsedGb = host.disk_used_bytes ? (host.disk_used_bytes / (1024 ** 3)).toFixed(1) : null;
        const diskAvailGb = host.disk_free_bytes ? (host.disk_free_bytes / (1024 ** 3)).toFixed(1) : null;

        if (diskPct !== null && diskPct !== undefined) {
            valHeroDisk.textContent = diskPct.toFixed(1);
            progHeroDisk.style.width = `${Math.min(diskPct, 100)}%`;
            subHeroDisk.textContent = `${diskUsedGb || '--'} GB used of ${diskTotalGb || '--'} GB`;

            if (valDiskPct) valDiskPct.textContent = `${diskPct.toFixed(1)}%`;
            if (valDiskTotal) valDiskTotal.textContent = `${diskTotalGb || '--'} GB`;
            if (valDiskUsed) valDiskUsed.textContent = `${diskUsedGb || '--'} GB`;
            if (valDiskAvail) valDiskAvail.textContent = `${diskAvailGb || '--'} GB`;

            if (diskMainProg) diskMainProg.style.width = `${Math.min(diskPct, 100)}%`;
            if (diskLblUsed) diskLblUsed.textContent = `Used: ${diskUsedGb || '--'} GB`;
            if (diskLblPct) diskLblPct.textContent = `${diskPct.toFixed(1)}% utilized`;
            if (diskLblFree) diskLblFree.textContent = `Free: ${diskAvailGb || '--'} GB`;

            if (ovDiskBar) ovDiskBar.style.width = `${Math.min(diskPct, 100)}%`;
            if (ovDiskLblUsed) ovDiskLblUsed.textContent = `Used: ${diskUsedGb || '--'} GB`;
            if (ovDiskLblPct) ovDiskLblPct.textContent = `${diskPct.toFixed(1)}% utilized`;
            if (ovDiskLblFree) ovDiskLblFree.textContent = `Free: ${diskAvailGb || '--'} GB`;
            if (ovDiskTotalVal) ovDiskTotalVal.textContent = `${diskTotalGb || '--'} GB`;
        }

        // 5. Network Metrics
        const rx = host.network_rx_bytes_sec || 0;
        const tx = host.network_tx_bytes_sec || 0;
        const totalNet = rx + tx;
        valHeroNet.textContent = totalNet > 1024 ? (totalNet / 1024).toFixed(1) + " KB" : totalNet.toFixed(0);
        subHeroNet.textContent = `Rx: ${rx.toFixed(0)} B/s · Tx: ${tx.toFixed(0)} B/s`;

        if (valNetRx) valNetRx.textContent = rx > 1024 ? (rx / 1024).toFixed(1) + " KB/s" : `${rx.toFixed(0)} B/s`;
        if (valNetTx) valNetTx.textContent = tx > 1024 ? (tx / 1024).toFixed(1) + " KB/s" : `${tx.toFixed(0)} B/s`;
        if (valNetReqs) valNetReqs.textContent = app.request_rate !== null ? `${app.request_rate} req/s` : "--";
        if (valNetTotalReqs) valNetTotalReqs.textContent = app.total_requests !== null ? app.total_requests : "--";

        // 6. Alerts Summary
        const promAlerts = prom.alerts || [];
        const firingAlerts = promAlerts.filter(a => a.state === "firing");
        const pendingAlerts = promAlerts.filter(a => a.state === "pending");

        valHeroAlerts.textContent = firingAlerts.length;
        if (firingAlerts.length > 0) {
            badgeHeroAlerts.className = "hero-badge badge-danger";
            badgeHeroAlerts.textContent = `${firingAlerts.length} Firing`;
            progHeroAlerts.style.width = "100%";
        } else if (pendingAlerts.length > 0) {
            badgeHeroAlerts.className = "hero-badge badge-warning";
            badgeHeroAlerts.textContent = `${pendingAlerts.length} Pending`;
            progHeroAlerts.style.width = "50%";
        } else {
            badgeHeroAlerts.className = "hero-badge badge-success";
            badgeHeroAlerts.textContent = "All Clear";
            progHeroAlerts.style.width = "0%";
        }

        const critCount = firingAlerts.filter(a => a.labels?.severity === "critical").length;
        const warnCount = firingAlerts.filter(a => a.labels?.severity === "warning").length;
        subHeroAlerts.textContent = `${warnCount} Warning · ${critCount} Critical`;

        if (navBadgeAlerts) {
            navBadgeAlerts.textContent = firingAlerts.length;
            navBadgeAlerts.className = firingAlerts.length > 0 ? "nav-badge badge-alert" : "nav-badge";
        }
        if (bellBadge) {
            if (webhooks.length > 0) {
                bellBadge.textContent = webhooks.length;
                bellBadge.classList.remove("hidden");
            } else {
                bellBadge.classList.add("hidden");
            }
        }

        // 7. Scrape Targets
        const targets = prom.targets || [];
        const upCount = targets.filter(t => t.health === "up").length;
        valHeroServices.textContent = `${upCount}/${targets.length}`;
        if (targetsBadge) targetsBadge.textContent = `${upCount} / ${targets.length} Targets UP`;
        if (navBadgeServices) navBadgeServices.textContent = `${upCount} UP`;

        const renderTargetRows = (tList) => {
            if (!tList.length) {
                return `<tr><td colspan="5" class="table-empty">No scrape targets returned from Prometheus.</td></tr>`;
            }
            return tList.map(t => {
                const isUp = t.health === "up";
                const badgeCls = isUp ? "badge badge-success" : "badge badge-danger";
                const lastScrape = t.lastScrape ? new Date(t.lastScrape).toLocaleTimeString() : "--";
                const duration = t.lastScrapeDuration ? (t.lastScrapeDuration * 1000).toFixed(1) + " ms" : "--";
                return `
                    <tr>
                        <td><strong>${escapeHtml(t.job)}</strong></td>
                        <td><code>${escapeHtml(t.instance)}</code></td>
                        <td><span class="${badgeCls}">${isUp ? "UP" : "DOWN"}</span></td>
                        <td><code>${duration}</code></td>
                        <td>${lastScrape}</td>
                    </tr>
                `;
            }).join("");
        };

        if (overviewTargetsTbody) overviewTargetsTbody.innerHTML = renderTargetRows(targets);
        if (servicesTargetsTbody) servicesTargetsTbody.innerHTML = renderTargetRows(targets);

        // 8. Render Alerts Center (Prometheus + Webhooks)
        renderAlertsCenter(promAlerts, webhooks);

        // Overview Recent Alerts
        if (ovAlertsSummaryBadge) {
            ovAlertsSummaryBadge.textContent = `${firingAlerts.length} Alerts Firing`;
            ovAlertsSummaryBadge.className = firingAlerts.length > 0 ? "badge badge-danger" : "badge badge-neutral";
        }

        if (ovRecentAlerts) {
            const combinedAlerts = [];
            firingAlerts.forEach(a => {
                combinedAlerts.push({
                    title: a.labels?.alertname || "Active Alert",
                    status: "FIRING",
                    severity: a.labels?.severity || "warning",
                    desc: a.annotations?.summary || a.annotations?.description || "Threshold exceeded",
                    time: a.activeAt ? new Date(a.activeAt).toLocaleTimeString() : "Active now"
                });
            });
            webhooks.slice(0, 5).forEach(w => {
                combinedAlerts.push({
                    title: w.alertname || "Webhook Event",
                    status: (w.status || "EVENT").toUpperCase(),
                    severity: w.severity || (w.status === "resolved" ? "success" : "danger"),
                    desc: w.summary || w.description || "Alertmanager notification",
                    time: w.received_at ? new Date(w.received_at).toLocaleTimeString() : "Recent"
                });
            });

            if (combinedAlerts.length === 0) {
                ovRecentAlerts.innerHTML = `<div class="empty-state">No firing alerts detected. All systems operating normally.</div>`;
            } else {
                ovRecentAlerts.innerHTML = combinedAlerts.slice(0, 5).map(item => {
                    const isFiring = item.status === "FIRING";
                    const isResolved = item.status === "RESOLVED";
                    const badgeCls = isFiring ? "badge badge-danger" : (isResolved ? "badge badge-success" : "badge badge-warning");
                    const borderCls = isFiring ? "critical" : (isResolved ? "resolved" : "warning");
                    return `
                        <div class="alert-item-card ${borderCls}">
                            <div class="alert-item-top">
                                <span class="alert-item-name">${escapeHtml(item.title)}</span>
                                <span class="${badgeCls}">${escapeHtml(item.status)}</span>
                            </div>
                            <div class="alert-item-summary">${escapeHtml(item.desc)}</div>
                            <div class="alert-item-time">Timestamp: ${escapeHtml(item.time)}</div>
                        </div>
                    `;
                }).join("");
            }
        }

        // Render Monitoring Services Cards
        if (data.monitoring_services) {
            renderMonitoringServices(data.monitoring_services);
        }

        // 9. Render Notifications Dropdown
        renderNotificationDropdown(webhooks);

        // 10. Uptime in Footer
        if (footerUptime && host.host_uptime_seconds) {
            const hrs = (host.host_uptime_seconds / 3600).toFixed(1);
            footerUptime.textContent = `Host Uptime: ${hrs} hrs`;
        }
    }

    // -------------------------------------------------------------------------
    // Monitoring Services Cards Health Renderer
    // -------------------------------------------------------------------------
    function renderMonitoringServices(servicesData) {
        if (!servicesData || !servicesData.services) return;
        const s = servicesData.services;

        const updateCard = (key, pillEl, textEl, diagEl, launchEl) => {
            const item = s[key];
            if (!item) return;

            const status = (item.status || "UNKNOWN").toUpperCase();
            if (pillEl) {
                if (status === "ONLINE") {
                    pillEl.className = "service-status-pill online";
                } else if (status === "OFFLINE") {
                    pillEl.className = "service-status-pill offline";
                } else if (status === "UNKNOWN") {
                    pillEl.className = "service-status-pill unknown";
                } else {
                    pillEl.className = "service-status-pill checking";
                }
            }
            if (textEl) {
                textEl.textContent = status;
            }
            if (diagEl) {
                if (status === "ONLINE") {
                    diagEl.className = "diag-val success";
                    diagEl.textContent = item.latency_ms !== null ? `${item.latency_ms} ms latency` : "Responsive (200 OK)";
                } else if (status === "OFFLINE") {
                    diagEl.className = "diag-val error";
                    diagEl.textContent = item.error || "Service unavailable";
                } else if (status === "UNKNOWN") {
                    diagEl.className = "diag-val error";
                    diagEl.textContent = item.error || "Health check failed / timeout";
                } else {
                    diagEl.className = "diag-val";
                    diagEl.textContent = "Probing health...";
                }
            }
            if (launchEl && item.external_url) {
                launchEl.href = item.external_url;
            }
        };

        updateCard("prometheus", statusPillProm, statusTextProm, diagValProm, btnLaunchProm);
        updateCard("grafana", statusPillGrafana, statusTextGrafana, diagValGrafana, btnLaunchGrafana);
        updateCard("alertmanager", statusPillAm, statusTextAm, diagValAm, btnLaunchAm);
        updateCard("node_exporter", statusPillNe, statusTextNe, diagValNe, btnLaunchNe);

        const onlineCount = servicesData.online_count !== undefined ? servicesData.online_count : Object.values(s).filter(x => x.status === "ONLINE").length;
        const totalCount = servicesData.total_count || 4;

        if (servicesGlobalDot && servicesGlobalText) {
            if (onlineCount === totalCount) {
                servicesGlobalDot.className = "badge-status-dot online";
                servicesGlobalText.textContent = `${onlineCount} / ${totalCount} Services Online`;
            } else if (onlineCount > 0) {
                servicesGlobalDot.className = "badge-status-dot checking";
                servicesGlobalText.textContent = `${onlineCount} / ${totalCount} Services Online (${totalCount - onlineCount} Offline/Unknown)`;
            } else {
                servicesGlobalDot.className = "badge-status-dot offline";
                servicesGlobalText.textContent = `All Services Offline (0 / ${totalCount})`;
            }
        }
    }

    async function fetchMonitoringServicesHealth() {
        try {
            const res = await fetch("/api/services/health");
            if (res.ok) {
                const data = await res.json();
                renderMonitoringServices(data);
            } else {
                renderMonitoringServicesFallback(`HTTP ${res.status} gateway error`);
            }
        } catch (err) {
            console.debug("Services health check polling error:", err.message);
            renderMonitoringServicesFallback(err.message || "Failed to reach health endpoint");
        }
    }

    function renderMonitoringServicesFallback(errorMsg) {
        const fallbackData = {
            online_count: 0,
            total_count: 4,
            services: {
                prometheus: { status: "UNKNOWN", error: errorMsg, external_url: "http://localhost:9090" },
                grafana: { status: "UNKNOWN", error: errorMsg, external_url: "http://localhost:3000" },
                alertmanager: { status: "UNKNOWN", error: errorMsg, external_url: "http://localhost:9093" },
                node_exporter: { status: "UNKNOWN", error: errorMsg, external_url: "http://localhost:9100/metrics" }
            }
        };
        renderMonitoringServices(fallbackData);
    }

    // -------------------------------------------------------------------------
    // 9. Alert Center Renderer with Multi-Criteria Filtering
    // -------------------------------------------------------------------------
    function renderAlertsCenter(promAlerts, webhooks) {
        if (!promAlertsContainer || !webhookAlertsContainer) return;

        // Apply active filter
        let filteredPromAlerts = promAlerts;
        let filteredWebhooks = webhooks;

        if (activeAlertFilter === "firing") {
            filteredPromAlerts = promAlerts.filter(a => a.state === "firing");
            filteredWebhooks = webhooks.filter(w => w.status === "firing");
        } else if (activeAlertFilter === "pending") {
            filteredPromAlerts = promAlerts.filter(a => a.state === "pending");
            filteredWebhooks = [];
        } else if (activeAlertFilter === "resolved") {
            filteredPromAlerts = [];
            filteredWebhooks = webhooks.filter(w => w.status === "resolved");
        } else if (activeAlertFilter === "critical") {
            filteredPromAlerts = promAlerts.filter(a => a.labels?.severity === "critical");
            filteredWebhooks = webhooks.filter(w => w.severity === "critical");
        } else if (activeAlertFilter === "warning") {
            filteredPromAlerts = promAlerts.filter(a => a.labels?.severity === "warning");
            filteredWebhooks = webhooks.filter(w => w.severity === "warning");
        }

        // Render Prometheus Rules
        promAlertsCount.textContent = `${filteredPromAlerts.length} Rules`;
        if (filteredPromAlerts.length === 0) {
            promAlertsContainer.innerHTML = `<div class="empty-state">No matching alerts in Prometheus for filter: <strong>${escapeHtml(activeAlertFilter)}</strong></div>`;
        } else {
            promAlertsContainer.innerHTML = filteredPromAlerts.map(a => {
                const labels = a.labels || {};
                const annot = a.annotations || {};
                const severity = labels.severity || "warning";
                const isFiring = a.state === "firing";
                const badgeCls = isFiring ? "badge badge-danger" : (a.state === "pending" ? "badge badge-warning" : "badge badge-neutral");

                return `
                    <div class="alert-item-card ${severity}">
                        <div class="alert-item-top">
                            <span class="alert-item-name">${escapeHtml(labels.alertname || "Alert")}</span>
                            <span class="${badgeCls}">${escapeHtml(a.state.toUpperCase())}</span>
                        </div>
                        <div class="alert-item-summary">${escapeHtml(annot.summary || "No summary provided")}</div>
                        <div class="alert-item-desc">${escapeHtml(annot.description || "")}</div>
                        <div class="alert-item-time">Target: <code>${escapeHtml(labels.instance || "N/A")}</code> · Job: <code>${escapeHtml(labels.job || "N/A")}</code></div>
                    </div>
                `;
            }).join("");
        }

        // Render Webhook Deliveries
        webhookAlertsCount.textContent = `${filteredWebhooks.length} Events`;
        if (filteredWebhooks.length === 0) {
            webhookAlertsContainer.innerHTML = `<div class="empty-state">No matching webhook events for filter: <strong>${escapeHtml(activeAlertFilter)}</strong></div>`;
        } else {
            webhookAlertsContainer.innerHTML = filteredWebhooks.map(w => {
                const statusCls = w.status === "firing" ? "critical" : "resolved";
                const badgeCls = w.status === "firing" ? "badge badge-danger" : "badge badge-success";
                return `
                    <div class="alert-item-card ${statusCls}">
                        <div class="alert-item-top">
                            <span class="alert-item-name">${escapeHtml(w.alertname)}</span>
                            <span class="${badgeCls}">${escapeHtml(w.status.toUpperCase())}</span>
                        </div>
                        <div class="alert-item-summary">${escapeHtml(w.summary)}</div>
                        <div class="alert-item-desc">${escapeHtml(w.description)}</div>
                        <div class="alert-item-time">Received: ${escapeHtml(w.received_at)} · Instance: <code>${escapeHtml(w.instance)}</code></div>
                    </div>
                `;
            }).join("");
        }
    }

    // Filter Button Clicks
    alertFilterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            alertFilterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeAlertFilter = btn.dataset.filter || "all";
            if (latestDashboardData) {
                renderAlertsCenter(latestDashboardData.prometheus?.alerts || [], latestDashboardData.recent_webhook_alerts || []);
            }
        });
    });

    // -------------------------------------------------------------------------
    // 10. Notification Bell Popover Renderer
    // -------------------------------------------------------------------------
    function renderNotificationDropdown(webhooks) {
        if (!popoverAlertsList) return;
        if (webhooks.length === 0) {
            popoverAlertsList.innerHTML = `<div class="empty-popover">No recent webhook events.</div>`;
            return;
        }
        popoverAlertsList.innerHTML = webhooks.slice(0, 8).map(w => {
            const isFiring = w.status === "firing";
            const badgeCls = isFiring ? "badge badge-danger" : "badge badge-success";
            return `
                <div class="alert-item-card ${isFiring ? 'critical' : 'resolved'}" style="padding: 8px;">
                    <div class="alert-item-top">
                        <span style="font-size: 11px; font-weight: 600;">${escapeHtml(w.alertname)}</span>
                        <span class="${badgeCls}" style="font-size: 9px; padding: 1px 5px;">${escapeHtml(w.status.toUpperCase())}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(w.summary)}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${escapeHtml(w.received_at)}</div>
                </div>
            `;
        }).join("");
    }

    if (bellBtn) {
        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            notificationPopover.classList.toggle("hidden");
        });
    }

    document.addEventListener("click", (e) => {
        if (notificationPopover && !notificationPopover.contains(e.target) && e.target !== bellBtn) {
            notificationPopover.classList.add("hidden");
        }
    });

    if (popoverClearBtn) {
        popoverClearBtn.addEventListener("click", async () => {
            await fetch("/api/simulate/clear-alerts", { method: "POST" });
            fetchDashboardData();
        });
    }

    // -------------------------------------------------------------------------
    // 11. Simulator Action Handlers
    // -------------------------------------------------------------------------
    async function triggerTrafficSim() {
        appendTerminal("Dispatching batch of 5 requests to /api/simulate/traffic...", "info");
        try {
            const reqs = Array.from({ length: 5 }, () => fetch("/api/simulate/traffic"));
            const res = await Promise.all(reqs);
            const oks = res.filter(r => r.ok).length;
            appendTerminal(`Traffic batch finished: ${oks}/5 returned 200 OK`, "ok");
            setTimeout(fetchDashboardData, 1200);
        } catch (err) {
            appendTerminal(`Traffic simulation error: ${err.message}`, "err");
        }
    }

    async function triggerErrorSim() {
        appendTerminal("Triggering HTTP 500 error at /api/simulate/error...", "warn");
        try {
            const res = await fetch("/api/simulate/error");
            appendTerminal(`Endpoint returned HTTP ${res.status} Internal Error (expected for alert rule)`, "err");
            setTimeout(fetchDashboardData, 1200);
        } catch (err) {
            appendTerminal(`Error simulation failed: ${err.message}`, "err");
        }
    }

    async function triggerSlowSim() {
        appendTerminal("Triggering slow endpoint (simulating 1.2s latency spike)...", "warn");
        const t0 = performance.now();
        try {
            const res = await fetch("/api/simulate/slow");
            const duration = Math.round(performance.now() - t0);
            appendTerminal(`Slow request completed in ${duration}ms with HTTP ${res.status}`, "ok");
            setTimeout(fetchDashboardData, 1200);
        } catch (err) {
            appendTerminal(`Slow simulation failed: ${err.message}`, "err");
        }
    }

    async function triggerCpuSim() {
        appendTerminal("Starting safe CPU stress test (15s duration on worker threads)...", "warn");
        try {
            const res = await fetch("/api/simulate/cpu?duration=15");
            const data = await res.json();
            appendTerminal(`CPU Stress: ${data.message}`, "info");
            setTimeout(fetchDashboardData, 1500);
        } catch (err) {
            appendTerminal(`CPU Stress failed: ${err.message}`, "err");
        }
    }

    async function triggerMemSim() {
        appendTerminal("Starting safe memory test (120 MB allocation for 15s)...", "warn");
        try {
            const res = await fetch("/api/simulate/memory?duration=15");
            const data = await res.json();
            appendTerminal(`Memory Test: ${data.message}`, "info");
            setTimeout(fetchDashboardData, 1500);
        } catch (err) {
            appendTerminal(`Memory Test failed: ${err.message}`, "err");
        }
    }

    async function triggerClearAlerts() {
        appendTerminal("Clearing in-memory webhook alerts history...", "info");
        try {
            await fetch("/api/simulate/clear-alerts", { method: "POST" });
            appendTerminal("Webhook alerts log cleared successfully.", "ok");
            fetchDashboardData();
        } catch (err) {
            appendTerminal(`Clear failed: ${err.message}`, "err");
        }
    }

    // Bind Simulator Buttons
    if (simBtnTraffic) simBtnTraffic.addEventListener("click", triggerTrafficSim);
    if (btnQuickTraffic) btnQuickTraffic.addEventListener("click", triggerTrafficSim);

    if (simBtnError) simBtnError.addEventListener("click", triggerErrorSim);
    if (btnQuickError) btnQuickError.addEventListener("click", triggerErrorSim);

    if (simBtnSlow) simBtnSlow.addEventListener("click", triggerSlowSim);

    if (simBtnCpu) simBtnCpu.addEventListener("click", triggerCpuSim);
    if (btnQuickCpu) btnQuickCpu.addEventListener("click", triggerCpuSim);
    if (btnTriggerCpuStress) btnTriggerCpuStress.addEventListener("click", triggerCpuSim);

    if (simBtnMem) simBtnMem.addEventListener("click", triggerMemSim);
    if (btnTriggerMemTest) btnTriggerMemTest.addEventListener("click", triggerMemSim);

    if (simBtnClear) simBtnClear.addEventListener("click", triggerClearAlerts);

    // -------------------------------------------------------------------------
    // 12. Search Filter Handler
    // -------------------------------------------------------------------------
    if (globalSearch) {
        globalSearch.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            const targetRows = document.querySelectorAll("#overview-targets-tbody tr, #services-targets-tbody tr");
            targetRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? "" : "none";
            });

            const alertCards = document.querySelectorAll(".alert-item-card");
            alertCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? "" : "none";
            });
        });
    }

    // -------------------------------------------------------------------------
    // 13. Auto-Refresh Management
    // -------------------------------------------------------------------------
    function setupAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        }
        const intervalMs = parseInt(autoRefreshSelect.value, 10);
        if (intervalMs > 0) {
            autoRefreshTimer = setInterval(fetchDashboardData, intervalMs);
        }
    }

    if (autoRefreshSelect) {
        autoRefreshSelect.addEventListener("change", setupAutoRefresh);
    }
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener("change", updateTimeseriesCharts);
    }
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            fetchDashboardData();
            fetchMonitoringServicesHealth();
        });
    }

    // Utility
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial Bootstrap
    initCharts();
    fetchDashboardData();
    fetchMonitoringServicesHealth();
    setupAutoRefresh();
    setInterval(fetchMonitoringServicesHealth, 10000);
});
