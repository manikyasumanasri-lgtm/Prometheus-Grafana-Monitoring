# CloudPulse — Local DevOps Sandbox for Monitoring & Alerting

[![Ubuntu 22.04 LTS](https://img.shields.io/badge/Platform-Ubuntu%2022.04%20LTS-E95420?logo=ubuntu&logoColor=white)](https://releases.ubuntu.com/22.04/)
[![Vagrant](https://img.shields.io/badge/Provisioning-Vagrant%202.x-1563FF?logo=vagrant&logoColor=white)](https://www.vagrantup.com/)
[![VirtualBox](https://img.shields.io/badge/Virtualization-VirtualBox%207.x-183A61?logo=virtualbox&logoColor=white)](https://www.virtualbox.org/)
[![Docker Compose](https://img.shields.io/badge/Containers-Docker%20Compose%20v2-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Python 3.11](https://img.shields.io/badge/Application-Python%203.11%20%7C%20Flask-3776AB?logo=python&logoColor=white)](https://flask.palletsprojects.com/)
[![Prometheus](https://img.shields.io/badge/Metrics-Prometheus%20v2.51.0-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Alertmanager](https://img.shields.io/badge/Alerting-Alertmanager%20v0.27.0-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/docs/alerting/latest/alertmanager/)
[![Grafana](https://img.shields.io/badge/Visualization-Grafana%2010.4.1-F46800?logo=grafana&logoColor=white)](https://grafana.com/)
[![Node Exporter](https://img.shields.io/badge/Host%20Metrics-Node%20Exporter%20v1.8.0-009688?logo=prometheus&logoColor=white)](https://github.com/prometheus/node_exporter)

An all-in-one local DevOps and Site Reliability Engineering (SRE) monitoring sandbox featuring automated virtual machine provisioning, host-level kernel telemetry via Node Exporter, multi-tier Prometheus alert evaluation, Alertmanager webhook dispatching, an auto-provisioned 12-panel Grafana dashboard, and a modern dark observability web console.

The complete environment runs locally on consumer hardware without requiring paid cloud infrastructure or AWS accounts.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Key Capabilities](#key-capabilities)
3. [Technology Stack](#technology-stack)
4. [Windows 11 & Hardware Compatibility (8 GB RAM Constraint)](#windows-11--hardware-compatibility-8-gb-ram-constraint)
5. [Project Directory Structure](#project-directory-structure)
6. [Prerequisites & System Setup](#prerequisites--system-setup)
7. [Automated VM Provisioning (Vagrant + VirtualBox)](#automated-vm-provisioning-vagrant--virtualbox)
8. [Dual-Mode Deployment Options](#dual-mode-deployment-options)
9. [Service Access Endpoints & Default Credentials](#service-access-endpoints--default-credentials)
10. [Prometheus Monitoring & Scrape Targets](#prometheus-monitoring--scrape-targets)
11. [Prometheus Production Alert Rules](#prometheus-production-alert-rules)
12. [Alertmanager Multi-Tier Routing & Webhooks](#alertmanager-multi-tier-routing--webhooks)
13. [Provisioned Grafana Dashboard (12 Panels)](#provisioned-grafana-dashboard-12-panels)
14. [CloudPulse Observability Web Console](#cloudpulse-observability-web-console)
15. [Alert Simulation & Validation Runbook](#alert-simulation--validation-runbook)
16. [Troubleshooting Guide](#troubleshooting-guide)
17. [Security Notice & Sandbox Boundaries](#security-notice--sandbox-boundaries)

---

## Architectural Overview

```
+-----------------------------------------------------------------------------------------+
|                                    WINDOWS HOST SYSTEM                                  |
|                                                                                         |
|   +---------------------------------------------------------------------------------+   |
|   |                      VAGRANT UBUNTU 22.04 LTS VIRTUAL MACHINE                   |   |
|   |                      (2 vCPUs · 2048 MB RAM · IP: 192.168.56.10)                |   |
|   |                                                                                 |   |
|   |  Linux Kernel /proc, /sys, /rootfs                                              |   |
|   |        ^                                                                        |   |
|   |        |  (read-only volume bindings: /proc, /sys, /rootfs)                     |   |
|   |        v                                                                        |   |
|   |  +---------------------------------------------------------------------------+  |   |
|   |  |                  DOCKER ENGINE & BRIDGE NETWORK (cloudpulse-net)          |  |   |
|   |  |                                                                           |  |   |
|   |  |  +------------------+         Pull Scrape (5s)         +---------------+  |  |   |
|   |  |  |  node-exporter   | <------------------------------- |               |  |  |   |
|   |  |  |   (:9100/tcp)    |                                  |               |  |  |   |
|   |  |  +------------------+                                  |               |  |  |   |
|   |  |                                                        |               |  |  |   |
|   |  |  +------------------+         Pull Scrape (5s)         |  Prometheus   |  |  |   |
|   |  |  |  cloudpulse-web  | <------------------------------- |    Server     |  |  |   |
|   |  |  |   (:5000/tcp)    |                                  |  (:9090/tcp)  |  |  |   |
|   |  |  +------------------+                                  |               |  |  |   |
|   |  |         ^                                              +---------------+  |  |   |
|   |  |         |                                                      |          |  |   |
|   |  |         | Webhook JSON Notification                            | Evaluates|  |   |
|   |  |         | (/api/alerts/webhook)                                v Rules    |  |   |
|   |  |  +------------------+     Expedited / Grouped Route    +---------------+  |  |   |
|   |  |  |   alertmanager   | <------------------------------- |  alerts.yml   |  |  |   |
|   |  |  |   (:9093/tcp)    |                                  |  (8 rules)    |  |  |   |
|   |  |  +------------------+                                  +---------------+  |  |   |
|   |  |                                                                |          |  |   |
|   |  |  +------------------+         PromQL Query Datasource          |          |  |   |
|   |  |  |     grafana      | -----------------------------------------+          |  |   |
|   |  |  |   (:3000/tcp)    |   (Auto-provisioned 12 Production Panels)            |  |   |
|   |  |  +------------------+                                                     |  |   |
|   |  +---------------------------------------------------------------------------+  |   |
|   +---------------------------------------------------------------------------------+   |
|                                                                                         |
|   Browser Port Forwarding:                                                              |
|     localhost:5000 -> Web Console       localhost:9090 -> Prometheus UI                 |
|     localhost:3000 -> Grafana           localhost:9093 -> Alertmanager UI               |
|     localhost:9100 -> Node Exporter Metrics                                             |
+-----------------------------------------------------------------------------------------+
```

---

## Key Capabilities

- **Automated Virtual Machine Provisioning:** Single-command setup (`vagrant up`) that initializes a secure Ubuntu 22.04 LTS instance, installs Docker and essential utilities, configures permissions, mounts project workspaces, and launches the entire monitoring environment.
- **Genuine Kernel & Host Metrics:** Real host telemetry collected via `node-exporter` with read-only rootfs (`/`), `/proc`, and `/sys` mounts. Captures authentic CPU utilization, RAM usage, storage capacity, load averages, network ingress/egress, and uptime.
- **Declarative Prometheus Alerting:** Evaluates 6 production host alert rules and 2 application RED alerts. Distinguishes critical failures (`up == 0`, `NodeExporterDown`, `PrometheusDown`) from warnings (`HighCpuUsage`, `HighMemoryUsage`, `HighDiskUsage`).
- **Multi-Tier Alertmanager Routing:** Routes alerts based on severity, groups similar events, applies inhibition to suppress redundant warnings during critical outages, and dispatches JSON webhooks with `send_resolved: true`.
- **Pre-Provisioned 12-Panel Grafana Dashboard:** Instant visualization of system health, load, memory consumption, storage, bandwidth, HTTP throughput, 5xx error rate, and p95 latency without manual datasource configuration.
- **Commercial SaaS UI/UX Experience:** Custom web console with fixed sidebar navigation across 11 functional views, time-range selectors, multi-criteria alert filtering, real-time Chart.js graphs, container health matrix, and interactive scenario simulator.

---

## Technology Stack

| Layer | Component | Version | Role in Architecture |
| :--- | :--- | :--- | :--- |
| **Virtualization** | Oracle VirtualBox | 7.x / 6.1.x | Type-2 Hypervisor supporting Windows Hypervisor Platform (WHPX). |
| **Infrastructure as Code** | HashiCorp Vagrant | 2.4.x+ | Declarative VM provisioning, private networking, and port forwarding. |
| **Base Operating System** | Ubuntu Server LTS | 22.04 (Jammy) | Guest operating system hosting container runtimes and kernel exporters. |
| **Container Engine** | Docker CE & Compose | v2 plugin | Multi-container coordination, network isolation, and volume management. |
| **Host Metrics Exporter** | Prometheus Node Exporter | v1.8.0 | Host procfs/sysfs telemetry scraper running with `pid: host`. |
| **Metrics & TSDB** | Prometheus | v2.51.0 | Pull-based time-series scraper, TSDB storage engine, and PromQL evaluator. |
| **Alert Routing Engine** | Prometheus Alertmanager | v0.27.0 | Alert grouping, throttling, inhibition, and webhook dispatching. |
| **Visualization Platform**| Grafana | 10.4.1 | Auto-provisioned dashboards, panel alerts, and timeseries analytics. |
| **Application & Webhook** | Python / Flask | 3.11-slim | Microservice instrumenting RED metrics, API proxy, and webhook receiver. |
| **Frontend UI/UX** | HTML5 / CSS3 / ES6 / Chart.js | 4.4.2 | SaaS dark theme console with real-time responsive charts. |

---

## Windows 11 & Hardware Compatibility (8 GB RAM Constraint)

Running virtual machines and container stacks on an **8 GB RAM Windows workstation** requires disciplined resource budgeting:

1. **VirtualBox & WSL2 Coexistence:**
   - Modern VirtualBox versions (6.1.28+ and 7.0+) integrate natively with the **Windows Hypervisor Platform (WHPX)** API. VirtualBox and WSL2/Docker Desktop operate concurrently without hypervisor locking.
2. **Resource Budgeting:**
   - **Windows Host OS + Background Processes:** ~3.0 – 3.5 GB
   - **CloudPulse Vagrant VM:** Fixed allocation of **2 vCPUs** and **2048 MB (2 GB) RAM** (`VM_CPUS = 2`, `VM_MEMORY = 2048`).
   - **Remaining Free Host RAM:** ~2.5 – 3.0 GB headroom, preventing memory exhaustion and page file thrashing.
3. **Execution Precaution:**
   - When running inside the Vagrant VM (`vagrant up`), keep Windows Docker Desktop idle so duplicate container stacks are not running simultaneously on both the host and the VM.

---

## Project Directory Structure

```text
CloudPulse/
│
├── Vagrantfile                                   # Declarative VM configuration (Ubuntu 22.04, 2 CPU, 2GB RAM)
├── docker-compose.yml                            # Multi-container orchestration (5 services on cloudpulse-net)
├── Dockerfile                                    # Python 3.11-slim container definition for web service
├── requirements.txt                              # Flask, prometheus-client, and requests dependencies
├── app.py                                        # Flask application, PromQL proxy, metrics, and webhook receiver
├── README.md                                     # Comprehensive engineering documentation
├── .gitignore                                    # Git ignore rules for virtual environments and runtime caches
│
├── provisioning/
│   └── install.sh                                # Idempotent shell provisioner (Docker, packages, health checks)
│
├── prometheus/
│   ├── prometheus.yml                            # Prometheus scrape configs (10s/5s intervals, 4 targets)
│   └── alerts.yml                                # 8 Production alert rules (CPU, Memory, Disk, Services, RED)
│
├── alertmanager/
│   └── alertmanager.yml                          # Routing tree, inhibition rules, and webhook receivers
│
├── grafana/
│   └── provisioning/
│       ├── datasources/
│       │   └── prometheus.yml                    # Auto-provisioned Prometheus datasource configuration
│       └── dashboards/
│           ├── dashboards.yml                    # Dashboard file provider definition
│           └── cloudpulse-monitoring.json        # 12 Production monitoring panels configuration
│
├── templates/
│   └── index.html                                # Observability console layout with 11 functional views
│
├── static/
│   ├── style.css                                 # Premium dark observability SaaS stylesheet (#0B1020 palette)
│   └── app.js                                    # View switcher, Chart.js managers, search, and simulators
│
└── screenshots/                                  # Architectural and verification reference images
    ├── alertmanager-alerts.png
    ├── grafana-dashboard.png
    ├── prometheus-alerts-firing.png
    └── prometheus-targets.png
```

---

## Prerequisites & System Setup

### Software Requirements
- **Windows 10/11 (64-bit)** with hardware virtualization (VT-x / AMD-V) enabled in BIOS/UEFI.
- **Oracle VirtualBox:** Download and install [VirtualBox 7.0+](https://www.virtualbox.org/wiki/Downloads).
- **HashiCorp Vagrant:** Download and install [Vagrant](https://developer.hashicorp.com/vagrant/downloads).
- **Git for Windows:** Recommended for running Git Bash and cloning the repository.

Verify installation on Windows PowerShell:
```powershell
vagrant --version
# Expected: Vagrant 2.4.x or higher

VBoxManage --version
# Expected: 7.0.x or higher
```

---

## Automated VM Provisioning (Vagrant + VirtualBox)

### 1. Boot and Provision the Environment
From the project root directory, launch the automated provisioning pipeline:
```bash
vagrant up
```
Vagrant will automatically:
1. Download Canonical's `ubuntu/jammy64` base image.
2. Configure 2 vCPUs and 2048 MB RAM.
3. Configure the private network IP `192.168.56.10` and port forwarding.
4. Mount the project folder into `/vagrant`.
5. Execute `provisioning/install.sh`, installing Docker CE, Compose v2, and launching the monitoring stack.

### 2. Connect to the Virtual Machine
```bash
vagrant ssh
```
Once connected, inspect container status:
```bash
docker compose -f /vagrant/docker-compose.yml ps
```

### 3. Core VM Management Commands

| Action | Command | Description |
| :--- | :--- | :--- |
| **Start / Resume** | `vagrant up` | Boots the VM and runs provisioning on first execution. |
| **Interactive Terminal** | `vagrant ssh` | Opens a secure SSH shell session inside Ubuntu. |
| **Graceful Shutdown** | `vagrant halt` | Shuts down the VM and halts running containers safely. |
| **Reload Settings** | `vagrant reload` | Reboots the VM applying updated Vagrantfile parameters. |
| **Re-run Provisioner** | `vagrant provision` | Re-executes `provisioning/install.sh` on an active VM. |
| **Complete Teardown** | `vagrant destroy -f` | Deletes the VM cleanly without touching repository files. |

---

## Dual-Mode Deployment Options

CloudPulse supports two deployment workflows:

### Mode A: Primary Vagrant Virtual Machine (Recommended)
- Runs completely inside the isolated Ubuntu 22.04 LTS VM.
- Isolates kernel procfs and host metrics to genuine Linux values.
- Start with: `vagrant up`

### Mode B: Direct Host Docker Compose (Development Fallback)
For rapid local testing directly on Windows Docker Desktop without starting the VM:
```bash
docker compose up -d --build
```
The exact same Docker configurations, Prometheus rules, and Grafana dashboards execute seamlessly.

---

## Service Access Endpoints & Default Credentials

| Service | Host URL | VM Private Network URL | Internal Container Port | Default Credentials |
| :--- | :--- | :--- | :--- | :--- |
| **CloudPulse Web Console** | [http://localhost:5000](http://localhost:5000) | `http://192.168.56.10:5000` | `5000/tcp` | None (Public UI) |
| **Prometheus Server** | [http://localhost:9090](http://localhost:9090) | `http://192.168.56.10:9090` | `9090/tcp` | None (Open UI) |
| **Alertmanager UI** | [http://localhost:9093](http://localhost:9093) | `http://192.168.56.10:9093` | `9093/tcp` | None (Open UI) |
| **Grafana Dashboards** | [http://localhost:3000](http://localhost:3000) | `http://192.168.56.10:3000` | `3000/tcp` | **User:** `admin`<br>**Password:** `admin` |
| **Node Exporter Metrics** | [http://localhost:9100/metrics](http://localhost:9100/metrics) | `http://192.168.56.10:9100/metrics`| `9100/tcp` | None (Raw scrape) |

---

## Prometheus Monitoring & Scrape Targets

Prometheus is configured in [prometheus/prometheus.yml](file:///c:/Users/manik/Downloads/CloudPulse/prometheus/prometheus.yml) to continuously scrape 4 essential targets:

```yaml
scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "cloudpulse-app"
    metrics_path: "/metrics"
    scrape_interval: 5s
    static_configs:
      - targets: ["web:5000"]

  - job_name: "alertmanager"
    static_configs:
      - targets: ["alertmanager:9093"]

  - job_name: "node-exporter"
    scrape_interval: 5s
    static_configs:
      - targets: ["node-exporter:9100"]
```

All 4 targets show as **`UP`** in the Prometheus Targets console.

---

## Prometheus Production Alert Rules

Configured in [prometheus/alerts.yml](file:///c:/Users/manik/Downloads/CloudPulse/prometheus/alerts.yml):

| Alert Rule | PromQL Expression | Duration (`for`) | Severity | Operational Intent |
| :--- | :--- | :--- | :--- | :--- |
| **`HighCpuUsage`** | `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100) > 80` | `2m` | `warning` | Warns when CPU utilization exceeds 80% for > 2 minutes. |
| **`HighMemoryUsage`** | `((node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes) * 100 > 85` | `2m` | `warning` | Warns when host memory utilization exceeds 85% for > 2 minutes. |
| **`HighDiskUsage`** | `((node_filesystem_size_bytes{...} - node_filesystem_free_bytes{...}) / node_filesystem_size_bytes{...}) * 100 > 80` | `2m` | `warning` | Warns when persistent filesystems exceed 80% usage (excludes tmpfs, overlay, squashfs). |
| **`ServiceDown`** | `up == 0` | `30s` | `critical` | Fires when any monitored target instance is unreachable for 30s. |
| **`NodeExporterDown`** | `up{job="node-exporter"} == 0` | `30s` | `critical` | Fires when Node Exporter fails, interrupting host metrics collection. |
| **`PrometheusDown`** | `absent(up{job="prometheus"}) == 1 or up{job="prometheus"} == 0` | `30s` | `critical` | Fires when Prometheus self-monitoring detects server failure. |
| **`HighHttpErrorRate`**| `(sum(rate(flask_http_request_total{status=~"5.."}[1m])) / sum(rate(flask_http_request_total[1m]))) * 100 > 10` | `30s` | `warning` | *[Preserved]* Fires when HTTP 5xx error rate exceeds 10% for 30s. |
| **`HighRequestLatency`**| `histogram_quantile(0.95, sum by (le, job) (rate(flask_http_request_duration_seconds_bucket{endpoint="simulate_slow"}[1m]))) > 1.0` | `30s` | `warning` | *[Preserved]* Fires when p95 response duration on slow endpoints exceeds 1.0s for 30s. |

---

## Alertmanager Multi-Tier Routing & Webhooks

Configured in [alertmanager/alertmanager.yml](file:///c:/Users/manik/Downloads/CloudPulse/alertmanager/alertmanager.yml):

- **Hierarchical Routing Tree:** Alerts are grouped by `['alertname', 'job', 'severity']`.
- **Critical Sub-Route:** Prioritized dispatching with `group_wait: 5s` and `group_interval: 10s`.
- **Warning Sub-Route:** Standard grouping with `group_wait: 10s` and `group_interval: 30s`.
- **Inhibition Rules:** Suppresses warning-level notifications when a corresponding critical alert is already firing on the same instance.
- **Webhook Dispatching:** Delivers structured JSON payloads to `http://web:5000/api/alerts/webhook` with `send_resolved: true`.

---

## Provisioned Grafana Dashboard (12 Panels)

The dashboard is auto-provisioned upon startup at [http://localhost:3000/d/cloudpulse-mon](http://localhost:3000/d/cloudpulse-mon):

| # | Panel Name | Visualization Type | PromQL Expression / Metric |
| :--- | :--- | :--- | :--- |
| **1** | **Node Exporter Availability** | Stat (Value Mapped) | `up{job="node-exporter"}` (1 = UP, 0 = DOWN) |
| **2** | **Prometheus Target Health** | Stat | `sum(up)` (Count of active healthy scrape targets) |
| **3** | **Active Alerts** | Stat | `count(ALERTS{alertstate="firing"}) or vector(0)` |
| **4** | **Application Request Rate** | Stat + Area Sparkline | `sum(rate(flask_http_request_total[1m]))` |
| **5** | **CPU Utilization (%)** | Timeseries Line | `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)` |
| **6** | **Memory Utilization (%)** | Timeseries Line | `((node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes) * 100` |
| **7** | **Disk Utilization (%)** | Gauge | `((max(node_filesystem_size_bytes{...}) - max(node_filesystem_free_bytes{...})) / max(...)) * 100` |
| **8** | **System Load Average** | Timeseries Multi-Line | `node_load1`, `node_load5`, `node_load15` |
| **9** | **Network Receive Traffic** | Timeseries Line | `sum(rate(node_network_receive_bytes_total[1m]))` (Bytes/sec) |
| **10** | **Network Transmit Traffic**| Timeseries Line | `sum(rate(node_network_transmit_bytes_total[1m]))` (Bytes/sec) |
| **11** | **HTTP Error Rate (%)** | Timeseries Line | `(sum(rate(flask_http_request_total{status=~"5.."}[1m])) / sum(rate(...))) * 100` |
| **12** | **p95 Response Latency** | Timeseries Line | `histogram_quantile(0.95, sum by (le) (rate(flask_http_request_duration_seconds_bucket[1m])))` |

---

## CloudPulse Observability Web Console

Accessible at [http://localhost:5000](http://localhost:5000):

- **Sidebar Navigation:** Switch between 11 functional views:
  - `Overview`: Hero metric cards, target health table, and real-time CPU/memory sparkline.
  - `Infrastructure`: Ubuntu VM hardware summary (vCPUs, RAM, IP) and 5-container service status matrix.
  - `CPU Monitoring`: Dedicated line chart with 1m, 5m, 15m load average gauges.
  - `Memory`: Total, used, and available RAM timeseries graph.
  - `Disk Utilization`: Filesystem usage progress distribution.
  - `Network Traffic`: Inbound Rx vs. outbound Tx timeseries chart.
  - `Alerts Management`: Multi-criteria filter (`All`, `Firing`, `Pending`, `Resolved`, `Critical`, `Warning`) with Prometheus rule states and live webhook logs.
  - `Services`: Live Prometheus scrape targets table.
  - `Prometheus`: Configuration inspector and direct link to port `:9090`.
  - `Grafana`: Auto-provisioned dashboard launcher for port `:3000`.
  - `Simulator & Settings`: Scenario simulator controls and activity terminal console.
- **Top Navigation Controls:**
  - Environment identifier (`Ubuntu 22.04 LTS · Local Sandbox`).
  - Dynamic System Health pill (`HEALTHY`, `DEGRADED`, `CRITICAL`).
  - Time range selector (`Last 5 minutes`, `Last 15 minutes`, `Last 1 hour`).
  - Notification drawer with unread count badge.
  - Auto-refresh selector (`5s`, `10s`, `30s`, `Paused`) with manual instant sync button.

---

## Alert Simulation & Validation Runbook

All alert simulation procedures are safe and include automated or explicit cleanup commands:

### 1. CPU Alert Simulation (Safe Multi-Threaded Stress)
Trigger a safe 15-second CPU surge:
- **Via Web UI:** Open `Settings & Simulator` &rarr; click **Trigger Safe CPU Stress (15s)**.
- **Via HTTP API:**
  ```bash
  curl -X POST "http://localhost:5000/api/simulate/cpu?duration=15"
  ```
- **Verification:** Watch CPU utilization surge in the `CPU Monitoring` graph. Worker threads automatically terminate after the configured duration.

### 2. Memory Alert Simulation (Safe Controlled Allocation)
Allocate a temporary 120 MB RAM buffer:
- **Via Web UI:** Open `Settings & Simulator` &rarr; click **Allocate 120 MB RAM (15s)**.
- **Via HTTP API:**
  ```bash
  curl -X POST "http://localhost:5000/api/simulate/memory?duration=15"
  ```
- **Verification:** Observe memory usage increase by ~120 MB. The buffer is automatically freed and collected by Python garbage collection (`del buf; gc.collect()`).

### 3. Disk Alert Simulation & Safe Cleanup
Generate a temporary test file on the VM filesystem:
```bash
# Connect to the VM
vagrant ssh

# Create a 500 MB temporary test file
fallocate -l 500M /tmp/cloudpulse_test.tmp

# Verify filesystem metric change in Prometheus:
curl -s "http://localhost:9090/api/v1/query?query=node_filesystem_free_bytes" | jq

# CLEANUP COMMAND (Mandatory)
rm -f /tmp/cloudpulse_test.tmp
```

### 4. Service Down Alert Simulation
Simulate an unexpected container crash:
```bash
# Stop a monitored container
docker stop cloudpulse-node-exporter

# Wait 15 seconds, then verify target health is DOWN:
curl -s "http://localhost:9090/api/v1/targets" | jq '.data.activeTargets[] | select(.labels.job=="node-exporter") | .health'

# RECOVERY COMMAND
docker start cloudpulse-node-exporter
```

### 5. Webhook Notification & Resolution Simulation
Verify end-to-end Alertmanager routing and resolution delivery:
```bash
# Dispatch a synthetic firing alert to Alertmanager
curl -X POST "http://localhost:9093/api/v2/alerts" \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {"alertname": "TestManualOutage", "severity": "critical", "job": "node-exporter", "instance": "sandbox-vm:9100"},
    "annotations": {"summary": "Manual Verification Test", "description": "Testing alert routing to webhook receiver."},
    "startsAt": "'$(date -u +%FT%TZ)'",
    "endsAt": "'$(date -u -d "+10 minutes" +%FT%TZ)'"
  }]'

# Verify receipt in CloudPulse web console:
curl -s "http://localhost:5000/api/dashboard-data" | jq '.recent_webhook_alerts[0]'

# Send RESOLUTION payload
curl -X POST "http://localhost:9093/api/v2/alerts" \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {"alertname": "TestManualOutage", "severity": "critical", "job": "node-exporter", "instance": "sandbox-vm:9100"},
    "annotations": {"summary": "Manual Verification Test", "description": "Testing alert routing to webhook receiver."},
    "startsAt": "'$(date -u +%FT%TZ)'",
    "endsAt": "'$(date -u +%FT%TZ)'"
  }]'
```

---

## Troubleshooting Guide

### 1. VirtualBox Fails with WHPX / Hyper-V Error
- **Symptom:** `VT-x is not available` or `WHPX execution failure`.
- **Remedy:** Ensure the Windows Hypervisor Platform feature is enabled:
  ```powershell
  # Run as Administrator in PowerShell
  Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform
  ```
  Restart Windows and re-run `vagrant up`.

### 2. Port Collision on Host
- **Symptom:** Port 5000, 9090, 9093, or 3000 already bound by another Windows application.
- **Remedy:** The `Vagrantfile` is configured with `auto_correct: true`. If a port is occupied on the Windows host, Vagrant automatically rebinds it to the next available port and reports the mapping in the console output. Alternatively, access services via the VM private IP `192.168.56.10:<port>`.

### 3. Prometheus Reports Target "DOWN"
- Inspect container network connectivity:
  ```bash
  docker compose exec prometheus wget -qO- http://node-exporter:9100/metrics | head -n 5
  ```
- If Node Exporter was recently restarted, allow 5–10 seconds for the next scrape cycle to refresh target status.

---

## Security Notice & Sandbox Boundaries

- **Educational Purpose:** CloudPulse is engineered specifically as a local sandbox for training, technical interviews, and portfolio demonstrations. It is not intended for public cloud production environments without TLS termination and authentication proxies.
- **Network Boundaries:** All containerized inter-service traffic flows over the internal Docker bridge network (`cloudpulse-net`). No sensitive ports are exposed to public wide-area networks.
- **Credentials:** Default Grafana administrative credentials (`admin` / `admin`) are restricted to local development use.
