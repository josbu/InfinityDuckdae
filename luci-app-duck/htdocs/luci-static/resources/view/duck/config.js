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
		
		if (!this.validateConfig(value)) {
			ui.addNotification(null, E('p', _('Configuration validation failed!')), 'error');
			return Promise.reject(new Error('Invalid configuration'));
		}
		
		return callFileWrite('/etc/duck/config.dae', value)
        .then(function() {
            return L.resolveDefault(fs.exec_direct('/bin/chmod', ['0600', '/etc/duck/config.dae']), null)
                .then(function() {
                    return fs.exec_direct('/etc/init.d/duck', ['status'])
                        .then(function(res) {
                            if (res.code !== 0) {
                                return L.resolveDefault(fs.exec_direct('/etc/init.d/duck', ['restart']), null);
                            } else {
                                return L.resolveDefault(fs.exec_direct('/etc/init.d/duck', ['hot_reload']), null);
                            }
                        });
                });
        }).catch(function(e) {
            ui.addNotification(null, E('p', _('Failed to save configuration: %s').format(e.message)));
            return Promise.reject(e);
        });
	},
	
	validateConfig: function(config) {
		var braceCount = 0;
		
		for (var i = 0; i < config.length; i++) {
			if (config[i] === '{') braceCount++;
			if (config[i] === '}') braceCount--;
			
			if (braceCount < 0) return false;
		}
		
		return braceCount === 0;
	},

	load: function() {
		return fs.read_direct('/etc/duck/config.dae', 'text')
			.then(function(content) {
				return content ?? '';
			}).catch(function(e) {
				if (e.toString().includes('NotFoundError'))
					return fs.read_direct('/etc/duck/example.dae', 'text')
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
			_('Here you can edit dae configuration. It will be hot-reloaded automatically after apply.'));

		m.onValidate = function(map, data) {
			self.formvalue = data;
		};

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
			var cmScript = document.createElement('script');
			cmScript.src = "/luci-static/resources/codemirror/codemirror.min.js";
			
			var cmStyle = document.createElement('link');
			cmStyle.rel = "stylesheet";
			cmStyle.href = "/luci-static/resources/codemirror/codemirror.min.css";
			
			var lightThemeStyle = document.createElement('link');
			lightThemeStyle.rel = "stylesheet";
			lightThemeStyle.href = "/luci-static/resources/codemirror/theme/eclipse.min.css";
			
			var darkThemeStyle = document.createElement('link');
			darkThemeStyle.rel = "stylesheet";
			darkThemeStyle.href = "/luci-static/resources/codemirror/theme/dracula.min.css";
			
			document.head.appendChild(cmStyle);
			document.head.appendChild(lightThemeStyle);
			document.head.appendChild(darkThemeStyle);
			scriptDiv.appendChild(cmScript);
			
			cmScript.onload = function() {
				CodeMirror.defineMode("duck", function() {
					return {
						token: function(stream, state) {
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
							
							if (stream.match(/^"(?:[^"\\]|\\.)*"/)) return "string";
							if (stream.match(/^'(?:[^'\\]|\\.)*'/)) return "string";
							
							if (stream.match(/\b(?:block|direct)\b/)) return "keyword";
							
							if (stream.match(/->|&&|!/)) return "operator";
							
							if (stream.match(/[{}()]/)) return "bracket";
							
							if (stream.match(/[a-zA-Z_][a-zA-Z_\/\\^*.+0-9\-=@$!#%]*:/)) return "property";
							
							if (stream.match(/[a-zA-Z_][a-zA-Z_\/\\^*.+0-9\-=@$!#%]*/)) return "variable";
							
							stream.next();
							return null;
						},
						
						startState: function() {
							return {inComment: false};
						}
					};
				});
				
				var prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
				var currentTheme = prefersDarkMode ? 'dracula' : 'eclipse';
				
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
				
				window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
					var newTheme = e.matches ? 'dracula' : 'eclipse';
					editorInstance.setOption('theme', newTheme);
				});
				
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
