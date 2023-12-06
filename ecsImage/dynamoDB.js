const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({ region: 'us-east-2' });

async function getDatetimeById(userId) {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const params = {
        TableName: "user",
        Key: marshall({ id: userId })
    };

    try {
        const { Item } = await client.send(new GetItemCommand(params));
        
        if (!Item) {
            return null;
        }

        const item = unmarshall(Item);
        return item.datetime;
    } catch (error) {
        console.error(error);
        throw new Error(`Error reading from DynamoDB: ${error}`);
    }
}

module.exports = { getDatetimeById };
