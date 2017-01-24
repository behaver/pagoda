var turrim = require('turrim');
var co = require('co');

co(function* () {
    try {
        yield turrim.load('./app');
        turrim.addPage({
            url: "",
            headers: {
            },
            schema: 'default',
            // gzip: true,
            // proxy: 'http://127.0.0.1:37347/?1',
        });

        yield turrim.collect();
    } catch(e) {
        console.log(e.stack);
    }
});