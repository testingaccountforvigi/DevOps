# ─────────────────────────────────────────────────────────────
#  IAM Role — attached to the EC2 instance via an instance profile
#  Grants the EC2 instance permission to read/write the S3 bucket
#  and use SSM Session Manager (so you can shell in without SSH keys)
# ─────────────────────────────────────────────────────────────

# Trust policy: only EC2 service can assume this role
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app_server" {
  name               = "${var.project_name}-app-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
  description        = "Role for LoanPro EC2 app server"
}

# ─────────────────────────────────────────────────────────────
#  S3 access policy — scoped to the specific artifacts bucket
# ─────────────────────────────────────────────────────────────
data "aws_iam_policy_document" "s3_access" {
  statement {
    sid    = "AllowS3BucketList"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation"
    ]
    resources = [aws_s3_bucket.artifacts.arn]
  }

  statement {
    sid    = "AllowS3ObjectAccess"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]
    resources = ["${aws_s3_bucket.artifacts.arn}/*"]
  }
}

resource "aws_iam_policy" "s3_access" {
  name        = "${var.project_name}-s3-access-policy"
  description = "Allows the EC2 app server to read/write the artifacts S3 bucket"
  policy      = data.aws_iam_policy_document.s3_access.json
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.app_server.name
  policy_arn = aws_iam_policy.s3_access.arn
}

# Attach AWS-managed SSM policy so you can use Session Manager in the console
# (browser-based shell — no SSH port required)
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.app_server.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# ─────────────────────────────────────────────────────────────
#  Instance Profile — wraps the role so EC2 can use it
# ─────────────────────────────────────────────────────────────
resource "aws_iam_instance_profile" "app_server" {
  name = "${var.project_name}-app-instance-profile"
  role = aws_iam_role.app_server.name
}
