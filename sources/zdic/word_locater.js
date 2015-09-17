module.export = function (c) {
	var controller = c;

	this.run = function (body) {
		var cheerio = require("cheerio");
		$ = cheerio.load(body);

		// 获取所有字链接
		$("a").each(function (i, e) {
			controller.addPage({
				url: $(e).attr("href"),
				catchers: "collecter"
			});
		});

		return true;
	}
};