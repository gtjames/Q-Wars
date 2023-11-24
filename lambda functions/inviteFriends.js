var AWS = require('aws-sdk'),
	documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = function (event, context, callback) {
	let now = new Date().getTime().toString();

	event.email.forEach(email => {
		let params = {
			Item : {
				"ts"        : now,
				"userName"     : email,
				"gameKey"   : event.gameKey,
				"word"      : event.word,
			},
			TableName: 'q-friends'
		};

		documentClient.put(params, (err, data) => {
			if (err)    console.log(err);
			else console.log(email)
		});

		params = {
			Item : {
				"ts"        : now,
				"userName"  : email,
				"gameKey"   : event.gameKey,
				"word"      : event.word,
				"moves"     : []
			},
			TableName: 'q-game'
		};
		documentClient.put(params, (err, data) => {
			callback(err, {
				"ts"        : now,
				"userName"  : email,
				"gameKey"   : event.gameKey,
				"word"      : event.word,
				"moves"     : []
			});
		});
	});
};
