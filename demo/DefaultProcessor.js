module.exports = function (c) {
    var controller = c;
    var co = require('co');

    this.run = function (data, bind, cb) {
        co(function* () {
            try {
                // Do something.
                
            } catch(e) {
                return cb(e);
            }
        });
    }
}