/**
 * 基本信息数据处理器
 * @authors Stalker (qianxing@yeah.net)
 * @date    2015-09-13 14:35:06
 * @version 0.1.0
 */

module.exports = function(c) {
	var controller = c;
	var mysql = require('mysql');
	var conn = mysql.createConnection({
		host: 'localhost',
		port: 3306,
		user: 'pagoda',
		password: 'collectsuccess',
		database: 'sinology'
	});
	conn.connect();
	this.run = function (page, callback) {
		page.data.pinyins;

		// 查询字结构
		var select_structure = "SELECT `id` FROM `word_structure` WHERE `name` = '" + page.data.structure + "';";
		// 插入字结构
		var insert_structure = "INSERT INTO `word_structure` (`name`) VALUES ('" + page.data.structure + "');";
		// 字结构ID
		var wsid = ;

		// 查询字结构
		var select_making_method = "SELECT `id` FROM `word_making_method` WHERE `name` = '" + page.data.making.method + "';";
		// 插入造字方法
		var insert_making_method = "INSERT INTO `word_making_method` (`name`) VALUES ('" + page.data.making.method + "');";
		// 造字方法ID
		var wmid = ;

		// 查询字主表sql
		var select_word = "SELECT `id` FROM `word` WHERE `value` = '" + page.data.value + "';";
		// 插入字主表sql
		var insert_word = "INSERT INTO `word` (`value`, `unicode`, `structure`, `making_method`, `making_rule`, `stroke`, `total_stroke`, `external_stroke`) VALUES ('" + 
			page.data.value + "', '" + page.data.unicode + "', " + wsid + ", " + wmid + ", '" + page.data.making.rule + "', '" +
			page.data.stroke + "', " + page.data.total_stroke + ", " + page.data.external_stroke ");";
		// 字id
		var wid = ;
		// 更新字主表sql
		var update_word = "UPDATE FROM `word` SET `unicode` = '" + page.data.unicode + 
			"', `structure` = " + wsid + 
			", `making_method` = " + wmid + 
			", `making_rule` = '" + page.data.making.rule + 
			"', `stroke` = '" + page.data.stroke + 
			"', `total_stroke` = " + page.data.total_stroke + 
			", `external_stroke` = " + page.data.external_stroke + " WHERE `id` = " + wid + ";";

		// 插入输入法编码sql
		var insert_input_code = "INSERT INTO `word_input_code` (`id`,`fivepen`,`cangjie`,`zhengma`,`sijiao`) VALUES (" +
			wid + ",'" + page.data.fivepen + "','" + page.data.cangjie + "','" + page.data.zhengma + "','" + page.data.sijiao + "');";
		
		// 查询部首字sql
		var select_radical = "SELECT `id` FROM `word` WHERE `value` = '" + page.data.radical + "';";
		// 插入部首字sql
		var insert_radical = "INSERT INTO `word` (`value`) VALUES ('" + page.data.radical + "');";
		// 部首字id
		var rid = ;
		// 插入部首sql
		var insert_word_radical = "INSERT INTO `word_radical` (`word`, `radical`) VALUES (" + wid + ", " + rid + ");";

		// 插入异体字信息
		for (var i = 0; i < page.data.variants.length; i++) {
			page.data.variants[i];
			// 查询异体字
			var select_variant_word = "SELECT `id` FROM `word` WHERE `value` = '" + page.data.variants[i] + "';";
			// 插入异体字
			var insert_variant_word = "INSERT INTO `word` (`value`) VALUES ('" + page.data.variants[i] + "');";
			var vid = ;
			// 插入字-异体字关系
			var insert_variant = "INSERT INTO `variant` (`source`, `target`) VALUES (" + wid + ", " + vid + ");";
		};

		// 插入字符集信息
		for (var i = 0; i < page.data.charactors.length; i++) {
			
			// 查询字集sql
			var select_charactor = "SELECT `id` FROM `charactor` WHERE `name` = '" + page.data.charactors[i] + "';";
			// 插入字集sql
			var insert_charactor = "INSERT INTO `charactor` (`name`) VALUES ('" + page.data.charactors[i] + "');";
			// 字符集id
			var cid = ;

			// 插入字-字符集sql
			var insert_word_charactor = "INSERT INTO `word_charctor` (`word`, `charactor`) VALUES (" + wid +", " + cid + ");";
		};

		// 插入拼音项
		for (var i = 0; i < page.data.pinyins.length; i++) {
			// 查询拼音sql
			var select_pinyin = "SELECT `id` FROM `pinyin` WHERE `value` = '" + page.data.pinyins[i].pinyin + "';";
			// 插入拼音sql
			var insert_pinyin = "INSERT INTO `pinyin` (`value`, `value2`, `phonetic`) VALUES ('" + 
				page.data.pinyins[i].pinyin + "', '" + 
				page.data.pinyins[i].pinyin2 + "', '" + 
				page.data.pinyins[i].phonetic + "');";
			// 拼音id
			var pid = ;

			// 插入字-拼音表
			var insert_word_pinyin = "INSERT INTO `word_pinyin` (`word`,`pinyin`) VALUES (" + wid + ", " + pid + ");";
			// 字拼音id
			var wpid = ;

			// 插入拼音字义
			for (var j = 0; j < page.data.pinyins[i].meanings.length; j++) {
				var insert_meaning = "INSERT INTO `meaning` (`word_pinyin`, `content`) VALUES (" + wpid + ", '" + page.data.pinyins[i].meanings[j] + "');"
			};
		};

		// 简体字关联
		
		// 繁体字关联
		
		conn.query("select * from word", function (r) {
			console.log(2);
		});
	}
	// conn.end();
};