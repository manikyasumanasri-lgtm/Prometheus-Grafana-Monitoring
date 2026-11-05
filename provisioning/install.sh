#!/usr/bin/env bash
# ==============================================================================
# CloudPulse - Automated Ubuntu VM Provisioning Script
# ==============================================================================
# This script is idempotent and can be safely re-run multiple times.
# Designed for Ubuntu 22.04 LTS on VirtualBox / Vagrant.
# ==============================================================================

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "=================================================================="
echo " [CloudPulse] Starting Automated VM Provisioning..."
echo " Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=================================================================="

# ------------------------------------------------------------------------------
# 1. System Package Updates & Essential Utilities
# ------------------------------------------------------------------------------
echo "==> [1/7] Updating package index and installing essential tools..."
apt-get update -y
apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    jq \
    htop \
    wget \
    git \
    stress-ng \
    bc \
    net-tools

# ------------------------------------------------------------------------------
# 2. Install Docker CE & Docker Compose Plugin
# ------------------------------------------------------------------------------
echo "==> [2/7] Configuring Docker Official Repository & Engine..."
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
    fi

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y --no-install-recommends \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin
    echo "    Docker Engine installed successfully."
else
    echo "    Docker Engine already installed: $(docker --version)"
fi

# ------------------------------------------------------------------------------
# 3. Configure Docker Permissions & Systemd Service
# ------------------------------------------------------------------------------
echo "==> [3/7] Setting up Docker permissions and daemon..."
systemctl enable docker
systemctl start docker

# Add vagrant and current sudo user to docker group if present
if id "vagrant" &>/dev/null; then
    usermod -aG docker vagrant
fi
if [ -n "${SUDO_USER:-}" ] && id "$SUDO_USER" &>/dev/null; then
    usermod -aG docker "$SUDO_USER"
fi

# ------------------------------------------------------------------------------
# 4. Prepare Project Directory and Workspaces
# ------------------------------------------------------------------------------
echo "==> [4/7] Preparing CloudPulse workspace..."
PROJECT_DIR="/vagrant"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "    Warning: /vagrant synced folder not detected. Using /opt/cloudpulse fallback."
    PROJECT_DIR="/opt/cloudpulse"
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
echo "    Working directory: $PROJECT_DIR"

# ------------------------------------------------------------------------------
# 5. Build and Launch Monitoring Stack
# ------------------------------------------------------------------------------
echo "==> [5/7] Deploying CloudPulse monitoring stack via Docker Compose..."
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
    docker compose -f "$PROJECT_DIR/docker-compose.yml" down --remove-orphans || true
    docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d --build
else
    echo "    Error: docker-compose.yml not found in $PROJECT_DIR"
    exit 1
fi

# ------------------------------------------------------------------------------
# 6. Service Health Validation
# ------------------------------------------------------------------------------
echo "==> [6/7] Validating service health checks..."

check_http() {
    local name="$1"
    local url="$2"
    local max_retries="${3:-12}"
    local delay="${4:-3}"

    echo -n "    Checking $name ($url)... "
    local count=0
    while [ $count -lt "$max_retries" ]; do
        if curl -s -f -o /dev/null "$url"; then
            echo "OK"
            return 0
        fi
        count=$((count + 1))
        sleep "$delay"
    done
    echo "WARNING (Not responding within expected window)"
    return 1
}

# Allow containers a few seconds to initialize
sleep 5

# Check individual components (tolerates non-fatal check in initial build)
check_http "CloudPulse Web Application" "http://localhost:5000" 10 3 || true
check_http "Prometheus Health" "http://localhost:9090/-/healthy" 10 3 || true
check_http "Alertmanager Health" "http://localhost:9093/-/healthy" 10 3 || true
check_http "Grafana Health" "http://localhost:3000/api/health" 10 3 || true

# Check Node Exporter if configured
if curl -s -o /dev/null "http://localhost:9100/metrics"; then
    echo "    Node Exporter (http://localhost:9100/metrics)... OK"
else
    echo "    Node Exporter (http://localhost:9100/metrics)... Not yet exposed or initializing"
fi

# ------------------------------------------------------------------------------
# 7. Summary & Endpoints
# ------------------------------------------------------------------------------
echo "=================================================================="
echo " [CloudPulse] VM Provisioning Completed Successfully!"
echo "=================================================================="
echo " Access Endpoints from Host Machine:"
echo "   - CloudPulse Web UI:    http://192.168.56.10:5000  (or http://localhost:5000)"
echo "   - Prometheus UI:        http://192.168.56.10:9090  (or http://localhost:9090)"
echo "   - Alertmanager UI:      http://192.168.56.10:9093  (or http://localhost:9093)"
echo "   - Grafana Dashboards:   http://192.168.56.10:3000  (or http://localhost:3000)"
echo "   - Node Exporter:        http://192.168.56.10:9100  (or http://localhost:9100)"
echo " Default Credentials: admin / admin (Grafana)"
echo "=================================================================="
