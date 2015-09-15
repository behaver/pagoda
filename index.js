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
        concurrence: 25,
        retry: 3
      },
      // processSem = 25,
      // 捕获器操作端
      catchers = [],
      // 就绪列表
      readyList = {
        request: [],
        catchers: [],
        end: []
      },
      // runningList = {
      //   request: [],
      //   catchers: [],
      // },
      // 用于log的数据库操作端
      logdb,
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
          readyList.catchers[i].push(page);
        };
        
      } else { // 请求响应失败
        page.request.statusCode = response.statusCode;
        page.request.status = FAILTURE;

        if (++page.request.retry > request.retry) { // 页面重试次数小于系统设定重试次数
          // 重新加入请求就绪队列
          readyList.request.push(page);  
        } else {
          // 重试次数已用尽，加入结束就绪1队列
          readyList.end.push(page);
        };
      };
      requestSem++;
    });
  };

  // function initEntryPage(page) {
  //   if (typeof(page) === "object" && (!page.purpose || page.purpose === [])) {
  //     page.purpose = "locate";
  //   } else if (typeof(page) === "string") {
  //     page = {
  //       "url": page,
  //       "purpose": "locate"
  //     };
  //   } else {
  //     throw new Error("The parem for initializing entry page is wrong.");
  //   }
  //   that.addPage(page);
  // };

  // function collect(page) {
  //   page.data = catcher.catch(page.body);
  //   if (page.data) {
  //     page.collect.catch.status = 1;
  //     page.collect.process.status = 1;
  //     processor.process(page.data, function(err, res) {
  //       if (err) {
  //         page.collect.process.status = 2;
  //       } else {
  //         page.collect.process.status = 3;
  //       }
  //     });
  //   } else {
  //     page.collect.catch.status = 2;
  //   }
  // };

  // 记录采集日志文件
  function log(callback) {
    // 打开数据库
    logdb.open(function (err, db) {
      if (err) throw err;
      // 创建或打开数据集
      db.collection('collect_log', {safe: true}, function (err, collection) {
        if (err) throw err;

        var insertList = readyList.end;
        // 清空结束就绪列表
        readyList.end = [];

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
    readyList.request.push(page);
    return true;
  };

  // 开始采集页面
  this.collect = function () {
    while (true) {
      // 异步控制请求页面
      while (requestSem > 0 && readyList.request.length > 0) {
        requestSem--;
        var page = readyList.request.shift();
        request(page);
      }

      // 结束页面批量log
      if (readyList.end.length > 50) {
        log();
      };

      // 全部catchers的ready页面捕捉处理
      for (var i = 0; i < readyList.catchers.length; i++) {
        while (readyList.catchers[i].length > 0) {
          var page = readyList.catchers[i].shift();
          if (catchers[i].run(page)) {
            // 捕捉完成
            page.catchers[i].status = SUCCESS;
            page.undoneCount--;
            if (page.undoneCount === 0) {
              readyList.end.push(page);
            };
          } else {
            // 捕捉失败
            page.catchers[i].status = FAILTURE;
            readyList.end.push(page);
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
      logdb = mongo.Db(sconfig.log.dbname || 'collect_log');
    } else {
      var server = mongo.Server('localhost', mongo.Connection.DEFAULT_PORT, {auto_reconnect: true});
      logdb = mongo.Db('collect_log');
    };
  };
};