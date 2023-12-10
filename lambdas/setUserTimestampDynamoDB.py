import boto3
import dateutil.parser
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    # Extract parameters
    user_id = event.get('id')
    datetime = event.get('datetime')

    # Validate datetime format (ISO 8601)
    try:
        parsed_datetime = dateutil.parser.isoparse(datetime)
    except ValueError:
        return {'statusCode': 400, 'body': 'Invalid datetime format. Must be ISO 8601.'}

    # Initialize a DynamoDB client
    dynamodb = boto3.resource('dynamodb')

    # Reference to the DynamoDB table
    table = dynamodb.Table('user')

    # Attempt to write to the DynamoDB table
    try:
        response = table.put_item(Item={'id': user_id, 'datetime': parsed_datetime.isoformat()})
        
        # Check if put operation was acknowledged
        if response.get('ResponseMetadata', {}).get('HTTPStatusCode') == 200:
            return {'statusCode': 200, 'body': 'Data written successfully'}
        else:
            return {'statusCode': 500, 'body': 'Unknown error occurred during write operation'}

    except ClientError as e:
        return {'statusCode': 500, 'body': f'Error writing to DynamoDB: {e}'}
