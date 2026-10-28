import os
import time
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

# Store recent Alertmanager webhook events (in-memory)
RECENT_ALERTS = deque(maxlen=20)


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
    """Render the CloudPulse dashboard."""
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


@app.route("/api/dashboard-data")
def dashboard_data():
    """
    Aggregates live monitoring status from Prometheus and Alertmanager.
    Strictly reports unavailability when services cannot be reached.
    """
    timestamp = datetime.utcnow().isoformat() + "Z"
    result = {
        "timestamp": timestamp,
        "prometheus": {
            "connected": False,
            "url": PROMETHEUS_URL,
            "error": None,
            "metrics": {},
            "targets": [],
            "alerts": []
        },
        "alertmanager": {
            "connected": False,
            "url": ALERTMANAGER_URL,
            "error": None,
            "alerts": []
        },
        "recent_webhook_alerts": list(RECENT_ALERTS)
    }

    # 1. Check Prometheus connectivity & query metrics
    try:
        health_resp = requests.get(f"{PROMETHEUS_URL}/-/healthy", timeout=3)
        if health_resp.status_code == 200:
            result["prometheus"]["connected"] = True

            # Query targets
            try:
                targets_resp = requests.get(f"{PROMETHEUS_URL}/api/v1/targets", timeout=3)
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

            # Query active alerts in Prometheus
            try:
                alerts_resp = requests.get(f"{PROMETHEUS_URL}/api/v1/alerts", timeout=3)
                if alerts_resp.status_code == 200:
                    a_data = alerts_resp.json().get("data", {})
                    result["prometheus"]["alerts"] = a_data.get("alerts", [])
            except Exception as e:
                result["prometheus"]["alerts_error"] = str(e)

            # Query real PromQL calculations
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
                "total_requests": total_requests,
                "request_rate": round(req_rate, 2) if req_rate is not None else None,
                "error_rate_pct": round(error_rate, 2) if error_rate is not None else (0.0 if req_rate is not None else None),
                "p95_latency_ms": round(p95_latency * 1000, 2) if p95_latency is not None else None,
                "app_uptime_seconds": int(app_uptime) if app_uptime is not None else None
            }
        else:
            result["prometheus"]["error"] = f"Prometheus returned HTTP status {health_resp.status_code}"
    except requests.exceptions.RequestException as e:
        result["prometheus"]["connected"] = False
        result["prometheus"]["error"] = f"Unreachable: {str(e)}"

    # 2. Check Alertmanager connectivity & active alerts
    try:
        am_health = requests.get(f"{ALERTMANAGER_URL}/-/healthy", timeout=3)
        if am_health.status_code == 200:
            result["alertmanager"]["connected"] = True
            am_alerts = requests.get(f"{ALERTMANAGER_URL}/api/v2/alerts", timeout=3)
            if am_alerts.status_code == 200:
                result["alertmanager"]["alerts"] = am_alerts.json()
        else:
            result["alertmanager"]["error"] = f"Alertmanager returned HTTP status {am_health.status_code}"
    except requests.exceptions.RequestException as e:
        result["alertmanager"]["connected"] = False
        result["alertmanager"]["error"] = f"Unreachable: {str(e)}"

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
    app.run(host="0.0.0.0", port=5000, debug=False)
