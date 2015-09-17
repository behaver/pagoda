var request = require('request');
var cheerio = require("cheerio");

var options = {
    uri : "http://www.zdic.net/z/17/js/597D.htm",
    headers:{
        'X-Requested-With':'XMLHttpRequest',
        "X-Prototype-Version":"1.5.0",
        "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.155 Safari/537.36",
        "Host":"www.zdic.net",
        "Referer":"http://www.zdic.net/z/jbs/",
        "Cookie":"ASPSESSIONIDSSRADBTT=AGHFELNAKCHPPJMNGEGLJFMO; ASPSESSIONIDQAADTQSC=LHKOJJBBKJKKPMKJCEOLACKO; ASPSESSIONIDAQADQRRD=EPMKIIPAEBBMAMMLIDFMEHNB; safedog-flow-item=E5367F9BC03E71DAAFCB5A59B7E5E25F; CNZZDATA524192=cnzz_eid%3D785993820-1441433517-%26ntime%3D1441433517"
    }
};
request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
    // console.log(body)
        var $ = cheerio.load(body);
        var pinyin = new Array();
        var phonetic = new Array();
        var radicial ;
        var external_stroke;
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
        var pinyin2 = new Array();
        var trad_word;
        var simp_word;
        var charactor = new Array();



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
        external_stroke =  $("div.z_it2_jbh").find("a").text();

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

        console.log($("td.z_i_t4_uno").contents().filter(function() { return this.nodeType === 3; }).text());
        unicode =  $("td.z_i_t4_uno").contents().filter(function() { return this.nodeType === 3; }).text();

        console.log($("span.diczx7").eq(0).text());
        fivepen =  $("span.diczx7").eq(0).text();

        console.log($("span.diczx7").eq(1).text());
        cangjie =  $("span.diczx7").eq(1).text();

        console.log($("span.diczx7").eq(2).text());
        zhengma =  $("span.diczx7").eq(2).text();

        console.log($("span.diczx6").text());
        sijiao =  $("span.diczx6").text();

        stroke =  $("span#z_i_t2_bis").text();
        console.log(stroke);

        // $("div.tab-page").find("p").each(function(i,e){
        //     // console.log($(e).text());
        //     if (($(e).text() == "【汉典‍】" ) || ($(e).text() ==  "【汉 典‍】" ) || ($(e).text() ==  "" ) )
        //         $(this).remove();
        //  });
        $("div.tab-page").find("h3").remove();
        $("hr.dichr").prev().remove();
        $("hr.dichr").next().remove();
        
        // console.log($("div.tab-page").find("p").text());
        var goal = $("div.tab-page").find("script");
        $("div.tab-page").find("p").each(function(i,e){
                if($(e).attr("class") != goal.parent().parent().attr("class") ) 
                    $(this).remove();
        });

        var meaning = Array(pinyin.length);
              for (var i = 0; i < meaning.length; i++) {
                    meaning[i] = new Array();
              };
        goal.each(function(i,e){
                console.log($(e).text().split("\"")[1]);
                pinyin2.push($(e).text().split("\"")[1]);
                for (var j = 0; j < pinyin.length; j++) {
                    if($(e).parent().contents().filter(function() { return this.nodeType === 3; }).text().split(" ")[0] === pinyin[j]){
                         var parent = $(e).parent().parent();
                         
                         while((parent = parent.next()) && parent.get(0).tagName != "hr"){
                            meaning[j].push(parent.text());
                            console.log(parent.text());
                          }
                    };
                 }
         })

        console.log($("span#ft").find("a").text());
        trad_word = $("span#ft").find("a").text();
        console.log($("span#jt").find("a").text());
        simp_word = $("span#jt").find("a").text();

        $("div#ziip").find("a[TARGET=_blank]").find("img").each(function(i,e){
            console.log($(e).attr("title"));
            charactor.push($(e).attr("title"))
        });

        
         function getPinyinsObj(){
            var pinyins= [];
            for (var i = 0; i < pinyin.length; i++) {
                pinyins[i] = {}; 
                pinyins[i].pinyin = pinyin[i] ;
                pinyins[i].pinyin2 = pinyin2[i];
                pinyins[i].phonetic = phonetic[i];
                pinyins[i].meaning = meaning[i];
            };
            return pinyins;
        }
        
        function getWordObj(){ 
            var word = {};
            word.pinyins = getPinyinsObj();
            word.radicial = radicial;
            word.trad_word = trad_word;
            word.simp_word = simp_word;
            word.external_stroke = external_stroke;
            word.total_stroke = total_stroke;
            word.structure  = structure;
            word.making_method = making_method;
            word.variant = variant;
            word.fivepen = fivepen;
            word.cangjie = cangjie;
            word.zhengma = zhengma;
            word.sijiao = sijiao;
            word.unicode = unicode;
            word.stroke = stroke;
            word.charactor = charactor;
            return word;
        }
        
        console.dir(getPinyinsObj());
     }     
});


