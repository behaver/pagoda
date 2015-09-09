var request = require('request');
var cheerio = require("cheerio");
  

 function getAttr(uri){
 	var options = {
 		url:uri,
 		headers:{
 			'X-Requested-With':null
 		}
 	};
 	
 	request(options,function(error,response,body){
 			if (!error && response.statusCode == 200) {
 		 		$ = cheerio.load(body);
 		 		$("div.bsul").each(function(j,e){
					$(e).find("a").each(function(i,e){
						var str = $(e).attr("onclick").substr(-12,9);
						//console.log(str)
						getData(str);
						
					})
   				})
 		 		
   			
   			// 	console.log(typeof(uriArr));
 					// for (var k =0; k <=2; k++) {
    		// 				console.log(uriArr[k]);
    		// 			};
    			}
    		});			
 	}
 		
var uri= "http://www.zdic.net/z/jbs/";
var arr = getAttr(uri);

// console.log(arr.length);
	// for (var k =0; k <=2; k++) {
 //    		console.log(k);
 //    	};

function getData(attr){
 		var options = {
 			uri : "http://www.zdic.net/z/jbs/bs/?bs="+attr,
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
	  	 		$("a").each(function(i,e){
						console.log($(e).attr("href"))
	  	  		});
   			}
		})
 }
 // getData("%E4%B8%A8");             

