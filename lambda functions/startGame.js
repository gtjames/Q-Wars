var AWS = require('aws-sdk'),
	documentClient = new AWS.DynamoDB.DocumentClient();

exports.startGame = function (event, context, callback) {
	let now = new Date().getTime().toString();
	var params = {
		Item : {
			"ts"        : now,         //  this will produce a random number
			"userName"  : event.userName,
			"gameKey"   : event.gameKey,
			"moves"     : []
		},
		TableName: 'q-game'
	};
	documentClient.put(params, function(err, data) {
		callback(err, {
			"ts"        : now,         //  this will produce a random number
			"userName"  : event.userName,
			"gameKey"   : event.gameKey
		});
	});

};
