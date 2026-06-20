# ─────────────────────────────────────────────────────────────
#  Outputs — values printed after `terraform apply`
#  Use these to SSH in, open the app, or reference in CI/CD
# ─────────────────────────────────────────────────────────────

output "vpc_id" {
  description = "ID of the LoanPro VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets (reserved for RDS etc.)"
  value       = aws_subnet.private[*].id
}

output "app_server_instance_id" {
  description = "EC2 instance ID of the app server"
  value       = aws_instance.app_server.id
}

output "app_server_public_ip" {
  description = "Elastic (static) public IP — use this to SSH and access the app"
  value       = aws_eip.app_server.public_ip
}

output "app_server_public_dns" {
  description = "Public DNS hostname of the app server"
  value       = aws_eip.app_server.public_dns
}

output "ssh_command" {
  description = "Ready-to-run SSH command (replace key path if needed)"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ubuntu@${aws_eip.app_server.public_ip}"
}

output "app_url" {
  description = "URL to access the LoanPro app after docker compose up"
  value       = "http://${aws_eip.app_server.public_ip}"
}

output "s3_bucket_name" {
  description = "S3 bucket name for artifacts"
  value       = aws_s3_bucket.artifacts.id
}

output "s3_bucket_arn" {
  description = "ARN of the artifacts S3 bucket"
  value       = aws_s3_bucket.artifacts.arn
}

output "iam_role_arn" {
  description = "ARN of the EC2 IAM role"
  value       = aws_iam_role.app_server.arn
}
