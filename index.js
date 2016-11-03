/**
 * CollectController
 * @authors Stalker (qianxing@yeah.net)
 * @date    2015-09-06 10:31:27
 * @version 0.2.0
 */
function CollectController() {
	// 页面请求配置信息
	var request = {
		headers: {},
		// 并发执行信号量
		sem: 50,
		retry: 3,
		readyList: [],
		runningList: []
	},

	/**
	 * 存放当前内存中的所有页面对象
	 * @type {Array}
	 */
	pages = [],

	/**
	 * co异步优化处理模块
	 * @type {[type]}
	 */
	co = require('co'),

	// 捕获器操作端
	catchers = [],

	/**
	 * [log description]
	 * @type {Object}
	 */
	log = {
		// 决定log执行一次的加权量
		weight: 0
	},

	/**
	 * 注册到控制器中的全部页面url
	 * @type {Array}
	 */
	urls = [],
	
	/**
	 * 已经采集完的页面计数
	 * @type {Number}
	 */
	finishCount = 0,

	// 用于均衡捕获器的执行队列
	headCatcher = 0,

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
	 * 初始化页面内容捕获器
	 * 
	 * @param  {[type]} page         [description]
	 * @param  {[type]} catcher_name [description]
	 * @return {[type]}              [description]
	 */
	function registerCatcherForPage(page, catcher_name) {
		if (catcher_name === undefined) {
			page.catchers = [{name: catchers[0].name, status: 0, error: null}];
			return 1;
		} else {
			for (var i = 0; i < catchers.length; i++) {
				if (catchers[i].name == catcher_name) {
					page.catchers[i] = {
						name: catcher_name,
						status: 0,
						error: null
					};
					return 1;
				};
			};
		};
		return 0;
	};

	/**
	 * 请求就绪页面
	 * 
	 * @param  {[type]} page [description]
	 * @return {[type]}      [description]
	 */
	function requestPage(page) {
		// 加入请求运行队列、更改页面请求状态
		request.runningList.push(page);
		page.request.status = PROCESSING;
		request.instance({
			url: page.url,
			headers: page.headers
		}, function (error, response, content) {
			request.runningList.shift(page);
			if (!error && response.statusCode == 200) { // 请求响应成功
				page.body = content;
				page.request.status = SUCCESS;
				log.weight += 30;
				console.log('请求成功：' + page.url);

				/*请求页面完毕，加入捕获就绪队列*/
				for (var i = 0; i < page.catchers.length; i++) {
					for (var j = 0; j < catchers.length; j++) {
						if (page.catchers[i] !== undefined && catchers[j].name === page.catchers[i].name) {
							catchers[j].readyList.push(page);
							console.log('添加队列：' + catchers[j].name);
							console.log('队列长度：' + catchers[j].readyList.length);
						};
					};
				};
			} else { // 请求响应失败
				page.request.status = FAILTURE;
				page.request.error = error;
				if (response !== undefined) page.request.statusCode = response.statusCode;
				if (++page.request.retry < request.retry) { // 页面重试次数小于系统设定重试次数
					// 重新加入请求就绪队列
					console.log('重新请求：' + page.url);
					request.readyList.push(page);  
				} else {
					// 重试次数已用尽，加入结束就绪1队列
					log.weight += 30;
					console.log('请求失败：' + page.url);
				};
			};
			// 释放信号量
			request.sem++;
		});
	};

	/**
	 * 记录页面日志
	 * 
	 * @return {[type]} [description]
	 */
	function logPages() {
		// 创建临时中转过滤变量
		var _pages = pages;
		pages = [];
		/*进行数据录入*/
		co(function* () {
			var db = yield log.client.connect(log.dsn);
			var pcol = db.collection(log.collection.page);
			for (var i = 0; i < _pages.length; i++) {
				/*录入数据*/
				if (_pages[i]._id === undefined) { // 未定义数据id，表示数据库中不存在
					var id = yield pcol.insert(_pages[i]);
					// 设置id
					_pages[i]._id = id;
				} else { // 数据库中已经存在该数据，更新。
					yield pcol.update(_pages[i], {'_id': _pages[i]._id});
				}
				if (_pages[i].status !== SUCCESS || _pages[i].status !== FAILTURE) { // 未处理完页面，放回内存。
					pages.push(_pages[i]);
				}
			};
			// 关闭数据库，释放资源。
			db.close();
			log.weight = 0;
		});
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

			// 页面捕获器参数标准化，同时设定待完成捕获数。
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
				data: true,
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

		if (page.data === true) { // 存在数据项，生成数据项id
			// Todo
			page.data = id;
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
		console.log('增添页面: ' + page.url);
		return true;
	};

	/**
	 * 采集页面
	 * 
	 * @return {[type]} [description]
	 */
	this.collect = function () {
		// 异步控制请求页面
		while (request.sem > 0 && request.readyList.length > 0) { // 存在空闲位置和请求就绪页面
			request.sem--;
			var page = request.readyList.shift();
			requestPage(page);
		}

		// 请求等待队列过多，防止内存不足，强行限制只进行请求处理。
		if (request.readyList.length > 100) {
			setImmediate(self.collect);
			return;
		}

		// 捕捉处理就绪页面
		for (var i = 0; i < catchers.length; i++) {
			// 用于循环各捕捉器优先级，当前捕捉器的数组索引。
			var index = (i + headCatcher) % catchers.length;
			var j = 0;
			// 页面捕捉处理
			while (catchers[index].readyList.length > 0 && j++ < catchers[index].step) {
				if (catchers[index].sync) { // 内容捕获器处理 - 同步模式
					var page = catchers[index].readyList.shift();
					page.catchers[index].status = PROCESSING;
					try {
						// 开始运行捕获器
						if (catchers[index].instance.run(page)) {
							// 捕捉完成
							console.log('捕获成功：' + page.url);
							page.catchers[index].status = SUCCESS;
						} else {
							// 捕捉失败
							console.log('捕获失败：' + page.url);
							page.catchers[index].status = FAILTURE;
						};
					} catch (e) {
						console.log('The catcher named ' + catchers[index].name + ' has an error on page ' + page.url);
						page.catchers[index].status = FAILTURE;
						page.catchers[index].error = e;
					} finally {
						log.weight += 1;
					}
				} else { // 内容捕获器处理 - 异步模式
					if (catchers[index].sem > 0) { // 有空闲信号可使用
						// 占用信号量
						catchers[index].sem--;
						var page = catchers[index].readyList.shift();
						catchers[index].runningList.push(page);
						page.catchers[index].status = PROCESSING;
						catchers[index].instance.run(page, (function (i) {
							var i;
							return function (error) {
								if (error) {
									// 捕捉失败
									page.catchers[i].status = FAILTURE;
									page.catchers[i].error = error;
									console.log('捕获失败：' + page.url);
								} else {
									// 捕捉完成
									page.catchers[i].status = SUCCESS;
									console.log('捕获成功：' + page.url);
								};
								log.weight += 1;
								// 释放信号量
								catchers[i].sem++;
							};
						})(index));
					};
				};
			};
		};

		// 下一个头位置捕获器索引，用于循环捕捉器队列执行优先级
		headCatcher = (headCatcher + 1) % catchers.length;

		// 结束页面批量log
		if (log.weight >= log.size) {
			logPages();
		};

		if (finishCount + log.readyList.finished.length < urls.length) {
			setImmediate(self.collect);
		} else { // 采集完成
			logPages();
			console.log('The collection has finished!');
		};
		return;
	};

	/**
	 * 加载配置
	 * 
	 * @param  {[type]} source_package_dir [description]
	 * @return {[type]}                    [description]
	 */
	this.load = function(source_package_dir) {
		// 读入并解析配置文件
		var sconfig = require(source_package_dir + '/source.json');

		// 配置请求选项
		if (sconfig.request.concurrence !== undefined) request.sem = sconfig.request.concurrence;
		if (sconfig.request.headers !== undefined) request.headers = sconfig.request.headers;
		if (sconfig.request.retry !== undefined) request.retry = sconfig.request.retry;

		// 配置页面内容捕捉器
		for (var i = 0; i < sconfig.catchers.length; i++) {
			var catcher_class = require(source_package_dir + '/' + sconfig.catchers[i].file);
			catchers[i] = {
				instance: new catcher_class(self),
				name: sconfig.catchers[i].name,
				sync: (sconfig.catchers[i].sync === undefined) ? true : sconfig.catchers[i].sync,
				step: (sconfig.catchers[i].step === undefined) ? 10 : sconfig.catchers[i].step,
				readyList: []
			};
			if (!catchers[i].sync) { // 配置异步捕捉器
				catchers[i].sem = (sconfig.catchers[i].concurrence === undefined) ? 25 : sconfig.catchers[i].concurrence;
				catchers[i].runningList = [];
			};
		};

		/*初始化入口页面*/
		if (sconfig.entry_pages === undefined) {
			throw new Error('The config of entry_pages is required.');
		} else if (sconfig.entry_pages.constructor === Array) {
			if (sconfig.entry_pages.length === 0) throw new Error('The config of entry_pages is required.');

			for (var i = 0; i < sconfig.entry_pages.length; i++) {
				self.addPage(sconfig.entry_pages[i]);
			};
		} else {
			self.addPage(sconfig.entry_pages);
		};

		/*Log数据库配置*/

		if (sconfig.log === undefined) sconfig.log = {};

		// 配置主机端口
		log.host = (sconfig.log.host === undefined) ? 'localhost' : sconfig.log.host;
		log.port = (sconfig.log.port === undefined) ? 27017 : sconfig.log.port;

		// 配置log使用的db
		log.db = (sconfig.log.db === undefined) ? 'pagoda' : sconfig.log.db

		// 配置log使用的collections
		log.collections = {
			page: 'pagoda_' + sconfig.name + '_page_log',
			data: 'pagoda_' + sconfig.name + '_data_log',
		};

		// 配置执行一次所需加权量
		log.size = sconfig.log.size ? sconfig.log.size : 300;

		// 配置自定义用户密码
		if (sconfig.log.user === undefined) {
			log.user = sconfig.log.user;
			log.pwd = sconfig.log.pwd;
		};

		// 生成数据库链接dsn
		log.dsn = (log.user === null) ? 
			'mongodb://' + log.host + ':' + log.client + '/' + log.db : 
			'mongodb://' + log.user + ':' + log.pwd + '@' + log.host + ':' + log.client + '/' + log.db;

		/*断点续传处理*/
		co(function*() {
			var db = yield log.client.connect(log.dsn);
			var page_col = db.collection(log.collection.page);
			var docs = yield collection.find().object({url: 1}).toArray();
			for (var i = 0; i < doc.length; i++) { // 添加全部页面的url到内存，用于防止重复采集。
				urls.push(doc[i].url);
				// 及时清理内存，防止内存泄露。
				doc[i] = 0;
			};
			// 及时清理内存，防止内存泄露。
			docs = [];

			// 查询所有未完成页面
			docs = yield collection.find({undoneCount: {'$gt': 0}}).toArray();

			for (var i = 0; i < docs.length; i++) {
				if (docs[i].request.status !== SUCCESS) { // 请求未完成，加入请求队列
					request.readyList.push(docs[i]);
				} else { // 请求已完成，加入相应捕获队列
					var catch_status = 1; // 控制全部捕获状态
					for (var j = 0; j < docs[i].catchers.length; j++) {
						if (docs[i].catchers[j].status !== SUCCESS) { // 捕获未成功，加入相应捕获队列
							catchers[j].readyList.push(docs[i]);
							catch_status = 0;
						};
					};

					if (catch_status) { // 全部捕获完成，检查数据处理工作

					};
				};
			};

			// 关闭数据库，释放资源
			db.close();
		});

		// 加载request模块
		request.instance = require("request");
		return self;
	};
};

module.exports = new CollectController();