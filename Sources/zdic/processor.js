/**
 * 
 * @authors Stalker (qianxing@yeah.net)
 * @date    2015-09-13 14:35:06
 * @version 0.1.0
 */

module.export = function(data, callback) {
  var mysql = require('mysql');
  var conn = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'ttss',
    database: 'sinology'
  });
  conn.connect();
  conn.query(sql, callback);
  conn.end;
};