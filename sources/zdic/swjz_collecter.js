module.exports = function (c) {
	var controller = c;
	var cheerio = require('cheerio');
	this.run = function (page) {
		var $ = cheerio.load(page.body);
		var swjs2 = $('div.swjs2');

		function getContent(div) {
			// 处理图片
			var imgs = div.find('img');
			imgs.each(function (i, e) {
				imgs.eq(i).text('<img src="' + e.attribs.src + '"/>');
			});

			// 处理换行
			var brs = div.find('span');
			brs.each(function (i, e) {
				brs.eq(i).text(brs.eq(i).text() + "\n");
			});

			return div.text();
		};

		var word = {
			swjz: {
				ccz: getContent(swjs2.prev()),
				dyc: getContent(swjs2.find('hr').next())
			}
		};

		$('div#swnr>a').each(function (i, e) {
			if (i === 0) {
				word.swjz.volume = e.children[0].data;
			} else if (i === 1) {
				word.swjz.section = e.children[0].data;
			};
		});
		page.data = word;
		
		return true;
	};
};