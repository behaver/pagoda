/**
 * Pagoda 数据采集
 * @authors Vincent (qianxing@yeah.net)
 * @date    2015-09-06 10:31:27
 * @version 0.3.0
 */
function Pagoda() {
    // 页面请求配置信息
    var request = {
        module: require("request"),
        // 请求头部信息
        headers: {},
        // 并发请求量
        sem: 50,
        // 请求失败后，重复请求次数
        retry: 3,
        // 预备请求的页面对象列表
        readyList: [],
        // 请求进行中的页面对象列表
        runningList: []
    },

    iconv = require('iconv-lite'),

    sourceDir = '',

    /**
     * 存放当前内存中的所有页面对象列表
     * @type {Array}
     */
    pages = [],

    /**
     * co异步优化处理模块
     * @type {[type]}
     */
    co = require('co'),

    mongo = require('mongodb'),

    colors = require('colors'),

    /**
     * 采集模式注册表
     * @type {Object}
     */
    schemas = {},

    /**
     * 内容捕获器队列
     * @type {Array}
     */
    catchers = {},

    /**
     * 数据处理器注册表
     * @type {Object}
     */
    processors = {},

    /**
     * [log description]
     * @type {Object}
     */
    log = {
        // 决定log执行一次的累计加权量
        weight: 0
    },

    /**
     * 注册到控制器中的全部页面url
     * 主要用于判断新增页面url是否存在,避免重复爬取
     * @type {Array}
     */
    urls = [],
    
    /**
     * 已经采集完的页面计数
     * @type {Number}
     */
    finishCount = 0,

    /**
     * 用于均衡捕获器的执行队列
     * @type {Number}
     */
    headCatcher = 0,

    /**
     * 主程序是否中断
     * @type {Boolean}
     */
    interrupt = false,

    self = this;

    // 执行状态常量定义
    // 未处理
    const UNTREATED = 0;
    // 处理中
    const PROCESSING = 1;
    // 处理成功
    const SUCCESS = 2;
    // 处理失败
    const FAILTURE = 3;
    // 阻塞
    const WAITING = 4;

    this.logDns = '';

    /**
     * 判断一个url是否已经注册到采集控制器中
     * 
     * @param url
     * @return {Boolean}
     */
    function hasUrl(url) {
        for (var i = 0; i < urls.length; i++) {
            if (urls[i] === url) return true;
        };
        return false;
    };

    /**
     * 注册捕获器
     * @param  {[type]} catcherCfg [description]
     * @return {[type]}            [description]
     */
    function registerCatcher(catcherCfg) {
        if (catcherCfg.constructor === Object) {
            var catcher = {};

            if (!catcherCfg.name) throw new Error('必须配置捕获器名称!');
            else {
                // 避免重复注册
                if (catchers[catcherCfg.name]) return false;
            }

            // 模块配置
            if (catcherCfg.file) var module = require(sourceDir + '/' + catcherCfg.file);
            else var module = require(sourceDir + '/' + catcher.name + '.js');
            catcher.module = new module(self);

            catcher.sync = (catcherCfg.concurrence === 1 || !catcherCfg.concurrence) ? true : false;
            catcher.sem = (catcherCfg.concurrence > 0) ? parseInt(catcherCfg.concurrence) : 1;
            catcher.step = (catcherCfg.step === undefined) ? 10 : catcherCfg.step;
            catcher.debug = (catcherCfg.debug === undefined) ? false : catcherCfg.debug;
            catcher.readyList = [];
            catcher.runningList = [];

            catchers[catcherCfg.name] = catcher;

            return true;
        }

        return false;
    }

    /**
     * 注册数据处理器
     * @return {[type]} [description]
     */
    function registerProcessor(processorCfg) {
        if (processorCfg.constructor === Object) {
            var processor = {};

            if (!processorCfg.name) throw new Error('必须配置数据处理器名称!');
            else {
                // 避免重复注册
                if (processors[processorCfg.name]) return false;
            }

            // 模块配置
            console.log(('加载模块: ' + sourceDir + '/' + processorCfg.file).blue);
            if (processorCfg.file) var module = require(sourceDir + '/' + processorCfg.file);
            else var module = require(sourceDir + '/' + processor.name + '.js');
            processor.module = new module(self);

            processor.sync = (processorCfg.concurrence === 1 || !processorCfg.concurrence) ? true : false;
            processor.sem = (processorCfg.concurrence > 0) ? parseInt(processorCfg.concurrence) : 1;
            processor.step = (processorCfg.step === undefined) ? 10 : processorCfg.step;
            processor.debug = (processorCfg.debug === undefined) ? false : processorCfg.debug;
            processor.readyList = [];
            processor.runningList = [];
            processor.waitingList = [];
            
            processors[processorCfg.name] = processor;

            return true;
        }

        return false;
    }

    /**
     * 为页面注册对应的内容捕获器
     * 
     * @param  {[type]} page         [description]
     * @param  {[type]} catcher_name [description]
     * @return {[type]}              [description]
     */
    function registerCatcherForPage(page, catcher_name) {
        if (catcher_name === undefined) { // 默认的页面内容捕获器注册,默认为捕获器列表中的第一个捕获器
            for (var i in catchers) {
                page.catchers[catchers[i].name] = [{ status: UNTREATED, error: null }];
                return 1;
            }
        } else { // 指定的页面内容捕获器注册
            if (catchers[catcher_name]) {
                    page.catchers[catcher_name] = {
                        status: UNTREATED,
                        error: null
                    };
                    return 1;
            } else return 0;
        };
        return 0;
    };

    /**
     * 为页面注册对应的数据处理器
     * 
     * @param  {[type]} page         [description]
     * @param  {[type]} processor_name [description]
     * @return {[type]}              [description]
     */
    function registerProcessorForPage(page, processor_name) {
        if (processor_name === undefined) { // 默认的数据处理器注册,默认为捕获器列表中的数据处理器
            for (var i in processors) {
                page.processors[processors[i].name] = [{ status: UNTREATED, error: null}];
                return 1;
            }
        } else { // 指定的数据处理器注册
            if (processors[processor_name]) {
                    page.processors[processor_name] = {
                        status: UNTREATED,
                        error: null
                    };
                    return 1;
            } else return 0;
        };
        return 0;
    };

    /**
     * 请求就绪页面
     * 
     * @param  {[type]} page [description]
     * @return {[type]}      [description]
     */
    function requestPage(page, cb) {
        // return co(function* () {
            // 加入请求运行队列、更改页面请求状态
            request.runningList.push(page);
            page.request.status = PROCESSING;
            request.module({
                url: page.url,
                headers: page.headers,
                encoding : page.charset ? null : 'utf8',
            }, function (error, response, content) { // 请求完成回调
                request.runningList.shift(page);
                if (!error && response.statusCode == 200) { // 请求响应成功
                    // page.document = content;
                    page.document = page.charset ? iconv.decode(content, page.charset) : content;
                    page.request.status = SUCCESS;

                    log.weight += 30;
                    console.log(('请求成功：' + page.url).green);

                    /*请求页面完毕，加入页面对应捕获器的捕获就绪队列*/
                    for (var i in catchers) {
                        if (page.catchers[i]) {
                            catchers[i].readyList.push(page);
                            console.log('加入队列：' + i + '(' + catchers[i].readyList.length + ')');
                        }
                    }
                } else { // 请求响应失败
                    page.request.status = FAILTURE;
                    page.request.error = error;

                    if (response !== undefined) page.request.statusCode = response.statusCode;

                    if (++page.request.retry < request.retry) { // 页面重试次数小于系统设定重试次数,
                        // 重新加入请求就绪队列
                        console.log(('重新请求：' + page.url).yellow);
                        request.readyList.push(page);
                    } else {
                        // 重试次数已用尽
                        log.weight += 30;
                        console.log(('请求失败：' + page.url).red);
                    };
                };
                // 释放信号量
                request.sem++;
                if (interrupt) logPages();
                return cb(null, 'request_ok');
            });
        // });
    };

    /**
     * 捕获页面内容
     * 
     * @return {[type]} [description]
     */
    function catchPages() {
        for (var cName in catchers) {
            // 计算当前捕捉器的数组索引，用于循环各捕捉器优先级。
            // var index = (i + headCatcher) % catchers.length;
            // 捕获器连续执行次数
            var j = 0;
            // 捕获待捕获队列中的页面
            while (catchers[cName].readyList.length > 0 && j++ < catchers[cName].step) {
                if (catchers[cName].sync) { // 内容捕获器处理 - 同步模式
                    var page = catchers[cName].readyList.shift();
                    page.catchers[cName].status = PROCESSING;
                    try {
                        // 开始运行捕获器
                        if (page.data = catchers[cName].module.run(page.document, page.bind)) {
                            // 捕捉完成
                            console.log(('捕获成功：' + cName + '@' + page.url).green);
                            page.catchers[cName].status = SUCCESS;
                        } else {
                            // 捕捉失败
                            console.log(('捕获失败：' + cName + '@' + page.url).red);
                            page.catchers[cName].status = FAILTURE;
                        };
                    } catch (e) {
                        console.log(('捕获过程中出错：' + cName+ '@' + page.url + '[' + e.message + ']').red);
                        page.catchers[cName].status = FAILTURE;
                        page.catchers[cName].error = e.message;
                        if (e.message != 'empty' && catchers[cName].debug) {
                            interrupt = true;
                            logPages();
                            console.log(e.stack);
                            throw new Error(e);
                        }
                    } finally {
                        page.uncatchedCount--;
                        log.weight += 1;
                    }
                } else { // 内容捕获器处理 - 异步模式
                    if (catchers[cName].sem > 0) { // 有空闲信号可使用
                        // 占用信号量
                        catchers[cName].sem--;
                        var page = catchers[cName].readyList.shift();
                        catchers[cName].runningList.push(page);
                        page.catchers[cName].status = PROCESSING;

                        page.data = catchers[cName].module.run(page.document, page.bind, (function (i) {
                            var i;
                            return function (error) {
                                if (error) {
                                    // 捕捉失败
                                    page.catchers[i].status = FAILTURE;
                                    page.catchers[i].error = error;
                                    console.log(('捕获失败：' + page.url).red);
                                    if (error.message != 'empty' && catchers[i].debug) {
                                        interrupt = true;
                                        logPages();
                                        console.log(error.stack);
                                        throw new Error(error);
                                    }
                                } else {
                                    // 捕捉完成
                                    page.catchers[i].status = SUCCESS;
                                    console.log(('捕获成功：' + page.url).green);
                                };
                                page.uncatchedCount--;
                                log.weight += 1;
                                // 释放信号量
                                catchers[i].sem++;
                                if (interrupt) logPages();
                            };
                        })(cName));
                    };
                };
            };
        };

        // 下一个头位置捕获器索引，用于循环捕捉器队列执行优先级
        // headCatcher = (headCatcher + 1) % catchers.length;
    }

    /**
     * 页面数据处理
     * 
     * @return {[type]} [description]
     */
    this.process = function() {
        /* 从MongoDB中导出数据用于处理 */
        return co(function* () {
            var size = 200;
            while(1) {
                try {
                    // console.log(pages.length);
                    if (pages.length < size) {
                        
                        // 在数据库中读取未数据处理页面
                        var db = yield mongo.connect(log.dsn);
                        var pcol = db.collection(log.collection);
                        var docs = yield pcol.find({ "unprocessedCount": {"$gt": 0}, "res": {$exists: 0} }).limit(size).toArray();
                        var docs_wait = yield pcol.find({ "unprocessedCount": {"$gt": 0}, "res": "wait" }).limit(Math.ceil(size/2)).toArray();
                        // 关闭数据库，释放资源。
                        db.close();

                        if (docs) {
                            /* 读取页面完毕，加入页面对应数据处理器的就绪队列*/
                            for (var j = 0; j < docs.length; j++) {
                                var p = docs[j];
                                // 加入到内存页面存储队列中
                                pages.push(p);
                                // 加入页面对应数据处理器的就绪队列
                                for (var k in p.processors) {
                                    console.log(('页面处理就绪：' + p.url + '@' + k).green);
                                    processors[k].readyList.push(p);
                                }
                            }
                        }

                        if (docs_wait) {
                            for (var i = 0; i < docs_wait.length; i++) {
                                var p = docs_wait[i];
                                // 加入到内存页面存储队列中
                                pages.push(p);
                                // 加入页面对应数据处理器的就绪队列
                                for (var k in p.processors) {
                                    console.log(('页面阻塞就绪：' + p.url + '@' + k).green);
                                    processors[k].waitingList.push(p);
                                }
                            }
                        }

                        if (pages.length == 0) {
                            console.log('全部数据处理完成.'.blue);
                            return;
                        }

                        // 重新加入阻塞任务
                        for (var i in processors) {
                            var p = null;
                            while (p = processors[i].waitingList.shift()) {
                                processors[i].readyList.push(p);
                            }
                        }
                    }
                } catch (e) {
                    interrupt = true;
                    yield function (cb) {
                        logPages(cb);
                    };
                    console.log('在载入log数据库数据时发生错误。'.red);
                    console.log(e.stack);
                    throw e;
                    return;
                }

                /* 处理各数据处理就绪队列 */
                for (var pname in processors) {

                    // 数据处理队列中的页面
                    for (var kkk = 0, len = processors[pname].readyList.length; kkk < len && kkk < processors[pname].step; kkk++) {
                        if (processors[pname].sync) { // 数据处理 - 同步模式
                            var page = processors[pname].readyList.shift();
                            var pProcessor = page.processors[pname];
                            pProcessor.status = PROCESSING;

                            try {
                                var res = yield (function (d, b, pname) {
                                    return function (cb) {
                                        processors[pname].module.run(d, b, cb);
                                    }
                                })(page.data, page.bind, pname);
                                page.res = res;

                                if (res) {
                                    console.log(res);
                                    if (res == 'wait') {
                                        console.log(('数据处理阻塞：' + pname + '@' + page.url).yellow);
                                        pProcessor.status = WAITING;
                                        // processors[pname].waitingList.push(page);
                                        continue;
                                    }

                                    console.log(('数据处理成功：' + pname + '@' + page.url).green);
                                    page.unprocessedCount--;
                                    pProcessor.status = SUCCESS;
                                } else {
                                    // 数据处理失败
                                    console.log(('数据处理失败：' + pname + '@' + page.url).red);
                                    page.unprocessedCount--;
                                    pProcessor.status = FAILTURE;
                                };
                            } catch (e) {
                                pProcessor.status = FAILTURE;
                                pProcessor.error = e;
                                page.unprocessedCount--;
                                console.log((pname + ' ,这逼数据处理器在处理页面 (' + page.url + ') 时犯了大错误.').red);
                                if (processors[pname].debug) {
                                    console.log(e.stack);
                                    interrupt = true;
                                    yield function (cb) {
                                        logPages(cb);
                                    };
                                    throw e;
                                    return;
                                }
                            } finally {
                                log.weight += 1;
                            }
                        } else { // 内容捕获器处理 - 异步模式
                            if (processors[pname].sem > 0) { // 有空闲信号可使用
                                // 占用信号量
                                processors[pname].sem--;
                                var page = processors[pname].readyList.shift();

                                processors[pname].runningList.push(page);
                                page.processors[pname].status = PROCESSING;
                                processors[pname].module.run(page.data, page.bind, (function (page, i) {
                                    return function (error, res) {
                                        page.res = res;
                                        if (error) {
                                            // 数据处理失败
                                            page.processors[i].status = FAILTURE;
                                            page.processors[i].error = error;
                                            page.unprocessedCount--;
                                            console.log(('数据处理失败：' + pname + '@' + page.url).red);
                                            if (processors[pname].debug) {
                                                console.log(error.stack);
                                                interrupt = true;
                                                // yield function (cb) {
                                                    console.log(123);
                                                    logPages(cb);
                                                // };
                                                throw e;
                                                return;
                                            }
                                        } else if (res == 'wait') {
                                            console.log(('数据处理阻塞：' + pname + '@' + page.url).yellow);
                                            pProcessor.status = WAITING;
                                            // processors[pname].waitingList.push(page);
                                        } else {
                                            // 数据处理完成
                                            page.processors[i].status = SUCCESS;
                                            page.unprocessedCount--;
                                            console.log(('数据处理成功：' + pname + '@' + page.url).green);
                                        };
                                        log.weight += 1;
                                        // 释放信号量
                                        processors[i].sem++;
                                        if (interrupt) {
                                            console.log(123);
                                            // yield function (cb) {
                                                logPages(cb);
                                            // };
                                        }
                                    };
                                })(page, pname));
                            };
                        };
                    }
                }
                yield function (cb) {
                    logPages(cb);
                };
                for (var i in processors) {
                    processors[i].waitingList = [];
                }
            }
        });
    }

    /**
     * 重新处理已捕获的全部数据
     * @return {[type]} [description]
     */
    this.reprocess = function () {
        return co(function* () {
            try {
                var db = yield mongo.connect(log.dsn);
                var pcol = db.collection(log.collection);
                console.log('开始重置页面数据处理log'.blue);
                for (var pos = 0, size = 100; 1; pos += size) {
                    var docs = yield pcol.find({}).limit(size).skip(pos).toArray();
                    if (!docs.length) break;

                    for (var i = 0; i < docs.length; i++) {
                        docs[i].unprocessedCount = Object.getOwnPropertyNames(docs[i].processors).length;
                        for (var j = 0; j < docs[i].processors.length; j++) {
                            docs[i].processors[j].status = UNTREATED;
                            docs[i].processors[j].error = null;
                        }
                        delete docs[i].res;

                        var res = yield pcol.updateOne({'_id': docs[i]._id}, docs[i]);
                    }
                }
                db.close();
                console.log('重置页面数据处理log完毕'.green);
            } catch (e) {
                console.log('重置页面数据处理log出错'.red);
                console.log(e.stack);
                throw e;
            }

            yield self.process();
        });
    }

    /**
     * 记录页面日志
     * 
     * @return {[type]} [description]
     */
    function logPages(cb) {

        /*进行数据录入*/
        co(function* () {
            // 创建临时中转过滤变量
            var _pages = pages;
            pages = [];

            var db = yield mongo.MongoClient.connect(log.dsn);
            var pcol = db.collection(log.collection);
            for (var i = 0; i < _pages.length; i++) {
                /*录入数据*/
                try {
                    if (_pages[i]._id === undefined) { // 未定义数据id，表示数据库中不存在
                        var res = yield pcol.insert(_pages[i]);
                        if (res.result.ok === 1) {
                            _pages[i]._id = res.ops[0]._id;
                        } else {
                            console.log(('log页面插入数据失败!' + res).red);
                            throw new Error('log页面插入数据失败!');
                        }
                    } else { // 数据库中已经存在该数据，更新。
                        var res = yield pcol.updateOne({'_id': _pages[i]._id}, _pages[i], { upsert: true });
                        if (res.result.ok !== 1) {
                            console.log(('log页面更新数据失败!' + res).red);
                            throw new Error('log页面更新数据失败!');
                        }
                    }
                } catch(e) {
                    console.log(e.stack);
                    throw e;
                }
                if (_pages[i].uncatchedCount > 0) { // 未处理完页面，放回内存。
                    pages.push(_pages[i]);
                }
            };

            // 关闭数据库，释放资源。
            db.close();
            log.weight = 0;
            console.log(('log数据: ' + _pages.length + '页, 释放内存数据' + (_pages.length - pages.length) + '页, 当前内存数据' + pages.length + '页').yellow);
            return cb(null, 'log_ok');
        });
    }

    /**
     * 恢复断点
     * @return {[type]} [description]
     */
    function resumeBreakpoint() {
        /*断点续传处理*/
        return co(function * () {
            try {
                var db = yield mongo.MongoClient.connect(log.dsn);
                // console.log(123);
                var pcol = db.collection(log.collection);
                var docs = yield pcol.find({}).project({url: 1}).toArray();
                for (var i = 0; i < docs.length; i++) { // 添加全部页面的url到内存，用于防止重复采集。
                    urls.push(docs[i].url);
                    // 及时清理内存，防止内存泄露。
                    docs[i] = 0;
                };
                // 及时清理内存，防止内存泄露。
                docs = [];

                // 查询所有未完成页面
                docs = yield pcol.find({uncatchedCount: {'$gt': 0}}).toArray();
                // console.log(docs);
                for (var i = 0; i < docs.length; i++) {
                    pages.push(docs[i]);
                    if (docs[i].request.status === UNTREATED || docs[i].request.status === PROCESSING) { // 请求未完成，加入请求队列
                        request.readyList.push(docs[i]);
                    } else { // 请求已完成，加入相应捕获队列
                        console.log(docs[i].catchers);
                        for (var j in docs[i].catchers) {
                            if (docs[i].catchers[j].status === UNTREATED || docs[i].catchers[j].status === PROCESSING) {
                                catchers[j].readyList.push(docs[i]);
                            }
                        }
                    };
                };
                // 关闭数据库，释放资源
                db.close();
                console.log('断点数据还原完毕'.blue);
            } catch (err) {
                console.log('断点数据还原失败'.red);
                throw err;
            }
        });
    }

    /**
     * 获取内存中未捕获完成页面的数量
     * @return {[type]} [description]
     */
    function uncatchedCount() {
        var count = request.readyList.length + request.runningList.length;
        for (var i in catchers) {
            count += catchers[i].readyList.length + catchers[i].runningList.length;
        }
        return count;
    }

    /**
     * 获取内存中未数据处理完成页面的数量
     * @return {[type]} [description]
     */
    function unprocessedCount() {
        var count = 0;
        for (var i in processors) {
            count += processors[i].readyList.length + processors[i].runningList.length;
        }
        return count;
    }

    /**
     * 添加页面
     * 
     * @param {[type]} p [description]
     */
    this.addPage = function (p) {
        if (typeof(p) == "object") { // 对象式参数
            if (p.url === undefined || hasUrl(p.url)) {
                return false;
            }

            var page = {
                url: p.url,
                bind: p.bind ? p.bind : null,
                headers: request.headers,
                document: null, 
                request: {
                    status: 0,
                    statusCode: 0,
                    error: null
                },
                catchers: {},
                processors: {},
                uncatchedCount: 0,
                unprocessedCount: 0,
            };

            if (p.headers) {
                if (typeof(p.headers) == 'object') {
                    for (var s in p.headers) {
                        page.headers[s] = p.headers.s;
                    };
                } else {
                    throw new Error(' 我TM没法处理你给的这个格式的headers!');
                }
            }

            // 模式处理
            if (p.schema) {
                var pSchema = schemas[p.schema];
                if (pSchema) {
                    // 页面捕获器参数标准化
                    for (var i = 0; i < pSchema.catchers.length; i++) {
                        page.uncatchedCount += registerCatcherForPage(page, pSchema.catchers[i]);
                    }

                    // 页面数据处理器参数标准化
                    for (var i = 0; i < pSchema.processors.length; i++) {
                        page.unprocessedCount += registerProcessorForPage(page, pSchema.processors[i]);
                    }
                } else {
                    throw new Error('未找到采集模式' + p.schema);
                }
            }

            // 页面捕获器参数标准化，同时设定待完成捕获数。
            if (p.catchers !== undefined) {
                if (p.catchers.constructor === Array) { // 用户设定为数组
                    while (p.catchers.length) {
                        page.uncatchedCount += registerCatcherForPage(page, p.catchers.shift());
                    }
                } else {
                    page.uncatchedCount = registerCatcherForPage(page, p.catchers);
                }
            }

            // 页面数据处理器参数标准化，同时设定待完成数据处理数。
            if (p.processors !== undefined) {
                if (p.processors.constructor === Array) { // 用户设定为数组
                    while (p.processors.length) {
                        page.unprocessedCount += registerProcessorForPage(page, p.processors.shift());
                    }
                } else {
                    page.unprocessedCount = registerProcessorForPage(page, p.processors);
                }
            }

            if (p.charset) page.charset = p.charset;
        } else if (typeof(p) == "string") { // 字符串式参数
            if (hasUrl(page.url)) {
                return false;
            }
            var page = {
                url: p,
                headers: request.headers,
                data: true,
                document: null, 
                request: {
                    status: 0,
                    statusCode: 0,
                    error: null
                },
                catchers: {},
                processors: {},
                uncatchedCount: 0
            };
            var pSchema;
            for (var i in schemas) {
                pSchema = schemas[i];
                break;
            }
            if (pSchema) {
                // 页面捕获器参数标准化
                for (var i = 0; i < pSchema.catchers.length; i++) {
                    page.uncatchedCount += registerCatcherForPage(page, pSchema.catchers[i]);
                }

                // 页面数据处理器参数标准化
                for (var i = 0; i < pSchema.processors.length; i++) {
                    page.unprocessedCount += registerProcessorForPage(page, pSchema.processors[i]);
                }
            } else { // 未找到默认采集模式
                page.uncatchedCount = registerCatcherForPage(page);
                page.unprocessedCount = registerProcessorForPage(page);
            }

            page.uncatchedCount = registerCatcherForPage(page);
            page.unprocessedCount = registerProcessorForPage(page);
        } else {
            throw new Error("请问你给我的是什么jb参数？");
        }
        
        // 初始化请求失败重试次数
        page.request.retry = 0;

        // 进入内存页面队列
        pages.push(page);

        // 页面进入请求就绪队列
        request.readyList.push(page);

        // 加入内存中全部已添加页面队列
        urls.push(page.url);

        log.weight += 5;
        console.log('增添采集页面: ' + page.url);
        return true;
    };

    /**
     * 采集页面
     * 
     * @return {[type]} [description]
     */
    this.collect = function (callback) {
        return co(function* () {
            try {
                /*存储当前内存中的所有页面对象*/
                if (log.weight >= log.size) { // log执行权重达标
                    yield function (cb) {
                        logPages(cb);
                    };
                };

                var ts = [];
                // 监视空闲请求信号及就绪队列
                for (var i = 0; i < 100 && request.sem > 0 && request.readyList.length > 0; i++) { // 存在空闲请求信号量和待请求页面
                    request.sem--;
                    var page = request.readyList.shift();
                    // 执行请求页面(异步)
                    ts.push((function (page){
                        return function (cb) {
                            requestPage(page, cb);
                        }
                    })(page));
                }
                yield ts;

                // 页面捕捉处理
                catchPages();

                if (uncatchedCount()) {
                    setImmediate(self.collect);
                } else {
                    yield function (cb) {
                        logPages(cb);
                    };
                    console.log('####### 所有页面请求及捕获完毕！ #######');
                    console.log('-------------- now我们开始处理数据了！ --------------');
                    yield self.process();
                    console.log('####### 我完事儿了，走，去约会吧！ #######');
                }
            } catch (e) {
                console.log(e);
                console.log(e.stack);
            }
        });

        // 等待请求的页面过多，防止内存不足，强行调控只进行请求处理。
        // if (request.readyList.length > 100) {
        //     setImmediate(self.collect);
        //     return;
        // }

        // return;
    };

    /**
     * 加载配置
     * 
     * @param  {[type]} source_package_dir [description]
     * @return {[type]}                    [description]
     */
    this.load = function(source_package_dir) {
        return co(function* () {
            try {
                sourceDir = source_package_dir;

                // 读入并解析配置文件
                var sconfig = require(sourceDir + '/source.json');

                // 配置请求选项
                if (sconfig.request.concurrence !== undefined) request.sem = sconfig.request.concurrence;
                if (sconfig.request.headers !== undefined) request.headers = sconfig.request.headers;
                if (sconfig.request.retry !== undefined) request.retry = sconfig.request.retry;

                // 配置页面内容捕捉器
                if (sconfig.catchers && sconfig.catchers.constructor === Array) {
                    for (var i = 0; i < sconfig.catchers.length; i++) {
                        registerCatcher(sconfig.catchers[i]);
                    };
                }

                // 配置页面数据处理器
                if (sconfig.processors && sconfig.processors.constructor === Array) {
                    for (var i = 0; i < sconfig.processors.length; i++) {
                        registerProcessor(sconfig.processors[i]);
                    };
                }

                // 配置页面采集模式
                if (sconfig.schemas) {
                    for (var schemaName in sconfig.schemas) {
                        var schemaCfg = sconfig.schemas[schemaName];
                        var schema = {catchers: [], processors: []};

                        // 配置模式内容捕捉器
                        if (schemaCfg['catchers']) {
                            // 注册捕获器
                            if (schemaCfg['catchers'].constructor === Array) {
                                for (var i = 0; i < schemaCfg['catchers'].length; i++) {
                                    registerCatcher(schemaCfg['catchers'][i]);
                                    schema.catchers.push(schemaCfg['catchers'][i].name);
                                }
                            } else if (schemaCfg['catchers'].constructor === Object) {
                                registerCatcher(schemaCfg['catchers']);
                                schema.catchers.push(schemaCfg['catchers'].name);
                            }
                        }

                        // 配置模式数据处理器
                        if (schemaCfg['processors']) {
                            // 注册数据处理器
                            if (schemaCfg['processors'].constructor === Array) {
                                for (var i = 0; i < schemaCfg['processors'].length; i++) {
                                    registerProcessor(schemaCfg['processors'][i]);
                                    schema.processors.push(schemaCfg['processors'][i].name);
                                }
                            } else if (schemaCfg['processors'].constructor === Object) {
                                registerProcessor(schemaCfg['processors']);
                                schema.processors.push(schemaCfg['processors'].name);
                            }
                        }

                        schemas[schemaName] = schema;
                    }
                }

                /*初始化入口页面*/
                if (sconfig.entry_pages) {
                    if (sconfig.entry_pages.constructor === Array) {
                        for (var i = 0; i < sconfig.entry_pages.length; i++) {
                            self.addPage(sconfig.entry_pages[i]);
                        };
                    } else {
                        self.addPage(sconfig.entry_pages);
                    };
                }

                /*Log数据库配置*/

                if (sconfig.log === undefined) sconfig.log = {};

                // 配置主机端口
                log.host = (sconfig.log.host === undefined) ? 'localhost' : sconfig.log.host;
                log.port = (sconfig.log.port === undefined) ? 27017 : sconfig.log.port;

                // 配置log使用的db
                log.db = (sconfig.log.db === undefined) ? 'pagoda' : sconfig.log.db

                // 配置log使用的collections
                log.collection = 'pagoda_' + sconfig.name + '_log',

                // 配置执行一次所需加权量
                log.size = sconfig.log.size ? sconfig.log.size : 300;

                // 配置自定义用户密码
                if (sconfig.log.user !== undefined) {
                    log.user = sconfig.log.user;
                    log.pwd = sconfig.log.pwd ? sconfig.log.pwd : '';
                };

                // 生成数据库链接dsn
                log.dsn = (log.user) ? 
                    'mongodb://' + log.user + ':' + log.pwd + '@' + log.host + ':' + log.port + '/' + log.db : 
                    'mongodb://' + log.host + ':' + log.port + '/' + log.db;

                var res = yield resumeBreakpoint();
                
            } catch(e) {
                console.log(e.message);
                console.log(e.stack);
                throw e;
            }
        });
    };

    this.getLogConfig = function () {
        return log;
    };
};

module.exports = new Pagoda();