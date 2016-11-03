module.exports = function (c) {
	var controller = c;
	var cheerio = require('cheerio');
	this.run = function (page) {
		var $ = cheerio.load(page.body);
		var word = {
			value: $("#ziip").text().match(/“(.*)”/)[1], 
			kangxi: {}
		};
		var info = $('#kxnr').children().eq(0).text();

		// 0-全部；1-集名；2-部名；3-总笔画；4-部外笔画
		var sections = info.match(/【([^】]*)】.*【([^】]*)】[^0-9]*([0-9]*)[^0-9]*([0-9]*)/);
		word.kangxi.volume = sections[1];
		word.kangxi.section = sections[2];
		word.kangxi.stroke = {
			total: sections[3],
			external: sections[4]
		};

		// 获取内容区
		var content_div = $('#kxnr>img').next();

		// 处理图片
		var imgs = content_div.children('img');
		imgs.each(function (i, e) {
			imgs.eq(i).text('<img src="' + e.attribs.src + '"/>');
		});

		// 处理换行
		var brs = content_div.children('br');
		brs.each(function (i, e) {
			brs.eq(i).text('\n');
		});

		word.kangxi.content = content_div.text();
		page.data = word;
	};
};