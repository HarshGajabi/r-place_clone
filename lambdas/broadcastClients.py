import json
import boto3
import os

# Your AWS SNS topic ARN should be stored in an environment variable
sns_topic_arn = os.environ['SNS_TOPIC_ARN']

def lambda_handler(event, context):
    try:
        # Retrieve and validate fields from the event
        message_type = event.get('type')
        x = event.get('x')
        y = event.get('y')
        color = event.get('color')
        
        size = 1000
        
        if message_type not in ['set', 'timeout']:
            return {'statusCode': 400, 'body': json.dumps({'message': 'Error: Type must be "set" or "timeout".'})}

        if not all(isinstance(i, int) for i in [x, y, color]):
            return {'statusCode': 400, 'body': json.dumps({'message': 'Inputs must be integers'})}
            
        if not (0 <= x < size and 0 <= y < size):
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'x or y out of bounds'})
            }
        
        if not (0 <= color < 16):
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Invalid color'})
            }

        # Create message
        message = json.dumps({'type': message_type, 'x': x, 'y': y, 'color': color})

        # Create a SNS client
        sns_client = boto3.client('sns')

        # Publish message to SNS topic
        response = sns_client.publish(
            TopicArn=sns_topic_arn,
            Message=message
        )

        # Check if publishing was successful
        if response.get('MessageId'):
            return {'statusCode': 200, 'body': json.dumps({'message': 'Message published successfully.'})}
        else:
            return {'statusCode': 500, 'body': json.dumps({'message': 'Error: Failed to publish message.'})}

    except Exception as e:
        return {'statusCode': 500, 'body': json.dumps({'message': f'Error: {str(e)}'})}


