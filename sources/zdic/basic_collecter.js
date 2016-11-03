module.exports = function (c) {
	var controller = c;
	var cheerio = require('cheerio');
	
	this.run = function (page, callback) {
		var $ = cheerio.load(page.body);
		var word = {
			pinyins: [],
			variants: [],
			charactors: []
		};

		// 字内容采集
		word.value = $("#ziip").text().match(/“(.*)”/)[1];

		// 拼音采集
		$("td.z_i_t2_py").eq(0).find("a").each(function (i, e) {
			var pinyin = {pinyin: $(e).text()};
			// 采集pinyin2
			if ($(e).next('script').length == 1) {
				pinyin.pinyin2 = $(e).next('script').text().split("\"")[1];
			};
			word.pinyins.push(pinyin);
		});

		// 注音采集
		var phonetics = $("td.z_i_t2_py").eq(1).find("a");

		phonetics.each(function (i, e) {
			var phonetic = $(e).text();
			// 存在pinyin2
			if ($(e).next('script').length == 1) {
				var pinyin2 = $(e).next('script').text().split("\"")[1];
				for (var i = 0; i < word.pinyins.length; i++) {
					if (pinyin2 === word.pinyins[i].pinyin2) { // 在原始拼音列表中找到了该发音
						word.pinyins[i].phonetic = phonetic;
						return;
					};
				};
				// 在原始拼音列表中未找到了该发音：1、未录入该注音的pinyin；2、未录入该注音的pinyin2；3、未取到该注音的pinyin2
				// 压入新的拼音项
				word.pinyins.push({phonetic: phonetic, pinyin2: pinyin2});
			} else {
				// 压入新的拼音项
				word.pinyins.push({phonetic: phonetic});
			};
		});

		// 部首采集
		word.radical =  $("div.z_it2_jbs").find("a").text();

		// 部外笔画采集
		word.external_stroke =  $("div.z_it2_jbh").find("a").text();

		// 总笔画采集
		word.total_stroke =  $("div.z_it2_jzbh").find("a").text();

		// 结构采集
		word.structure =  $("td.z_i_t2").eq(1).find("a").text();

		// 造字方法采集
		var making = $("td.z_i_t2").eq(1).contents().filter(function () { 
			return this.nodeType === 3;
		}).text().split('；');

		word.making_method = ;
		word.making = {
			method: making[0],
			rule: making[1]
		};
		
		// 异体字采集
		$("td.z_i_t2_ytz").find("img").each(function (i, e) {
			word.variant.push($(e).attr("src"));
		});
		$("td.z_i_t2_ytz").find("a").each(function (i, e) {
			word.variant.push($(e).text());
			controller.addPage({
				url: "http://www.zdic.net" + $(e).attr("href"),
				catchers: "basic_collecter"
			});
		});

		// 无效空字符处理
		for (var i = 0 ;i < word.variant.length; i++) {
			if (word.variant[i] == "" || typeof(word.variant[i]) == "undefined") {
				word.variant.splice(i, 1);
				i = i - 1;
			};
		};

		// 统一码采集
		word.unicode =  $("td.z_i_t4_uno").contents().filter(
			function() {
				return this.nodeType === 3;
			}).text().trim();

		// 五笔采集
		word.fivepen =  $("span.diczx7").eq(0).text();

		// 仓颉码采集
		word.cangjie =  $("span.diczx7").eq(1).text();

		// 郑码采集
		word.zhengma =  $("span.diczx7").eq(2).text();

		// 四角采集
		word.sijiao =  $("span.diczx6").text();

		// 笔顺采集
		word.stroke =  $("span#z_i_t2_bis").text();

		// 移除无用题头字
		var hp = $(".tab-page p strong").parent().filter(function () {
			return this.children.length === 1;
		}).remove();
		
		// 所有详细字义中拼音所在的span				
		var flags = $("div.tab-page .dicpy").filter(function (i, e) {
			return $(e).parent().contents().length === 1
		});

		// 装内容的p标签的class
		var content_p_class = flags.eq(0).parent().attr("class");

		// 遍历采集每个发音的字义
		flags.each(function (i, e) {
			// 详细字义中的拼音，索引0为pinyin，索引1为注音，索引2为pinyin2
			var pinyin_z = $(e).contents().filter(function () { 
				return this.nodeType === 3; 
			}).text().split(" ");

			if ($(e).find('script').length === 1) { // 存在pinyin2
				pinyin_z.push($(e).find('script').text().split('"')[1]);
			};

			// 装拼音的标识P标签
			var p = $(e).parent();

			// 拼音下字义的采集
			meanings = [];
			while((p = p.next()) && p.is( '.' + content_p_class)) {
				var meaning = '';
				var contents = p.contents()
				contents.each(function (i, e){
					if (this.nodeType === 3) {
						meaning += contents.eq(i).text();
					} else if (this.nodeType === 1) {
						if (e.name === 'span') {
							meaning += contents.eq(i).text() ? contents.eq(i).text() : contents.eq(i).html();
						} else {
							meaning += $('<div>').append(contents.eq(i)).html();
						}
					}
				});
				meanings.push(meaning);
			};

			// 将数据装配进入拼音数组
			for (var i = 0; i < word.pinyins.length; i++) {
				// if (word.pinyins[i].pinyin !== undefined) {};
				if (word.pinyins[i].pinyin === pinyin_z[0] && word.pinyins[i].pinyin !== undefined) { // 相同非空拼音
					word.pinyins[i].meanings = meanings;
					if (word.pinyins[i].phonetic === undefined && pinyin_z[1] !== undefined) word.pinyins[i].phonetic = pinyin_z[1];
					if (word.pinyins[i].pinyin2 === undefined && pinyin_z[2] !== undefined) word.pinyins[i].pinyin2 = pinyin_z[2];
				} else if (word.pinyins[i].phonetic === pinyin_z[1] && word.pinyins[i].phonetic !== undefined) {
					word.pinyins[i].meanings = meanings;
					if (word.pinyins[i].pinyin === undefined && pinyin_z[0] !== undefined) word.pinyins[i].pinyin = pinyin_z[0];
					if (word.pinyins[i].pinyin2 === undefined && pinyin_z[2] !== undefined) word.pinyins[i].pinyin2 = pinyin_z[2];
				} else if (word.pinyins[i].pinyin2 === pinyin_z[2] && word.pinyins[i].pinyin2 !== undefined) {
					word.pinyins[i].meanings = meanings;
					if (word.pinyins[i].pinyin === undefined && pinyin_z[0] !== undefined) word.pinyins[i].pinyin = pinyin_z[0];
					if (word.pinyins[i].phonetic === undefined && pinyin_z[1] !== undefined) word.pinyins[i].phonetic = pinyin_z[1];
				} else {
					continue;
				}
				return;
			};

			// 拼音数组中不含有该发音
			var pinyin = {meanings: meanings};
			if (pinyin_z[0] !== undefined) pinyin.pinyin = pinyin_z[0];
			if (pinyin_z[1] !== undefined) pinyin.phonetic = pinyin_z[1];
			if (pinyin_z[2] !== undefined) pinyin.pinyin2 = pinyin_z[2];
			word.pinyins.push(pinyin);
		});

		// 繁体字采集
		word.trad_word = $("span#ft").find("a").text();

		// 简体字采集
		word.simp_word = $("span#jt").find("a").text();

		// 字体集采集
		$("div#ziip").find("a[TARGET=_blank]").find("img").each(function (i, e) {
			word.charactors.push($(e).attr("title"));
		});

		// page.data = word;


		// 添加本字相关信息页面采集
		$('div.tab-row>h2>a').each(function (i, e) {
			var a = $(e);
			if (a.text() === '详细解释') controller.addPage({
				url: 'http://www.zdic.net/z/jbs/' + a.attr('href'),
				catchers: 'detailed_collecter',
				bind: {}
			});
			else if (a.text() === '康熙字典') controller.addPage({
				url: 'http://www.zdic.net/z/jbs/' + a.attr('href'),
				catchers: 'kangxi_collecter',
				bind: {}
			});
			else if (a.text() === '说文解字') controller.addPage({
				url: 'http://www.zdic.net/z/jbs/' + a.attr('href'),
				catchers: 'swjz_collecter', 
				bind: {}
			});
		});

		return true;
	};
};