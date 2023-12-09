const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

// Initialize Lambda Client
const lambdaClient = new LambdaClient({ region: 'us-east-2' });

/**
 * Invokes a given Lambda function with specified payload.
 * 
 * @param {Object} payload - The payload to send to the Lambda function.
 * @param {string} lambdaName - The name of the Lambda function to invoke.
 * @returns {Promise<Object>} - The response from the Lambda function.
 */
async function invokeLambda(lambdaName, payload) {
    try {
        const params = {
            FunctionName: lambdaName,
            Payload: Buffer.from(JSON.stringify(payload)),
        };

        const command = new InvokeCommand(params);
        const response = await lambdaClient.send(command);

        if (response.FunctionError) {
            throw new Error(`Error from Lambda: ${response.FunctionError}`);
        }

        return JSON.parse(new TextDecoder().decode(response.Payload));
    } catch (error) {
        console.error("Error invoking Lambda function:", error);
    }
}

async function setBoardPixelDynamoDB(x, y, color) {
    return invokeLambda('setBoardPixelDynamoDB', {x, y, color});
}

async function boardcastClients(x, y, color) {
    return invokeLambda('boardcastClients', {x, y, color, type: "set"});
}

async function setUserTimestampDynamoDB(id, timestamp) {
    return invokeLambda('setUserTimestampDynamoDB', {id, datetime: timestamp});
}

module.exports = {setBoardPixelDynamoDB, boardcastClients, setUserTimestampDynamoDB};
