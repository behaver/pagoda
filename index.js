/**
 * CollectController

 * @authors Stalker (qianxing@yeah.net)
 * @date    2015-09-06 10:31:27
 * @version 0.1.0
 */
module.export = function () {
  // 页面请求配置信息
  var request = {
        headers: {},
        // 并发执行信号量
        sem: 25,
        retry: 3,
        readyList: [],
        runningList: []
      },
      // 捕获器操作端
      catchers = [],
      // log
      log = {
        readyList: []
      },
      // 所有页面url的记录
      urls = [],
      // 完成页面计数
      finishCount,
      that = this;

  // 执行状态常量定义
  // 未处理
  const UNTREATED = 0;
  // 处理中
  const PROCESSING = 1;
  // 处理成功
  const SUCCESS = 2;
  // 处理失败
  const FAILTURE = 3;

  // 判断url记录是否存在
  function hasUrl(url) {
    for (var i = 0; i < urls.length; i++) {
      if (urls[i] === url) return true;
    };
    return false;
  };

  function request(page) {
    // 加入请求运行队列
    runningList.request.push(page);
    page.request.status = PROCESSING;

    require("request").request({
      url: page.url,
      headers: page.headers
    }, function(error, response, content) {
      if (!error && response.statusCode == 200) { // 请求响应成功
        page.body = content;
        page.request.status = SUCCESS;

        // 加入相应的捕获就绪队列
        for (var i = 0; i < page.catchers.length; i++) {
          catchers[i].readyList.push(page);
        };
        
      } else { // 请求响应失败
        page.request.statusCode = response.statusCode;
        page.request.status = FAILTURE;

        if (++page.request.retry > request.retry) { // 页面重试次数小于系统设定重试次数
          // 重新加入请求就绪队列
          request.readyList.push(page);  
        } else {
          // 重试次数已用尽，加入结束就绪1队列
          log.readyList.push(page);
        };
      };
      request.sem++;
    });
  };

  // 记录采集日志文件
  function log(callback) {
    // 打开数据库
    log.db.open(function (err, db) {
      if (err) throw err;
      // 创建或打开数据集
      db.collection('collect_log', {safe: true}, function (err, collection) {
        if (err) throw err;

        var insertList = log.readyList;
        // 清空结束就绪列表
        log.readyList = [];

        // 向插入数据库中插入记录
        collection.insert(insertList, {safe: true}, function (err, result) {
          if (err) throw err;
          // 添加已完成页面采集数目
          finishCount += insertList.length;
          // 执行回调
          if (typeof(callback) === 'function') {
            callback();
          };
        });
      });
    });
  };

  // 为页面注册捕获器，成功返回1，失败返回0。
  function registerCatcherForPage(page, catcher_name) {
    if (catcher_name === undefined) {
      page.catchers = [{name: catchers[0].name, status: 0, error: null}];
      return 1;
    } else {
      for (var i = 0; i < catchers.length; i++) {
        if (catchers[i].name == catcher_name) {
          page.catchers[i].name = catcher_name;
          page.status = 0;
          page.error = null;
          return 1;
        };
      };
    };
    return 0;
  }

  // 增加一个处理页面，多于定位器处使用添加数据页。
  this.addPage = function (p) {
    if (typeof(p) == "object") { // 对象式参数
      if (p.url === undefined || hasUrl(p.url)) {
        return false;
      }

      var page = {
        url: p.url,
        headers: request.headers,
        body: null, 
        request: {
          status: 0,
          statusCode: 0,
          error: null
        },
        catchers: [],
        undoneCount: 0
      };

      if (typeof(p.headers) == 'object') {
        for (var s in p.headers) {
          page.headers[s] = p.headers.s;
        };
      };

      // 页面捕获器参数标准化
      if (p.catchers !== undefined) {
        if (p.catchers.constructor === Array) { // 用户设定为数组
          while (p.catchers.length) {
            page.undoneCount += registerCatcherForPage(page, p.catchers.shift());
          }
        } else {
          page.undoneCount = registerCatcherForPage(page, p.catchers);
        }
      } else {
        page.undoneCount = registerCatcherForPage(page);
      }
    } else if (typeof(p) == "string") { // 字符串式参数
      if (hasUrl(page.url)) {
        return false;
      }
      var page = {
        url: p,
        headers: request.headers,
        body: null, 
        request: {
          status: 0,
          statusCode: 0,
          error: null
        },
        catchers: [],
        undoneCount: 0
      };
      page.undoneCount = registerCatcherForPage(page);
    } else {
      throw new Error("The parem is illegality.");
    }
    
    // 页面进入请求准备队列
    request.readyList.push(page);
    return true;
  };

  // 开始采集页面
  this.collect = function () {
    while (true) {
      // 异步控制请求页面
      while (request.sem > 0 && request.readyList.length > 0) {
        request.sem--;
        var page = request.readyList.shift();
        request(page);
      }

      // 结束页面批量log
      if (log.readyList.length > 50) {
        log();
      };

      // 全部catchers的ready页面捕捉处理
      for (var i = 0; i < readyList.catchers.length; i++) {
        // 页面捕捉处理
        while (catchers[i].readyList.length > 0) {
          if (catchers[i].sync) { // 同步模式
            var page = catchers[i].readyList.shift();
            if (catchers[i].run(page)) {
              // 捕捉完成
              page.catchers[i].status = SUCCESS;

              if (catchers[i].processor !== undefined) { 
                // 加入数据处理就绪队列
                catchers[i].processor.readyList.push(page);
              } else {
                // 捕获全部完成
                page.undoneCount--;
                if (page.undoneCount === 0) {
                  log.readyList.push(page);
                };
              };
            } else {
              // 捕捉失败
              page.catchers[i].status = FAILTURE;
              log.readyList.push(page);
            };
          } else { // 异步模式
            if (catchers[i].sem > 0) {
              catchers[i].sem--;
              var page = catchers[i].readyList.shift();
              catchers[i].runningList.push(page);
              page.catchers[i].status = PROCESSING;
              catchers[i].run(page, (function (i) {
                var i;
                return function (error) {
                  if (error) {
                    // 捕捉失败
                    page.catchers[i].status = FAILTURE;
                    log.readyList.push(page);
                  } else {
                    // 捕捉完成
                    page.catchers[i].status = SUCCESS;
                    if (catchers[i].processor !== undefined) { 
                      // 加入数据处理就绪队列
                      catchers[i].processor.readyList.push(page);
                    } else {
                      // 捕获全部完成
                      page.undoneCount--;
                      if (page.undoneCount === 0) {
                        log.readyList.push(page);
                      };
                    };
                  };
                  catchers[i].sem++;
                };
              })());
            };
          };
        };
        while (catchers[i].processor.readyList.length > 0) {
          if (!catchers[i].processor.sync && catchers[i].processor.sem > 0) { // 异步执行控制
            catchers[i].processor.sem--;
            var page = catchers[i].processor.readyList.shift();
            catchers[i].processor.runningList.push(page);
            catchers[i].processor.status = PROCESSING;
            catchers[i].processor.run(page.data, function (error) {
              if (error) {
                catchers[i].processor.status = FAILTURE;
                catchers[i].processor.error = error;
              } else {
                catchers[i].processor.status = SUCCESS;
              };
              page.undoneCount--;
              if (page.undoneCount === 0) {
                log.readyList.push(page);
              };
              catchers[i].processor.sem++;
            });
          };

          if (catchers[i].processor.sync) { // 同步执行控制
            var page = catchers[i].processor.readyList.shift();
            if (catchers[i].processor.run(page.data)) {
              catchers[i].processor.status = SUCCESS;
            } else {
              catchers[i].processor.status = FAILTURE;
              catchers[i].processor.error = error;
            };
            page.undoneCount--;
            if (page.undoneCount === 0) {
              log.readyList.push(page);
            };
          };
        };
      };

      // 操作全部完成
      if (finishCount === urls.length) {
        // log总数小于size的记录
        log(funcion () {
          console.log('This collection has finished.');
        });
      };
    };
  };

  // 载入“采集源”配置，
  this.load = function(source_package_dir) {
    var fs = require("fs");
    // 读入并解析配置文件
    var sconfig = JSON.prase(fs.readFileSync(source_package_dir + '/source.json'));

    // 配置请求选项
    if (sconfig.request.concurrence !== undefined) request.sem = sconfig.request.concurrence;
    if (sconfig.request.headers !== undefined) request.sem = sconfig.request.headers;
    if (sconfig.request.retry !== undefined) request.sem = sconfig.request.retry;

    // 配置页面内容捕捉器
    for (var i = 0; i < scofig.catchers.length; i++) {
      catchers[i].run = require(source_package_dir + '/' + sconfig.catchers[i].file);
      catchers[i].name = sconfig.catchers[i].name;
      catchers[i].sync = (sconfig.catchers[i].sync === undefined) ? true : sconfig.catchers[i].sync;
      // 配置并发信号量
      if (!catchers[i].sync) {
        catchers[i].sem = (sconfig.catchers[i].concurrence === undefined) ? 25 : sconfig.catchers[i].concurrence;
      };
      // 配置采集数据处理器
      if (catchers[i].processor !== undefined) {
        catchers[i].processor.run = require(source_package_dir + '/' + sconfig.catchers[i].processor.file);
        (sconfig.catchers[i].processor.sync === undefined) ? false : sconfig.catchers[i].sync;
      };
    };

    // 初始化起始页面
    if (sconfig.entry_pages === undefined) {
      throw new Error('The config of entry_pages is required.');
    } else if (sconfig.entry_pages.constructor === Array) {
      if (sconfig.entry_pages.length === 0) throw new Error('The config of entry_pages is required.');

      for (var i = 0; i < sconfig.entry_pages.length; i++) {
        that.addPage(sconfig.entry_pages[i]);
      };
    } else {
      that.addPage(sconfig.entry_pages);
    };

    // 配置log数据库
    var mongo = require('mongodb');
    // 初始化MongoDB
    if (sconfig.log !== undefined) {
      var server = mongo.Server(sconfig.log.host || 'localhost', sconfig.log.port || mongo.Connection.DEFAULT_PORT, {auto_reconnect: true});
      log.db = mongo.Db(sconfig.log.dbname || 'collect_log');
    } else {
      var server = mongo.Server('localhost', mongo.Connection.DEFAULT_PORT, {auto_reconnect: true});
      log.db = mongo.Db('collect_log');
    };
  };
};