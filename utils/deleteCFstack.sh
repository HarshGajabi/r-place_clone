#!/bin/bash

# Check if stack name is provided as an argument
if [ $# -eq 0 ]; then
    echo "Please provide the stack name as an argument."
    exit 1
fi
stack_name=$1
# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name $stack_name
echo "Stack deletion in progress..."
# Wait for stack deletion to complete
aws cloudformation wait stack-delete-complete --stack-name $stack_name
echo "Stack deletion complete."