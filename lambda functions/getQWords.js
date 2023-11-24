var AWS = require('aws-sdk'),
	documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
	console.log(event);
	console.log(context);
	var params = {
		KeyConditionExpression: 'userName = :userName',
		ExpressionAttributeValues: { ':userName': event.userName },
		TableName: 'q-friends',
	};

	console.log(params);

	documentClient.query(params, (err, data) => {
		if (err) {
			callback(err,null);
		} else {
			callback(null, { data: data.Items, params: params, event: event});
		}
	});
};
