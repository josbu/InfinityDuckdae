// SPDX-License-Identifier: Apache-2.0

'use strict';
'require form';
'require fs';
'require ui';
'require view';
'require poll';
'require uci';
'require rpc';

var callFileWrite = rpc.declare({
	object: 'file',
	method: 'write',
	params: [ 'path', 'data' ],
	expect: { result: false }
});

return view.extend({
	handleSaveApply: function(ev, mode) {
		var value = document.getElementById('cbid_duck_config__configuration').value;
		
		if (!value) {
			ui.addNotification(null, E('p', _('Configuration cannot be empty!')), 'error');
			return Promise.reject(new Error('Empty configuration'));
		}
		
		// 首先尝试验证配置文件格式 - 这里可以增加更多验证逻辑
		if (!this.validateConfig(value)) {
			ui.addNotification(null, E('p', _('Configuration validation failed!')), 'error');
			return Promise.reject(new Error('Invalid configuration'));
		}
		
		return callFileWrite('/etc/duck/config.dae', value).then(function() {
			return L.resolveDefault(fs.exec_direct('/etc/init.d/duck', ['hot_reload']), null).then(function() {
			});
		}).catch(function(e) {
			ui.addNotification(null, E('p', _('Failed to save configuration: %s').format(e.message)));
			return Promise.reject(e);
		});
	},
	
	validateConfig: function(config) {
		// 基本验证 - 检查是否有匹配的花括号等
		var braceCount = 0;
		
		for (var i = 0; i < config.length; i++) {
			if (config[i] === '{') braceCount++;
			if (config[i] === '}') braceCount--;
			
			// 括号不平衡，提前失败
			if (braceCount < 0) return false;
		}
		
		// 所有括号应该匹配
		return braceCount === 0;
	},

	load: function() {
		return fs.read_direct('/etc/duck/config.dae', 'text')
			.then(function(content) {
				return content ?? '';
			}).catch(function(e) {
				if (e.toString().includes('NotFoundError'))
					return fs.read_direct('/etc/duck/example.duck', 'text')
						.then(function(content) {
							return content ?? '';
						}).catch(function(e) {
							return '';
						});

				ui.addNotification(null, E('p', e.message));
				return '';
			});
	},

	render: function(content) {
		var m, s, o;
		var editorInstance = null;
		var self = this;
		
		self.formvalue = {};

		var css = E('style', {}, `
			#code_editor {
				height: 500px;
				width: 100%;
				border: 1px solid #ccc;
			}
			.CodeMirror {
				height: 100%;
				font-size: 14px;
				line-height: 1.5;
				@media (prefers-color-scheme: dark) {
					#code_editor {
						border-color: #555;
					}
				}
			}
		`);

		var editorDiv = E('div', { id: 'code_editor' });
		var scriptDiv = E('div');
		var hiddenInput = E('input', {
			type: 'hidden',
			id: 'cbid_duck_config__configuration',
			name: 'cbid.duck.config._configuration',
			value: content
		});

		m = new form.Map('duck', _('Configuration'),
			_('Here you can edit duck configuration. It will be hot-reloaded automatically after apply.'));

			// 监听表单提交
		m.onValidate = function(map, data) {
			self.formvalue = data;
		};

		// 禁用默认保存行为，改用我们自定义的保存函数
		m.submitSave = function() {
			return false;
		};

		s = m.section(form.TypedSection);
		s.anonymous = true;
		
		s.render = function() {
			return E('div', { 'class': 'cbi-section' }, [
				css,
				editorDiv,
				hiddenInput,
				scriptDiv
			]);
		};
		
		var formEl = m.render();
		
		window.setTimeout(function() {
			// 加载CodeMirror主脚本
			var cmScript = document.createElement('script');
			cmScript.src = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/codemirror.min.js";
			cmScript.crossOrigin = "anonymous";
			cmScript.referrerPolicy = "no-referrer";
			
			// 加载CodeMirror样式
			var cmStyle = document.createElement('link');
			cmStyle.rel = "stylesheet";
			cmStyle.href = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/codemirror.min.css";
			cmStyle.crossOrigin = "anonymous";
			
			// 加载亮色主题
			var lightThemeStyle = document.createElement('link');
			lightThemeStyle.rel = "stylesheet";
			lightThemeStyle.href = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/theme/eclipse.min.css";
			lightThemeStyle.crossOrigin = "anonymous";
			
			// 加载深色主题
			var darkThemeStyle = document.createElement('link');
			darkThemeStyle.rel = "stylesheet";
			darkThemeStyle.href = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/theme/dracula.min.css";
			darkThemeStyle.crossOrigin = "anonymous";
			
			document.head.appendChild(cmStyle);
			document.head.appendChild(lightThemeStyle);
			document.head.appendChild(darkThemeStyle);
			scriptDiv.appendChild(cmScript);
			
			cmScript.onload = function() {
				 // 为duck语言定义简单的语法高亮
				CodeMirror.defineMode("duck", function() {
					return {
						token: function(stream, state) {
							// 处理注释
							if (stream.match(/^#.*/)) return "comment";
							if (stream.match(/^\/\*/)) {
								state.inComment = true;
								return "comment";
							}
							
							if (state.inComment) {
								if (stream.match(/\*\//)) {
									state.inComment = false;
									return "comment";
								}
								stream.next();
								return "comment";
							}
							
							// 处理字符串
							if (stream.match(/^"(?:[^"\\]|\\.)*"/)) return "string";
							if (stream.match(/^'(?:[^'\\]|\\.)*'/)) return "string";
							
							// 处理关键词
							if (stream.match(/\b(?:block|direct)\b/)) return "keyword";
							
							// 处理运算符
							if (stream.match(/->|&&|!/)) return "operator";
							
							// 处理括号
							if (stream.match(/[{}()]/)) return "bracket";
							
							// 处理属性定义
							if (stream.match(/[a-zA-Z_][a-zA-Z_\/\\^*.+0-9\-=@$!#%]*:/)) return "property";
							
							// 处理变量/标识符
							if (stream.match(/[a-zA-Z_][a-zA-Z_\/\\^*.+0-9\-=@$!#%]*/)) return "variable";
							
							stream.next();
							return null;
						},
						
						startState: function() {
							return {inComment: false};
						}
					};
				});
				
				 // 检测系统颜色方案
				var prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
				var currentTheme = prefersDarkMode ? 'dracula' : 'eclipse';
				
				// 初始化编辑器
				editorInstance = CodeMirror(document.getElementById('code_editor'), {
					value: content,
					mode: "duck",
					lineNumbers: true,
					indentUnit: 4,
					tabSize: 4,
					indentWithTabs: true,
					lineWrapping: true,
					theme: currentTheme
				});
				
				// 监听系统主题变化并更新编辑器主题
				window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
					var newTheme = e.matches ? 'dracula' : 'eclipse';
					editorInstance.setOption('theme', newTheme);
				});
				
				// 编辑器内容变更时更新隐藏输入
				editorInstance.on('change', function() {
					hiddenInput.value = editorInstance.getValue();
					document.getElementById('cbid_duck_config__configuration').value = editorInstance.getValue();
					self.formvalue.cbid_duck_config__configuration = editorInstance.getValue();
				});
			};
		}, 100);
		
		return formEl;
	}
});
