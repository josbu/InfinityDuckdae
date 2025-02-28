// SPDX-License-Identifier: Apache-2.0

'use strict';
'require dom';
'require fs';
'require poll';
'require view';

return view.extend({
	render: function() {
		/* Thanks to luci-app-aria2 */
		var css = '					\
			#log_textarea {				\
				text-align: left;			\
				max-height: 70vh;		\
				overflow-y: auto;			\
				color-scheme: light dark;	\
			}					\
			#log_textarea pre {			\
				padding: .5rem;			\
				word-break: break-all;		\
				margin: 0;			\
			}					\
			.description {				\
				background-color: #33ccff;	\
				}					\
			#log_textarea::-webkit-scrollbar {	\
				width: 8px;			\
			}					\
			#log_textarea::-webkit-scrollbar-track {\
				background: rgba(0, 0, 0, 0.05);	\
			}					\
			#log_textarea::-webkit-scrollbar-thumb {\
				background: rgba(0, 0, 0, 0.2);	\
				border-radius: 4px;		\
			}					\
			#log_textarea::-webkit-scrollbar-thumb:hover {\
				background: rgba(0, 0, 0, 0.3);	\
			}					\
			@media (prefers-color-scheme: dark) {	\
				#log_textarea::-webkit-scrollbar-track {\
					background: rgba(255, 255, 255, 0.05);\
				}				\
				#log_textarea::-webkit-scrollbar-thumb {\
					background: rgba(255, 255, 255, 0.2);\
				}				\
				#log_textarea::-webkit-scrollbar-thumb:hover {\
					background: rgba(255, 255, 255, 0.3);\
				}				\
			}';

		var log_textarea = E('div', { 'id': 'log_textarea' },
			E('img', {
				'src': L.resource('icons/loading.gif'),
				'alt': _('Loading...'),
				'style': 'vertical-align:middle'
			}, _('Collecting data…'))
		);

		poll.add(L.bind(function() {
			return fs.read_direct('/var/log/duck/duck.log', 'text')
			.then(function(content) {
				var contentLines = content.trim().split(/\r?\n/);
				var reversedContent = contentLines.reverse().join('\n');
				
				var log = E('pre', { 'wrap': 'pre' }, [
					reversedContent || _('Log is empty.')
				]);

				dom.content(log_textarea, log);
			}).catch(function(e) {
				var log;

				if (e.toString().includes('NotFoundError'))
					log = E('pre', { 'wrap': 'pre' }, [
						_('Log file does not exist.')
					]);
				else
					log = E('pre', { 'wrap': 'pre' }, [
						_('Unknown error: %s').format(e)
					]);

				dom.content(log_textarea, log);
			});
		}));

		var scrollDownButton = E('button', {
				'id': 'scrollDownButton',
				'class': 'cbi-button cbi-button-neutral',
			}, _('Scroll to tail', 'scroll to bottom (the tail) of the log file')
		);
		scrollDownButton.addEventListener('click', function() {
			var logContainer = document.getElementById('log_textarea');
			if (logContainer) {
				logContainer.scrollTop = logContainer.scrollHeight;
			}
		});

		var scrollUpButton = E('button', {
				'id' : 'scrollUpButton',
				'class': 'cbi-button cbi-button-neutral',
			}, _('Scroll to head', 'scroll to top (the head) of the log file')
		);
		scrollUpButton.addEventListener('click', function() {
			var logContainer = document.getElementById('log_textarea');
			if (logContainer) {
				logContainer.scrollTop = 0;
			}
		});

		return E([
			E('style', [ css ]),
			E('h2', {}, [ _('Log') ]),
			E('div', {'class': 'cbi-map'}, [
				E('div', {'style': 'padding-bottom: 20px'}, [scrollDownButton]),
				E('div', {'class': 'cbi-section'}, [
					log_textarea,
					E('div', {'style': 'text-align:right'},
						E('small', {}, _('Refresh every %s seconds.').format(L.env.pollinterval))
					)
				]),
				E('div', {'style': 'padding-bottom: 20px'}, [scrollUpButton])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
