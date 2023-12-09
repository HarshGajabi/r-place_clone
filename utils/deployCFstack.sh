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