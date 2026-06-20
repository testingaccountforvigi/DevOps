# ─────────────────────────────────────────────
# General
# ─────────────────────────────────────────────
variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short project identifier used in resource names"
  type        = string
  default     = "loanpro"
}

variable "environment" {
  description = "Deployment environment (dev / staging / prod)"
  type        = string
  default     = "prod"
}

# ─────────────────────────────────────────────
# Networking
# ─────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per AZ)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (one per AZ)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "availability_zones" {
  description = "Availability zones to use"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# ─────────────────────────────────────────────
# EC2
# ─────────────────────────────────────────────
variable "instance_type" {
  description = "EC2 instance type for the app server"
  type        = string
  default     = "t3.medium"
}

variable "ami_id" {
  description = "Amazon Machine Image ID (Ubuntu 22.04 LTS us-east-1)"
  type        = string
  default     = "ami-0fc5d935ebf8bc3bc" # Ubuntu 22.04 LTS us-east-1 (update if changing region)
}

variable "key_pair_name" {
  description = "Name of an existing EC2 key pair for SSH access"
  type        = string
  default     = "loanpro-key"
}

# ─────────────────────────────────────────────
# S3
# ─────────────────────────────────────────────
variable "s3_bucket_name" {
  description = "Globally-unique S3 bucket name for app artifacts and logs"
  type        = string
  default     = "loanpro-artifacts-prod"
}

# ─────────────────────────────────────────────
# Credentials (provided via terraform.tfvars)
# ─────────────────────────────────────────────
variable "aws_access_key" {
  description = "AWS access key ID — provide via terraform.tfvars, never hardcode here"
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS secret access key — provide via terraform.tfvars, never hardcode here"
  type        = string
  sensitive   = true
}
