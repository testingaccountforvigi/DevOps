# ─────────────────────────────────────────────────────────────
#  EC2 Instance — LoanPro application server
#
#  What this creates:
#    - Ubuntu 22.04 LTS instance in the first public subnet
#    - User-data script installs Docker + Docker Compose on boot
#    - IAM instance profile gives it S3 access
#    - Attached to the app security group (SSH, HTTP, HTTPS)
#
#  After terraform apply:
#    1. SSH in:  ssh -i ~/.ssh/<key>.pem ubuntu@<public_ip>
#    2. Clone:   git clone https://github.com/testingaccountforvigi/DevOps
#    3. Deploy:  cd DevOps && docker compose up -d --build
# ─────────────────────────────────────────────────────────────
resource "aws_instance" "app_server" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.app_server.id]
  iam_instance_profile   = aws_iam_instance_profile.app_server.name
  key_name               = var.key_pair_name

  # Root volume: 20 GB gp3 (faster and cheaper than gp2)
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    delete_on_termination = true
    encrypted             = true
  }

  # User-data runs once on first boot as root.
  # Installs Docker Engine and Docker Compose plugin.
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # ── System update ──────────────────────────────────────
    apt-get update -y
    apt-get upgrade -y

    # ── Docker Engine (official repo) ──────────────────────
    apt-get install -y ca-certificates curl gnupg lsb-release git

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" \
      > /etc/apt/sources.list.d/docker.list

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # ── Allow ubuntu user to run docker without sudo ───────
    usermod -aG docker ubuntu

    # ── Enable Docker on boot ──────────────────────────────
    systemctl enable docker
    systemctl start docker

    # ── Signal completion ──────────────────────────────────
    echo "LoanPro EC2 bootstrap complete — Docker $(docker --version)" \
      >> /var/log/loanpro-init.log
  EOF

  tags = {
    Name = "${var.project_name}-app-server"
  }
}

# Elastic IP — gives the instance a stable public IP that survives stop/start
resource "aws_eip" "app_server" {
  instance = aws_instance.app_server.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}
