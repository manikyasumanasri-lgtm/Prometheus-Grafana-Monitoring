# CloudPulse – DevOps Monitoring and Alerting Sandbox

## Project Overview

CloudPulse is a local DevOps monitoring platform built to monitor system performance, collect application metrics, visualize data and manage alerts.

The project runs inside an Ubuntu virtual machine using Vagrant, VirtualBox and Docker.

## Technology Stack

- Ubuntu 22.04
- VirtualBox
- Vagrant
- Docker and Docker Compose
- Prometheus
- Grafana
- Alertmanager
- Node Exporter
- Python Flask

## Key Features

- Automated VM provisioning.
- Real-time CPU, memory, disk and network monitoring.
- Application performance monitoring.
- Four Prometheus monitoring targets.
- Eight predefined alert rules.
- Alert routing through Alertmanager.
- Grafana monitoring dashboard.
- HTTP error simulation and alert testing.

## Project Structure

```text
CloudPulse/
├── Vagrantfile
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── app.py
├── provisioning/
├── prometheus/
├── alertmanager/
├── grafana/
├── templates/
├── static/
└── README.md
```

## Installation

Clone the repository:

```bash
git clone https://github.com/manikyasumanasri-lgtm/Prometheus-Grafana-Monitoring.git
```

Navigate to the project:

```bash
cd Prometheus-Grafana-Monitoring
```

Start the virtual machine:

```bash
vagrant up
```

Connect to Ubuntu:

```bash
vagrant ssh
```

Check running containers:

```bash
docker ps
```

## Service Access

| Service | URL |
|---|---|
| Web Application | http://192.168.56.10:5000 |
| Prometheus | http://192.168.56.10:9090 |
| Grafana | http://192.168.56.10:3000 |
| Alertmanager | http://192.168.56.10:9093 |
| Node Exporter | http://192.168.56.10:9100/metrics |

Grafana default credentials:

- Username: `admin`
- Password: `admin`

## Monitoring and Alerting

CloudPulse includes eight alert rules covering:

- High CPU usage.
- High memory usage.
- High disk usage.
- Service availability.
- Node Exporter availability.
- Prometheus availability.
- HTTP 5xx error rate.
- Application response latency.

## Verification

The following components were successfully tested:

- Five Docker containers running.
- Four Prometheus targets UP.
- Eight alert rules loaded.
- Grafana dashboard operational.
- HTTP 500 error simulation successful.
- HighHttpErrorRate alert triggered.
- Alertmanager successfully received the active alert.

## Learning Outcomes

- Infrastructure automation.
- Container orchestration.
- Linux system monitoring.
- Prometheus metrics and alert rules.
- Grafana dashboard configuration.
- Alertmanager notification routing.
- Application monitoring and troubleshooting.

## Conclusion

CloudPulse provides a practical local environment for learning DevOps monitoring, observability, containerization and automated infrastructure provisioning.
