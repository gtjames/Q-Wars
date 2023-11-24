var AWS = require('aws-sdk'),
	documentClient = new AWS.DynamoDB.DocumentClient();

exports.updateQword = (event, context, callback) => {
	var params = {
		Key                         : { userName: event.userName, gameKey: event.gameKey },
		UpdateExpression            : 'set #moves = list_append(#moves, :move)',
		ExpressionAttributeNames    : { '#moves': 'moves' },
		ExpressionAttributeValues   : { ':move':  [event.move] },
		TableName                   : 'q-game'
	};
	console.log(event);
	console.log(params);

	documentClient.update (params, (err, data) => {
		if (err) {
			callback(err,null);
		} else {
			callback(null, { "userName": event.userName, "move": event.move })
		}
	});
};
