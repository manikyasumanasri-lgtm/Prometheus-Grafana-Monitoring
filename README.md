CloudPulse – DevOps Monitoring and Alerting Sandbox

Project Overview

CloudPulse is a local DevOps monitoring and alerting platform designed to monitor system resources, collect application metrics, visualize performance data, and manage alerts.

The platform runs inside an Ubuntu 22.04 virtual machine provisioned using Vagrant and VirtualBox. Docker Compose manages the monitoring services.

Technology Stack

Ubuntu 22.04 LTS

Oracle VirtualBox

Vagrant

Docker

Docker Compose

Prometheus

Grafana

Alertmanager

Node Exporter

Python Flask

Key Features

Automated Ubuntu VM provisioning.

Containerized monitoring environment.

CPU, memory, disk, and network monitoring.

Application performance monitoring.

Four Prometheus scrape targets.

Eight predefined Prometheus alert rules.

Alert routing through Alertmanager.

Grafana dashboard for metrics visualization.

HTTP error simulation for alert testing.

Flask-based monitoring dashboard.

Architecture

The project uses the following monitoring flow:

Vagrant provisions the Ubuntu virtual machine.

Docker Compose starts the monitoring containers.

Node Exporter collects system-level metrics.

Prometheus scrapes and stores metrics.

Grafana visualizes monitoring data.

Prometheus evaluates alert rules.

Alertmanager routes alerts to the Flask application webhook.

Project Structure

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
│   └── provisioning/
├── templates/
├── static/
├── screenshots/
└── README.md

Prerequisites

Install the following software on your host machine:

Oracle VirtualBox

Vagrant

Docker

Git

Ensure hardware virtualization is enabled.

Installation and Setup

1. Clone the Repository

git clone https://github.com/manikyasumanasri-lgtm/Prometheus-Grafana-Monitoring.git

2. Navigate to the Project

cd Prometheus-Grafana-Monitoring

3. Start the Virtual Machine

vagrant up

4. Connect to Ubuntu

vagrant ssh

5. Check Running Containers

docker ps

6. Check Container Status

docker compose ps

Service Access

Once the virtual machine and containers are running, access the services using the following URLs.

Service

URL

CloudPulse Web Application

http://192.168.56.10:5000

Prometheus

http://192.168.56.10:9090

Grafana

http://192.168.56.10:3000

Alertmanager

http://192.168.56.10:9093

Node Exporter

http://192.168.56.10:9100/metrics

Note: These URLs are accessible when the local virtual machine is running and the host can reach its host-only network.

Grafana Login

Default credentials, if unchanged:

Username: admin

Password: admin

Change the default password after your first login.

Monitoring and Alerting

CloudPulse includes eight predefined Prometheus alert rules:

High CPU Usage

High Memory Usage

High Disk Usage

Service Availability

Node Exporter Availability

Prometheus Availability

HTTP 5xx Error Rate

Application Response Latency

Alertmanager handles alert routing and sends webhook notifications to the Flask application.

Testing and Verification

The following project components were tested successfully:

Five Docker containers running.

Four Prometheus monitoring targets reporting UP.

Eight Prometheus alert rules loaded.

Grafana dashboard operational.

HTTP 500 error simulation successful.

HighHttpErrorRate alert triggered successfully.

Alertmanager received the active alert.

Flask webhook endpoint returned HTTP 200.

Alert resolution events recorded.

Screenshots

The screenshots/ directory contains project verification screenshots covering the monitoring environment and alert testing.

Learning Outcomes

Through this project, I gained practical experience in:

Infrastructure provisioning using Vagrant.

Virtual machine management using VirtualBox.

Containerization with Docker.

Docker Compose orchestration.

Linux system administration.

Prometheus metrics collection and alert rules.

Grafana dashboard configuration.

Alertmanager notification routing.

Application monitoring and troubleshooting.

Monitoring system integration.

Conclusion

CloudPulse demonstrates a locally deployed DevOps monitoring environment integrating infrastructure automation, containerization, metrics collection, visualization, and alert management.

The project provides practical experience with monitoring and observability tools used in DevOps environments.

