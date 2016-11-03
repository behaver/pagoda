module.exports = function (c) {
	var controller = c;
	var cheerio = require('cheerio');
	this.run = function (page) {
		var $ = cheerio.load(page.body);
		var word = {
			pinyins: []
		};

		// 移除无用题头字
		var hp = $(".tab-page p strong").parent().filter(function () {
			return this.children.length === 1;
		}).remove();

		// 字内容采集
		word.value = $("#ziip").text().match(/“(.*)”/)[1];

		// 通过tab-page下所有含有拼音的P标签，获取词性作为标识点。
		var flags = $(".tab-page .dicpy").parent().attr("class", 'py').next('p');

		flags.each(function (i, e) {
			// 在此标识点下采集字义
			if (this.children && this.children[0] && this.children[0].data) {
				var nature = this.children[0].data.match(/〈(.*)〉/);
			} else {
				return;
			};
			if (nature && nature[1] !== undefined) { // 匹配到标识字性
				var nature = {value: nature[1], explains: []};
				var p = flags.eq(i);
				var p_class = p.attr('class');
				p.attr('class', 'nature');

				// 获取词性所在拼音
				var pinyin = p.prev().find('.dicpy').text();

				// 采集和处理详解内容
				while ((p = p.next()) && p.is('p.' + p_class)) {
					var content = p.text().split('——');
					if (content[1] != undefined) { // 内容符合例句格式
						var example = {content: content[0].trim()};
						// 索引：0-全部；1-作者；2-出处；4-注。
						var items = content[1].match(/([^《]*)?《([^》]*)》(。?(.*))?/);
						if (items) { // 规范格式
							if (items[1]) { // 存在作者信息
								var author = items[1].split('·');
								if (author.length === 1) {
									example.author = {name: author[0].trim()};
								} else if (author.length === 2) {
									example.author = {name: author[1].trim(), times: author[0].trim()};
								} else {
									throw new Error('未知的作者格式。');
								};
							};
							example.source = items[2].split('·');
							if (content[4]) example.note = content[4].trim();
						} else { // 未知格式，加入注中。
							example.note = content[1].trim();
						}
						explain.examples.push();
					} else { // 内容是详解
						var explain = {content: content[0].trim(), examples: []};
						nature.explains.push(explain);
					};
				};			

				
				// 查询该拼音是否录入数组，并找到该索引。
				var index = -1;
				for (var i = 0; i < word.pinyins.length; i++) {
					if (word.pinyins[i].pinyin === pinyin) {
						index = i;
					};
				};

				if (index >= 0) { // 数组中存在该拼音
					// 录入该词性信息
					if (word.pinyins[index].natures === undefined) word.pinyins[index].natures = [];
					word.pinyins[index].natures.push(nature);
				} else { // 数组中不存在该拼音
					word.pinyins.push({
						pinyin: pinyin,
						natures: [nature]
					});
				};
			};
		});
	};
};