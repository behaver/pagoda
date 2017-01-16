var turrim = require('turrim');
var co = require('co');

co(function* () {
    try {
        yield turrim.load('./app');
        turrim.addPage({
            url: "http://luoliluoliyounvyounv.tumblr.com/",
            headers: {
                // "referer": "http://luoliluoliyounvyounv.tumblr.com/",
                "Host": "luoliluoliyounvyounv.tumblr.com",
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "accept-encoding": "gzip, deflate, sdch, br",
                "accept-language": "zh-CN,zh;q=0.8,zh-TW;q=0.6,en;q=0.4",
                "cache-control": "max-age=0",
                "cookie": 'tmgioct=586fa6fbdd30570975469210; rxx=24qhxccdndg.ktldadh&v=1; anon_id=QAJQEHOWJJCCGDIKVHVEHYFYTVZSWEEC; _ga=GA1.2.1048118905.1483712258; __utma=189990958.1048118905.1483712258.1484050190.1484051851.4; __utmb=189990958.0.10.1484051851; __utmc=189990958; __utmz=189990958.1484051851.4.3.utmcsr=baidu|utmccn=(organic)|utmcmd=organic',
                "upgrade-insecure-requests": 1,
                "Proxy-Connection": "keep-alive",
                "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36 Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            },
            schema: 'default',
            proxy: 'http://127.0.0.1:37347/?1',
        });

        yield turrim.collect();
    } catch(e) {
        console.log(e.stack);
    }
});