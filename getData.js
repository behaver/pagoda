var request = require('request');
var cheerio = require("cheerio");

var options = {
 			uri : "http://www.zdic.net/z/1c/js/6BD4.htm",
 			headers:{
				'X-Requested-With':'XMLHttpRequest',
				"X-Prototype-Version":"1.5.0",
				"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.155 Safari/537.36",
				"Host":"www.zdic.net",
				"Referer":"http://www.zdic.net/z/jbs/",
				"Cookie":"ASPSESSIONIDSSRADBTT=AGHFELNAKCHPPJMNGEGLJFMO; ASPSESSIONIDQAADTQSC=LHKOJJBBKJKKPMKJCEOLACKO; ASPSESSIONIDAQADQRRD=EPMKIIPAEBBMAMMLIDFMEHNB; safedog-flow-item=E5367F9BC03E71DAAFCB5A59B7E5E25F; CNZZDATA524192=cnzz_eid%3D785993820-1441433517-%26ntime%3D1441433517"
			}
 		}
 		request(options, function (error, response, body) {
	 		if (!error && response.statusCode == 200) {
	 			// console.log(body)
 				var $ = cheerio.load(body);

 				var pinyin = new Array();
 				var phonetic = new Array();
 				var radicial ;
 				var external_stoke;
 				var total_stroke;
 				var structure;
 				var making_method;
 				var variant = new Array();
 				var fivepen;
 				var cangjie;
 				var zhengma;
 				var sijiao;
 				var unicode;
 				var stroke;



	  	 		$("td.z_i_t2_py").eq(0).find("a").each(function(i,e){
						console.log($(e).text());
						pinyin.push($(e).text());
	  	  		});

	  	  		$("td.z_i_t2_py").eq(1).find("a").each(function(i,e){
						console.log($(e).text());
						phonetic.push($(e).text());
	  	  		});

	  	  		console.log($("div.z_it2_jbs").find("a").text());
				radicial =  $("div.z_it2_jbs").find("a").text();

				console.log($("div.z_it2_jbh").find("a").text());
				external_stoke =  $("div.z_it2_jbh").find("a").text();

				console.log($("div.z_it2_jzbh").find("a").text());
				total_stroke =  $("div.z_it2_jzbh").find("a").text();	

				console.log($("td.z_i_t2").eq(1).find("a").text());
				structure =  $("td.z_i_t2").find("a").text();	

				console.log($("td.z_i_t2").eq(1).contents().filter(function() { return this.nodeType === 3; }).text() );
				making_method =  $("td.z_i_t2").eq(1).contents().filter(function() { return this.nodeType === 3; }).text() ;

				$("td.z_i_t2_ytz").find("img").each(function(i,e){
					//console.log($(e).attr("src"));
					variant.push($(e).attr("src"));
				});
				$("td.z_i_t2_ytz").find("a").each(function(i,e){
					//console.log($(e).text().trim());
					variant.push($(e).text());
				});
				
				//remove null value
				for(var i = 0 ;i<variant.length;i++) {
             				if(variant[i] == "" || typeof(variant[i]) == "undefined"){
                      				variant.splice(i,1);
                     					 i= i-1;
                     			 }
				 };
				for (var i = variant.length - 1; i >= 0; i--) {
					console.log(variant[i]);
				};

				console.log($("span#z_i_t3_uno_l").text());
				radicial =  $("span#z_i_t3_uno_l").text();

						
	  	


   			}
		})