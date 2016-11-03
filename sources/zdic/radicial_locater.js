module.exports = function (c) {
	var controller = c;
	var cheerio = require("cheerio");

	this.run = function (page) {
		// console.log('in radicial_locater');
		var $ = cheerio.load(page.body);

		// 获取所有部首展开链接
		$("div.bsul").each(function (i, e) {
			$(e).find("a").each(function (i, e) {
				// 添加页面
				controller.addPage({
					url: "http://www.zdic.net/z/jbs/bs/?bs=" + $(e).attr("onclick").split("'")[1],
					catchers: "word_locater"
				});
			});
		});

		return true;
	};
};