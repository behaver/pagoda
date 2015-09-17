module.export = function (c) {
	var controller = c;
	
	this.run = function (body) {
		var cheerio = require("cheerio");
		
		var $ = cheerio.load(body);
		var word = {
			pinyins: [],
			variant: [],
			charactor: [],
		};

		// 拼音采集
		$("td.z_i_t2_py").eq(0).find("a").each(function (i, e) {
			word.pinyins.push({
				pinyin: $(e).text();
			});
		});

		// 注音采集
		$("td.z_i_t2_py").eq(1).find("a").each(function (i, e) {
			word.pinyins[i].phonetic = $(e).text();
		});

		// 部首采集
		word.radicial =  $("div.z_it2_jbs").find("a").text();

		// 部外笔画采集
		word.external_stroke =  $("div.z_it2_jbh").find("a").text();

		// 总笔画采集
		word.total_stroke =  $("div.z_it2_jzbh").find("a").text();

		// 结构采集
		word.structure =  $("td.z_i_t2").find("a").text();

		// 造字方法采集
		word.making_method =  $("td.z_i_t2").eq(1).contents().filter(
			function () { 
				return this.nodeType === 3; 
			}).text();

		// 异体字采集
		$("td.z_i_t2_ytz").find("img").each(function (i, e) {
			word.variant.push($(e).attr("src"));
		});
		$("td.z_i_t2_ytz").find("a").each(function (i, e) {
			word.variant.push($(e).text());
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
			}).text();

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

		// 详细字义采集
		$("div.tab-page").find("h3").remove();
		$("hr.dichr").prev().remove();
		$("hr.dichr").next().remove();
						
		var flag = $("div.tab-page").find("script");

		$("div.tab-page").find("p").each(function (i, e) {
			if ($(e).attr("class") != flag.parent().parent().attr("class")) $(this).remove();
		});

		flag.each(function (i, e) {
			// 详细字义中的拼音
			var pinyin_z = $(e).parent().contents().filter(function() { 
				return this.nodeType === 3; 
			}).text().split(" ")[0];

			var parent = $(e).parent().parent();

			for (var i = 0; i < word.pinyins.length; i++) {
				if (word.pinyins[i].pinyin == pinyin_z) {
					// 拼音2的采集
					word.pinyins[i].pinyin2 = $(e).text().split("\"")[1];
					// 拼音下字义的采集
					word.pinyins[i].meaning = [];
					while((parent = parent.next()) && parent.get(0).tagName != "hr") {
						word.pinyins[i].meaning.push(parent.text());
					};
				};
			};
		});

		// 繁体字采集
		word.trad_word = $("span#ft").find("a").text();

		// 简体字采集
		word.simp_word = $("span#jt").find("a").text();

		// 字体集采集
		$("div#ziip").find("a[TARGET=_blank]").find("img").each(function (i, e) {
			word.charactor.push($(e).attr("title"))
		});

		controller.data = word;
		return true;
	};
};