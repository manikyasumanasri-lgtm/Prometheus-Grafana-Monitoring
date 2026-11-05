# -*- mode: ruby -*-
# vi: set ft=ruby :

# ==============================================================================
# CloudPulse - Local DevOps Sandbox Vagrantfile
# ==============================================================================
# Configurable resource allocation tailored for 8 GB Windows laptop hosts.
# Default allocation: 2 CPU cores and 2048 MB (2 GB) RAM.
# ==============================================================================

# User-configurable hardware & network settings
VM_BOX       = "ubuntu/jammy64"
VM_NAME      = "cloudpulse-sandbox"
VM_CPUS      = 2
VM_MEMORY    = 2048  # Set to 2048 MB to safeguard host stability; can be increased to 3072 MB if host allows
VM_IP        = "192.168.56.10"

Vagrant.configure("2") do |config|
  # Base Box Specification (Ubuntu 22.04 LTS)
  config.vm.box = VM_BOX
  config.vm.hostname = "cloudpulse-sandbox"

  # VirtualBox Provider Configuration
  config.vm.provider "virtualbox" do |vb|
    vb.name = VM_NAME
    vb.cpus = VM_CPUS
    vb.memory = VM_MEMORY

    # Performance and stability flags for Windows Hypervisor Platform (WHPX)
    vb.customize ["modifyvm", :id, "--ioapic", "on"]
    vb.customize ["modifyvm", :id, "--audio", "none"]
    vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
  end

  # Private Network Configuration
  # Allows direct access to the VM via static host-only IP
  config.vm.network "private_network", ip: VM_IP

  # Forwarded Ports (Host -> Guest)
  # Enables direct access via localhost in addition to private network IP
  config.vm.network "forwarded_port", guest: 5000, host: 5000, auto_correct: true, id: "cloudpulse-web"
  config.vm.network "forwarded_port", guest: 9090, host: 9090, auto_correct: true, id: "prometheus"
  config.vm.network "forwarded_port", guest: 9093, host: 9093, auto_correct: true, id: "alertmanager"
  config.vm.network "forwarded_port", guest: 3000, host: 3000, auto_correct: true, id: "grafana"
  config.vm.network "forwarded_port", guest: 9100, host: 9100, auto_correct: true, id: "node-exporter"

  # Synced Project Folder
  # Mounts the current repository into /vagrant inside the VM
  config.vm.synced_folder ".", "/vagrant", type: "virtualbox", mount_options: ["dmode=775,fmode=664"]

  # Automated Shell Provisioning
  config.vm.provision "shell",
    path: "provisioning/install.sh",
    privileged: true
end
