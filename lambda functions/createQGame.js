var AWS = require('aws-sdk'),
	documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = function (event, context, callback) {
	let now = new Date().getTime().toString();
	var params = {
		Item : {
			"ts"        : now,
			"userName"  : event.userName,
			"gameKey"   : event.gameKey,
			"moves"     : []
		},
		TableName: 'q-game'
	};

	let userName = "gtjames";
	if (event.requestContext !== undefined)
		userName = event.requestContext.authorizer.claims['cognito:username'];

	documentClient.put(params, function(err, data) {
		callback(err, {
			"ts"        : now,
			"userName"  : event.userName,
			"gameKey"   : event.gameKey,
			"moves"     : [],
			"userName"  : userName
		});
	});

};
