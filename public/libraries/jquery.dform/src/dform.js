/*
 * jQuery dform plugin
 * Copyright (C) 2012 David Luecke <daff@neyeon.com>, [http://daffl.github.com/jquery.dform]
 * 
 * Licensed under the MIT license
 */
(function ($) {
	var _subscriptions = {},
		_types = {},
		each = $.each,
		addToObject = function(obj) {
			var result = function (data, fn, condition) {
				if(typeof data === 'object') {
					$.each(data, function(name, val) {
						result(name, val, condition);
					});
				} else if(condition === undefined || condition === true) {
					if(!obj[data]) {
						obj[data] = [];
					}
					obj[data].push(fn);
				}
			}
			return result;
		},
		isArray = $.isArray,
		/**
		 * Returns an array of keys (properties) contained in the given object.
		 *
		 * @param {Object} object The object to use
		 * @return {Array} An array containing all properties in the object
		 */
		keyset = function (object) {
			return $.map(object, function (val, key) {
				return key;
			});
		},
		/**
		 * Returns an object that contains all values from the given
		 * object that have a key which is also in the array keys.
		 *
		 * @param {Object} object The object to traverse
		 * @param {Array} keys The keys the new object should contain
		 * @return {Object} A new object containing only the properties
		 * with names given in keys
		 */
		withKeys = function (object, keys) {
			var result = {};
			each(keys, function (index, value) {
				if (object[value]) {
					result[value] = object[value];
				}
			});
			return result;
		},
		/**
		 * Returns an object that contains all value from the given
		 * object that do not have a key which is also in the array keys.
		 *
		 * @param {Object} object The object to traverse
		 * @param {Array} keys A list of keys that should not be contained in the new object
		 * @return {Object} A new object with all properties of the given object, except
		 * for the ones given in the list of keys
		 */
		withoutKeys = function (object, keys) {
			var result = {};
			each(object, function (index, value) {
				if (!~$.inArray(index, keys)) {
					result[index] = value;
				}
			});
			return result;
		},
		/**
		 * Run all subscriptions with the given name and options
		 * on an element.
		 *
		 * @param {String} name The name of the subscriber function
		 * @param {Object} options ptions for the function
		 * @param {String} type The type of the current element as in the registered types
		 * @return {Object} The jQuery object
		 */
		runSubscription = function (name, options, type) {
			if ($.dform.hasSubscription(name)) {
				this.each(function () {
					var element = $(this);
					each(_subscriptions[name], function (i, sfn) {
						// run subscriber function with options
						sfn.call(element, options, type);
					});
				});
			}
			return this;
		},
		/**
		 * Run all subscription functions with given options.
		 *
		 * @param {Object} options The options to use
		 * @return {Object} The jQuery element this function has been called on
		 */
		runAll = function (options) {
			var type = options.type, self = this;
			// Run preprocessing subscribers
			this.dform('run', '[pre]', options, type);
			each(options, function (name, sopts) {
				self.dform('run', name, sopts, type);
			});
			// Run post processing subscribers
			this.dform('run', '[post]', options, type);
			return this;
		};

	/**
	 * Globals added directly to the jQuery object
	 */
	$.extend($, {
		keyset : keyset,
		withKeys : withKeys,
		withoutKeys : withoutKeys,
		dform : {
			/**
			 * Default options the plugin is initialized with:
			 *
			 * ## prefix
			 *
			 * The Default prefix used for element classnames generated by the dform plugin.
			 * Defaults to _ui-dform-_
			 * E.g. an element with type text will have the class ui-dform-text
			 *
			 */
			options : {
				prefix : "ui-dform-"
			},

			/**
			 * A function that is called, when no registered type has been found.
			 * The default behaviour returns an HTML element with the tag
			 * as specified in type and the HTML attributes given in options
			 * (without subscriber options).
			 *
			 * @param {Object} options
			 * @return {Object} The created object
			 */
			defaultType : function (options) {
				return $("<" + options.type + ">").dform('attr', options);
			},
			/**
			 * Return all types.
			 *
			 * @params {String} name (optional) If passed return
			 * all type generators for a given name.
			 * @return {Object} Mapping from type name to
			 * an array of generator functions.
			 */
			types : function (name) {
				return name ? _types[name ] : name;
			},
			/**
			 * Register an element type function.
			 *
			 * @param {String|Array} data Can either be the name of the type
			 * function or an object that contains name : type function pairs
			 * @param {Function} fn The function that creates a new type element
			 */
			addType : addToObject(_types),
			/**
			 * Returns all subscribers or all subscribers for a given name.
			 *
			 * @params {String} name (optional) If passed return all
			 * subscribers for a given name
			 * @return {Object} Mapping from subscriber names
			 * to an array of subscriber functions.
			 */
			subscribers : function(name) {
				return name ? _subscriptions[name] : _subscriptions;
			},
			/**
			 * Register a subscriber function.
			 *
			 * @param {String|Object} data Can either be the name of the subscriber
			 * function or an object that contains name : subscriber function pairs
			 * @param {Function} fn The function to subscribe or nothing if an object is passed for data
			 * @param {Array} deps An optional list of dependencies
			 */
			subscribe : addToObject(_subscriptions),
			/**
			 * Returns if a subscriber function with the given name
			 * has been registered.
			 *
			 * @param {String} name The subscriber name
			 * @return {Boolean} True if the given name has at least one subscriber registered,
			 *	 false otherwise
			 */
			hasSubscription : function (name) {
				return _subscriptions[name] ? true : false;
			},
			/**
			 * Create a new element.
			 *
			 * @param {Object} options - The options to use
			 * @return {Object} The element as created by the builder function specified
			 *	 or returned by the defaultType function.
			 */
			createElement : function (options) {
				if (!options.type) {
					throw "No element type given! Must always exist.";
				}
				var type = options.type,
					element = null,
					// We don't need the type key in the options
					opts = $.withoutKeys(options, ["type"]);

				if (_types[type]) {
					// Run all type element builder functions called typename
					each(_types[type], function (i, sfn) {
						element = sfn.call(element, opts);
					});
				} else {
					// Call defaultType function if no type was found
					element = $.dform.defaultType(options);
				}
				return $(element);
			},
			methods : {
				/**
				 * Run all subscriptions with the given name and options
				 * on an element.
				 *
				 * @param {String} name The name of the subscriber function
				 * @param {Object} options ptions for the function
				 * @param {String} type The type of the current element as in the registered types
				 * @return {Object} The jQuery object
				 */
				run : function (name, options, type) {
					if (typeof name !== 'string') {
						return runAll.call(this, name);
					}
					return runSubscription.call(this, name, options, type);
				},
				/**
				 * Creates a form element on an element with given options
				 *
				 * @param {Object} options The options to use
				 * @return {Object} The jQuery element this function has been called on
				 */
				append : function (options, converter) {
					if (converter && $.dform.converters && $.isFunction($.dform.converters[converter])) {
						options = $.dform.converters[converter](options);
					}
					// Create element (run builder function for type)
					var element = $.dform.createElement(options);
					this.append(element);
					// Run all subscriptions
					element.dform('run', options);
				},
				/**
				 * Adds HTML attributes to the current element from the given options.
				 * Any subscriber will be omitted so that the attributes will contain any
				 * key value pair where the key is not the name of a subscriber function
				 * and is not in the string array excludes.
				 *
				 * @param {Object} object The attribute object
				 * @param {Array} excludes A list of keys that should also be excluded
				 * @return {Object} The jQuery object of the this reference
				 */
				attr : function (object, excludes) {
					// Ignore any subscriber name and the objects given in excludes
					var ignores = $.keyset(_subscriptions);
					isArray(excludes) && $.merge(ignores, excludes);
					this.attr($.withoutKeys(object, ignores));
				},
				/**
				 *
				 *
				 * @param params
				 * @param success
				 * @param error
				 */
				ajax : function (params, success, error) {
					var options = {
						error : error,
						url : params
					}, self = this;
					if (typeof params !== 'string') {
						$.extend(options, params);
					}
					options.success = function (data) {
						self.dform(data);
						success(data);
					}
					$.ajax(options);
				},
				/**
				 *
				 *
				 * @param options
				 */
				init : function (options, converter) {
					var opts = options.type ? options : $.extend({ "type" : "form" }, options);
					if (converter && $.dform.converters && $.isFunction($.dform.converters[converter])) {
						opts = $.dform.converters[converter](opts);
					}
					if (this.is(opts.type)) {
						this.dform('attr', opts);
						this.dform('run', opts);
					} else {
						this.dform('append', opts);
					}
				}
			}
		}
	});

	/**
	 * The jQuery plugin function
	 *
	 * @param options The form options
	 * @param {String} converter The name of the converter in $.dform.converters
	 * that will be used to convert the options
	 */
	$.fn.dform = function (options, converter) {
		var self = $(this);
		if ($.dform.methods[options]) {
			$.dform.methods[options].apply(self, Array.prototype.slice.call(arguments, 1));
		} else {
			$.dform.methods.init.apply(self, arguments);
		}
		return this;
	}
})(jQuery);
