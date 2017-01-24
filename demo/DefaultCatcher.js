module.exports = function (c) {
    var controller = c;
    var cheerio = require('cheerio');
    
    this.run = function (document, bind, callback) {
        var $ = cheerio.load(document);
        var data = {};

        // do something...

        return data;
    };
};