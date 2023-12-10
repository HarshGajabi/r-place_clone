import redis
import os
import urllib.request

from redis.cluster import RedisCluster

def lambda_handler(event, context):
    # application_name = "place"
    # environment_name = "dev"
    # configuration_name = "place"
    # url = f'http://localhost:2772/applications/{application_name}/environments/{environment_name}/configurations/{configuration_name}'
    # config = urllib.request.urlopen(url).read()
    # print(config)
    
    # Redis configuration
    redis_host = os.environ['REDIS_HOST']
    redis_port = int(os.environ['REDIS_PORT'])  # Ensure port is an integer

    # Read row and column size from event object, use default if not provided
    size = event.get('size', 1000)

    # Calculate the number of bits needed
    total_bits = size * size * 4  # assuming 4 bits per tile 

    # Connect to the Redis cluster
    try:
        # Initialize Redis Cluster client
        redis_client = RedisCluster(host=redis_host, port=redis_port, decode_responses=True)
        
        # Check if the 'board' key exists
        if not redis_client.exists('board'):
            # If not, create one
            redis_client.setbit('board', total_bits-1, 0)
            message = 'Board initialized and connected to Redis successfully.'
        else:
            message = 'Board already exists.'
    except Exception as e:
        message = f'Error connecting to Redis: {str(e)}'

    return {
        'statusCode': 200,
        'body': json.dumps({'message': message})
    }
