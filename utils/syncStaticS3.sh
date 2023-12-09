#!/bin/bash

if [ -z "$1" ]; then
    echo "Please provide the S3 bucket name as an argument."
    exit 1
fi

# Set the AWS region
AWS_REGION="us-east-2"

# Set the local & S3 folder path
LOCAL_FOLDER="static"
S3_FOLDER="static"
S3_BUCKET="$1"

aws s3 sync "$LOCAL_FOLDER" "s3://$S3_BUCKET/$S3_FOLDER" --region "$AWS_REGION"