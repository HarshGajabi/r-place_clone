import boto3
import json
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    size = 1000
    
    # Extract parameters
    x = event.get('x')
    y = event.get('y')
    color = event.get('color')

    # Validate input
    if not all(isinstance(i, int) for i in [x, y, color]):
        return {'statusCode': 400, 'body': json.dumps({'message': 'Inputs must be integers'})}
        
    # Check if x and y are within the board
    if not (0 <= x < size and 0 <= y < size):
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'x or y out of bounds'})
        }
    
    # Check if color is not more than 4 bits (less than 16)
    if not (0 <= color < 16):
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Invalid color'})
        }

    # Initialize a DynamoDB client
    dynamodb = boto3.resource('dynamodb')

    # Reference to the DynamoDB table
    table = dynamodb.Table('board')

    # Attempt to write to the DynamoDB table
    try:
        response = table.put_item(Item={'x': x, 'y': y, 'color': color})
        
        # Check if put operation was acknowledged
        if response.get('ResponseMetadata', {}).get('HTTPStatusCode') == 200:
            return {'statusCode': 200, 'body': 'Data written successfully'}
        else:
            return {'statusCode': 500, 'body': 'Unknown error occurred during write operation'}

    except ClientError as e:
        return {'statusCode': 500, 'body': f'Error writing to DynamoDB: {e}'}
