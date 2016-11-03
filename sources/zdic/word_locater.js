module.exports = function (c) {
	var controller = c;
	var cheerio = require("cheerio");

	this.run = function (page) {
		// console.log('in word_locater');
		var $ = cheerio.load(page.body);

		// 获取所有字链接
		$("li a").each(function (i, e) {
			controller.addPage({
				url: "http://www.zdic.net" + $(e).attr("href"),
				catchers: "basic_collecter"
			});
		});

		$(".Paginator a").each(function (i, e) {
			var mark = $(e).attr("onclick").split("'")[1];
			// console.log(mark);
			controller.addPage({
				url: "http://www.zdic.net/z/jbs/bs/?bs=" + mark,
				catchers: "word_locater"
			});
		});

		return true;
	}
};