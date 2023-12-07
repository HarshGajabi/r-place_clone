#!/bin/bash

# Check if the distribution ID is provided
if [ -z "$1" ]; then
    echo "Please provide the CloudFront distribution ID as a parameter."
    exit 1
fi

# Invalidate the CloudFront cache
aws cloudfront create-invalidation --distribution-id "$1" --paths "/*"

echo "Cache invalidation request sent for CloudFront distribution $1."