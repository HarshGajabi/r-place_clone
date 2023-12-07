#!/bin/bash

# Set the AWS region and S3 bucket name
AWS_REGION="us-east-2"
S3_BUCKET="rplace-static"

# Set the local & S3 folder path
LOCAL_FOLDER="static"
S3_FOLDER="static"

# Upload the local folder to S3 bucket
aws s3 sync "$LOCAL_FOLDER" "s3://$S3_BUCKET/$S3_FOLDER" --region "$AWS_REGION"