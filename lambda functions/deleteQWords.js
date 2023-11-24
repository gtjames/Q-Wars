var AWS = require('aws-sdk'),
	documentClient = new AWS.DynamoDB.DocumentClient();

exports.deleteQword = (event, context, callback) => {
	var params = {
		Key: { userName: event.userName, gameKey: event.gameKey },
		TableName : 'q-game'
	};

	documentClient.scan(params, (err, data) => {
		if (err)    callback(err,null);

		documentClient.delete(params, (err, data) => {
			if (err)    callback(err,null);

			params = {
				Item : {
					"ts"        : data.ts,
					"userName"  : data.userName,
					"gameKey"   : data.gameKey,
					"moves"     : data.moves
				},
				TableName: 'q-archive'
			};
			documentClient.put(params, function(err, data) {
				if (err)    callback(err,null);
				callback(err, {
					"id"        : data.ts,
					"userName"  : data.userName,
					"gameKey"   : data.gameKey,
					"moves"     : data.moves
				});
			});
		});
	});
};
