import os
import time
import threading
import concurrent.futures
import gc
from collections import deque
from datetime import datetime
from flask import Flask, jsonify, render_template, request, Response
import requests
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
    REGISTRY
)

app = Flask(__name__)

# Service URLs from environment
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090").rstrip("/")
ALERTMANAGER_URL = os.getenv("ALERTMANAGER_URL", "http://localhost:9093").rstrip("/")
GRAFANA_URL = os.getenv("GRAFANA_URL", "http://grafana:3000").rstrip("/")
NODE_EXPORTER_URL = os.getenv("NODE_EXPORTER_URL", "http://node-exporter:9100").rstrip("/")

# Prometheus application metrics
REQUEST_COUNT = Counter(
    "flask_http_request_total",
    "Total HTTP Requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "flask_http_request_duration_seconds",
    "HTTP Request Latency in Seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

ACTIVE_REQUESTS = Gauge(
    "flask_active_requests",
    "Currently active HTTP requests in Flask"
)

# Store recent Alertmanager webhook events (in-memory ring buffer)
RECENT_ALERTS = deque(maxlen=50)

# Background simulation handles
ACTIVE_SIMULATIONS = {
    "cpu": False,
    "memory": False
}


@app.before_request
def before_request():
    request._start_time = time.time()
    ACTIVE_REQUESTS.inc()


@app.after_request
def after_request(response):
    ACTIVE_REQUESTS.dec()
    if hasattr(request, "_start_time"):
        duration = time.time() - request._start_time
        endpoint = request.endpoint or request.path
        REQUEST_LATENCY.labels(method=request.method, endpoint=endpoint).observe(duration)
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status=response.status_code
        ).inc()
    return response


@app.route("/")
def index():
    """Render the upgraded CloudPulse observability platform dashboard."""
    return render_template("index.html")


@app.route("/metrics")
def metrics():
    """Prometheus metrics scrape endpoint."""
    return Response(generate_latest(REGISTRY), mimetype=CONTENT_TYPE_LATEST)


def query_prometheus_vector(query: str):
    """Execute a PromQL query and extract a single scalar/vector value or None."""
    try:
        url = f"{PROMETHEUS_URL}/api/v1/query"
        resp = requests.get(url, params={"query": query}, timeout=3)
        if resp.status_code == 200:
            payload = resp.json()
            if payload.get("status") == "success":
                results = payload.get("data", {}).get("result", [])
                if results and len(results) > 0:
                    val = results[0].get("value", [None, None])[1]
                    try:
                        return float(val)
                    except (ValueError, TypeError):
                        return val
    except Exception:
        pass
    return None


@app.route("/api/prometheus/query_range")
def prometheus_query_range():
    """Proxy PromQL range queries for Chart.js interactive historical graphs."""
    query = request.args.get("query")
    start = request.args.get("start")
    end = request.args.get("end")
    step = request.args.get("step", "15s")

    if not query:
        return jsonify({"status": "error", "message": "query parameter is required"}), 400

    now = time.time()
    if not end:
        end = now
    if not start:
        start = float(end) - 900  # Default 15 minutes window

    try:
        url = f"{PROMETHEUS_URL}/api/v1/query_range"
        resp = requests.get(
            url,
            params={"query": query, "start": start, "end": end, "step": step},
            timeout=5
        )
        if resp.status_code == 200:
            return jsonify(resp.json())
        return jsonify({"status": "error", "message": f"Prometheus returned HTTP {resp.status_code}"}), resp.status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 502


def check_service_health(name: str, check_url: str, external_url: str, port: int, purpose: str, button_text: str):
    """Probe a single monitoring service endpoint and report status, latency, and error."""
    start_t = time.time()
    status = "UNKNOWN"
    error_msg = None
    try:
        resp = requests.get(check_url, timeout=1.5)
        latency = round((time.time() - start_t) * 1000, 1)
        if resp.status_code in (200, 204):
            status = "ONLINE"
        else:
            status = "OFFLINE"
            error_msg = f"HTTP {resp.status_code}"
    except requests.exceptions.Timeout:
        latency = round((time.time() - start_t) * 1000, 1)
        status = "UNKNOWN"
        error_msg = "Connection timed out (>1.5s)"
    except requests.exceptions.ConnectionError:
        latency = round((time.time() - start_t) * 1000, 1)
        status = "OFFLINE"
        error_msg = f"Connection refused on port {port}"
    except Exception as e:
        latency = round((time.time() - start_t) * 1000, 1)
        status = "UNKNOWN"
        error_msg = str(e)

    return {
        "name": name,
        "status": status,
        "port": port,
        "external_url": external_url,
        "purpose": purpose,
        "button_text": button_text,
        "latency_ms": latency if status == "ONLINE" else None,
        "error": error_msg,
        "checked_at": datetime.utcnow().isoformat() + "Z"
    }


def get_all_monitoring_services():
    """Execute live health probes concurrently across all 4 core monitoring daemons."""
    configs = [
        ("prometheus", "Prometheus", f"{PROMETHEUS_URL}/-/healthy", "http://localhost:9090", 9090, "Metrics collection and monitoring.", "Open Prometheus"),
        ("grafana", "Grafana", f"{GRAFANA_URL}/api/health", "http://localhost:3000", 3000, "Monitoring dashboards and visualization.", "Open Grafana"),
        ("alertmanager", "Alertmanager", f"{ALERTMANAGER_URL}/-/healthy", "http://localhost:9093", 9093, "Alert management and notifications.", "Open Alertmanager"),
        ("node_exporter", "Node Exporter", f"{NODE_EXPORTER_URL}/metrics", "http://localhost:9100/metrics", 9100, "Host-level CPU, memory, disk, and network metrics.", "View Metrics")
    ]

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_to_key = {
            executor.submit(check_service_health, name, check_url, ext_url, port, purpose, btn): key
            for key, name, check_url, ext_url, port, purpose, btn in configs
        }
        for future in concurrent.futures.as_completed(future_to_key):
            key = future_to_key[future]
            try:
                results[key] = future.result()
            except Exception as e:
                results[key] = {
                    "name": key,
                    "status": "OFFLINE",
                    "port": 0,
                    "external_url": "",
                    "purpose": "",
                    "button_text": "",
                    "latency_ms": None,
                    "error": str(e),
                    "checked_at": datetime.utcnow().isoformat() + "Z"
                }
    return results


@app.route("/api/services/health")
def api_services_health():
    """
    Dedicated live health check endpoint for the 4 core monitoring services:
    Prometheus, Grafana, Alertmanager, Node Exporter.
    Avoids CORS issues by proxying probes through the Flask backend.
    """
    services = get_all_monitoring_services()
    online_count = sum(1 for s in services.values() if s["status"] == "ONLINE")
    return jsonify({
        "status": "success",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "online_count": online_count,
        "total_count": len(services),
        "services": services
    })


@app.route("/api/dashboard-data")
def dashboard_data():
    """
    Aggregates live monitoring status from Prometheus, Alertmanager, and Node Exporter.
    Strictly reports unavailability when services cannot be reached.
    """
    timestamp = datetime.utcnow().isoformat() + "Z"
    result = {
        "timestamp": timestamp,
        "environment": {
            "name": "Local DevOps Sandbox (Ubuntu 22.04 LTS / Docker)",
            "vm_status": "Running",
            "allocated_cpus": 2,
            "allocated_ram_mb": 2048,
            "system_health": "HEALTHY"
        },
        "services_health": {
            "cloudpulse_web": {"status": "UP", "url": "http://localhost:5000"},
            "prometheus": {"status": "UNKNOWN", "url": PROMETHEUS_URL},
            "alertmanager": {"status": "UNKNOWN", "url": ALERTMANAGER_URL},
            "grafana": {"status": "UNKNOWN", "url": GRAFANA_URL},
            "node_exporter": {"status": "UNKNOWN", "url": "http://localhost:9100"}
        },
        "prometheus": {
            "connected": False,
            "url": PROMETHEUS_URL,
            "error": None,
            "metrics": {},
            "host_metrics": {},
            "targets": [],
            "alerts": []
        },
        "alertmanager": {
            "connected": False,
            "url": ALERTMANAGER_URL,
            "error": None,
            "alerts": []
        },
        "recent_webhook_alerts": list(RECENT_ALERTS),
        "simulations": ACTIVE_SIMULATIONS
    }

    monitoring = get_all_monitoring_services()
    result["monitoring_services"] = monitoring

    # 1. Grafana Status from probe
    graf_status = monitoring.get("grafana", {}).get("status")
    result["services_health"]["grafana"]["status"] = "UP" if graf_status == "ONLINE" else "DOWN"

    # 2. Check Prometheus connectivity & query metrics if online
    prom_info = monitoring.get("prometheus", {})
    if prom_info.get("status") == "ONLINE":
        result["prometheus"]["connected"] = True
        result["services_health"]["prometheus"]["status"] = "UP"
        try:
            # Query Scrape Targets
            try:
                targets_resp = requests.get(f"{PROMETHEUS_URL}/api/v1/targets", timeout=2)
                if targets_resp.status_code == 200:
                    t_data = targets_resp.json().get("data", {})
                    active_targets = t_data.get("activeTargets", [])
                    result["prometheus"]["targets"] = [
                        {
                            "job": t.get("labels", {}).get("job", "unknown"),
                            "instance": t.get("labels", {}).get("instance", "unknown"),
                            "health": t.get("health", "unknown"),
                            "lastScrape": t.get("lastScrape", ""),
                            "lastScrapeDuration": t.get("lastScrapeDuration", 0)
                        }
                        for t in active_targets
                    ]
            except Exception as e:
                result["prometheus"]["targets_error"] = str(e)

            # Query Active Alert Rules in Prometheus
            try:
                alerts_resp = requests.get(f"{PROMETHEUS_URL}/api/v1/alerts", timeout=2)
                if alerts_resp.status_code == 200:
                    a_data = alerts_resp.json().get("data", {})
                    result["prometheus"]["alerts"] = a_data.get("alerts", [])
            except Exception as e:
                result["prometheus"]["alerts_error"] = str(e)

            # Query Application RED Metrics
            total_requests = query_prometheus_vector("sum(flask_http_request_total)")
            req_rate = query_prometheus_vector("sum(rate(flask_http_request_total[1m]))")
            error_rate = query_prometheus_vector(
                "sum(rate(flask_http_request_total{status=~\"5..\"}[1m])) / sum(rate(flask_http_request_total[1m])) * 100"
            )
            p95_latency = query_prometheus_vector(
                "histogram_quantile(0.95, sum(rate(flask_http_request_duration_seconds_bucket[1m])) by (le))"
            )
            app_uptime = query_prometheus_vector('time() - process_start_time_seconds{job="cloudpulse-app"}')

            result["prometheus"]["metrics"] = {
                "total_requests": int(total_requests) if total_requests is not None else None,
                "request_rate": round(req_rate, 2) if req_rate is not None else None,
                "error_rate_pct": round(error_rate, 2) if error_rate is not None else (0.0 if req_rate is not None else None),
                "p95_latency_ms": round(p95_latency * 1000, 2) if p95_latency is not None else None,
                "app_uptime_seconds": int(app_uptime) if app_uptime is not None else None
            }

            # Query Host-level Node Exporter Metrics
            cpu_usage = query_prometheus_vector('100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)')
            load1 = query_prometheus_vector('node_load1')
            load5 = query_prometheus_vector('node_load5')
            load15 = query_prometheus_vector('node_load15')

            mem_total = query_prometheus_vector('node_memory_MemTotal_bytes')
            mem_avail = query_prometheus_vector('node_memory_MemAvailable_bytes')
            mem_used_pct = query_prometheus_vector(
                '((node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes) * 100'
            )

            disk_total = query_prometheus_vector('max(node_filesystem_size_bytes{fstype!~"tmpfs|overlay|iso9660|squashfs"})')
            disk_free = query_prometheus_vector('max(node_filesystem_free_bytes{fstype!~"tmpfs|overlay|iso9660|squashfs"})')
            disk_used_pct = query_prometheus_vector(
                '((max(node_filesystem_size_bytes{fstype!~"tmpfs|overlay|iso9660|squashfs"}) - max(node_filesystem_free_bytes{fstype!~"tmpfs|overlay|iso9660|squashfs"})) / max(node_filesystem_size_bytes{fstype!~"tmpfs|overlay|iso9660|squashfs"})) * 100'
            )

            net_rx_rate = query_prometheus_vector('sum(rate(node_network_receive_bytes_total[1m]))')
            net_tx_rate = query_prometheus_vector('sum(rate(node_network_transmit_bytes_total[1m]))')
            host_uptime = query_prometheus_vector('node_time_seconds - node_boot_time_seconds')

            result["prometheus"]["host_metrics"] = {
                "cpu_utilization_pct": round(cpu_usage, 2) if cpu_usage is not None else None,
                "load_1m": round(load1, 2) if load1 is not None else None,
                "load_5m": round(load5, 2) if load5 is not None else None,
                "load_15m": round(load15, 2) if load15 is not None else None,
                "memory_total_bytes": int(mem_total) if mem_total is not None else None,
                "memory_available_bytes": int(mem_avail) if mem_avail is not None else None,
                "memory_used_bytes": int(mem_total - mem_avail) if (mem_total is not None and mem_avail is not None) else None,
                "memory_utilization_pct": round(mem_used_pct, 2) if mem_used_pct is not None else None,
                "disk_total_bytes": int(disk_total) if disk_total is not None else None,
                "disk_free_bytes": int(disk_free) if disk_free is not None else None,
                "disk_used_bytes": int(disk_total - disk_free) if (disk_total is not None and disk_free is not None) else None,
                "disk_utilization_pct": round(disk_used_pct, 2) if disk_used_pct is not None else None,
                "network_rx_bytes_sec": round(net_rx_rate, 2) if net_rx_rate is not None else None,
                "network_tx_bytes_sec": round(net_tx_rate, 2) if net_tx_rate is not None else None,
                "host_uptime_seconds": int(host_uptime) if host_uptime is not None else None
            }
        except Exception as e:
            result["prometheus"]["error"] = str(e)
    else:
        result["prometheus"]["connected"] = False
        result["prometheus"]["error"] = prom_info.get("error", "Prometheus offline")
        result["services_health"]["prometheus"]["status"] = "DOWN"

    # 3. Check Alertmanager connectivity & active alerts
    am_info = monitoring.get("alertmanager", {})
    if am_info.get("status") == "ONLINE":
        result["alertmanager"]["connected"] = True
        result["services_health"]["alertmanager"]["status"] = "UP"
        try:
            am_alerts = requests.get(f"{ALERTMANAGER_URL}/api/v2/alerts", timeout=1.5)
            if am_alerts.status_code == 200:
                result["alertmanager"]["alerts"] = am_alerts.json()
        except Exception as e:
            result["alertmanager"]["error"] = str(e)
    else:
        result["alertmanager"]["connected"] = False
        result["alertmanager"]["error"] = am_info.get("error", "Alertmanager offline")
        result["services_health"]["alertmanager"]["status"] = "DOWN"

    # 4. Node Exporter Health
    ne_info = monitoring.get("node_exporter", {})
    result["services_health"]["node_exporter"]["status"] = "UP" if ne_info.get("status") == "ONLINE" else "DOWN"

    # 4. Compute Overall System Health Status
    firing_alerts = [a for a in result["prometheus"].get("alerts", []) if a.get("state") == "firing"]
    has_critical = any(
        a.get("labels", {}).get("severity") == "critical" for a in firing_alerts
    ) or any(
        s.get("status") == "DOWN" for s in result["services_health"].values()
    )
    has_warning = len(firing_alerts) > 0 or any(
        s.get("status") == "DEGRADED" for s in result["services_health"].values()
    )

    if has_critical:
        result["environment"]["system_health"] = "CRITICAL"
    elif has_warning:
        result["environment"]["system_health"] = "DEGRADED"
    else:
        result["environment"]["system_health"] = "HEALTHY"

    return jsonify(result)


# Simulator endpoints for testing metrics and alert triggers
@app.route("/api/simulate/traffic", methods=["POST", "GET"])
def simulate_traffic():
    """Generates a standard 200 OK request."""
    return jsonify({"status": "ok", "message": "Synthetic traffic request processed successfully"})


@app.route("/api/simulate/error", methods=["POST", "GET"])
def simulate_error():
    """Simulates an internal server 500 error to test error rate alert."""
    return jsonify({"status": "error", "message": "Simulated HTTP 500 Internal Error"}), 500


@app.route("/api/simulate/slow", methods=["POST", "GET"])
def simulate_slow():
    """Simulates high latency request (sleeps for 1.2s) to test p95 latency alert."""
    time.sleep(1.2)
    return jsonify({"status": "ok", "message": "Slow request processed after 1.2s delay"})


@app.route("/api/simulate/cpu", methods=["POST", "GET"])
def simulate_cpu():
    """Safely runs controlled CPU stress for 15 seconds across threads and terminates."""
    duration = int(request.args.get("duration", 15))
    duration = max(5, min(duration, 30))  # Bound between 5s and 30s for safety

    def cpu_worker(end_time):
        while time.time() < end_time:
            _ = [x * x for x in range(2000)]

    def run_stress():
        ACTIVE_SIMULATIONS["cpu"] = True
        end_time = time.time() + duration
        threads = []
        for _ in range(2):
            t = threading.Thread(target=cpu_worker, args=(end_time,))
            t.daemon = True
            t.start()
            threads.append(t)
        for t in threads:
            t.join()
        ACTIVE_SIMULATIONS["cpu"] = False

    t = threading.Thread(target=run_stress)
    t.daemon = True
    t.start()

    return jsonify({
        "status": "ok",
        "message": f"Safe CPU load simulation initiated for {duration} seconds across 2 worker threads."
    })


@app.route("/api/simulate/memory", methods=["POST", "GET"])
def simulate_memory():
    """Safely allocates a controlled 120MB buffer in memory for 15s and cleans it up."""
    duration = int(request.args.get("duration", 15))
    duration = max(5, min(duration, 30))

    def memory_worker():
        ACTIVE_SIMULATIONS["memory"] = True
        try:
            # Allocate approx 120 MB buffer
            buf = bytearray(120 * 1024 * 1024)
            for i in range(0, len(buf), 4096):
                buf[i] = 1
            time.sleep(duration)
            del buf
            gc.collect()
        finally:
            ACTIVE_SIMULATIONS["memory"] = False

    t = threading.Thread(target=memory_worker)
    t.daemon = True
    t.start()

    return jsonify({
        "status": "ok",
        "message": f"Controlled memory allocation (120 MB) initiated for {duration}s. Will auto-release."
    })


@app.route("/api/simulate/clear-alerts", methods=["POST"])
def clear_alerts():
    """Clears in-memory recent webhook alert history."""
    RECENT_ALERTS.clear()
    return jsonify({"status": "ok", "message": "Webhook alert history cleared."})


@app.route("/api/alerts/webhook", methods=["POST"])
def alertmanager_webhook():
    """Webhook receiver for Alertmanager notifications."""
    payload = request.get_json(silent=True) or {}
    alerts = payload.get("alerts", [])
    status = payload.get("status", "unknown")
    for alert in alerts:
        RECENT_ALERTS.appendleft({
            "received_at": datetime.utcnow().strftime("%H:%M:%S UTC"),
            "status": status,
            "alertname": alert.get("labels", {}).get("alertname", "UnknownAlert"),
            "severity": alert.get("labels", {}).get("severity", "info"),
            "instance": alert.get("labels", {}).get("instance", "N/A"),
            "summary": alert.get("annotations", {}).get("summary", ""),
            "description": alert.get("annotations", {}).get("description", "")
        })
    return jsonify({"status": "received", "count": len(alerts)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
