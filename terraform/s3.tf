# ─────────────────────────────────────────────────────────────
#  S3 Bucket — artifacts, deployment packages, and app logs
# ─────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "artifacts" {
  bucket        = var.s3_bucket_name
  force_destroy = false  # prevents accidental deletion in prod

  tags = {
    Name = "${var.project_name}-artifacts"
  }
}

# Block all public access — bucket is only accessible via IAM
resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning so you can roll back to a previous artifact
resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption with AES-256 (no extra cost)
resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle: move objects to Glacier after 90 days, delete after 365
# filter {} with no arguments applies the rule to ALL objects in the bucket
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "archive-and-expire"
    status = "Enabled"

    # Empty filter = apply to all objects (required in provider v5.x)
    filter {}

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}
