const { SQSClient, CreateQueueCommand, ReceiveMessageCommand, DeleteMessageCommand, 
  GetQueueAttributesCommand, DeleteQueueCommand, SetQueueAttributesCommand } = require("@aws-sdk/client-sqs");
const { SNSClient, SubscribeCommand, UnsubscribeCommand } = require("@aws-sdk/client-sns");
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const { createCluster } = require('redis');
const base64 = require('base-64');

require('dotenv').config();

const snsTopicArn = process.env.SNS_TOPIC_ARN;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;

// Join a redis cluster
const cluster = createCluster({
  rootNodes: [{ url: redisHost + redisPort }]
});

// Handle Redis Cluster errors
cluster.on('error', (err) => {
  console.error('Redis Cluster Error:', err);
  process.exit(1); // Exit if cannot connect to Redis Cluster
});

// Connect to the Redis Cluster
cluster.connect().catch(err => {
  console.error('Error connecting to Redis Cluster:', err);
});

// Initialize AWS SDK clients
const sqsClient = new SQSClient({ region: 'us-east-2' });
const snsClient = new SNSClient({ region: 'us-east-2' });

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const port = 3000;

app.get('/health', (req, res) => {
  res.status(200).send({ status: 'UP', message: 'Server is running' });
});

// Endpoint to get the Redis board
app.get('/getRedisBoard', async (req, res) => {
  try {
      if (await cluster.exists('board')) {
          const rawData = await cluster.get('board');
          const encodedData = base64.encode(rawData);
          res.status(200).json({ data: encodedData });
      } else {
          res.status(404).json({ message: 'Board does not exist in Redis' });
      }
  } catch (error) {
      res.status(500).json({ message: `Error: ${error.message}` });
  }
});

// Global variables to store resource identifiers
let queueUrl = null;
let subscriptionArn = null;

// WebSocket Server
const wsServer = new WebSocket.Server({ server });

wsServer.on('connection', (webSocketClient) => {
  console.log("New client connected");
  webSocketClient.send('{ "connection" : "ok"}');
  webSocketClient.on('close', () => {
    console.log("Client disconnected");
  });
});

const broadcast = (message) => {
  if (message){
    console.log("Broadcasting message to all ws clients");
    wsServer.clients.forEach(
      client => client.send(`{ "message" : ${message}}`)
    )
  }
}

// Create SQS Queue
const createQueue = async () => {
  const queueName = `myQueue-${Math.random().toString(36).substring(7)}`; // Unique queue name
  const command = new CreateQueueCommand({ QueueName: queueName });
  try {
    const response = await sqsClient.send(command);
    return response.QueueUrl;
  } catch (error) {
    console.error("Error creating SQS Queue:", error);
  }
};

const setPermissions = async () => {
  const getAttrsCommand = new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: ['QueueArn']
  });

  let queueArn = null;
  try {
    const attrsResponse = await sqsClient.send(getAttrsCommand);
    queueArn = attrsResponse.Attributes.QueueArn;
  } catch (error) {
    console.error("Error setting permissions for SQS Queue:", error);
    return
  }

  // Set Queue Policy to allow SNS to send messages
  const policy = {
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: "*",
      Action: "sqs:SendMessage",
      Resource: queueArn,
      Condition: {
        ArnEquals: { "aws:SourceArn": snsTopicArn }
      }
    }]
  };

  const setAttrsCommand = new SetQueueAttributesCommand({
    QueueUrl: queueUrl,
    Attributes: {
      Policy: JSON.stringify(policy)
    }
  });
  await sqsClient.send(setAttrsCommand);
};

// Subscribe Queue to SNS Topic
const subscribeQueueToSNS = async (queueUrl) => {
  try {
    // Retrieve the Queue ARN
    const getAttrsCommand = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['QueueArn']
    });
    const attrsResponse = await sqsClient.send(getAttrsCommand);
    const queueArn = attrsResponse.Attributes.QueueArn;

    // Subscribe the Queue ARN to the SNS topic
    const subscribeCommand = new SubscribeCommand({
      TopicArn: snsTopicArn,
      Protocol: 'sqs',
      Endpoint: queueArn
    });
    const response = await snsClient.send(subscribeCommand);
    return response.SubscriptionArn;
  } catch (error) {
    console.error("Error subscribing SQS Queue to SNS Topic:", error);
  }
};

const parseMessage = (snsMessageBody) => {
  try {
    // Parse the message body in case it's JSON (for example, from SNS)
    const parsedBody = JSON.parse(snsMessageBody);
    return parsedBody.Message;
  } catch (err) {
    // If it's not JSON, use the original body
    return snsMessageBody
  }
}

// Poll SQS Queue and forward messages to WebSocket clients
const pollQueueAndForwardMessages = async (queueUrl) => {
  const receiveCommand = new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20
  });

  while (true) {
    try {
      const receivedMessages = await sqsClient.send(receiveCommand);
      if (receivedMessages.Messages) {
        receivedMessages.Messages.forEach(async (message) => {
          const parsedMessage = parseMessage(message.Body);
          
          console.log("Got the message from SQS: " + parsedMessage);
          broadcast(parsedMessage);

          const deleteCommand = new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle
          });
          sqsClient.send(deleteCommand); // Delete message after forwarding
        });
      }
    } catch (error) {
      console.error("Error receiving messages from SQS:", error);
    }
  }
};

// Initialize the application
const init = async () => {
  queueUrl = await createQueue();
  console.log("Created SQS successfully: " + queueUrl);
  
  await setPermissions();
  
  subscriptionArn = await subscribeQueueToSNS(queueUrl);
  console.log("Subscribed successfully: " + subscriptionArn);

  pollQueueAndForwardMessages(queueUrl);
};

init();

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// clean up function:
const deleteQueue = async () => {
  if (queueUrl) {
    const command = new DeleteQueueCommand({ QueueUrl: queueUrl });
    try {
      await sqsClient.send(command);
      console.log("SQS Queue deleted successfully.");
    } catch (error) {
      console.error("Error deleting SQS Queue:", error);
    }
  } else {
    console.log("DeleteQueue: No queueUrl found to delete");
  }
};

// Function to unsubscribe from the SNS topic
const unsubscribeFromSNS = async () => {
  if (subscriptionArn) {
    const command = new UnsubscribeCommand({ SubscriptionArn: subscriptionArn });
    try {
      await snsClient.send(command);
      console.log("Unsubscribed from SNS topic successfully.");
    } catch (error) {
      console.error("Error unsubscribing from SNS topic:", error);
    }
  } else {
    console.log("DeleteSubscription: No subscriptionArn found to unsub");
  }
};

// Handle application termination
const handleAppTermination = async (signal) => {
  console.log("Disconneting Redis Cluster...");
  cluster.disconnect();

  console.log(`Received ${signal}. Cleaning up resources...`);
  await unsubscribeFromSNS();
  await deleteQueue();
  process.exit(0);
};

// Listen for termination signals
process.on('SIGINT', handleAppTermination);  // CTRL+C
process.on('SIGTERM', handleAppTermination); // Termination signal
