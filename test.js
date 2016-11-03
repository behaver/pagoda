// var test = require('./index.js');
// test.load('./sources/zdic');
// var t = require('./sources/zdic/basic_processor.js');
// t = new t();
// t.run();
// t.run();
// t.run();
// 
var m = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/test';
m.connect(url, function (err, db) {
	db.collection('word_collect_log', {safe: true}, function (err, collection) {
		if (!err) {
			collection.find({}, {skip: 2, limit: 400}).toArray(function (err, r) {
				console.log(r.length);
			});
		};
	});
});
// var server = new m.Server('localhost', 27017, {auto_reconnect: true});
// var db = new m.Db('test', server, {safe: true});
// db.open(function (err, db) {
// 	if (!err) {
// 		console.log('connect db');
		// db.collection('word_collect_log', {safe: true}, function (err, collection) {
		// 	if (!err) {
		// 		// collection.count(function (err, r) {
		// 		// 	console.log(r);
		// 		// });
		// 		collection.find({}, {skip:2, limit: 400}).toArray(function (err, r) {
		// 			console.log(r.length);
		// 		});
		// 	};
		// });
// 	};
// });