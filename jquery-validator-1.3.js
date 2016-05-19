//**************************************
 @Name: jQuery-Validator 基于jQuery的表单验证框架
 @Version: 1.3.0 beta
 @Author: Ready
 @Date: 2015-02-25
 @Blog: http://www.365mini.com
 @Copyright: CodePlayer( Ready )
 @Email: CodePlayer360@gmail.com
 @Licence: https://www.apache.org/licenses/LICENSE-2.0.html
*/
!function ($) {
	if(typeof jQuery === "undefined" || !($ instanceof jQuery)){
		console && console.log("jQuery must be initialied before loading the Validator.");
		return;
	};
	var V = function(){
		if(!(this instanceof V)){
			return new V();
		}
	};
	var cache = V.cache = { };
	// 输出日志信息
	var log = V.log = function(){
		if(window.console){
			for(var i = 0; i < arguments.length; i++){
				console.log(arguments[i]);
			}
			return true;
		}	
	};

	V.fn = V.prototype = {
		// 版本号
		version: "1.3",

		constructor: V,
		
		// 获取元素的值
		getValue: function($dom, context){
			return $dom.val();
		},

		// 全局对象
		global: { },

		// 将指定值包裹为jQuery对象
		$: function( input ){
			if(!input) return null;
			if(input instanceof $){
				return val;				
			}else if($.type(input) === "string"){
				var ch = input.charAt(0);
				if(ch != "#"){
					if(ch == "$") input = input.substr(1);
					input = "[name='" + input + "']";
				}				
			}
			return $(input);
		},

		// 默认规则
		defaultRules: {
			required: true
		},
		// 对单个元素的校验规则进行处理
		clipRule: function(rule, context){
			var _extend = rule.extend, _ext;
			while(_extend){
				_ext = $.extend( { }, this.rules[rule.extend], _ext);
				_extend = _ext ? _ext.extend : null;
			}
			return $.extend( { }, this.defaultRules, _ext, rule );
		}
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
		}

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
				V.debug && log( "number regex:" ) && log( regex );
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
				V.debug && log( "date pattern:" ) && log( pattern );
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
				return context.date = new Date(parts.yyyy, parts.MM || 0, parts.dd || 1, parts.HH || 0, parts.mm || 0, parts.ss || 0);
			},
			// 身份证格式化器：返回日期
			// "idcard/?:[18,]"
			idcard: function(value, expr, context){
				var pattern = cache[context.rule.format];
				if(!pattern){
					if(!expr) pattern = ["?"];
					else pattern = expr.split(":", 2);
					if(pattern.length == 1 && pattern[0].length > 2){
						pattern = ["?", pattern[0]];
					}
					cache[context.rule.format] = pattern;
				}
				V.debug && log( "idcard pattern:" ) && log( pattern );
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
				var date = context.actual = new Date(yyyy, MM, dd);
				if( isNaN(date.getTime()) ){
					return false;
				}
				if(pattern[1]){ // 年龄范围校验
					var now = new Date();
					if(date.getTime() > now.getTime()) return false; // fast failed
					var age = now.getFullYear() - date.getFullYear();
					now.setFullYear(now.getFullYear() - age);
					if(date.getTime() > now.getTime()) age--; // 不足周岁,减1岁
					if(this.validator.range.call(this, age, context) === false ){
						return false;
					}
				}
				return context.birthday = date;
			}
		},

		// 校验器
		validator: {
			// 非空校验器
			required: function(value, expr, context){
				var $dom = context.$dom;
				if($dom && $dom.length){
					// 如果是复选框或单选框，需要特殊处理
					var e = $dom[0], nodeName = e.nodeName;
					if((e.type == "checkbox" || e.type == "radio") && (nodeName == "INPUT" || nodeName == "input")){
						// 复选框、单选框则判断是否选中
						context.actual = value = $dom.filter(":checked").length;
					}
				}
				if( !value ){
					if( context.rule.required ){
						this.sendError("", value, "required", context);
						return false;
					}
					context._stop = true;
				}
			},
			// 格式化校验器
			format: function(value, expr, context){
				var result = V.util.parseFormat( expr ), formatter = this.formatter[ result[0] ];
				if( formatter ){
					value = formatter.call(this, value, result[1], context);
					if(value === false){
						this.sendError(expr, value, result[1], context);
					}
					return value;
				}else{
					throw "Unsupported format validator:" + result[0];
				}
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
				var $dom = $("[name='" + expr + "']"), val = $dom.val();
				if(value != val){
					V.util.pushDomContext(context, expr, $dom);
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
							var selector = $2 == "#" ? "#" + name : "[name='" + name + "']", $dom = $(selector), domValue = $dom.val();
							if(domValue != null){
								if(s.propagation){ // 表达式中的其他表单字段和当前字段采用相同的校验规则(compare规则除外)									
									var copy = $.extend({}, s);
									delete copy.compare;
									if( me.validate($dom, copy) === false ){
										isOK = false;
									}
								}
								V.util.pushDomContext(context, name, $dom);								
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
					return "this[\"" + name +"\"]";
				});
				if(!isOK){
					return false;
				}
				V.debug && log( "compare expression:" + expression ) && log( "compare [this] hook:" ) && log( hook );
				result = new Function("return (" + expression + ")").call(hook);
				if(result === false){
					this.sendError("pattern", value, expr, context);
					return false;
				}
			},
			// 手机号码校验器
			cellphone: function(value, expr, context){
				cache.__cellhone || ( cache.__cellhone = /^1\d{10}$/ );
				V.debug && log( "cellphone pattern:" ) && log( cache.__cellhone );
				if( !cache.__cellhone.test(value) ){
					this.sendError("pattern", value, cache.__cellhone, context);
					return false;
				}
			},
			// 邮箱格式校验器
			email: function(value, expr, context){
				cache.__email || ( cache.__email = /^[\w._-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/ );
				V.debug && log( "email pattern:" ) && log( cache.__email );
				if( !cache.__email.test(value) ){
					this.sendError("pattern", value, cache.__email, context);
					return false;
				}
			},
			// 文件格式校验器:"jpeg|png|txt|gif"
			file: function(value, expr, context){
				var filePattern = V.cache[expr] || (V.cache[expr] = new RegExp("\\.(" + expr + ")$", "i"));
				V.debug && log( "file pattern:" ) && log( filePattern );
				if( !filePattern.test(value) ){
					this.sendError("pattern", value, expr, context);
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
							if(context.name == null){
								context.name = context.$dom.prop("name");
							}
							opt.data = { };
							opt.data[context.name] = value;
						}
						break;
					case "object":
						$.extend(opt, expr);
						break;
					default:
						throw "Unexpected remote validator value:" + expr;
				}
				var result = null;
				opt.success = function(data, textStatus, jqXHR){
					result = data;
				};
				V.debug && log( "remote ajax options:", opt );
				$.ajax(opt);
				if( result ){
					if( result.message ){
						context.message = result.message;
						this.sendError("", value, expr, context);
					}
					if( result.callback ){
						window[result.callback].call(context.$dom, result, value, context);
					}
					return result.status == "OK";
				}
				return false;
			}
		},
		
		rules: { },
		
		define: function(name, rule, global){
			if(typeof name == "object"){
				for(var i in name){
					this.define(i, name[i]);
				}
				return;
			}
			if(typeof rule != "object"){
				var obj = {};
				obj[rule] = rule;
				rule = obj;
			}
			while(rule.extend){
				var ext = this.rules[rule.extend];
				delete rule.extend;
				if(ext){
					rule = $.extend({}, ext, rule);
				}			
			}			
			if(global || !(this instanceof V)){
				V.fn.rules[name] = rule; 
			}else{
				this.rules[name] = rule;
			}
		},
		
		 // 执行单个校验
		validate: function(value, rule, event){
			if( typeof rule === "string" ){
				rule = this.rules[rule];
				if( !rule ) throw "validate rule not found:" + rule;
			}
			var context = V.context = { origin: rule };
			rule = context.rule = this.clipRule( rule );
			V.debug && log( "current validate context:", context );
			if( value instanceof $ ){
				context.$dom = value;
				value = value.val();
			}
			context.value = value;
			// 如果设置了条件预过滤器，只有在匹配条件时才执行后续校验
			if( rule.preMatch ){
				if(rule.preMatch.call(this, value, context) === false)
					return true;
				delete rule.preMatch;
			}
			if( event ){
				context.event = event;
			}
			// 如果设置了预处理
			if( rule.pre ){
				var pres = rule.pre.split(",");
				for(var i in pres){
					value = this.pre[pres[i]].call(this, value, context);
				}
				context.value = value;
				delete rule.pre;
			}
			// 如果设置了非空验证
			if( rule.required != null ){
				if( this.validator.required.call(this, value, "", context) === false){
					return false;
				}
				if( context._stop ) return true;
				delete rule.required;
			}
			// 如果设置了格式验证
			if( rule.format ){
				value = this.validator.format.call(this, value, rule.format, context);
				if( value === false ) return false;
				if( context._stop ) return true;
				delete rule.format;
			}
			// 循环执行验证器，非验证器属性就跳过
			for(var i in rule){
				var validator = this.validator[i];
				if( validator ){
					if( validator.call(this, value, rule[i], context) === false ){
						return false;
					}
					if( context._stop ) return true;
				}
			}
			return true;
		},

		bind: function($doms, eventType, rules, event){
			if(!($doms instanceof $)){
				$doms = $($doms);
			}
			if( !$doms.length ) return false;

			if( rules == null){
				rules = eventType, eventType = null;
			}
			var me = this;
			if(eventType){ // 事件监听
				$doms.on(eventType, function(e){
					var isSubmit = e.type == "submit", element = isSubmit ? this : e.target, rule = isSubmit ? rules : rules[element.name];
					if( rule ){
						return me.execute(element, null, rule, e);
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
						if( me.validate($me.find("[name='" + i + "']"), rules[i], event) === false ){
							return (result = false);
						}
					}
				}else{
					if( me.validate($me, rules, event) === false){
						return (result = false);
					}
				}
			});
			if( this.callback && $.isFunction(this.callback) ){
				return this.callback.call($doms, result, rules, event) !== false;
			}
			return result;
		},
		// 发送错误信息
		sendError: function(trigger, actual, expected, context){
			context.trigger = trigger;
			context.actual = actual;
			context.expected = expected;
			if(context.message !== false){
				var msg = context.message || this.getMessage(context);
				if(msg !== false) this.renderError(this.$( context.rule.errorFocus ) || context.$dom, msg, context);
			}
			
		},
		
		 // 渲染错误
		renderError: function($target, message, context){
			$target && $target.tips && $target.tips(message) || alert(message);
			var event = rule.event;
			if( !event || event.type != "focusout" && event.type != "blur")
				$target && $target.first().focus();
		},
		
		messages: {
			"required": "{label}不能为空!",
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
			"format.date": "{label}必须是有效的日期!",
			"pattern": "{label}的格式不正确!",
			"regexp": "{label}的格式不正确!",
			"function": "{label}的格式不正确!",
			"file": "{label}的文件格式不正确，必须为{expected}等格式!"
		},
		
		getMessage: function(s){
			var message = typeof s.message === "object" ? ( s.message[s.validator + "." + s.trigger] || s.message[s.validator] || s.message[s.trigger] ) : s.message;
			if( !message ){
				message = this.messages[s.validator + "." + s.trigger] || this.messages[s.validator] || this.messages[s.trigger];
			}
			if( message ){
				this.devMode && console && console.log( s );
				message = V.util.parseMessage(message, s, this);
			}else{
				message = this.messages["default"] || "您输入的格式不正确!";
			}
			return message;
		},
		
		labels: { },
		
		setLabel: function(){
			function(name, label){
				if(typeof name == "object"){
					$.extend(this.labels, name);
				}else{
					this.labels[name] = label;
				}
			}
		},

		getLabel: function(){
			if( $dom && $dom.length ){
				var name = $dom.prop("name"), label = name && this.labels[name] || $dom.attr("label") || $dom.prev("label").text();
				if( label ) return label.charAt(0) == "*" ? label.substr(1) : label;
			}
			return "";
		}
		
	};
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
				cache.__interval || ( cache.__interval = /^([\[\(])(\d+(\.\d+)?)?(,)?(\d+(\.\d+)?)?([\]\)])$/ );
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
					throw "Unexpected pattern:" + pattern;
				}
			}
			return cache[pattern];
		},
		// 解析错误消息
		parseMessage: function(message, me){
			return message.replace(cache.__message || ( cache.__message = /\{([^}]+)\}/g ), function($0, $1){
				var char0 = $1.charAt(0), result;
				if(char0 == "#" || char0 == "$"){
					var key = $1.substr(1);
					if(me.$relatedDoms && me.$relatedDoms[key]){
						result = me.getLabel( me.$relatedDoms[key] );
					}else{
						result = me.getLabel( $( char0 == "#" ? "#" + key : "[name='" + key + "']" ) );
					}
				}else{
					result = me[$1];
				}
				if( !result ) result = "";
				return result;
			});
		},
		// 将关联的DOM放入上下文的$relatedDoms中
		pushDomContext: function(context, name, $dom){
			var array = context.$relatedDoms || ( context.$relatedDoms = [] );
			if( !name ) name = $dom.prop("name");
			array.push($dom);
			if(name) array[name] = $dom;
		}
	};
	
	V.fn.define({
		"username": {
			pre: "trimAll,lower,flush",
			text: /^[a-z][a-z0-9_]{5,15}$/i,
			message: "{label}必须是英文、数字和下划线组成的6~16位字符，并且必须以字母开头!"
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
		"+int": {
			format: "number",
			range: "(0,)"
		},
		"money": {
			format: "number/money"
		},
		"+money": {
			format: "number/money",
			range: "(0,)"
		},
		"phoneCode": {
			format: "number",
			length: "[6]"
		},
		"imageCode": {
			length: "[4]"
		},
		"required": {},
		"cellphone": true,
		"email": true,
		"idcard": {
			format: "idcard/18:[18,]"
		},
		"file": "jpg|jpeg|gif|png|bmp"
	});
}(jQuery);