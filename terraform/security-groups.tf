# ─────────────────────────────────────────────────────────────
#  EC2 App Server Security Group
#  Allows: SSH (22), HTTP (80), HTTPS (443)
#  Denies: everything else inbound
# ─────────────────────────────────────────────────────────────
resource "aws_security_group" "app_server" {
  name        = "${var.project_name}-app-sg"
  description = "Allow SSH, HTTP, and HTTPS to the LoanPro EC2 instance"
  vpc_id      = aws_vpc.main.id

  # SSH — restrict this to your IP in production
  # Change 0.0.0.0/0 to "your.ip.address/32" for tighter security
  ingress {
    description = "SSH from anywhere (tighten in prod)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP — Nginx serves the frontend on port 80
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS — for future SSL/TLS termination
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic allowed (required for apt-get, docker pull, etc.)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-app-sg"
  }
}
