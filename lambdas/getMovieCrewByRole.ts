import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { MovieCrewRole } from "../shared/types"; 


export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const ddbDocClient = createDDbDocClient();
  const role = event.pathParameters?.role;
  const movieId = event.pathParameters?.movieId ? parseInt(event.pathParameters.movieId) : undefined;

  console.log(`Fetching crew member for role ${role} and movieId ${movieId}`);

  if (!role || !movieId) {
    console.error("Missing or invalid parameters");
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing or invalid parameters" }),
    };
  }

  try {
    const queryCommandInput = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "movieId = :movieId and crewRole = :role",
      ExpressionAttributeValues: {
        ":movieId": movieId,
        ":role": role,
      },
    };

    const commandOutput = await ddbDocClient.send(new QueryCommand(queryCommandInput));
    
    if (!commandOutput.Items || commandOutput.Items.length === 0) {
      console.error("Crew member not found for the specified role and movie");
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Crew member not found for the specified role and movie" }),
      };
    }

    const crewMembers = commandOutput.Items as MovieCrewRole[];
    const names = crewMembers.map(crew => crew.names).join(", ");

    return {
      statusCode: 200,
      body: JSON.stringify({ role, names }),
    };
  } catch (error) {
    console.error('Error fetching movie crew by role:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', error }),
    };
  }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
      wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
  }