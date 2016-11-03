"INSERT INTO `` (``) VALUES ();"
"SELECT `id` FROM `` WHERE `name` = '" + + "';"
for (var i = 0; i < page.data.pinyins.length; i++) {
	page.data.pinyins[i];
	for (var j = 0; j < page.data.pinyins[i].natures.length; j++) {
		// 查询词性
		var select_nature = "SELECT `id` FROM `nature` WHERE `name` = '" + page.data.pinyins[i].natures[j].value + "';";
		// 插入词性
		var insert_nature = "INSERT INTO `nature` (`name`) VALUES ('" + page.data.pinyins[i].natures[j].value + "');";
		// 词性id
		var nid = ;

		// 插入字-拼音-词性关系
		var insert_word_pinyin_nature = "INSERT INTO `word_pinyin_nature` (`word_pinyin`, `nature`) VALUES (" + wpid + ", " + nid + ");";
		// 字-拼音-词性id
		var wpnid = ;
		for (var k = 0; k < page.data.pinyins[i].natures[j].explains.length; k++) {
			var insert_explaination = "INSERT INTO `explaination` (`word_pinyin_nature`, `content`) VALUES (" + wpnid +  ", '" + page.data.pinyins[i].natures[j].explains[k].content + "');";
			var epid = ;
			page.data.pinyins[i].natures[j].explains[k];

			for (var l = 0; l < page.data.pinyins[i].natures[j].explains[k].examples.length; l++) {
				page.data.pinyins[i].natures[j].explains[k].examples[l];
				var select_example = "SELECT `example`.`id`,`ancient_section`.`ancient` FROM `example` LEFT JOIN `ancient_section` ON (`example`.`id` = `ancient`.`id`) WHERE `example`.`content` = '" + 
					page.data.pinyins[i].natures[j].explains[k].examples[l].content + "';";
				// 古籍章节ID
				var asid = ;
				var select_ancient_section = "SELECT `title` FROM `ancient_section` WHERE `id` = " + asid + ";";

				for (var i = 0; i < Things.length; i++) {
					var select_ancient_section = "SELECT `id` FROM `ancient_section` WHERE `title` = '" + page.data.pinyins[i].natures[j].explains[k].examples[l]. + "';";
					Things[i]
				};
				var insert_example = "INSERT INTO `` (``) VALUES ();";
				var eaid = ;
			};
		};
	};
};