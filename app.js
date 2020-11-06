define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster');

	var app = {
		name: '2fa',

		css: [ 'app' ],

		i18n: {
			'en-US': { customCss: false },
			'fr-FR': { customCss: false }
		},

		// Defines API requests not included in the SDK
		requests: {
			'qrcodes.get': {
				url: 'accounts/{accountId}/users/{userId}/qrcodes',
				verb: 'GET'
			},
			'qrcodes.update': {
				url: 'accounts/{accountId}/users/{userId}/qrcodes/{qrcodeId}',
				verb: 'PATCH'
			},
			'qrcodes.delete': {
				url: 'accounts/{accountId}/users/{userId}/qrcodes/{qrcodeId}',
				verb: 'DELETE'
			},
			'mfa.get': {
				url: 'accounts/{accountId}/multi_factor',
				verb: 'GET'
			},
			'qrcodes.put': {
				url: 'accounts/{accountId}/users/{userId}/qrcodes',
				verb: 'PUT'
			}
		},

		// Define the events available for other apps
		subscribe: {},

		// Method used by the Monster-UI Framework, shouldn't be touched unless you're doing some advanced kind of stuff!
		load: function(callback) {
			var self = this;

			self.initApp(function() {
				callback && callback(self);
			});
		},

		// Method used by the Monster-UI Framework, shouldn't be touched unless you're doing some advanced kind of stuff!
		initApp: function(callback) {
			var self = this;

			// Used to init the auth token and account id of this app
			monster.pub('auth.initApp', {
				app: self,
				callback: callback
			});
		},

		// Entry Point of the app
		render: function(container) {
			var self = this,
			  $container = _.isEmpty(container) ? $('#monster_content') : container,
			  $layout = $(self.getTemplate({
				name: 'layout',
				data: {mfa_enabled: false}
			  }));

			self.bindEvents({
				template: $layout
			});

			self.mfaGetData(function(data) {
				var dataTemplate = self.MfaFormatListData(data);

				var templateMfa;

				_.each(dataTemplate.MfaProviders, function(provider) {
						templateMfa = $(self.getTemplate({
								name: 'provider-row',
								data: provider
						}));

						$container.find('.2fa-rows').append(templateMfa);
				});

				if (dataTemplate.MfaProviders.length === 0) {
						$container.find('.no-2fa-row').css('display', 'block');
				} else {
						$container.find('.no-2fa-row').css('display', 'none');
				}
			});

			self.getQRCode(function(data) {
				$container.find('.switch-state').prop('checked', data.enabled);
			});
		
			$container
			  .empty()
			  .append($layout);
		  },
		
		  bindEvents: function(args) {
			var self = this,
			  $template = args.template;
		
			$template.find('#display').on('click', function(e) {
			  self.displayQRCode(function(image) {
				var $qrcode = new Image();
				$qrcode.id = 'qrcodeicon';
				$qrcode.height = 500;
				$qrcode.width = 500;
				$qrcode.alt = 'QRCode goes here'
				$qrcode.src = 'data:image/png;base64, ' + image;
				$template
          				.find('.results')
          				.empty()
          				.append($qrcode);
			  });
			});

			$template.find('#create').on('click', function(e) {
				self.newQRCode(function(response) {
					monster.ui.alert('info', response.result);
				});
			  });

		    $template.find('.switch-state').on('change', function() {
			  var toggle = $(this);
			  var enable = toggle.prop('checked');

	   		  self.getQRCode(function(data) {
			  		data.enabled = enable;
	   		  		self.updateQRCode(data, function(data) {
			  		},
			  		function() {
			  				toggle.prop('checked', !enable);
			  		});
			  },
			  function() {
			  		toggle.prop('checked', !enable);
			  });
			});
		  },
		
		  displayQRCode: function(callback) {
			var self = this;
		
			monster.request({
			  resource: 'qrcodes.get',
			  data: {
				accountId: self.accountId,
				userId: self.userId
			  },
			  success: function(data) {
				callback(data.data[0].image);
			  },
			  error: function(response) {
				monster.ui.alert('error', response.message);
			  }
			});
		  },
		  
		  getQRCode: function(callback) {
			var self = this;
		
			monster.request({
			  resource: 'qrcodes.get',
			  data: {
				accountId: self.accountId,
				userId: self.userId
			  },
			  success: function(data) {
				callback(data.data[0]);
			  },
			  error: function(response) {
				monster.ui.alert('error', response.message);
			  }
			});
		  },

		  updateQRCode: function(data, callback) {
			var self = this;
		
			monster.request({
			  resource: 'qrcodes.update',
			  data: {
				accountId: self.accountId,
				userId: self.userId,
				qrcodeId: data.id,
				data: {'enabled': data.enabled}
			  },
			  success: function(data) {
				callback(data.data);
			  },
			  error: function(response) {
				monster.ui.alert('error', response.message);
			  }
			});
		  },

		  newQRCode: function(callback) {
			var self = this;
			var qrcodes = [];
		
			monster.request({
				resource: 'qrcodes.get',
				data: {
				  accountId: self.accountId,
				  userId: self.userId
				},
				success: function(data) {
					qrcodes = data.data;
					_.each(qrcodes, function(qrcode) {
						monster.request({
							resource: 'qrcodes.delete',
							data: {
							  accountId: self.accountId,
							  userId: self.userId,
							  qrcodeId: qrcode.id,
							},
							success: function(data) {
							},
							error: function(response) {
							  monster.ui.alert('error', response.message);
							}
						});
					});
					monster.request({
						resource: 'qrcodes.put',
						data: {
						  accountId: self.accountId,
						  userId: self.userId
						},
						success: function(data) {
						  callback(data.data);
						},
						error: function(response) {
						  monster.ui.alert('error', response.message);
						}
					});
				},
				error: function(response) {
				  monster.ui.alert('error', response.message);
				}
			});
		  },

		  mfaGetData: function(callback) {
			var self = this;
		
			monster.request({
			  resource: 'mfa.get',
			  data: {
				accountId: self.accountId
			  },
			  success: function(data) {
				callback(data);
			  },
			  error: function(response) {
				monster.ui.alert('error', response.message);
			  }
			});
		  },

		  MfaFormatListData: function(results) {
			return {
					countMfaProviers: _.size(results.data.configured),
					MfaProviders: results.data.configured

			};
		  }

	};

	return app;
});
