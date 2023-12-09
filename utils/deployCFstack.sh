#!/bin/bash

if [ -z "$1" ]; then
    echo "Stack name is required."
    exit 1
fi

stack_name="$1"
template_file="${2:-service.yml}"

aws cloudformation create-stack \
    --stack-name "$stack_name" \
    --template-body "file://$template_file" \
    --capabilities CAPABILITY_IAM

echo "Stack creation in progress..."
aws cloudformation wait stack-create-complete --stack-name "$stack_name"
stack_status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query "Stacks[0].StackStatus" --output text)

if [ "$stack_status" = "CREATE_COMPLETE" ]; then
    echo "Stack creation succeeded."
    stack_outputs=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query "Stacks[0].Outputs")
    static_bucket_name=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey=="StaticBucketName") | .OutputValue')
    cloudfront_url=$(echo "$stack_outputs" | jq -r '.[] | select(.OutputKey=="CloudFrontURL") | .OutputValue')
    if [ -n "$static_bucket_name" ]; then
        echo "Static bucket name: $static_bucket_name"
        utils/syncStaticS3.sh "$static_bucket_name"
    else
        echo "Static bucket name not found in stack outputs, not syncing."
    fi
    if [ -n "$cloudfront_url" ]; then
        echo "Deployment URL: $cloudfront_url"
    else
        echo "CloudFront URL not found in stack outputs."
    fi
else
    echo "Stack creation failed. Status: $stack_status"
fi