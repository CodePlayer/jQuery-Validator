/**************************************
 @Name: jQuery-Validator 基于jQuery的表单验证框架
 @Version: 1.3.0 beta
 @Author: Ready
 @Date: 2015-02-25
 @Documentation: http://www.365mini.com/page/jquery-validator-quickstart.htm
 @Copyright: CodePlayer( Ready )
 @Email: CodePlayer360@gmail.com
 @Licence: https://www.apache.org/licenses/LICENSE-2.0.html
*/
!function ($, global) {
	var console = global && global.console;
	if(typeof jQuery === "undefined" || $ !== jQuery){
		console && console.log("jQuery must be initialized before loading the Validator.");
		return;
	};
	var V = function(method){
		if(!(this instanceof V)){
			return new V(method);
		}
		if( !method ) method = "v";
		if( !$.fn[method] ){
			var me = this;
			$.fn[method] = function(eventType, rules){
				return me.execute(this, eventType, rules);
			};
		}
	}, cache = V.cache = { },
	// 输出日志信息
	log = V.log = function(){
		if(console){
			for(var i = 0; i < arguments.length; i++){
				console.log(arguments[i]);
			}
			return true;
		}
	},
	fn = V.fn = V.prototype = {
		// 版本号
		version: "1.3",

		constructor: V,
		
		// 获取元素的值
		getValue: function($dom, context){
			return $dom.val();
		},

		// 严格模式:如果为false,则指定选择器没有对应元素时,直接忽略该元素的校验
		strict: true,

		// 将指定值包裹为jQuery对象
		$: function( input, $context ){
			if(!input) return null;
			if(input instanceof $){
				return input;
			}else if($.type(input) === "string"){
				var ch = input.charAt(0);
				if(ch != "#"){
					if(ch == "$") input = input.substr(1);
					input = "[name='" + input + "']";
				}
			}
			return $(input, $context);
		},

		// 默认规则
		defaultRules: {
			required: true
		},
		// 处理规则的扩展(继承)
		extendRule:function(clone, rule, defaultRule){
			var result = clone ? $.extend( {}, rule) : rule, _extend = rule.extend, _ext;
			while(_extend){
				_ext = this.getRule(_extend);
				if(!_ext) throw "extended rule not found:" + _extend;
				for(i in _ext){
					if( !(i in result) ){
						result[i] = _ext[i];
					}
				}
				_extend = _ext.extend;
			}
			if(defaultRule){
				for(i in defaultRule){
					if( !(i in result) ){
						result[i] = defaultRule[i];
					}
				}
			}
			if(result.extend) delete result.extend;
			return result;
		},

		// 对单个元素的校验规则进行处理
		clipRule: function(rule, context){
			return this.extendRule(true, rule, this.defaultRules);
		},
		// 后置处理
		afterHandler: function(result, context){
			var handler = context.rule.after;
			if(handler && $.isFunction(handler)) handler.call(this, result, context);
			return result;									
		},		
		 // 元素值预处理器，必须返回值
		pre: {
			// 去除两侧的空白字符
			trim: function(value, context){
				return $.trim(value);
			},
			// 去除所有的空白字符
			trimAll: function(value, context){
				cache.__whiteSpace || (cache.__whiteSpace = /\s/g);
				return value ? value.replace(cache.__whiteSpace, "") : value;
			},
			// 字母转小写
			lower: function(value, context){
				return value ? value.toLowerCase() : value;
			},
			// 字母转大写
			upper: function(value, context){
				return value ? value.toUpperCase() : value;
			},
			// 刷新：将预处理后的值放回元素的value中
			flush: function(value, context){
				context.$dom && context.$dom.val(value);
				return value;
			}
		},
 		// 格式化器：根据指定的表达式进行格式化，并返回格式化后的内容,格式化失败，返回false或Error对象
		formatter: {
			// 数字格式化器：返回数字
			// "number[/[+|-][int|integer|float|double|money|{位数正则}.{位数正则}]]"
			number: function(value, expr, context){
				var regex = cache[context.rule.format];
				if(!regex){
					if(!expr) expr = "+int";
					var sign = expr.charAt(0), signExpr = "";
					// 符号位
					switch(sign){
						case "+":
							break;
						case "-":
							signExpr = "-";
							break;
						case "?":
							signExpr = "-?";
							break;
						default:
							sign = "+";
							expr = sign + expr;
					}
					// 位数表达式
					var subExpr = expr.substr(1);
					switch(subExpr){
						case "int":
						case "integer":
							regex = new RegExp("^" + signExpr + "\\d+$");
							break;
						case "money":
							regex = new RegExp("^" + signExpr + "\\d+(\\.\\d{1,2})?$");
							break;
						case "float":
						case "double":
							regex = new RegExp("^" + signExpr + "\\d+(\\.\\d+)?$");
							break;
						default:
							var subArray = subExpr.split(".", 2);
							regex = "^" + signExpr + "\\d" + subArray[0];
							if(subArray[1]) regex += "\\.\\d" + subArray[1];
							regex = new RegExp(regex + "$");
					}
					cache[context.rule.format] = regex;
				}
				V.debug && log( "number formatter [" + expr + "] regexp:", regex );
				if(regex.test(value)){
					return parseFloat(value);
				}
				return false;
			},
			// 日期格式化器：返回日期
			// "date[/[yyyy-MM-dd|yyyy-MM-dd HH:mm:ss]]"
			date: function(value, expr, context){
				if(!expr) expr = "yyyy-MM-dd";
				else if(expr == "datetime") expr = "yyyy-MM-dd HH:mm:ss";
				else if(expr == "time") expr = "HH:mm:ss";
				context.dateFormat = expr;
				if(!value || value.length != expr.length) return false;
				var pattern = cache[context.rule.format], part;
				// pattern = {yyyy:[begin,end], MM:[begin,end], dd:[begin,end], HH:[begin,end], mm:[begin,end], ss:[begin,end]}
				if(!pattern){
					var datePattern = cache.__date || ( cache.__date = new RegExp("yyyy|MM|dd|HH|mm|ss", "g") ), pattern = {};
					datePattern.lastIndex = 0;
					while(part = datePattern.exec(expr)){
						pattern[part[0]] = [part.index, part.index + part[0].length];
					}
					cache[context.rule.format] = pattern;
				}
				V.debug && log( "date pattern:", pattern );
				var parts = {} , chars = value.split("");
				for(var i in pattern){
					part = pattern[i];
					for(var j = part[0]; j < part[1]; j++){
						chars[j] = true;
					}
					part = value.substring(part[0], part[1]);
					parts[i] = parseInt(part, 10);
					if(parts[i] != part) return false;
				}
				for(var i in chars){
					if(chars[i] !== true && chars[i] !== expr[i]){
						return false;
					}
				}
				if(parts.MM) parts.MM--; // 实际月份数值需要减1
				return new Date(parts.yyyy, parts.MM || 0, parts.dd || 1, parts.HH || 0, parts.mm || 0, parts.ss || 0);
			},
			// 身份证格式化器：返回日期
			// "idcard/?:[18,]"
			idcard: function(value, expr, context){
				var pattern = cache[context.rule.format];
				if(!pattern){
					if(!expr)
						pattern = ["?", null];
					else {
						pattern = expr.split(":", 2);
						if(pattern.length == 1 && pattern[0].length > 2){
							pattern = ["?", pattern[0]];
						}
					}
					cache[context.rule.format] = pattern;
				}
				V.debug && log( "idcard pattern:", pattern );
				if(!value || (pattern[0] == "?" && value.length != 15 && value.length != 18) || value.length != pattern[0]) return false;
				var isNew = value.length == 18;
				if(isNew){ // 18位身份证校验位校验
					var factors = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2], sum = 0;
					for(var i = 0; i < factors.length; i++){
						sum += value.charAt(i) * factors[i];
					}
					if( isNaN(sum) || value.charAt(17) != "10X98765432".charAt(sum % 11) ){
						return false;
					}
				}
				var begin = 6, yyyy = value.substring(begin, begin += isNew ? 4 : 2), MM = value.substring(begin, begin += 2), dd = value.substring(begin, begin += 2);
				if(!isNew) yyyy = "19" + yyyy;
				MM--;
				var date = new Date(yyyy, MM, dd);
				if( isNaN(date.getTime()) ){
					return false;
				}
				if(pattern[1]){ // 年龄范围校验
					var now = new Date();
					if(date.getTime() > now.getTime()) return false; // fast failed
					var age = now.getFullYear() - date.getFullYear();
					now.setFullYear(now.getFullYear() - age);
					if(date.getTime() > now.getTime()) age--; // 不足周岁,减1岁
					var label = context.label;
					context.age = age, context.label = "身份证年龄";
					if(this.validator.range.call(this, age, pattern[1], context) === false ){
						return false;
					}
					context.label = label;
				}
				return date;
			}
		},
		// 校验器
		validator: {
			// 非空校验器
			required: function(value, expr, context){
				var $dom = context.$dom, basedLength;
				if($dom && $dom.length){
					// 如果是复选框或单选框，需要特殊处理
					var e = $dom[0], nodeName = e.nodeName;
					if(e.checked != null && (e.type == "checkbox" || e.type == "radio")){
						basedLength = true;
						// 复选框、单选框则判断是否选中
						context.actual = value = $dom.filter(":checked").length;
					}
				}
				if( !value ){
					if( expr && (!$.isFunction(expr) || (expr = expr.call(this, value, context)))){
						this.sendError(basedLength ? "checked":"", value, "required", context);
						return false;
					}
					context._stop = true;
				}
			},
			// 格式化校验器
			format: function(value, expr, context){
				var result = V.util.parseFormat( expr ), formatter = this.formatter[ context.child = result[0] ]; // context.child 子校验器名称
				if( formatter ){
					value = context.formatResult = formatter.call(this, value, result[1], context);
					if(value === false){
						this.sendError(expr, value, result[1], context);
					}
					return value;
				}
				throw "Unsupported format validator:" + result[0];
			},
			// 正则表达式或自定义函数文本校验器
			text: function(value, expr, context){
				var type = $.type(expr);
				switch(type){
					case "string":
						if( expr != value ){
							this.sendError("==", value, expr, context);
							return false;
						}
						break;
					case "regexp":
						if( !expr.test(value) ){
							this.sendError("regexp", value, expr, context);
							return false;
						}
						break;
					case "function":
						if( expr.call(this, value, context) === false ){
							this.sendError("function", value, expr, context);
							return false;
						}
						break;
					default:
						throw "Unexpected text validator:" + expr;
				}
			},
			// 长度校验器
			length: function(value, expr, context){
				return this.validator.range.call(this, context.value.length, expr, context);
			},
			// 范围校验器
			range: function(value, expr, context){
				var pattern = V.util.parseIntervalPattern( expr );
				if( pattern.equals ){
					if(value != pattern.min){
						this.sendError("==", value, pattern.min, context);
						return false;
					}
				}else {
					if( pattern.min ){
						var leftResult = value > pattern.min || pattern.left == ">=" && pattern.min == value;
						if( !leftResult ){
							this.sendError(pattern.left, value, pattern.min, context);
							return leftResult;
						}
					}
					if( pattern.max ){
						var rightResult = value < pattern.max || pattern.right == "<=" && pattern.max == value;
						if( !rightResult ){
							this.sendError(pattern.right, value, pattern.max, context);
							return rightResult;
						}
					}
				}
			},
			// 相等校验器
			equalsTo: function(value, expr, context){
				var $dom = this.$(expr), val = this.getValue($dom, context);
				if(value != val){
					V.util.pushDomContext(null, $dom, context);
					this.sendError("", value, val, context);
					return false;
				}
			},
			// 比较校验器
			compare: function(value, expr, context){
				var hook = {}, s = context.rule, me = this, result, isOK = true;
				var expression = expr.replace(cache.__compare || ( cache.__compare = /\b(this|now)\b|([$#])([^\s=+*\/%&|-]+)/g ), function($0, $1, $2, $3){
					var name = $1 || $3;
					if(isOK){
						if(name == "this"){
							if( hook[name] == null)
								hook[name] = value;
						}else if(name == "now"){
							if( hook[name] == null){
								hook[name] = new Date();
							}
						}else {
							var selector = $2 == "#" ? "#" + name : "[name='" + name + "']", $dom = $(selector), domValue = me.getValue($dom, context);
							if(domValue != null){
								if(s.propagation){ // 表达式中的其他表单字段和当前字段采用相同的校验规则(compare规则除外)
									var copy = $.extend({ }, context.origin);
									delete copy.compare;
									if( me.validate($dom, copy) === false ){
										isOK = false;
									}
								}
								V.util.pushDomContext(name, $dom, context);
								if(isOK){
									if(s.format){
										result = result || V.util.parseFormat( s.format );
										domValue = me.formatter[ result[0] ].call(me, domValue, result[1], context);
										if(domValue !== false) hook[name] = domValue;
									}else{
										hook[name] = domValue;
									}
								}
							}
						}
					}
					return "_hook_[\"" + name +"\"]";
				});
				if(!isOK){
					return false;
				}
				V.debug && log( "compare validator pattern:" + expression, "compare validator hook:", hook );
				result = new Function("_hook_", "return (" + expression + ")").call(null, hook);
				if(result === false){
					this.sendError("", value, expr, context);
					return false;
				}
			},
			// 手机号码校验器
			cellphone: function(value, expr, context){
				cache.__cellhone || ( cache.__cellhone = /^1\d{10}$/ );
				V.debug && log( "cellphone regexp:", cache.__cellhone );
				if( !cache.__cellhone.test(value) ){
					this.sendError("", value, cache.__cellhone, context);
					return false;
				}
			},
			// 邮箱格式校验器
			email: function(value, expr, context){
				cache.__email || ( cache.__email = /^[\w._-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/ );
				V.debug && log( "email regexp:", cache.__email );
				if( !cache.__email.test(value) ){
					this.sendError("", value, cache.__email, context);
					return false;
				}
			},
			// 文件格式校验器:"jpeg|png|txt|gif"
			file: function(value, expr, context){
				var filePattern = cache[expr] || (cache[expr] = new RegExp("\\.(" + expr + ")$", "i"));
				V.debug && log( "file regexp:", filePattern );
				if( !filePattern.test(value) ){
					this.sendError("", value, expr, context);
					return false;
				}
			},
			// Ajax远程校验器
			remote: function(value, expr, context){
				var type = $.type(expr), opt = {type: "post", async: false, dataType: "json"}, isFunction;
				while( (isFunction = type == "function") ){
					expr = expr.call(null, value, context);
					type = $.type(expr);
				}
				switch(type){
					case "string":
						opt.url = expr;
						if(!isFunction && context.$dom){
							opt.data = context.$dom.serialize();
						}
						break;
					case "object":
						$.extend(opt, expr);
						break;
					default:
						throw "Unexpected remote validator value:" + expr;
				}
				var result = null, success = opt.success; // 用户自定义的success回调
				opt.success = function(data, textStatus, jqXHR){
					result = data;
					success && $.isFunction(success) && success(data, textStatus, jqXHR);
				};
				V.debug && log( "remote ajax options:", opt );
				$.ajax(opt);
				if( context.remoteResult = result ){
					if( result.callback ){
						window[result.callback].call(context.$dom, result, value, context);
					}
					var success = result.status == "OK";
					if( result.message ){
						context.message = result.message;						
					}
					if(!success){
						this.sendError("", value, expr, context);						
					}
					return success;
				}
				return false;
			}
		},
		// 全局规则
		rules: { },
		// 定义规则
		define: function(name, rule, global){
			global ||  (global = !(this instanceof V));
			if(typeof name == "object"){
				for(var i in name){
					fn.define.call(this, i, name[i], global);
				}
				return;
			}
			if(typeof rule != "object"){
				var obj = {};
				obj[rule] = rule;
				rule = obj;
			}
			rule = this.extendRule(false, rule);
			var rules = global ? fn.rules : this.rules;
			if(!global && rules === fn.rules)
				this.rules = rules = { };
			rules[name] = rule;
		},
		// 获取指定名称对应的校验规则
		getRule: function(name){
			return this.rules && this.rules[name] || fn.rules[name];
		},
		 // 执行单个校验
		validate: function(value, rule, event){
			var me = this, context, is$;
			if( typeof rule === "string" ){
				rule = me.getRule(rule);
				if( !rule ) throw "validate rule not found:" + rule;
			}
			context = V.context = { origin: rule };
			rule = context.rule = me.clipRule( rule );
			is$ = value instanceof $;
			V.debug && log( "current validate context [" + (is$ ? value.prop("name") : value) + "]:" , context );
			if( is$ ){
				if(!value.length && !this.strict) return me.afterHandler(true, context); // 非严格模式,直接跳过校验
				context.$dom = value;
				value = me.getValue(value, context);
			}
			context.value = value;
			// 如果设置了条件预过滤器，只有在匹配条件时才执行后续校验
			if( rule.before ){
				if(rule.before.call(me, value, context) === false)
					return me.afterHandler(true, context);
				delete rule.before;
			}
			if( event ){
				context.event = event;
			}
			// 如果设置了预处理
			if( rule.pre ){
				var preNames = me.pre.trimAll(rule.pre).split(",");
				for(var i in preNames){
					value = me.pre[preNames[i]].call(me, value, context);
				}
				context.value = value;
				delete rule.pre;
			}
			if(value == null) context.value = value = ""; // 确保校验器接收到的不会为null或undefined
			// 如果设置了非空验证
			if( rule.required != null ){
				context.validator = "required", context.expression = rule.required;
				if( me.validator.required.call(me, value, rule.required, context) === false){
					return me.afterHandler(false, context);
				}
				if( context._stop ) return me.afterHandler(true, context);
				delete rule.required;
			}
			// 如果设置了格式验证
			if( rule.format ){
				context.validator = "format", context.expression = rule.format;
				value = me.validator.format.call(me, value, rule.format, context);
				if( value === false ) return me.afterHandler(false, context);
				if( context._stop ) return me.afterHandler(true, context);
				delete rule.format;
			}
			// 循环执行验证器，非验证器属性就跳过
			for(var i in rule){
				var validator = me.validator[i];
				if( validator ){
					context.validator = i, context.expression = rule[i];
					if( validator.call(me, value, rule[i], context) === false ){
						return me.afterHandler(false, context);
					}
					if( context._stop ) return me.afterHandler(true, context);
				}
			}
			return me.afterHandler(true, context);
		},
		// 对多个元素的值一并执行校验，values 可以为数组、普通对象以及jQuery对象，rules必须是对象
		execute: function($doms, eventType, rules){
			var me = this;
			if(rules == null){
				rules = eventType, eventType = null;
			}
			if(!($doms instanceof $)){
				$doms = $($doms);
			}
			if( !$doms.length ) return !this.strict;

			if(typeof eventType === "string"){ // 进行事件绑定
				$doms.bind(eventType, function(e){
					var isSubmit = e.type == "submit", element = isSubmit ? this : e.target, rule = rules, prop;
					if(!isSubmit){
						if((prop = element.id) == null || (rule = rules["#" + prop]) == null){ // "#id"、"name"、"$name"
							if((rule = rules[prop = element.name]) == null ){
								rule = rules["$" + prop];
							}
						}
					}
					if( rule ){
						return me.execute(element, e, rule);
					}
					return false;
				});
				return;
			}
			var result = true;  // 执行表单校验
			$doms.each(function(){
				var $me = $(this), tagName = this.nodeName;
				if( tagName == "FORM" || tagName == "form" ){
					for(var i in rules){
						if( me.validate(me.$(i, $me), rules[i], eventType) === false ){
							return (result = false);
						}
					}
				}else{
					if( me.validate($me, rules, eventType) === false){
						return (result = false);
					}
				}
			});
			if( me.callback && $.isFunction(me.callback) ){
				return me.callback.call($doms, result, rules, eventType) !== false;
			}
			return result;		
		},		

		bindAttr: function(options){
			var opts = $.extend({
				container: "form", // 元素容器,并对此进行监听
				eventType: "submit", // 监听事件
				attr:"v", // 指定设置规则的属性
				nameAsValue: true, // 如果 attr指定的属性值为空,是否可使用name属性值作为其属性值
				cache: true // 是否允许缓存,如果规则不会随时变动,建议开启缓存以提高重复校验的性能
			}, options), me = this, $p = $(opts.container), $matches = $p.find("[" + opts.attr +"]"),
			validate = function(selector, event){
				var $doms = selector ? $(selector) : opts.cache ? $matches : $p.find("[" + opts.attr +"]"), result = true, rules = { };
				$doms.each(function(){
					var $me = $(this), name = this.name || $me.attr("name"), ruleName = $me.attr(opts.attr) || opts.nameAsValue && name;
					V.debug && log("current element [" + ruleName + "] :", $me );
					if(!ruleName){
						throw "invalid attribute [" + opts.attr + "]:" + $me;
					}
					if(rules[name]) return;
					if(this.checked != null && (this.type == "radio" || this.type == "checkbox")) // 对复选框/单选框进行特殊处理
						$me = $p.find("[name='" + name + "']");
					rules[name] = ruleName;
					if( me.validate($me, ruleName, event) === false){
						return (result = false);
					}
				});
				if(me.callback && $.isFunction(me.callback) ){
					return me.callback.call($doms, result, rules, event) !== false;
				}
				return result;
			};
			opts.eventType && $p.bind(opts.eventType, function(e){
				return validate(null, e);
			});
			return { validate: validate }; // 返回包含校验函数的对象,便于手动调用
		},
		
		// 发送错误信息
		sendError: function(trigger, actual, expected, context){
			context.trigger = trigger || context.validator;
			context.actual = actual;
			context.expected = expected;
			context.label = context.label || this.getLabel(context.name, context.$dom, context);
			var msg = this.getMessage(context);
			if(msg !== false){
				var renderError = $.isFunction(context.rule.renderError) ? context.rule.renderError : this.renderError;
				renderError.call(this, msg, this.$( context.rule.errorFocus ) || context.$dom, context);
			}
		},
		 // 渲染错误
		renderError: function(message, $target, context){
			if($target && $.isFunction($target.tips)){
				$target.tips(message);
			}else {
				alert(message);
			}
			var e = context.event;
			if( !e || e.type != "focusout" && e.type != "blur")
				$target && $target.first().focus();
		},
		// 全局消息配置
		messages: {
			"required": "{label}不能为空!",
			"required.checked": "请先选择{label}!",
			"equalsTo": "{label}必须与{#0}输入一致!",
			"==": "{label}必须等于{expected}!",
			">=": "{label}必须大于或等于{expected}!",
			">": "{label}必须大于{expected}!",
			"<=": "{label}必须小于或等于{expected}!",
			"<": "{label}必须小于{expected}!",
			"length.==": "{label}的长度必须等于{expected}!",
			"length.>=": "{label}的长度必须大于或等于{expected}!",
			"length.>": "{label}的长度必须大于{expected}!",
			"length.<=": "{label}的长度必须小于或等于{expected}!",
			"length.<": "{label}的长度必须小于{expected}!",
			"format.number": "{label}必须是有效的整数!",
			"format.number/money": "{label}必须是整数或最多保留两位的小数!",
			"format.number/double": "{label}必须是有效的整数或小数!",
			"format.date": "{label}必须为\"{dateFormat}\"格式的有效时间!",
			"file": "{label}的格式不正确，必须为{expected}等格式!",
			"default":"{label}的格式不正确!"
		},
		setMessage: function(name, msg, global){
			global ||  (global = !(this instanceof V));
			var msgs  = global ? fn.messages : this.messages;
			if(!global && msgs == fn.messages) this.messages = msgs = { };
			if(typeof name == "object"){
				for(i in name){
					msgs[i] = name[i];
				}
			}else{
				msgs[name] = msg;
			}
		},
		// 按照优先级依次解析并获取对应的message
		getMessage: function(context){
			var bundles = [context.message, context.rule.message, this.messages, fn.messages], bundle, msg;
			for(var i in bundles){
				msg = bundle = bundles[i];
				if(bundle === false){
					return msg;
				}
				if(bundle != null){
					if(typeof bundle === "object"){
						msg = bundle[context.validator + "." + context.trigger];
						msg == null && (!context.child || (msg = bundle[context.validator + "." + context.child]) == null) && ( (msg = bundle[context.validator]) == null ) && (msg = bundle[context.trigger]);
					}
					if(msg === false){
						return msg;
					}else if(msg != null){
						break;
					}
				}
			}
			if(msg && $.isFunction(msg)){
				msg = msg.call(null, context);
			}
			if(msg !== false){
				if(!msg) msg = this.messages["default"] || fn.messages["default"];
				msg && (msg = V.util.parseMessage(msg, context, this));
			}
			return msg;
		},

		labels: { },

		setLabel: function(name, label, global){
			global ||  (global = !(this instanceof V));
			var labels  = global ? fn.labels : this.labels;
			if(!global && labels == fn.labels) this.labels = labels = { };
			if(typeof name == "object"){
				for(i in name){
					labels[i] = name[i];
				}
			}else{
				labels[name] = label;
			}
		},

		getLabel: function(name, $dom, context){
			if(!name) name = $dom.prop("name");
			if(name != null){
				var label = this.labels[name] || fn.labels[name];
				if(label == null && $dom && $dom.length ){
					label = $dom.attr("label") || $dom.prev("label").text();
					if(label) return label;
				}
			}
			return "";
		}
	};
	// 工具函数
	V.util = {
		// 解析formatter的format，形如:"formatterName[/expression]"
		parseFormat: function(format){
			var pos = format.indexOf("/"), result = [format, ""];
			if(pos > 0) result[0] = format.substring(0, pos), result[1] = format.substr(pos + 1);
			return result;
		},
		// 解析范围区间，形如："(1,2)"、"[2,5]"
		parseIntervalPattern: function(pattern){
			if( !cache[pattern] ){
				cache.__interval || ( cache.__interval = /^([\[\(])(-?\d+(\.\d+)?)?(,)?(-?\d+(\.\d+)?)?([\]\)])$/ );
				if( cache.__interval.test(pattern) && (RegExp.$2 || RegExp.$4) ){
					var result = { min: RegExp.$2, max: RegExp.$5 };
					if( RegExp.$4 == RegExp.$5 ){
						result.equals = true;
					}else {
						result.left = RegExp.$1 == "[" ? ">=" : ">";
						result.right = RegExp.$7 == "]" ? "<=" : "<";
					}
					cache[pattern] = result;
				}else{
					throw "Unexpected interval pattern:" + pattern;
				}
			}
			return cache[pattern];
		},
		// 解析错误消息
		parseMessage: function(message, context, me){
			var $doms = context.$relatedDoms;
			return message.replace(cache.__message || ( cache.__message = /\{([^}]+)\}/g ), function($0, $1){
				var char0 = $1.charAt(0), result;
				if(char0 == "#" || char0 == "$"){
					var key = $1.substr(1);
					if($doms && $doms[key]){
						result = me.getLabel( null, $doms[key], context );
					}else{
						result = me.getLabel( null, $( char0 == "#" ? "#" + key : "[name='" + key + "']" ), context );
					}
				}else{
					result = context[$1];
				}
				if( !result ) result = "";
				return result;
			});
		},
		// 将关联的DOM放入上下文的$relatedDoms中
		pushDomContext: function(name, $dom, context){
			var doms = context.$relatedDoms || ( context.$relatedDoms = [] );
			if( !name ) name = $dom.prop("name");
			doms.push($dom);
			if(name) doms[name] = $dom;
		}
	};
	fn.define({
		"username": {
			pre: "trimAll,lower,flush",
			text: /^[a-z][a-z0-9_]{5,15}$/i,
			message: "{label}必须是英文字母、数字和下划线组成的6~16位字符，并且必须以字母开头!"
		},
		"password": {
			length: "[6,16]"
		},
		"age": {
			format: "number",
			range: "[18,100]"
		},
		"int": {
			format: "number"
		},
		"int+": {
			format: "number",
			range: "(0,)"
		},
		"money": {
			format: "number/money"
		},
		"money+": {
			format: "number/money",
			range: "(0,)"
		},
		"date": {
			format:"date"
		},
		"datetime": {
			format:"date/datetime"
		},
		"phoneCode": {
			format: "number",
			length: "[6]"
		},
		"imageCode": {
			length: "[4]"
		},
		"required": { },
		"cellphone": true,
		"email": true,
		"idcard": {
			pre: "upper,flush",
			format: "idcard/18:[18,]"
		},
		"image": "jpg|jpeg|gif|png|bmp"
	});
	if(global ||  (global = (typeof window !== "undefined") ? window : this)){
		global.V = V;
	}
}(jQuery, window);