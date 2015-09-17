module.export = function (c) {
	var controller = c;

	this.run = function (body) {
		var cheerio = require("cheerio");
		$ = cheerio.load(body);

		// 获取所有部首展开链接
		$("div.bsul").each(function (i, e) {
			$(e).find("a").each(function (i, e) {
				// 添加页面
				controller.addPage({
					url: "http://www.zdic.net/z/jbs/bs/?bs=" + $(e).attr("onclick").substr(-12,9),
					catchers: "word_locater"
				});
			});
		});

		return true;
	};
};