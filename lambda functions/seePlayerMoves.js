var AWS = require('aws-sdk'),
	documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
	var params = {
		KeyConditionExpression: 'gameKey = :gameKey',
		ExpressionAttributeValues: { ':gameKey': event.gameKey },
		TableName: 'q-game',
		IndexName: 'gameKey-index',
	};

	console.log(event);
	console.log(params);

	documentClient.query(params, (err, data) => {
		if (err) {
			callback(err,null);
		} else {
			callback(null, data.Items)
		}
	});
};
