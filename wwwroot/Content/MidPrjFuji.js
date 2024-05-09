(function (Global) {
  "use strict";

  // Polyfill

  if (!Date.now) {
    Date.now = function () {
      return new Date().getTime();
    };
  }

  if (!Math.trunc) {
    Math.trunc = function (x) {
      return x < 0 ? Math.ceil(x) : Math.floor(x);
    }
  }

  if (!Object.setPrototypeOf) {
    Object.setPrototypeOf = function (obj, proto) {
      obj.__proto__ = proto;
      return obj;
    }
  }

  Global.WebSharper = {
    Runtime: {
      Ctor: function (ctor, typeFunction) {
        ctor.prototype = typeFunction.prototype;
        return ctor;
      },

      Class: function (members, base, statics) {
        var proto = members;
        if (base) {
          proto = new base();
          for (var m in members) { proto[m] = members[m] }
        }
        var typeFunction = function (copyFrom) {
          if (copyFrom) {
            for (var f in copyFrom) { this[f] = copyFrom[f] }
          }
        }
        typeFunction.prototype = proto;
        if (statics) {
          for (var f in statics) { typeFunction[f] = statics[f] }
        }
        return typeFunction;
      },

      Clone: function (obj) {
        var res = {};
        for (var p of Object.getOwnPropertyNames(obj)) { res[p] = obj[p] }
        Object.setPrototypeOf(res, Object.getPrototypeOf(obj));
        return res;
      },

      NewObject:
        function (kv) {
          var o = {};
          for (var i = 0; i < kv.length; i++) {
            o[kv[i][0]] = kv[i][1];
          }
          return o;
        },

      PrintObject:
        function (obj) {
          var res = "{ ";
          var empty = true;
          for (var field of Object.getOwnPropertyNames(obj)) {
            if (empty) {
              empty = false;
            } else {
              res += ", ";
            }
            res += field + " = " + obj[field];
          }
          if (empty) {
            res += "}";
          } else {
            res += " }";
          }
          return res;
        },

      DeleteEmptyFields:
        function (obj, fields) {
          for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (obj[f] === void (0)) { delete obj[f]; }
          }
          return obj;
        },

      GetOptional:
        function (value) {
          return (value === void (0)) ? null : { $: 1, $0: value };
        },

      SetOptional:
        function (obj, field, value) {
          if (value) {
            obj[field] = value.$0;
          } else {
            delete obj[field];
          }
        },

      SetOrDelete:
        function (obj, field, value) {
          if (value === void (0)) {
            delete obj[field];
          } else {
            obj[field] = value;
          }
        },

      Apply: function (f, obj, args) {
        return f.apply(obj, args);
      },

      Bind: function (f, obj) {
        return function () { return f.apply(this, arguments) };
      },

      CreateFuncWithArgs: function (f) {
        return function () { return f(Array.prototype.slice.call(arguments)) };
      },

      CreateFuncWithOnlyThis: function (f) {
        return function () { return f(this) };
      },

      CreateFuncWithThis: function (f) {
        return function () { return f(this).apply(null, arguments) };
      },

      CreateFuncWithThisArgs: function (f) {
        return function () { return f(this)(Array.prototype.slice.call(arguments)) };
      },

      CreateFuncWithRest: function (length, f) {
        return function () { return f(Array.prototype.slice.call(arguments, 0, length).concat([Array.prototype.slice.call(arguments, length)])) };
      },

      CreateFuncWithArgsRest: function (length, f) {
        return function () { return f([Array.prototype.slice.call(arguments, 0, length), Array.prototype.slice.call(arguments, length)]) };
      },

      BindDelegate: function (func, obj) {
        var res = func.bind(obj);
        res.$Func = func;
        res.$Target = obj;
        return res;
      },

      CreateDelegate: function (invokes) {
        if (invokes.length == 0) return null;
        if (invokes.length == 1) return invokes[0];
        var del = function () {
          var res;
          for (var i = 0; i < invokes.length; i++) {
            res = invokes[i].apply(null, arguments);
          }
          return res;
        };
        del.$Invokes = invokes;
        return del;
      },

      CombineDelegates: function (dels) {
        var invokes = [];
        for (var i = 0; i < dels.length; i++) {
          var del = dels[i];
          if (del) {
            if ("$Invokes" in del)
              invokes = invokes.concat(del.$Invokes);
            else
              invokes.push(del);
          }
        }
        return WebSharper.Runtime.CreateDelegate(invokes);
      },

      DelegateEqual: function (d1, d2) {
        if (d1 === d2) return true;
        if (d1 == null || d2 == null) return false;
        var i1 = d1.$Invokes || [d1];
        var i2 = d2.$Invokes || [d2];
        if (i1.length != i2.length) return false;
        for (var i = 0; i < i1.length; i++) {
          var e1 = i1[i];
          var e2 = i2[i];
          if (!(e1 === e2 || ("$Func" in e1 && "$Func" in e2 && e1.$Func === e2.$Func && e1.$Target == e2.$Target)))
            return false;
        }
        return true;
      },

      ThisFunc: function (d) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(this);
          return d.apply(null, args);
        };
      },

      ThisFuncOut: function (f) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          return f.apply(args.shift(), args);
        };
      },

      ParamsFunc: function (length, d) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          return d.apply(null, args.slice(0, length).concat([args.slice(length)]));
        };
      },

      ParamsFuncOut: function (length, f) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          return f.apply(null, args.slice(0, length).concat(args[length]));
        };
      },

      ThisParamsFunc: function (length, d) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(this);
          return d.apply(null, args.slice(0, length + 1).concat([args.slice(length + 1)]));
        };
      },

      ThisParamsFuncOut: function (length, f) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          return f.apply(args.shift(), args.slice(0, length).concat(args[length]));
        };
      },

      Curried: function (f, n, args) {
        args = args || [];
        return function (a) {
          var allArgs = args.concat([a === void (0) ? null : a]);
          if (n == 1)
            return f.apply(null, allArgs);
          if (n == 2)
            return function (a) { return f.apply(null, allArgs.concat([a === void (0) ? null : a])); }
          return WebSharper.Runtime.Curried(f, n - 1, allArgs);
        }
      },

      Curried2: function (f) {
        return function (a) { return function (b) { return f(a, b); } }
      },

      Curried3: function (f) {
        return function (a) { return function (b) { return function (c) { return f(a, b, c); } } }
      },

      UnionByType: function (types, value, optional) {
        var vt = typeof value;
        for (var i = 0; i < types.length; i++) {
          var t = types[i];
          if (typeof t == "number") {
            if (Array.isArray(value) && (t == 0 || value.length == t)) {
              return { $: i, $0: value };
            }
          } else {
            if (t == vt) {
              return { $: i, $0: value };
            }
          }
        }
        if (!optional) {
          throw new Error("Type not expected for creating Choice value.");
        }
      },

      MarkResizable: function (arr) {
        Object.defineProperty(arr, "resizable", { enumerable: false, writable: false, configurable: false, value: true });
        return arr;
      },

      MarkReadOnly: function (arr) {
        Object.defineProperty(arr, "readonly", { enumerable: false, writable: false, configurable: false, value: true });
        return arr;
      },

      ScriptBasePath: "./",

      ScriptPath: function (a, f) {
        return this.ScriptBasePath + (this.ScriptSkipAssemblyDir ? "" : a + "/") + f;
      },

      OnLoad:
        function (f) {
          if (!("load" in this)) {
            this.load = [];
          }
          this.load.push(f);
        },

      Start:
        function () {
          function run(c) {
            for (var i = 0; i < c.length; i++) {
              c[i]();
            }
          }
          if ("load" in this) {
            run(this.load);
            this.load = [];
          }
        },
    }
  }

  Global.WebSharper.Runtime.OnLoad(function () {
    if (Global.WebSharper && WebSharper.Activator && WebSharper.Activator.Activate)
      WebSharper.Activator.Activate()
  });

  Global.ignore = function() { };
  Global.id = function(x) { return x };
  Global.fst = function(x) { return x[0] };
  Global.snd = function(x) { return x[1] };
  Global.trd = function(x) { return x[2] };

  if (!Global.console) {
    Global.console = {
      count: ignore,
      dir: ignore,
      error: ignore,
      group: ignore,
      groupEnd: ignore,
      info: ignore,
      log: ignore,
      profile: ignore,
      profileEnd: ignore,
      time: ignore,
      timeEnd: ignore,
      trace: ignore,
      warn: ignore
    }
  }
}(self));
;
/* https://github.com/jonathantneal/closest */
(function(w,p){p=w.Element.prototype
if(!p.matches){p.matches=p.msMatchesSelector||function(s){var m=(this.document||this.ownerDocument).querySelectorAll(s);for(var i=0;m[i]&&m[i]!==e;++i);return!!m[i]}}
if(!p.closest){p.closest=function(s){var e=this;while(e&&e.nodeType==1){if(e.matches(s))return e;e=e.parentNode}return null}}})(self);
(function () {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());
;
(function(Global)
{
 "use strict";
 var MidPrjFuji,App,WebSharper,Arrays,Operators,Obj,UI,Templating,Runtime,Server,ProviderBuilder,TemplateHole,Handler,Var,EventTarget,WindowOrWorkerGlobalScope,JavaScript,JS,Charting,Renderers,ChartJs,Chart,Charts,RadarChart,Pervasives,Color,BarChart,Pages,View,TemplateInstance,TemplateHoleModule,Elt,Text,Unchecked,System,Guid,EventQ,SC$1,ChartJsInternal,Client,Templates,Doc,Pervasives$1,CompositeChart,Object,Numeric,MidPrjFuji_Templates,MidPrjFuji_Router,Var$1,ListModel,Router,Seq,ADataSet,ChartConfig,SeriesChartConfig,SC$2,Node,Collections,Dictionary,ColorConfig,Options,Control,FSharpEvent,SC$3,Snap,ConcreteVar,TextView,VarStr,Docs,HashSet,TemplateInitializer,VarFloatUnchecked,VarBool,VarDateTime,VarFile,VarDomElement,Sitelets,RouterOperators,RouterModule,Route,HtmlModule,attr,AttrModule,Element,HTMLElement,Enumerator,T,Option,Slice,BatchUpdater,Util,Seq$1,Reactive,Reactive$1,List,T$1,SC$4,Event,Event$1,Random,PolarData,Abbrev,Fresh,DictionaryUtil,Storage,Router$1,List$1,AttrProxy,Attrs,DomUtility,Prepare,KeyCollection,DocElemNode,CharacterData,Blob,Elt$1,An,Settings,Mailbox,ArrayStorage,FSharpMap,Map,Strings,Utils,Concurrency,Attrs$1,Dyn,SC$5,Attribute,Event$2,AfterRender,AfterRenderQ,Array,Updates,ValueCollection,Docs$1,RunState,NodeSet,Anims,SC$6,BalancedTree,Tree,Pair,SC$7,Queue,HashSetUtil,SC$8,AppendList,MapUtil,Scheduler,PathUtil,Error,KeyNotFoundException,DynamicAttrNode,SC$9,Easing,AsyncBody,SC$10,CT,HashSet$1,BindVar,String,CheckedInput,CancellationTokenSource,DomNodes,Char,DateUtil,OperationCanceledException,Lazy,SC$11,LazyExtensionsProxy,LazyRecord,Math,Runtime$1,console,Date;
 MidPrjFuji=Global.MidPrjFuji=Global.MidPrjFuji||{};
 App=MidPrjFuji.App=MidPrjFuji.App||{};
 WebSharper=Global.WebSharper=Global.WebSharper||{};
 Arrays=WebSharper.Arrays=WebSharper.Arrays||{};
 Operators=WebSharper.Operators=WebSharper.Operators||{};
 Obj=WebSharper.Obj=WebSharper.Obj||{};
 UI=WebSharper.UI=WebSharper.UI||{};
 Templating=UI.Templating=UI.Templating||{};
 Runtime=Templating.Runtime=Templating.Runtime||{};
 Server=Runtime.Server=Runtime.Server||{};
 ProviderBuilder=Server.ProviderBuilder=Server.ProviderBuilder||{};
 TemplateHole=UI.TemplateHole=UI.TemplateHole||{};
 Handler=Server.Handler=Server.Handler||{};
 Var=UI.Var=UI.Var||{};
 EventTarget=Global.EventTarget;
 WindowOrWorkerGlobalScope=Global.WindowOrWorkerGlobalScope;
 JavaScript=WebSharper.JavaScript=WebSharper.JavaScript||{};
 JS=JavaScript.JS=JavaScript.JS||{};
 Charting=WebSharper.Charting=WebSharper.Charting||{};
 Renderers=Charting.Renderers=Charting.Renderers||{};
 ChartJs=Renderers.ChartJs=Renderers.ChartJs||{};
 Chart=Charting.Chart=Charting.Chart||{};
 Charts=Charting.Charts=Charting.Charts||{};
 RadarChart=Charts.RadarChart=Charts.RadarChart||{};
 Pervasives=Charting.Pervasives=Charting.Pervasives||{};
 Color=Pervasives.Color=Pervasives.Color||{};
 BarChart=Charts.BarChart=Charts.BarChart||{};
 Pages=MidPrjFuji.Pages=MidPrjFuji.Pages||{};
 View=UI.View=UI.View||{};
 TemplateInstance=Server.TemplateInstance=Server.TemplateInstance||{};
 TemplateHoleModule=UI.TemplateHoleModule=UI.TemplateHoleModule||{};
 Elt=TemplateHoleModule.Elt=TemplateHoleModule.Elt||{};
 Text=TemplateHoleModule.Text=TemplateHoleModule.Text||{};
 Unchecked=WebSharper.Unchecked=WebSharper.Unchecked||{};
 System=Global.System=Global.System||{};
 Guid=System.Guid=System.Guid||{};
 EventQ=TemplateHoleModule.EventQ=TemplateHoleModule.EventQ||{};
 SC$1=Global.StartupCode$MidPrjFuji$Client=Global.StartupCode$MidPrjFuji$Client||{};
 ChartJsInternal=Renderers.ChartJsInternal=Renderers.ChartJsInternal||{};
 Client=UI.Client=UI.Client||{};
 Templates=Client.Templates=Client.Templates||{};
 Doc=UI.Doc=UI.Doc||{};
 Pervasives$1=JavaScript.Pervasives=JavaScript.Pervasives||{};
 CompositeChart=Charts.CompositeChart=Charts.CompositeChart||{};
 Object=Global.Object;
 Numeric=WebSharper.Numeric=WebSharper.Numeric||{};
 MidPrjFuji_Templates=Global.MidPrjFuji_Templates=Global.MidPrjFuji_Templates||{};
 MidPrjFuji_Router=Global.MidPrjFuji_Router=Global.MidPrjFuji_Router||{};
 Var$1=UI.Var$1=UI.Var$1||{};
 ListModel=UI.ListModel=UI.ListModel||{};
 Router=UI.Router=UI.Router||{};
 Seq=WebSharper.Seq=WebSharper.Seq||{};
 ADataSet=Global.ADataSet;
 ChartConfig=Charts.ChartConfig=Charts.ChartConfig||{};
 SeriesChartConfig=Charts.SeriesChartConfig=Charts.SeriesChartConfig||{};
 SC$2=Global.StartupCode$WebSharper_Charting$Renderers=Global.StartupCode$WebSharper_Charting$Renderers||{};
 Node=Global.Node;
 Collections=WebSharper.Collections=WebSharper.Collections||{};
 Dictionary=Collections.Dictionary=Collections.Dictionary||{};
 ColorConfig=Charts.ColorConfig=Charts.ColorConfig||{};
 Options=Global.Options;
 Control=WebSharper.Control=WebSharper.Control||{};
 FSharpEvent=Control.FSharpEvent=Control.FSharpEvent||{};
 SC$3=Global.StartupCode$WebSharper_Charting$Charts=Global.StartupCode$WebSharper_Charting$Charts||{};
 Snap=UI.Snap=UI.Snap||{};
 ConcreteVar=UI.ConcreteVar=UI.ConcreteVar||{};
 TextView=TemplateHoleModule.TextView=TemplateHoleModule.TextView||{};
 VarStr=TemplateHoleModule.VarStr=TemplateHoleModule.VarStr||{};
 Docs=UI.Docs=UI.Docs||{};
 HashSet=Collections.HashSet=Collections.HashSet||{};
 TemplateInitializer=Server.TemplateInitializer=Server.TemplateInitializer||{};
 VarFloatUnchecked=TemplateHoleModule.VarFloatUnchecked=TemplateHoleModule.VarFloatUnchecked||{};
 VarBool=TemplateHoleModule.VarBool=TemplateHoleModule.VarBool||{};
 VarDateTime=TemplateHoleModule.VarDateTime=TemplateHoleModule.VarDateTime||{};
 VarFile=TemplateHoleModule.VarFile=TemplateHoleModule.VarFile||{};
 VarDomElement=TemplateHoleModule.VarDomElement=TemplateHoleModule.VarDomElement||{};
 Sitelets=WebSharper.Sitelets=WebSharper.Sitelets||{};
 RouterOperators=Sitelets.RouterOperators=Sitelets.RouterOperators||{};
 RouterModule=Sitelets.RouterModule=Sitelets.RouterModule||{};
 Route=Sitelets.Route=Sitelets.Route||{};
 HtmlModule=UI.HtmlModule=UI.HtmlModule||{};
 attr=HtmlModule.attr=HtmlModule.attr||{};
 AttrModule=UI.AttrModule=UI.AttrModule||{};
 Element=Global.Element;
 HTMLElement=Global.HTMLElement;
 Enumerator=WebSharper.Enumerator=WebSharper.Enumerator||{};
 T=Enumerator.T=Enumerator.T||{};
 Option=WebSharper.Option=WebSharper.Option||{};
 Slice=WebSharper.Slice=WebSharper.Slice||{};
 BatchUpdater=ChartJsInternal.BatchUpdater=ChartJsInternal.BatchUpdater||{};
 Util=WebSharper.Util=WebSharper.Util||{};
 Seq$1=Pervasives.Seq=Pervasives.Seq||{};
 Reactive=Charting.Reactive=Charting.Reactive||{};
 Reactive$1=Pervasives.Reactive=Pervasives.Reactive||{};
 List=WebSharper.List=WebSharper.List||{};
 T$1=List.T=List.T||{};
 SC$4=Global.StartupCode$WebSharper_UI$Templates=Global.StartupCode$WebSharper_UI$Templates||{};
 Event=Control.Event=Control.Event||{};
 Event$1=Event.Event=Event.Event||{};
 Random=WebSharper.Random=WebSharper.Random||{};
 PolarData=Charts.PolarData=Charts.PolarData||{};
 Abbrev=UI.Abbrev=UI.Abbrev||{};
 Fresh=Abbrev.Fresh=Abbrev.Fresh||{};
 DictionaryUtil=Collections.DictionaryUtil=Collections.DictionaryUtil||{};
 Storage=UI.Storage=UI.Storage||{};
 Router$1=Sitelets.Router=Sitelets.Router||{};
 List$1=Sitelets.List=Sitelets.List||{};
 AttrProxy=UI.AttrProxy=UI.AttrProxy||{};
 Attrs=UI.Attrs=UI.Attrs||{};
 DomUtility=UI.DomUtility=UI.DomUtility||{};
 Prepare=Templates.Prepare=Templates.Prepare||{};
 KeyCollection=Collections.KeyCollection=Collections.KeyCollection||{};
 DocElemNode=UI.DocElemNode=UI.DocElemNode||{};
 CharacterData=Global.CharacterData;
 Blob=Global.Blob;
 Elt$1=UI.Elt=UI.Elt||{};
 An=UI.An=UI.An||{};
 Settings=Client.Settings=Client.Settings||{};
 Mailbox=Abbrev.Mailbox=Abbrev.Mailbox||{};
 ArrayStorage=Storage.ArrayStorage=Storage.ArrayStorage||{};
 FSharpMap=Collections.FSharpMap=Collections.FSharpMap||{};
 Map=Collections.Map=Collections.Map||{};
 Strings=WebSharper.Strings=WebSharper.Strings||{};
 Utils=WebSharper.Utils=WebSharper.Utils||{};
 Concurrency=WebSharper.Concurrency=WebSharper.Concurrency||{};
 Attrs$1=Client.Attrs=Client.Attrs||{};
 Dyn=Attrs$1.Dyn=Attrs$1.Dyn||{};
 SC$5=Global.StartupCode$WebSharper_UI$Abbrev=Global.StartupCode$WebSharper_UI$Abbrev||{};
 Attribute=TemplateHoleModule.Attribute=TemplateHoleModule.Attribute||{};
 Event$2=TemplateHoleModule.Event=TemplateHoleModule.Event||{};
 AfterRender=TemplateHoleModule.AfterRender=TemplateHoleModule.AfterRender||{};
 AfterRenderQ=TemplateHoleModule.AfterRenderQ=TemplateHoleModule.AfterRenderQ||{};
 Array=UI.Array=UI.Array||{};
 Updates=UI.Updates=UI.Updates||{};
 ValueCollection=Collections.ValueCollection=Collections.ValueCollection||{};
 Docs$1=Client.Docs=Client.Docs||{};
 RunState=Docs$1.RunState=Docs$1.RunState||{};
 NodeSet=Docs$1.NodeSet=Docs$1.NodeSet||{};
 Anims=UI.Anims=UI.Anims||{};
 SC$6=Global.StartupCode$WebSharper_UI$Doc_Proxy=Global.StartupCode$WebSharper_UI$Doc_Proxy||{};
 BalancedTree=Collections.BalancedTree=Collections.BalancedTree||{};
 Tree=BalancedTree.Tree=BalancedTree.Tree||{};
 Pair=Collections.Pair=Collections.Pair||{};
 SC$7=Global.StartupCode$WebSharper_UI$DomUtility=Global.StartupCode$WebSharper_UI$DomUtility||{};
 Queue=WebSharper.Queue=WebSharper.Queue||{};
 HashSetUtil=Collections.HashSetUtil=Collections.HashSetUtil||{};
 SC$8=Global.StartupCode$WebSharper_UI$Animation=Global.StartupCode$WebSharper_UI$Animation||{};
 AppendList=UI.AppendList=UI.AppendList||{};
 MapUtil=Collections.MapUtil=Collections.MapUtil||{};
 Scheduler=Concurrency.Scheduler=Concurrency.Scheduler||{};
 PathUtil=Sitelets.PathUtil=Sitelets.PathUtil||{};
 Error=Global.Error;
 KeyNotFoundException=WebSharper.KeyNotFoundException=WebSharper.KeyNotFoundException||{};
 DynamicAttrNode=UI.DynamicAttrNode=UI.DynamicAttrNode||{};
 SC$9=Global.StartupCode$WebSharper_UI$Attr_Client=Global.StartupCode$WebSharper_UI$Attr_Client||{};
 Easing=UI.Easing=UI.Easing||{};
 AsyncBody=Concurrency.AsyncBody=Concurrency.AsyncBody||{};
 SC$10=Global.StartupCode$WebSharper_Main$Concurrency=Global.StartupCode$WebSharper_Main$Concurrency||{};
 CT=Concurrency.CT=Concurrency.CT||{};
 HashSet$1=Abbrev.HashSet=Abbrev.HashSet||{};
 BindVar=UI.BindVar=UI.BindVar||{};
 String=UI.String=UI.String||{};
 CheckedInput=UI.CheckedInput=UI.CheckedInput||{};
 CancellationTokenSource=WebSharper.CancellationTokenSource=WebSharper.CancellationTokenSource||{};
 DomNodes=Docs$1.DomNodes=Docs$1.DomNodes||{};
 Char=WebSharper.Char=WebSharper.Char||{};
 DateUtil=WebSharper.DateUtil=WebSharper.DateUtil||{};
 OperationCanceledException=WebSharper.OperationCanceledException=WebSharper.OperationCanceledException||{};
 Lazy=WebSharper.Lazy=WebSharper.Lazy||{};
 SC$11=Global.StartupCode$WebSharper_UI$AppendList=Global.StartupCode$WebSharper_UI$AppendList||{};
 LazyExtensionsProxy=WebSharper.LazyExtensionsProxy=WebSharper.LazyExtensionsProxy||{};
 LazyRecord=LazyExtensionsProxy.LazyRecord=LazyExtensionsProxy.LazyRecord||{};
 Math=Global.Math;
 Runtime$1=WebSharper&&WebSharper.Runtime;
 console=Global.console;
 Date=Global.Date;
 App.Main=function()
 {
  var builder,M,_this,t,_this$1,_this$2,p,_,labels,_$1;
  builder=(M=Doc.EmbedView(View.Map(function(endpoint)
  {
   return endpoint.$==1?Pages.Page1():Pages.HomePage();
  },App.currentPage().get_View())),(_this=(t=(_this$1=(_this$2=new ProviderBuilder.New$1(),(_this$2.h.push(new Text.New("url_home","/")),_this$2)),(_this$1.h.push(new Text.New("url_page1","/#/page1")),_this$1)),(t.h.push(Handler.EventQ2(t.k,"takemehome",function()
  {
   return t.i;
  },function()
  {
   App.currentPage().Set({
    $:0
   });
   App.month()<6?self.alert("Now, It's still month of  "+Global.String(App.month())+" .  so it's a good time to start doing some healthy things!  Let't check at the homepage."):App.month()<10?self.alert("Now, it is month of "+Global.String(App.month())+" .  so you still have time to start living a healthier lifestyle!  Let't check at the homepage."):self.alert("Now, it is month of  "+Global.String(App.month())+" .  Start living a healthy lifestyle in preparation for next year.!  Let't check at the homepage.");
  })),t)),(_this.h.push(new Elt.New("maincontainer",M)),_this)));
  p=Handler.CompleteHoles(builder.k,builder.h,[]);
  builder.i=new TemplateInstance.New(p[1],Templates.RunFullDocTemplate(p[0]));
  _=ChartJs.Render$1(Chart.Combine([Chart.Bar$1(Arrays.zip(["Your","John","Paul","Sara","Mery"],[Pages.counter().Get(),2,3,1,4])).__WithFillColor(new Color({
   $:0,
   $0:151,
   $1:187,
   $2:205,
   $3:0.2
  })).__WithStrokeColor(new Color({
   $:2,
   $0:"blue"
  }))]),{
   $:1,
   $0:{
    $:0,
    $0:600,
    $1:300
   }
  },null,null);
  Templates.LoadLocalTemplates("");
  Doc.RunAppendById("Chart1",_);
  labels=["Eating","Drinking","Sleeping","Designing","Coding","Cycling","Running"];
  _$1=ChartJs.Render(Chart.Combine([Chart.Radar$1(Arrays.zip(labels,[28,48,40,19,96,27,100])).__WithFillColor(new Color({
   $:0,
   $0:151,
   $1:187,
   $2:205,
   $3:0.2
  })).__WithStrokeColor(new Color({
   $:2,
   $0:"blue"
  })).__WithPointColor(new Color({
   $:2,
   $0:"darkblue"
  })),Chart.Radar$1(Arrays.zip(labels,[65,59,90,81,56,55,40])).__WithFillColor(new Color({
   $:0,
   $0:220,
   $1:220,
   $2:220,
   $3:0.2
  })).__WithStrokeColor(new Color({
   $:2,
   $0:"green"
  })).__WithPointColor(new Color({
   $:2,
   $0:"darkgreen"
  }))]),{
   $:1,
   $0:{
    $:0,
    $0:600,
    $1:400
   }
  },null,null);
  Templates.LoadLocalTemplates("");
  Doc.RunAppendById("Chart",_$1);
 };
 App.currentPage=function()
 {
  SC$1.$cctor();
  return SC$1.currentPage;
 };
 App.month=function()
 {
  SC$1.$cctor();
  return SC$1.month;
 };
 App.router=function()
 {
  SC$1.$cctor();
  return SC$1.router;
 };
 Arrays.get=function(arr,n)
 {
  Arrays.checkBounds(arr,n);
  return arr[n];
 };
 Arrays.checkBounds=function(arr,n)
 {
  if(n<0||n>=arr.length)
   Operators.FailWith("Index was outside the bounds of the array.");
 };
 Arrays.set=function(arr,n,x)
 {
  Arrays.checkBounds(arr,n);
  arr[n]=x;
 };
 Arrays.length=function(arr)
 {
  return arr.dims===2?arr.length*arr.length:arr.length;
 };
 Operators.toInt=function(x)
 {
  var u;
  u=Operators.toUInt(x);
  return u>=2147483648?u-4294967296:u;
 };
 Operators.FailWith=function(msg)
 {
  throw new Error(msg);
 };
 Operators.toUInt=function(x)
 {
  return(x<0?Math.ceil(x):Math.floor(x))>>>0;
 };
 Operators.range=function(min,max)
 {
  var count;
  count=1+max-min;
  return count<=0?[]:Seq.init(count,function(x)
  {
   return x+min;
  });
 };
 Operators.KeyValue=function(kvp)
 {
  return[kvp.K,kvp.V];
 };
 Obj=WebSharper.Obj=Runtime$1.Class({
  Equals:function(obj)
  {
   return this===obj;
  },
  GetHashCode:function()
  {
   return -1;
  }
 },null,Obj);
 Obj.New=Runtime$1.Ctor(function()
 {
 },Obj);
 ProviderBuilder=Server.ProviderBuilder=Runtime$1.Class({},Obj,ProviderBuilder);
 ProviderBuilder.New$1=Runtime$1.Ctor(function()
 {
  var c;
  Obj.New.call(this);
  this.i=null;
  this.k=(c=Guid.NewGuid(),Global.String(c));
  this.h=Runtime$1.MarkResizable([]);
  Runtime$1.SetOptional(this,"s",null);
 },ProviderBuilder);
 TemplateHole=UI.TemplateHole=Runtime$1.Class({
  ForTextView:function()
  {
   console.warn("Content hole filled with attribute data",this.get_Name());
   return null;
  },
  AddAttribute:function(a,a$1)
  {
   console.warn("Var hole filled with non-Var data",this.get_Name());
  },
  get_AsChoiceView:function()
  {
   console.warn("Attribute value hole filled with non-text data",this.get_Name());
   return{
    $:0,
    $0:""
   };
  }
 },Obj,TemplateHole);
 TemplateHole.New=Runtime$1.Ctor(function()
 {
  Obj.New.call(this);
 },TemplateHole);
 Handler.EventQ2=function(key,holeName,ti,f)
 {
  return new EventQ.New(holeName,function(el)
  {
   return function(ev)
   {
    var i;
    i=ti();
    i.SetAnchorRoot(el);
    return f({
     Vars:i,
     Anchors:i,
     Target:el,
     Event:ev
    });
   };
  });
 };
 Handler.CompleteHoles=function(key,filledHoles,vars)
 {
  var allVars,filledVars,e,h,n;
  function c(name,ty,a)
  {
   var r;
   return filledVars.Contains(name)?null:(r=Unchecked.Equals(ty,0)?TemplateInitializer.GetOrAddHoleFor(key,name,function()
   {
    return new VarStr.New(name,Var$1.Create$1(""));
   }):Unchecked.Equals(ty,1)?TemplateInitializer.GetOrAddHoleFor(key,name,function()
   {
    return new VarFloatUnchecked.New(name,Var$1.Create$1(0));
   }):Unchecked.Equals(ty,2)?TemplateInitializer.GetOrAddHoleFor(key,name,function()
   {
    return new VarBool.New(name,Var$1.Create$1(false));
   }):Unchecked.Equals(ty,3)?TemplateInitializer.GetOrAddHoleFor(key,name,function()
   {
    return new VarDateTime.New(name,Var$1.Create$1(-8640000000000000));
   }):Unchecked.Equals(ty,4)?TemplateInitializer.GetOrAddHoleFor(key,name,function()
   {
    return new VarFile.New(name,Var$1.Create$1([]));
   }):Unchecked.Equals(ty,5)?TemplateInitializer.GetOrAddHoleFor(key,name,function()
   {
    var el;
    el=self.document.querySelector("[ws-dom="+name+"]");
    el.removeAttribute("ws-dom");
    return new VarDomElement.New(name,Var$1.Create$1({
     $:1,
     $0:el
    }));
   }):Operators.FailWith("Invalid value type"),(allVars.set_Item(name,r),{
    $:1,
    $0:r
   }));
  }
  allVars=new Dictionary.New$5();
  filledVars=new HashSet.New$3();
  e=Enumerator.Get(filledHoles);
  try
  {
   while(e.MoveNext())
    {
     h=e.Current();
     n=h.get_Name();
     filledVars.SAdd(n);
     allVars.set_Item(n,h);
    }
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
  return[Seq.append(filledHoles,Arrays.choose(function($1)
  {
   return c($1[0],$1[1],$1[2]);
  },vars)),{
   $:0,
   $0:allVars
  }];
 };
 Var=UI.Var=Runtime$1.Class({},Obj,Var);
 Var.New=Runtime$1.Ctor(function()
 {
  Obj.New.call(this);
 },Var);
 JS.GetFieldValues=function(o)
 {
  var r,k;
  r=[];
  for(var k$1 in o)r.push(o[k$1]);
  return r;
 };
 ChartJs.Render$1=function(chart,Size,Config,Window)
 {
  var d;
  return ChartJsInternal.RenderCombinedBarChart(chart,(d=Renderers.defaultSize(),Size==null?d:Size.$0),Config,Window);
 };
 ChartJs.Render=function(chart,Size,Config,Window)
 {
  var d;
  return ChartJsInternal.RenderCombinedRadarChart(chart,(d=Renderers.defaultSize(),Size==null?d:Size.$0),Config,Window);
 };
 Chart.Combine=function(charts)
 {
  return new CompositeChart.New(charts);
 };
 Chart.Radar$1=function(dataset)
 {
  return new RadarChart.New({
   $:0,
   $0:dataset
  },Charts.defaultChartConfig(),Charts.defaultSeriesChartConfig(),Charts.defaultColorConfig());
 };
 Chart.Bar$1=function(dataset)
 {
  return new BarChart.New({
   $:0,
   $0:dataset
  },Charts.defaultChartConfig(),Charts.defaultSeriesChartConfig());
 };
 RadarChart=Charts.RadarChart=Runtime$1.Class({
  __WithPointColor:function(color)
  {
   return this.WebSharper_Charting_Charts_IColorChart_1$WithPointColor(color);
  },
  __WithStrokeColor:function(color)
  {
   return this.WebSharper_Charting_Charts_ISeriesChart_1$WithStrokeColor(color);
  },
  __WithFillColor:function(color)
  {
   return this.WebSharper_Charting_Charts_ISeriesChart_1$WithFillColor(color);
  },
  get__Config:function()
  {
   return this.WebSharper_Charting_Charts_IChart_1$get_Config();
  },
  get__SeriesConfig:function()
  {
   return this.WebSharper_Charting_Charts_ISeriesChart_1$get_SeriesConfig();
  },
  get__ColorConfig:function()
  {
   return this.WebSharper_Charting_Charts_IColorChart_1$get_ColorConfig();
  },
  get_DataSet:function()
  {
   return this.dataset;
  },
  WebSharper_Charting_Charts_IColorChart_1$WithPointColor:function(color)
  {
   var i;
   return new RadarChart.New(this.dataset,this.cfg,this.scfg,(i=this.ccfg,ColorConfig.New(color,i.PointHighlightFill,i.PointHighlightStroke,i.PointStrokeColor)));
  },
  WebSharper_Charting_Charts_ISeriesChart_1$WithStrokeColor:function(color)
  {
   var i;
   return new RadarChart.New(this.dataset,this.cfg,(i=this.scfg,SeriesChartConfig.New(i.XAxis,i.YAxis,i.FillColor,color,i.IsFilled)),this.ccfg);
  },
  WebSharper_Charting_Charts_ISeriesChart_1$WithFillColor:function(color)
  {
   var i;
   return new RadarChart.New(this.dataset,this.cfg,(i=this.scfg,SeriesChartConfig.New(i.XAxis,i.YAxis,color,i.StrokeColor,i.IsFilled)),this.ccfg);
  },
  WebSharper_Charting_Charts_IChart_1$get_Config:function()
  {
   return this.cfg;
  },
  WebSharper_Charting_Charts_ISeriesChart_1$get_SeriesConfig:function()
  {
   return this.scfg;
  },
  WebSharper_Charting_Charts_IMutableChart_2$OnUpdate:function(fn)
  {
   this.event.event.Subscribe(Util.observer(fn));
  },
  WebSharper_Charting_Charts_IColorChart_1$get_ColorConfig:function()
  {
   return this.ccfg;
  }
 },Obj,RadarChart);
 RadarChart.New=Runtime$1.Ctor(function(dataset,cfg,scfg,ccfg)
 {
  Obj.New.call(this);
  this.dataset=dataset;
  this.cfg=cfg;
  this.scfg=scfg;
  this.ccfg=ccfg;
  this.event=new FSharpEvent.New();
 },RadarChart);
 Arrays.zip=function(arr1,arr2)
 {
  var res,i,$1;
  Arrays.checkLength(arr1,arr2);
  res=Arrays.create(arr1.length,null);
  for(i=0,$1=arr1.length-1;i<=$1;i++)res[i]=[arr1[i],arr2[i]];
  return res;
 };
 Arrays.checkLength=function(arr1,arr2)
 {
  if(arr1.length!==arr2.length)
   Operators.FailWith("The arrays have different lengths.");
 };
 Arrays.map=function(f,arr)
 {
  var r,i,$1;
  r=new Global.Array(arr.length);
  for(i=0,$1=arr.length-1;i<=$1;i++)r[i]=f(arr[i]);
  return r;
 };
 Arrays.iter=function(f,arr)
 {
  var i,$1;
  for(i=0,$1=arr.length-1;i<=$1;i++)f(arr[i]);
 };
 Arrays.iteri=function(f,arr)
 {
  var i,$1;
  for(i=0,$1=arr.length-1;i<=$1;i++)f(i,arr[i]);
 };
 Arrays.create=function(size,value)
 {
  var r,i,$1;
  r=new Global.Array(size);
  for(i=0,$1=size-1;i<=$1;i++)r[i]=value;
  return r;
 };
 Arrays.choose=function(f,arr)
 {
  var q,i,$1,m;
  q=[];
  for(i=0,$1=arr.length-1;i<=$1;i++){
   m=f(arr[i]);
   if(m==null)
    ;
   else
    q.push(m.$0);
  }
  return q;
 };
 Arrays.ofSeq=function(xs)
 {
  var q,o;
  if(xs instanceof Global.Array)
   return xs.slice();
  else
   if(xs instanceof T$1)
    return Arrays.ofList(xs);
   else
    {
     q=[];
     o=Enumerator.Get(xs);
     try
     {
      while(o.MoveNext())
       q.push(o.Current());
      return q;
     }
     finally
     {
      if(typeof o=="object"&&"Dispose"in o)
       o.Dispose();
     }
    }
 };
 Arrays.tryFindIndex=function(f,arr)
 {
  var res,i;
  res=null;
  i=0;
  while(i<arr.length&&res==null)
   {
    f(arr[i])?res={
     $:1,
     $0:i
    }:void 0;
    i=i+1;
   }
  return res;
 };
 Arrays.ofList=function(xs)
 {
  var l,q;
  q=[];
  l=xs;
  while(!(l.$==0))
   {
    q.push(List.head(l));
    l=List.tail(l);
   }
  return q;
 };
 Arrays.map2=function(f,arr1,arr2)
 {
  var r,i,$1;
  Arrays.checkLength(arr1,arr2);
  r=new Global.Array(arr2.length);
  for(i=0,$1=arr2.length-1;i<=$1;i++)r[i]=f(arr1[i],arr2[i]);
  return r;
 };
 Arrays.forall=function(f,x)
 {
  var a,i,$1,l;
  a=true;
  i=0;
  l=Arrays.length(x);
  while(a&&i<l)
   if(f(x[i]))
    i=i+1;
   else
    a=false;
  return a;
 };
 Arrays.init=function(size,f)
 {
  var r,i,$1;
  if(size<0)
   Operators.FailWith("Negative size given.");
  else
   null;
  r=new Global.Array(size);
  for(i=0,$1=size-1;i<=$1;i++)r[i]=f(i);
  return r;
 };
 Arrays.exists=function(f,x)
 {
  var e,i,$1,l;
  e=false;
  i=0;
  l=Arrays.length(x);
  while(!e&&i<l)
   if(f(x[i]))
    e=true;
   else
    i=i+1;
  return e;
 };
 Arrays.tryPick=function(f,arr)
 {
  var res,i,m;
  res=null;
  i=0;
  while(i<arr.length&&res==null)
   {
    m=f(arr[i]);
    if(m!=null&&m.$==1)
     res=m;
    i=i+1;
   }
  return res;
 };
 Arrays.filter=function(f,arr)
 {
  var r,i,$1;
  r=[];
  for(i=0,$1=arr.length-1;i<=$1;i++)if(f(arr[i]))
   r.push(arr[i]);
  return r;
 };
 Arrays.concat=function(xs)
 {
  return Global.Array.prototype.concat.apply([],Arrays.ofSeq(xs));
 };
 Arrays.foldBack=function(f,arr,zero)
 {
  var acc,$1,len,i,$2;
  acc=zero;
  len=arr.length;
  for(i=1,$2=len;i<=$2;i++)acc=f(arr[len-i],acc);
  return acc;
 };
 Arrays.pick=function(f,arr)
 {
  var m;
  m=Arrays.tryPick(f,arr);
  return m==null?Operators.FailWith("KeyNotFoundException"):m.$0;
 };
 Arrays.sortInPlace=function(arr)
 {
  Arrays.mapInPlace(function(t)
  {
   return t[0];
  },Arrays.mapiInPlace(function($1,$2)
  {
   return[$2,$1];
  },arr).sort(Unchecked.Compare));
 };
 Color=Pervasives.Color=Runtime$1.Class({
  toString:function()
  {
   return this.$==1?this.$0:this.$==2?this.$0:"rgba("+Global.String(this.$0)+", "+Global.String(this.$1)+", "+Global.String(this.$2)+", "+this.$3.toFixed(6)+")";
  }
 },null,Color);
 BarChart=Charts.BarChart=Runtime$1.Class({
  __WithStrokeColor:function(color)
  {
   return this.cst(this).WebSharper_Charting_Charts_ISeriesChart_1$WithStrokeColor(color);
  },
  __WithFillColor:function(color)
  {
   return this.cst(this).WebSharper_Charting_Charts_ISeriesChart_1$WithFillColor(color);
  },
  cst:Global.id,
  get__Config:function()
  {
   return this.cst(this).WebSharper_Charting_Charts_IChart_1$get_Config();
  },
  get__SeriesConfig:function()
  {
   return this.cst(this).WebSharper_Charting_Charts_ISeriesChart_1$get_SeriesConfig();
  },
  get_DataSet:function()
  {
   return this.dataset;
  },
  WebSharper_Charting_Charts_ISeriesChart_1$WithStrokeColor:function(color)
  {
   var i;
   return new BarChart.New(this.dataset,this.cfg,(i=this.scfg,SeriesChartConfig.New(i.XAxis,i.YAxis,i.FillColor,color,i.IsFilled)));
  },
  WebSharper_Charting_Charts_ISeriesChart_1$WithFillColor:function(color)
  {
   var i;
   return new BarChart.New(this.dataset,this.cfg,(i=this.scfg,SeriesChartConfig.New(i.XAxis,i.YAxis,color,i.StrokeColor,i.IsFilled)));
  },
  WebSharper_Charting_Charts_IChart_1$get_Config:function()
  {
   return this.cfg;
  },
  WebSharper_Charting_Charts_ISeriesChart_1$get_SeriesConfig:function()
  {
   return this.scfg;
  },
  WebSharper_Charting_Charts_IMutableChart_2$OnUpdate:function(fn)
  {
   this.event.event.Subscribe(Util.observer(fn));
  }
 },Obj,BarChart);
 BarChart.New=Runtime$1.Ctor(function(dataset,cfg,scfg)
 {
  Obj.New.call(this);
  this.dataset=dataset;
  this.cfg=cfg;
  this.scfg=scfg;
  this.event=new FSharpEvent.New();
 },BarChart);
 Pages.counter=function()
 {
  SC$1.$cctor();
  return SC$1.counter;
 };
 Pages.Page1=function()
 {
  var b,p,i;
  return(b=new ProviderBuilder.New$1(),(p=Handler.CompleteHoles(b.k,b.h,[]),(i=new TemplateInstance.New(p[1],MidPrjFuji_Templates.page1(p[0])),b.i=i,i))).get_Doc();
 };
 Pages.HomePage=function()
 {
  var newName,newHeight,newWeight,newBMI,_eval,b,C,_this,V,_this$1,t,E,_this$2,R,_this$3,t$1,_this$4,_this$5,_this$6,L,_this$7,t$2,t$3,p,i;
  function a(name,height,weight,bmi)
  {
   var b$1,_this$8,_this$9,_this$10,_this$11,p$1,i$1;
   return(b$1=(_this$8=(_this$9=(_this$10=(_this$11=new ProviderBuilder.New$1(),(_this$11.h.push(new Text.New("name",name)),_this$11)),(_this$10.h.push(new Text.New("height",height)),_this$10)),(_this$9.h.push(new Text.New("weight",weight)),_this$9)),(_this$8.h.push(new Text.New("bmi",bmi)),_this$8)),(p$1=Handler.CompleteHoles(b$1.k,b$1.h,[]),(i$1=new TemplateInstance.New(p$1[1],MidPrjFuji_Templates.listitem(p$1[0])),b$1.i=i$1,i$1))).get_Doc();
  }
  newName=Var$1.Create$1("");
  newHeight=Var$1.Create$1("");
  newWeight=Var$1.Create$1("");
  newBMI=Var$1.Create$1(0);
  _eval=Var$1.Create$1("");
  return(b=(C=Global.String((new Global.Date(Pages.now())).getFullYear())+"/"+Global.String((new Global.Date(Pages.now())).getMonth()+1)+"/"+Global.String((new Global.Date(Pages.now())).getDate()),(_this=(V=View.Map(Global.String,Pages.counter().get_View()),(_this$1=(t=(E=View.Map(Global.String,_eval.get_View()),(_this$2=(R=View.Map(Global.String,Pages.healthData().get_View()),(_this$3=(t$1=(_this$4=(_this$5=(_this$6=(L=Doc.Convert(function($1)
  {
   return a($1[0],$1[1],$1[2],$1[3]);
  },Pages.People().v),(_this$7=(t$2=(t$3=new ProviderBuilder.New$1(),(t$3.h.push(Handler.EventQ2(t$3.k,"decrement",function()
  {
   return t$3.i;
  },function()
  {
   Pages.counter().Set(Pages.counter().Get()-1);
   Pages.strage().setItem("counter",Global.String(Pages.counter().Get()));
  })),t$3)),(t$2.h.push(Handler.EventQ2(t$2.k,"increment",function()
  {
   return t$2.i;
  },function()
  {
   Pages.counter().Set(Pages.counter().Get()+1);
   Pages.strage().setItem("counter",Global.String(Pages.counter().Get()));
  })),t$2)),(_this$7.h.push(new Elt.New("listcontainer",L)),_this$7))),(_this$6.h.push(new VarStr.New("name",newName)),_this$6)),(_this$5.h.push(new VarStr.New("height",newHeight)),_this$5)),(_this$4.h.push(new VarStr.New("weight",newWeight)),_this$4)),(t$1.h.push(Handler.EventQ2(t$1.k,"add",function()
  {
   return t$1.i;
  },function()
  {
   var heightInMeters;
   heightInMeters=Global.Number(newHeight.Get())/100;
   newBMI.Set(Operators.toInt(Global.Number(newWeight.Get())/(heightInMeters*heightInMeters)));
   Pages.People().Append([newName.Get(),newHeight.Get(),newWeight.Get(),Global.String(newBMI.Get())]);
   Pages.healthData().Set("["+newName.Get()+"'s HEALTH-DATA]    HEIGHT:  "+newHeight.Get()+"cm  / WEIGHT:  "+newWeight.Get()+"kg  / BMI:  "+Global.String(newBMI.Get())+".");
   Pages.str().setItem(newName.Get(),Pages.healthData().Get());
   if(Pages.counter().Get()>=3&&newBMI.Get()<=25)
    _eval.Set("+++ GOOD HEALTH");
   else
    Pages.counter().Get()<3&&newBMI.Get()<=25?_eval.Set("++ NORMAL HEALTH"):Pages.counter().Get()>=3&&newBMI.Get()>20?_eval.Set("++ NORMAL HEALTH"):_eval.Set("+ NOT HEALTHY");
   newName.Set("");
   newHeight.Set("");
   newWeight.Set("");
  })),t$1)),(_this$3.h.push(new TextView.New("result",R)),_this$3))),(_this$2.h.push(new TextView.New("eval",E)),_this$2))),(t.h.push(Handler.EventQ2(t.k,"clear",function()
  {
   return t.i;
  },function()
  {
   Pages.counter().Set(0);
  })),t)),(_this$1.h.push(new TextView.New("value",V)),_this$1))),(_this.h.push(new Text.New("checkdate",C)),_this))),(p=Handler.CompleteHoles(b.k,b.h,[["name",0,null],["height",0,null],["weight",0,null]]),(i=new TemplateInstance.New(p[1],MidPrjFuji_Templates.homepage(p[0])),b.i=i,i))).get_Doc();
 };
 Pages.strage=function()
 {
  SC$1.$cctor();
  return SC$1.strage;
 };
 Pages.People=function()
 {
  SC$1.$cctor();
  return SC$1.People;
 };
 Pages.healthData=function()
 {
  SC$1.$cctor();
  return SC$1.healthData;
 };
 Pages.str=function()
 {
  SC$1.$cctor();
  return SC$1.str;
 };
 Pages.now=function()
 {
  SC$1.$cctor();
  return SC$1.now;
 };
 View=UI.View=Runtime$1.Class({},null,View);
 TemplateInstance=Server.TemplateInstance=Runtime$1.Class({
  SetAnchorRoot:function(el)
  {
   this.anchorRoot=el;
  },
  get_Doc:function()
  {
   return this.doc;
  }
 },Obj,TemplateInstance);
 TemplateInstance.New=Runtime$1.Ctor(function(c,doc)
 {
  Obj.New.call(this);
  this.doc=doc;
  this.allVars=c.$==0?c.$0:Operators.FailWith("Should not happen");
  this.anchorRoot=null;
 },TemplateInstance);
 Elt=TemplateHoleModule.Elt=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  get_Value:function()
  {
   return this.fillWith;
  }
 },TemplateHole,Elt);
 Elt.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },Elt);
 Text=TemplateHoleModule.Text=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  get_Value:function()
  {
   return this.fillWith;
  },
  get_AsChoiceView:function()
  {
   return{
    $:0,
    $0:this.fillWith
   };
  }
 },TemplateHole,Text);
 Text.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },Text);
 Unchecked.Equals=function(a,b)
 {
  var m,eqR,k,k$1;
  if(a===b)
   return true;
  else
   {
    m=typeof a;
    if(m=="object")
    {
     if(a===null||a===void 0||b===null||b===void 0||!Unchecked.Equals(typeof b,"object"))
      return false;
     else
      if("Equals"in a)
       return a.Equals(b);
      else
       if("Equals"in b)
        return false;
       else
        if(a instanceof Global.Array&&b instanceof Global.Array)
         return Unchecked.arrayEquals(a,b);
        else
         if(a instanceof Global.Date&&b instanceof Global.Date)
          return Unchecked.dateEquals(a,b);
         else
          {
           eqR=[true];
           for(var k$2 in a)if(function(k$3)
           {
            eqR[0]=!a.hasOwnProperty(k$3)||b.hasOwnProperty(k$3)&&Unchecked.Equals(a[k$3],b[k$3]);
            return!eqR[0];
           }(k$2))
            break;
           if(eqR[0])
            {
             for(var k$3 in b)if(function(k$4)
             {
              eqR[0]=!b.hasOwnProperty(k$4)||a.hasOwnProperty(k$4);
              return!eqR[0];
             }(k$3))
              break;
            }
           return eqR[0];
          }
    }
    else
     return m=="function"&&("$Func"in a?a.$Func===b.$Func&&a.$Target===b.$Target:"$Invokes"in a&&"$Invokes"in b&&Unchecked.arrayEquals(a.$Invokes,b.$Invokes));
   }
 };
 Unchecked.Compare=function(a,b)
 {
  var $1,m,$2,cmp,k,k$1;
  if(a===b)
   return 0;
  else
   {
    m=typeof a;
    switch(m=="function"?1:m=="boolean"?2:m=="number"?2:m=="string"?2:m=="object"?3:0)
    {
     case 0:
      return typeof b=="undefined"?0:-1;
     case 1:
      return Operators.FailWith("Cannot compare function values.");
     case 2:
      return a<b?-1:1;
     case 3:
      if(a===null)
       $2=-1;
      else
       if(b===null)
        $2=1;
       else
        if("CompareTo"in a)
         $2=a.CompareTo(b);
        else
         if("CompareTo0"in a)
          $2=a.CompareTo0(b);
         else
          if(a instanceof Global.Array&&b instanceof Global.Array)
           $2=Unchecked.compareArrays(a,b);
          else
           if(a instanceof Global.Date&&b instanceof Global.Date)
            $2=Unchecked.compareDates(a,b);
           else
            {
             cmp=[0];
             for(var k$2 in a)if(function(k$3)
             {
              return!a.hasOwnProperty(k$3)?false:!b.hasOwnProperty(k$3)?(cmp[0]=1,true):(cmp[0]=Unchecked.Compare(a[k$3],b[k$3]),cmp[0]!==0);
             }(k$2))
              break;
             if(cmp[0]===0)
              {
               for(var k$3 in b)if(function(k$4)
               {
                return!b.hasOwnProperty(k$4)?false:!a.hasOwnProperty(k$4)&&(cmp[0]=-1,true);
               }(k$3))
                break;
              }
             $2=cmp[0];
            }
      return $2;
    }
   }
 };
 Unchecked.arrayEquals=function(a,b)
 {
  var eq,i;
  if(Arrays.length(a)===Arrays.length(b))
   {
    eq=true;
    i=0;
    while(eq&&i<Arrays.length(a))
     {
      !Unchecked.Equals(Arrays.get(a,i),Arrays.get(b,i))?eq=false:void 0;
      i=i+1;
     }
    return eq;
   }
  else
   return false;
 };
 Unchecked.dateEquals=function(a,b)
 {
  return a.getTime()===b.getTime();
 };
 Unchecked.compareArrays=function(a,b)
 {
  var cmp,i;
  if(Arrays.length(a)<Arrays.length(b))
   return -1;
  else
   if(Arrays.length(a)>Arrays.length(b))
    return 1;
   else
    {
     cmp=0;
     i=0;
     while(cmp===0&&i<Arrays.length(a))
      {
       cmp=Unchecked.Compare(Arrays.get(a,i),Arrays.get(b,i));
       i=i+1;
      }
     return cmp;
    }
 };
 Unchecked.compareDates=function(a,b)
 {
  return Unchecked.Compare(a.getTime(),b.getTime());
 };
 Unchecked.Hash=function(o)
 {
  var m;
  m=typeof o;
  return m=="function"?0:m=="boolean"?o?1:0:m=="number"?o:m=="string"?Unchecked.hashString(o):m=="object"?o==null?0:o instanceof Global.Array?Unchecked.hashArray(o):Unchecked.hashObject(o):0;
 };
 Unchecked.hashString=function(s)
 {
  var hash,i,$1;
  if(s===null)
   return 0;
  else
   {
    hash=5381;
    for(i=0,$1=s.length-1;i<=$1;i++)hash=Unchecked.hashMix(hash,s[i].charCodeAt());
    return hash;
   }
 };
 Unchecked.hashArray=function(o)
 {
  var h,i,$1;
  h=-34948909;
  for(i=0,$1=Arrays.length(o)-1;i<=$1;i++)h=Unchecked.hashMix(h,Unchecked.Hash(Arrays.get(o,i)));
  return h;
 };
 Unchecked.hashObject=function(o)
 {
  var h,k;
  if("GetHashCode"in o)
   return o.GetHashCode();
  else
   {
    h=[0];
    for(var k$1 in o)if(function(key)
    {
     h[0]=Unchecked.hashMix(Unchecked.hashMix(h[0],Unchecked.hashString(key)),Unchecked.Hash(o[key]));
     return false;
    }(k$1))
     break;
    return h[0];
   }
 };
 Unchecked.hashMix=function(x,y)
 {
  return(x<<5)+x+y;
 };
 Guid.NewGuid=function()
 {
  return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(new Global.RegExp("[xy]","g"),function(c)
  {
   var r,v;
   r=Math.random()*16|0;
   v=c=="x"?r:r&3|8;
   return v.toString(16);
  });
 };
 EventQ=TemplateHoleModule.EventQ=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  get_Value:function()
  {
   return this.fillWith;
  }
 },TemplateHole,EventQ);
 EventQ.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },EventQ);
 SC$1.$cctor=function()
 {
  var curr;
  SC$1.$cctor=Global.ignore;
  SC$1.now=Date.now();
  SC$1.People=ListModel.FromSeq([["John","170","60","20"],["Paul","180","50","15"],["Sara","160","50","19"],["Mery","170","60","20"]]);
  SC$1.str=self.localStorage;
  SC$1.healthData=Var$1.Create$1("");
  SC$1.strage=self.localStorage;
  SC$1.counter=(curr=Pages.strage().getItem("counter"),Var$1.Create$1(curr==""?0:Operators.toInt(Global.Number(curr))));
  SC$1.router=MidPrjFuji_Router.r();
  SC$1.currentPage=Router.InstallHash({
   $:0
  },App.router());
  SC$1.state=0;
  SC$1.month=(new Date(Date.now())).getMonth()+1;
 };
 ChartJsInternal.RenderCombinedBarChart=function(chart,size,cfg,window$1)
 {
  return ChartJsInternal.withNewCanvas(size,function(canvas)
  {
   var labels,e,data,r,rendered;
   labels=(e=Seq.choose(function(chart$1)
   {
    var m;
    m=chart$1.get_DataSet();
    return m.$==1?null:{
     $:1,
     $0:Seq.map(function(t)
     {
      return t[0];
     },m.$0)
    };
   },chart.get_Charts()),Seq.length(e)>0?Seq.maxBy(Seq.length,e):[]);
   data=(r={},r.datasets=Arrays.ofSeq(Seq.map(function(chart$1)
   {
    var initials,r$1;
    initials=ChartJsInternal.mkInitial(chart$1.get_DataSet(),window$1);
    r$1={
     type:"bar"
    };
    r$1.label=chart$1.get__Config().Title;
    r$1.backgroundColor=Global.String(chart$1.get__SeriesConfig().FillColor);
    r$1.borderColor=Global.String(chart$1.get__SeriesConfig().StrokeColor);
    r$1.data=Arrays.map(function(t)
    {
     return t[1];
    },initials);
    return r$1;
   },chart.get_Charts())),r);
   data.labels=Arrays.ofSeq(labels);
   rendered=new Global.Chart(canvas,{
    data:data,
    options:cfg==null?{}:cfg.$0
   });
   Seq.iteri(function(i,chart$1)
   {
    return ChartJsInternal.registerUpdater(chart$1,function(j,$1)
    {
     var s;
     s=Arrays.get(rendered.data.datasets,i).data;
     s[j]=$1(Arrays.get(s,j));
    },function()
    {
     rendered.update();
    });
   },chart.get_Charts());
   return ChartJsInternal.onCombinedEvent(ChartJsInternal.extractStreams(Seq.map(function(chart$1)
   {
    return chart$1.get_DataSet();
   },chart.get_Charts())),Seq.length(chart.get_Charts()),window$1,function()
   {
    var data$1,ds,labels$1;
    data$1=rendered.data;
    ds=data$1.datasets;
    labels$1=data$1.labels;
    Arrays.iter(function(d)
    {
     d.data.shift();
    },ds);
    labels$1.shift();
    return rendered.update();
   },function(a,t)
   {
    var arr,data$1,ds,labels$1;
    arr=t[0];
    data$1=rendered.data;
    ds=data$1.datasets;
    labels$1=data$1.labels;
    Arrays.iteri(function(i,d)
    {
     var dd;
     dd=d.data;
     return dd[Arrays.length(dd)]=Arrays.get(arr,i);
    },ds);
    labels$1[Arrays.length(labels$1)]=t[1];
    return rendered.update();
   });
  });
 };
 ChartJsInternal.RenderCombinedRadarChart=function(chart,size,cfg,window$1)
 {
  return ChartJsInternal.withNewCanvas(size,function(canvas)
  {
   var labels,e,data,r,rendered;
   labels=(e=Seq.choose(function(chart$1)
   {
    var m;
    m=chart$1.get_DataSet();
    return m.$==1?null:{
     $:1,
     $0:Seq.map(function(t)
     {
      return t[0];
     },m.$0)
    };
   },chart.get_Charts()),Seq.length(e)>0?Seq.maxBy(Seq.length,e):[]);
   data=(r={},r.datasets=Arrays.ofSeq(Seq.map(function(chart$1)
   {
    var initials,r$1;
    initials=ChartJsInternal.mkInitial(chart$1.get_DataSet(),window$1);
    r$1={
     type:"radar"
    };
    r$1.label=chart$1.get__Config().Title;
    r$1.fill=chart$1.get__SeriesConfig().IsFilled;
    r$1.backgroundColor=Global.String(chart$1.get__SeriesConfig().FillColor);
    r$1.borderColor=Global.String(chart$1.get__SeriesConfig().StrokeColor);
    r$1.pointBackgroundColor=Global.String(chart$1.get__ColorConfig().PointColor);
    r$1.pointHoverBackgroundColor=Global.String(chart$1.get__ColorConfig().PointHighlightFill);
    r$1.pointHoverBorderColor=Global.String(chart$1.get__ColorConfig().PointHighlightStroke);
    r$1.pointBorderColor=Global.String(chart$1.get__ColorConfig().PointStrokeColor);
    r$1.data=Arrays.map(function(t)
    {
     return t[1];
    },initials);
    return r$1;
   },chart.get_Charts())),r);
   data.labels=Arrays.ofSeq(labels);
   rendered=new Global.Chart(canvas,{
    data:data,
    options:cfg==null?{}:cfg.$0
   });
   Seq.iteri(function(i,chart$1)
   {
    return ChartJsInternal.registerUpdater(chart$1,function(j,$1)
    {
     var s;
     s=Arrays.get(rendered.data.datasets,i).data;
     s[j]=$1(Arrays.get(s,j));
    },function()
    {
     rendered.update();
    });
   },chart.get_Charts());
   return ChartJsInternal.onCombinedEvent(ChartJsInternal.extractStreams(Seq.map(function(chart$1)
   {
    return chart$1.get_DataSet();
   },chart.get_Charts())),Seq.length(chart.get_Charts()),window$1,function()
   {
    var data$1,ds,labels$1;
    data$1=rendered.data;
    ds=data$1.datasets;
    labels$1=data$1.labels;
    Arrays.iter(function(d)
    {
     d.data.shift();
    },ds);
    labels$1.shift();
    return rendered.update();
   },function(a,t)
   {
    var arr,data$1,ds,labels$1;
    arr=t[0];
    data$1=rendered.data;
    ds=data$1.datasets;
    labels$1=data$1.labels;
    Arrays.iteri(function(i,d)
    {
     var dd;
     dd=d.data;
     return dd[Arrays.length(dd)]=Arrays.get(arr,i);
    },ds);
    labels$1[Arrays.length(labels$1)]=t[1];
    return rendered.update();
   });
  });
 };
 ChartJsInternal.withNewCanvas=function(size,k)
 {
  var width,height;
  width=size.$0;
  height=size.$1;
  return Doc.Element("div",[AttrProxy.Create("width",Global.String(width)),AttrProxy.Create("height",Global.String(height)),AttrModule.Style("width",Global.String(width)+"px"),AttrModule.Style("height",Global.String(height)+"px")],[Doc.Element("canvas",[AttrModule.OnAfterRender(function(el)
  {
   var ctx;
   ctx=el.getContext("2d");
   el.width=width;
   el.height=height;
   k(el,ctx);
  })],[])]);
 };
 ChartJsInternal.mkInitial=function(dataSet,window$1)
 {
  return dataSet.$==0?Option.fold(function(s,w)
  {
   var skp;
   skp=Arrays.length(s)-w;
   return skp>=Arrays.length(s)?[]:skp<=0?s:Slice.array(s,{
    $:1,
    $0:skp
   },null);
  },Arrays.ofSeq(dataSet.$0),window$1):[];
 };
 ChartJsInternal.registerUpdater=function(mChart,upd,fin)
 {
  var bu;
  function a($1,$2)
  {
   upd($1,$2);
   bu.Update(fin);
  }
  bu=new BatchUpdater.New(null,null);
  mChart.WebSharper_Charting_Charts_IMutableChart_2$OnUpdate(function($1)
  {
   return a($1[0],$1[1]);
  });
 };
 ChartJsInternal.onCombinedEvent=function(streams,l,window$1,remove,add)
 {
  var size;
  size=[0];
  streams.Subscribe(Util.observer(function(data)
  {
   var window$2,arr,o,$1,a;
   function a$1(i,a$2)
   {
    Arrays.set(arr,i,a$2[1]);
   }
   if(window$1==null)
    ;
   else
    {
     window$2=window$1.$0;
     size[0]>=window$2?remove(window$2,size[0]):void 0;
    }
   arr=Arrays.ofSeq(Seq.delay(function()
   {
    return Seq.map(function()
    {
     return 0;
    },Operators.range(1,l));
   }));
   Seq.iter(function($2)
   {
    return a$1($2[0],$2[1]);
   },data);
   o=Seq$1.headOption(data);
   if(o==null)
    ;
   else
    {
     $1=o.$0;
     $1[0];
     a=$1[1];
     add(size[0],[arr,a[0]]);
    }
   size[0]++;
  }));
 };
 ChartJsInternal.extractStreams=function(dataSet)
 {
  return Reactive$1.SequenceOnlyNew(Seq.choose(Global.id,Seq.mapi(function(i,data)
  {
   return data.$==0?null:{
    $:1,
    $0:Reactive.Select(data.$0,function(d)
    {
     return[i,d];
    })
   };
  },dataSet)));
 };
 Renderers.defaultSize=function()
 {
  SC$2.$cctor();
  return SC$2.defaultSize;
 };
 Templates.LoadLocalTemplates=function(baseName)
 {
  !Templates.LocalTemplatesLoaded()?(Templates.set_LocalTemplatesLoaded(true),Templates.LoadNestedTemplates(self.document.body,"")):void 0;
  Templates.LoadedTemplates().set_Item(baseName,Templates.LoadedTemplateFile(""));
 };
 Templates.LocalTemplatesLoaded=function()
 {
  SC$4.$cctor();
  return SC$4.LocalTemplatesLoaded;
 };
 Templates.set_LocalTemplatesLoaded=function($1)
 {
  SC$4.$cctor();
  SC$4.LocalTemplatesLoaded=$1;
 };
 Templates.LoadNestedTemplates=function(root,baseName)
 {
  var loadedTpls,rawTpls,wsTemplates,i,$1,node,name,wsChildrenTemplates,i$1,$2,node$1,name$1,html5TemplateBasedTemplates,i$2,$3,node$2,html5TemplateBasedTemplates$1,i$3,$4,node$3,instantiated;
  function prepareTemplate(name$2)
  {
   var m,o;
   if(!loadedTpls.ContainsKey(name$2))
    {
     m=(o=null,[rawTpls.TryGetValue(name$2,{
      get:function()
      {
       return o;
      },
      set:function(v)
      {
       o=v;
      }
     }),o]);
     if(m[0])
      {
       instantiated.SAdd(name$2);
       rawTpls.RemoveKey(name$2);
       Templates.PrepareTemplateStrict(baseName,{
        $:1,
        $0:name$2
       },m[1],{
        $:1,
        $0:prepareTemplate
       });
      }
     else
      console.warn(instantiated.Contains(name$2)?"Encountered loop when instantiating "+name$2:"Local template does not exist: "+name$2);
    }
  }
  loadedTpls=Templates.LoadedTemplateFile(baseName);
  rawTpls=new Dictionary.New$5();
  wsTemplates=root.querySelectorAll("[ws-template]");
  for(i=0,$1=wsTemplates.length-1;i<=$1;i++){
   node=wsTemplates[i];
   name=node.getAttribute("ws-template").toLowerCase();
   node.removeAttribute("ws-template");
   rawTpls.set_Item(name,Templates.FakeRootSingle(node));
  }
  wsChildrenTemplates=root.querySelectorAll("[ws-children-template]");
  for(i$1=0,$2=wsChildrenTemplates.length-1;i$1<=$2;i$1++){
   node$1=wsChildrenTemplates[i$1];
   name$1=node$1.getAttribute("ws-children-template").toLowerCase();
   node$1.removeAttribute("ws-children-template");
   rawTpls.set_Item(name$1,Templates.FakeRoot(node$1));
  }
  html5TemplateBasedTemplates=root.querySelectorAll("template[id]");
  for(i$2=0,$3=html5TemplateBasedTemplates.length-1;i$2<=$3;i$2++){
   node$2=html5TemplateBasedTemplates[i$2];
   rawTpls.set_Item(node$2.getAttribute("id").toLowerCase(),Templates.FakeRootFromHTMLTemplate(node$2));
  }
  html5TemplateBasedTemplates$1=root.querySelectorAll("template[name]");
  for(i$3=0,$4=html5TemplateBasedTemplates$1.length-1;i$3<=$4;i$3++){
   node$3=html5TemplateBasedTemplates$1[i$3];
   rawTpls.set_Item(node$3.getAttribute("name").toLowerCase(),Templates.FakeRootFromHTMLTemplate(node$3));
  }
  instantiated=new HashSet.New$3();
  while(rawTpls.count>0)
   prepareTemplate(Seq.head(rawTpls.Keys()));
 };
 Templates.LoadedTemplates=function()
 {
  SC$4.$cctor();
  return SC$4.LoadedTemplates;
 };
 Templates.LoadedTemplateFile=function(name)
 {
  var m,o,d;
  m=(o=null,[Templates.LoadedTemplates().TryGetValue(name,{
   get:function()
   {
    return o;
   },
   set:function(v)
   {
    o=v;
   }
  }),o]);
  return m[0]?m[1]:(d=new Dictionary.New$5(),(Templates.LoadedTemplates().set_Item(name,d),d));
 };
 Templates.RunFullDocTemplate=function(fillWith)
 {
  var d,x,a;
  return Templates.RenderedFullDocTemplate()==null?(d=(Templates.LoadLocalTemplates(""),Templates.PrepareTemplateStrict("",null,self.document.body,null),x=Templates.ChildrenTemplate(self.document.body,fillWith),a=self.document.body,function(a$1)
  {
   Doc.RunInPlace(true,a,a$1);
  }(x),x),(Templates.set_RenderedFullDocTemplate({
   $:1,
   $0:d
  }),d)):Templates.RenderedFullDocTemplate().$0;
 };
 Templates.FakeRootSingle=function(el)
 {
  var m,m$1,n,fakeroot;
  el.removeAttribute("ws-template");
  m=el.getAttribute("ws-replace");
  if(m==null)
   ;
  else
   {
    el.removeAttribute("ws-replace");
    m$1=el.parentNode;
    Unchecked.Equals(m$1,null)?void 0:(n=self.document.createElement(el.tagName),n.setAttribute("ws-replace",m),m$1.replaceChild(n,el));
   }
  fakeroot=self.document.createElement("div");
  fakeroot.appendChild(el);
  return fakeroot;
 };
 Templates.FakeRoot=function(parent)
 {
  var fakeroot;
  fakeroot=self.document.createElement("div");
  while(parent.hasChildNodes())
   fakeroot.appendChild(parent.firstChild);
  return fakeroot;
 };
 Templates.FakeRootFromHTMLTemplate=function(parent)
 {
  var fakeroot,content,i,$1;
  fakeroot=self.document.createElement("div");
  content=parent.content;
  for(i=0,$1=content.childNodes.length-1;i<=$1;i++)fakeroot.appendChild(content.childNodes[i].cloneNode(true));
  return fakeroot;
 };
 Templates.PrepareTemplateStrict=function(baseName,name,fakeroot,prepareLocalTemplate)
 {
  var processedHTML5Templates,name$1;
  function recF(recI,$1)
  {
   var next,m,$2,x,f,name$2,p,instName,instBaseName,d,t,instance,usedHoles,mappings,attrs,i,$3,name$3,m$1,i$1,$4,n,singleTextFill,i$2,$5,n$1;
   function g(v)
   {
   }
   while(true)
    switch(recI)
    {
     case 0:
      if($1!==null)
       {
        next=$1.nextSibling;
        if(Unchecked.Equals($1.nodeType,Node.TEXT_NODE))
         Prepare.convertTextNode($1);
        else
         if(Unchecked.Equals($1.nodeType,Node.ELEMENT_NODE))
          convertElement($1);
        $1=next;
       }
      else
       return null;
      break;
     case 1:
      name$2=Slice.string($1.nodeName,{
       $:1,
       $0:3
      },null).toLowerCase();
      p=(m=name$2.indexOf("."),m===-1?[baseName,name$2]:[Slice.string(name$2,null,{
       $:1,
       $0:m-1
      }),Slice.string(name$2,{
       $:1,
       $0:m+1
      },null)]);
      instName=p[1];
      instBaseName=p[0];
      if(instBaseName!=""&&!Templates.LoadedTemplates().ContainsKey(instBaseName))
       return Prepare.failNotLoaded(instName);
      else
       {
        if(instBaseName==""&&prepareLocalTemplate!=null)
         prepareLocalTemplate.$0(instName);
        d=Templates.LoadedTemplates().Item(instBaseName);
        if(!d.ContainsKey(instName))
         return Prepare.failNotLoaded(instName);
        else
         {
          t=d.Item(instName);
          instance=t.cloneNode(true);
          usedHoles=new HashSet.New$3();
          mappings=new Dictionary.New$5();
          attrs=$1.attributes;
          for(i=0,$3=attrs.length-1;i<=$3;i++){
           name$3=attrs.item(i).name.toLowerCase();
           mappings.set_Item(name$3,(m$1=attrs.item(i).nodeValue,m$1==""?name$3:m$1.toLowerCase()));
           if(!usedHoles.SAdd(name$3))
            console.warn("Hole mapped twice",name$3);
          }
          for(i$1=0,$4=$1.childNodes.length-1;i$1<=$4;i$1++){
           n=$1.childNodes[i$1];
           if(Unchecked.Equals(n.nodeType,Node.ELEMENT_NODE))
            !usedHoles.SAdd(n.nodeName.toLowerCase())?console.warn("Hole filled twice",instName):void 0;
          }
          singleTextFill=$1.childNodes.length===1&&Unchecked.Equals($1.firstChild.nodeType,Node.TEXT_NODE);
          if(singleTextFill)
           {
            x=Prepare.fillTextHole(instance,$1.firstChild.textContent,instName);
            ((function(a)
            {
             return function(o)
             {
              if(o!=null)
               a(o.$0);
             };
            }((f=function(usedHoles$1)
            {
             return function(a)
             {
              return usedHoles$1.SAdd(a);
             };
            }(usedHoles),function(x$1)
            {
             return g(f(x$1));
            })))(x));
           }
          Prepare.removeHolesExcept(instance,usedHoles);
          if(!singleTextFill)
           {
            for(i$2=0,$5=$1.childNodes.length-1;i$2<=$5;i$2++){
             n$1=$1.childNodes[i$2];
             if(Unchecked.Equals(n$1.nodeType,Node.ELEMENT_NODE))
              n$1.hasAttributes()?Prepare.fillInstanceAttrs(instance,n$1):fillDocHole(instance,n$1);
            }
           }
          Prepare.mapHoles(instance,mappings);
          Prepare.fill(instance,$1.parentNode,$1);
          $1.parentNode.removeChild($1);
          return;
         }
       }
      break;
    }
  }
  function fillDocHole(instance,fillWith)
  {
   var m,m$1,name$2,m$2;
   function fillHole(p,n)
   {
    var parsed;
    if(name$2=="title"&&fillWith.hasChildNodes())
     {
      parsed=DomUtility.ParseHTMLIntoFakeRoot(fillWith.textContent);
      fillWith.removeChild(fillWith.firstChild);
      while(parsed.hasChildNodes())
       fillWith.appendChild(parsed.firstChild);
     }
    else
     null;
    convertElement(fillWith);
    return Prepare.fill(fillWith,p,n);
   }
   name$2=fillWith.nodeName.toLowerCase();
   Templates.foreachNotPreserved(instance,"[ws-attr-holes]",function(e)
   {
    var holeAttrs,i,$1,attrName,_this;
    holeAttrs=Strings.SplitChars(e.getAttribute("ws-attr-holes"),[" "],1);
    for(i=0,$1=holeAttrs.length-1;i<=$1;i++){
     attrName=Arrays.get(holeAttrs,i);
     e.setAttribute(attrName,(_this=new Global.RegExp("\\${"+name$2+"}","ig"),e.getAttribute(attrName).replace(_this,fillWith.textContent)));
    }
   });
   m$2=instance.querySelector("[ws-hole="+name$2+"]");
   if(Unchecked.Equals(m$2,null))
    {
     m=instance.querySelector("[ws-replace="+name$2+"]");
     return Unchecked.Equals(m,null)?(m$1=instance.querySelector("slot[name="+name$2+"]"),instance.tagName.toLowerCase()=="template"?(fillHole(m$1.parentNode,m$1),void m$1.parentNode.removeChild(m$1)):null):(fillHole(m.parentNode,m),void m.parentNode.removeChild(m));
    }
   else
    {
     while(m$2.hasChildNodes())
      m$2.removeChild(m$2.lastChild);
     m$2.removeAttribute("ws-hole");
     return fillHole(m$2,null);
    }
  }
  function convertElement(el)
  {
   if(!el.hasAttribute("ws-preserve"))
    if(Strings.StartsWith(el.nodeName.toLowerCase(),"ws-"))
     convertInstantiation(el);
    else
     {
      Prepare.convertAttrs(el);
      convertNodeAndSiblings(el.firstChild);
     }
  }
  function convertNodeAndSiblings(n)
  {
   return recF(0,n);
  }
  function convertInstantiation(el)
  {
   return recF(1,el);
  }
  function convertNestedTemplates(el)
  {
   var m,m$1,idTemplates,i,$1,n,nameTemplates,i$1,$2,n$1,name$2,name$3;
   while(true)
    {
     m=el.querySelector("[ws-template]");
     if(Unchecked.Equals(m,null))
      {
       m$1=el.querySelector("[ws-children-template]");
       if(Unchecked.Equals(m$1,null))
        {
         idTemplates=el.querySelectorAll("template[id]");
         for(i=1,$1=idTemplates.length-1;i<=$1;i++){
          n=idTemplates[i];
          if(processedHTML5Templates.Contains(n))
           ;
          else
           {
            Templates.PrepareTemplateStrict(baseName,{
             $:1,
             $0:n.getAttribute("id")
            },n,null);
            processedHTML5Templates.SAdd(n);
           }
         }
         nameTemplates=el.querySelectorAll("template[name]");
         for(i$1=1,$2=nameTemplates.length-1;i$1<=$2;i$1++){
          n$1=nameTemplates[i$1];
          if(processedHTML5Templates.Contains(n$1))
           ;
          else
           {
            Templates.PrepareTemplateStrict(baseName,{
             $:1,
             $0:n$1.getAttribute("name")
            },n$1,null);
            processedHTML5Templates.SAdd(n$1);
           }
         }
         return null;
        }
       else
        {
         name$2=m$1.getAttribute("ws-children-template");
         m$1.removeAttribute("ws-children-template");
         Templates.PrepareTemplateStrict(baseName,{
          $:1,
          $0:name$2
         },m$1,null);
         el=el;
        }
      }
     else
      {
       name$3=m.getAttribute("ws-template");
       (Templates.PrepareSingleTemplate(baseName,{
        $:1,
        $0:name$3
       },m))(null);
       el=el;
      }
    }
  }
  processedHTML5Templates=new HashSet.New$3();
  name$1=(name==null?"":name.$0).toLowerCase();
  Templates.LoadedTemplateFile(baseName).set_Item(name$1,fakeroot);
  if(fakeroot.hasChildNodes())
   {
    convertNestedTemplates(fakeroot);
    convertNodeAndSiblings(fakeroot.firstChild);
   }
 };
 Templates.NamedTemplate=function(baseName,name,fillWith)
 {
  var m,o;
  m=(o=null,[Templates.LoadedTemplateFile(baseName).TryGetValue(name==null?"":name.$0,{
   get:function()
   {
    return o;
   },
   set:function(v)
   {
    o=v;
   }
  }),o]);
  return m[0]?Templates.ChildrenTemplate(m[1].cloneNode(true),fillWith):(console.warn("Local template doesn't exist",name),Doc.get_Empty());
 };
 Templates.RenderedFullDocTemplate=function()
 {
  SC$4.$cctor();
  return SC$4.RenderedFullDocTemplate;
 };
 Templates.ChildrenTemplate=function(el,fillWith)
 {
  var p,updates,docTreeNode,m,$1;
  p=Templates.InlineTemplate(el,Seq.append(fillWith,Templates.GlobalHoles().Values()));
  updates=p[1];
  docTreeNode=p[0];
  m=docTreeNode.Els;
  return!Unchecked.Equals(m,null)&&m.length===1&&(Arrays.get(m,0)instanceof Node&&(Unchecked.Equals(Arrays.get(m,0).nodeType,Node.ELEMENT_NODE)&&($1=Arrays.get(m,0),true)))?Elt$1.TreeNode(docTreeNode,updates):Doc.Mk({
   $:6,
   $0:docTreeNode
  },updates);
 };
 Templates.set_RenderedFullDocTemplate=function($1)
 {
  SC$4.$cctor();
  SC$4.RenderedFullDocTemplate=$1;
 };
 Templates.foreachNotPreserved=function(root,selector,f)
 {
  DomUtility.IterSelector(root,selector,function(p)
  {
   if(p.closest("[ws-preserve]")==null)
    f(p);
  });
 };
 Templates.PrepareSingleTemplate=function(baseName,name,el)
 {
  var root;
  root=Templates.FakeRootSingle(el);
  return function(p)
  {
   Templates.PrepareTemplateStrict(baseName,name,root,p);
  };
 };
 Templates.InlineTemplate=function(el,fillWith)
 {
  var els,isDefaultSlotProcessed,$1,$2,$3,holes,updates,attrs,afterRender,fw,e,x;
  function addAttr(el$1,attr$1)
  {
   var attr$2,m,f;
   attr$2=Attrs.Insert(el$1,attr$1);
   updates.push(Attrs.Updates(attr$2));
   attrs.push([el$1,attr$2]);
   m=Runtime$1.GetOptional(attr$2.OnAfterRender);
   return m==null?null:(f=m.$0,void afterRender.push(function()
   {
    f(el$1);
   }));
  }
  function tryGetAsDoc(name)
  {
   var m,o,th,o$1;
   m=(o=null,[fw.TryGetValue(name,{
    get:function()
    {
     return o;
    },
    set:function(v)
    {
     o=v;
    }
   }),o]);
   return m[0]?(th=m[1],th instanceof Elt?{
    $:1,
    $0:th.get_Value()
   }:th instanceof Text?{
    $:1,
    $0:Doc.TextNode(th.get_Value())
   }:(o$1=th.ForTextView(),o$1==null?null:{
    $:1,
    $0:Doc.TextView(o$1.$0)
   })):null;
  }
  function wsdomHandling()
  {
   Templates.foreachNotPreservedwsDOM("[ws-dom]",function(e$1)
   {
    var m,o,th,_var,toWatch,mo,r;
    m=(o=null,[fw.TryGetValue(e$1.getAttribute("ws-dom").toLowerCase(),{
     get:function()
     {
      return o;
     },
     set:function(v)
     {
      o=v;
     }
    }),o]);
    if(m[0])
     {
      th=m[1];
      th instanceof VarDomElement?(_var=th.get_Value(),e$1.removeAttribute("ws-dom"),toWatch=e$1,mo=new Global.MutationObserver(function($4,mo$1)
      {
       Arrays.iter(function(mr)
       {
        function a(x$1,a$1,a$2,a$3)
        {
         if(x$1===toWatch&&mr.addedNodes.length!==1)
          {
           _var.SetFinal(null);
           mo$1.disconnect();
          }
        }
        mr.removedNodes.forEach(Runtime$1.CreateFuncWithArgs(function($5)
        {
         return a($5[0],$5[1],$5[2],$5[3]);
        }),null);
       },$4);
      }),e$1.parentElement!==null?mo.observe(e$1.parentElement,(r={},r.childList=true,r)):void 0,_var.Set({
       $:1,
       $0:e$1
      }),View.Sink(function(nel)
      {
       var nel$1;
       if(nel!=null&&nel.$==1)
        {
         nel$1=nel.$0;
         if(toWatch===nel$1)
          ;
         else
          {
           toWatch.replaceWith.apply(toWatch,[nel$1]);
           toWatch=nel$1;
          }
        }
       else
        {
         toWatch.remove();
         mo.disconnect();
        }
      },_var.get_View())):void 0;
     }
   });
  }
  holes=[];
  updates=[];
  attrs=[];
  afterRender=[];
  fw=new Dictionary.New$5();
  e=Enumerator.Get(fillWith);
  try
  {
   while(e.MoveNext())
    {
     x=e.Current();
     fw.set_Item(x.get_Name(),x);
    }
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
  els=DomUtility.ChildrenArray(el);
  Templates.foreachNotPreserved(el,"[ws-hole]",function(p)
  {
   var m,doc,name;
   name=p.getAttribute("ws-hole");
   p.removeAttribute("ws-hole");
   while(p.hasChildNodes())
    p.removeChild(p.lastChild);
   m=tryGetAsDoc(name);
   if(m!=null&&m.$==1)
    {
     doc=m.$0;
     Docs.LinkElement(p,doc.docNode);
     holes.push(DocElemNode.New(Attrs.Empty(p),doc.docNode,null,p,Fresh.Int(),null));
     updates.push(doc.updates);
    }
  });
  Templates.foreachNotPreserved(el,"[ws-replace]",function(e$1)
  {
   var m,doc,p,after,before,o;
   m=tryGetAsDoc(e$1.getAttribute("ws-replace"));
   if(m!=null&&m.$==1)
    {
     doc=m.$0;
     p=e$1.parentNode;
     after=self.document.createTextNode("");
     p.replaceChild(after,e$1);
     before=Docs.InsertBeforeDelim(after,doc.docNode);
     o=Arrays.tryFindIndex(function(y)
     {
      return e$1===y;
     },els);
     o==null?void 0:Arrays.set(els,o.$0,doc.docNode);
     holes.push(DocElemNode.New(Attrs.Empty(p),doc.docNode,{
      $:1,
      $0:[before,after]
     },p,Fresh.Int(),null));
     updates.push(doc.updates);
    }
  });
  isDefaultSlotProcessed=false;
  Templates.foreachNotPreserved(el,"slot",function(p)
  {
   var m,doc,name,name$1;
   name=p.getAttribute("name");
   name$1=name==""||name==null?"default":name.toLowerCase();
   if(isDefaultSlotProcessed&&name$1=="default"||!Unchecked.Equals(el.parentElement,null))
    void 0;
   else
    {
     while(p.hasChildNodes())
      p.removeChild(p.lastChild);
     if(name$1=="default")
      isDefaultSlotProcessed=true;
     m=tryGetAsDoc(name$1);
     if(m!=null&&m.$==1)
      {
       doc=m.$0;
       Docs.LinkElement(p,doc.docNode);
       holes.push(DocElemNode.New(Attrs.Empty(p),doc.docNode,null,p,Fresh.Int(),null));
       updates.push(doc.updates);
      }
    }
  });
  Templates.foreachNotPreserved(el,"[ws-attr]",function(e$1)
  {
   var name,m,o,th;
   name=e$1.getAttribute("ws-attr");
   e$1.removeAttribute("ws-attr");
   m=(o=null,[fw.TryGetValue(name,{
    get:function()
    {
     return o;
    },
    set:function(v)
    {
     o=v;
    }
   }),o]);
   if(m[0])
    {
     th=m[1];
     th instanceof Attribute?addAttr(e$1,th.get_Value()):console.warn("Attribute hole filled with non-attribute data",name);
    }
  });
  Templates.foreachNotPreserved(el,"[ws-on]",function(e$1)
  {
   addAttr(e$1,AttrProxy.Concat(Arrays.choose(function(x$1)
   {
    var a,m,o,th;
    a=Strings.SplitChars(x$1,[":"],1);
    m=(o=null,[fw.TryGetValue(Arrays.get(a,1),{
     get:function()
     {
      return o;
     },
     set:function(v)
     {
      o=v;
     }
    }),o]);
    return m[0]?(th=m[1],th instanceof Event$2?{
     $:1,
     $0:AttrModule.Handler(Arrays.get(a,0),th.get_Value())
    }:th instanceof EventQ?{
     $:1,
     $0:AttrProxy.Handler(Arrays.get(a,0),th.get_Value())
    }:(console.warn("Event hole on"+Arrays.get(a,0)+" filled with non-event data",Arrays.get(a,1)),null)):null;
   },Strings.SplitChars(e$1.getAttribute("ws-on"),[" "],1))));
   e$1.removeAttribute("ws-on");
  });
  Templates.foreachNotPreserved(el,"[ws-onafterrender]",function(e$1)
  {
   var name,m,o,th;
   name=e$1.getAttribute("ws-onafterrender");
   m=(o=null,[fw.TryGetValue(name,{
    get:function()
    {
     return o;
    },
    set:function(v)
    {
     o=v;
    }
   }),o]);
   if(m[0])
    {
     th=m[1];
     th instanceof AfterRender?(e$1.removeAttribute("ws-onafterrender"),addAttr(e$1,AttrModule.OnAfterRender(th.get_Value()))):th instanceof AfterRenderQ?(e$1.removeAttribute("ws-onafterrender"),addAttr(e$1,AttrModule.OnAfterRender(th.get_Value()))):console.warn("onafterrender hole filled with non-onafterrender data",name);
    }
  });
  Templates.foreachNotPreserved(el,"[ws-var]",function(e$1)
  {
   var name,m,o;
   name=e$1.getAttribute("ws-var");
   e$1.removeAttribute("ws-var");
   m=(o=null,[fw.TryGetValue(name,{
    get:function()
    {
     return o;
    },
    set:function(v)
    {
     o=v;
    }
   }),o]);
   if(m[0])
    m[1].AddAttribute(function($4)
    {
     return function($5)
     {
      return addAttr($4,$5);
     };
    },e$1);
  });
  Templates.foreachNotPreserved(el,"[ws-attr-holes]",function(e$1)
  {
   var re,holeAttrs,i,$4;
   re=new Global.RegExp(Templates.TextHoleRE(),"g");
   holeAttrs=Strings.SplitChars(e$1.getAttribute("ws-attr-holes"),[" "],1);
   e$1.removeAttribute("ws-attr-holes");
   for(i=0,$4=holeAttrs.length-1;i<=$4;i++)(function()
   {
    var m,lastIndex,$5,finalText,value,s,s$1,s$2,s$3,attrName,s$4,res,textBefore;
    attrName=Arrays.get(holeAttrs,i);
    s$4=e$1.getAttribute(attrName);
    m=null;
    lastIndex=0;
    res=[];
    while(m=re.exec(s$4),m!==null)
     {
      textBefore=Slice.string(s$4,{
       $:1,
       $0:lastIndex
      },{
       $:1,
       $0:re.lastIndex-Arrays.get(m,0).length-1
      });
      lastIndex=re.lastIndex;
      res.push([textBefore,Arrays.get(m,1)]);
     }
    finalText=Slice.string(s$4,{
     $:1,
     $0:lastIndex
    },null);
    re.lastIndex=0;
    value=Arrays.foldBack(function($6,$7)
    {
     return(function(t)
     {
      var textBefore$1,holeName;
      textBefore$1=t[0];
      holeName=t[1];
      return function(t$1)
      {
       var textAfter,views,holeContent,m$1,o;
       textAfter=t$1[0];
       views=t$1[1];
       holeContent=(m$1=(o=null,[fw.TryGetValue(holeName,{
        get:function()
        {
         return o;
        },
        set:function(v)
        {
         o=v;
        }
       }),o]),m$1[0]?m$1[1].get_AsChoiceView():{
        $:0,
        $0:""
       });
       return holeContent.$==1?[textBefore$1,new T$1({
        $:1,
        $0:textAfter==""?holeContent.$0:View.Map(function(s$5)
        {
         return s$5+textAfter;
        },holeContent.$0),
        $1:views
       })]:[textBefore$1+holeContent.$0+textAfter,views];
      };
     }($6))($7);
    },res,[finalText,T$1.Empty]);
    return addAttr(e$1,value[1].$==1?value[1].$1.$==1?value[1].$1.$1.$==1?value[1].$1.$1.$1.$==0?(s=value[0],AttrModule.Dynamic(attrName,View.Map3(function(v1,v2,v3)
    {
     return s+v1+v2+v3;
    },value[1].$0,value[1].$1.$0,value[1].$1.$1.$0))):(s$1=value[0],AttrModule.Dynamic(attrName,View.Map(function(vs)
    {
     return s$1+Strings.concat("",vs);
    },View.Sequence(value[1])))):(s$2=value[0],AttrModule.Dynamic(attrName,View.Map2(function(v1,v2)
    {
     return s$2+v1+v2;
    },value[1].$0,value[1].$1.$0))):value[0]==""?AttrModule.Dynamic(attrName,value[1].$0):(s$3=value[0],AttrModule.Dynamic(attrName,View.Map(function(v)
    {
     return s$3+v;
    },value[1].$0))):AttrProxy.Create(attrName,value[0]));
   }());
  });
  return[Runtime$1.DeleteEmptyFields({
   Els:els,
   Dirty:true,
   Holes:holes,
   Attrs:attrs,
   Render:($1=afterRender.length==0?{
    $:1,
    $0:function()
    {
     wsdomHandling();
    }
   }:{
    $:1,
    $0:function(el$1)
    {
     wsdomHandling();
     Arrays.iter(function(f)
     {
      f(el$1);
     },afterRender);
    }
   },$1?$1.$0:void 0),
   El:($2=!Unchecked.Equals(els,null)&&els.length===1&&(Arrays.get(els,0)instanceof Node&&(Arrays.get(els,0)instanceof Element&&($3=Arrays.get(els,0),true)))?{
    $:1,
    $0:$3
   }:null,$2?$2.$0:void 0)
  },["Render","El"]),Array.TreeReduce(View.Const(),View.Map2Unit,updates)];
 };
 Templates.GlobalHoles=function()
 {
  SC$4.$cctor();
  return SC$4.GlobalHoles;
 };
 Templates.TextHoleRE=function()
 {
  SC$4.$cctor();
  return SC$4.TextHoleRE;
 };
 Templates.foreachNotPreservedwsDOM=function(selector,f)
 {
  DomUtility.IterSelectorDoc(selector,function(p)
  {
   if(p.closest("[ws-preserve]")==null)
    f(p);
  });
 };
 Doc=UI.Doc=Runtime$1.Class({},Obj,Doc);
 Doc.RunAppendById=function(id,doc)
 {
  var m;
  m=self.document.getElementById(id);
  if(Unchecked.Equals(m,null))
   Operators.FailWith("invalid id: "+id);
  else
   Doc.RunAppend(m,doc);
 };
 Doc.EmbedView=function(view)
 {
  var node;
  node=Docs.CreateEmbedNode();
  return Doc.Mk({
   $:2,
   $0:node
  },View.Map(Global.ignore,View.Bind(function(doc)
  {
   Docs.UpdateEmbedNode(node,doc.docNode);
   return doc.updates;
  },view)));
 };
 Doc.RunAppend=function(parent,doc)
 {
  var rdelim;
  rdelim=self.document.createTextNode("");
  parent.appendChild(rdelim);
  Doc.RunBefore(rdelim,doc);
 };
 Doc.Mk=function(node,updates)
 {
  return new Doc.New(node,updates);
 };
 Doc.RunBefore=function(rdelim,doc)
 {
  var ldelim;
  ldelim=self.document.createTextNode("");
  rdelim.parentNode.insertBefore(ldelim,rdelim);
  Doc.RunBetween(ldelim,rdelim,doc);
 };
 Doc.Convert=function(render,view)
 {
  return Doc.Flatten(View.MapSeqCached(render,view));
 };
 Doc.RunInPlace=function(childrenOnly,parent,doc)
 {
  var st;
  st=Docs.CreateRunState(parent,doc.docNode);
  View.Sink(An.get_UseAnimations()||Settings.BatchUpdatesEnabled()?Mailbox.StartProcessor(Docs.PerformAnimatedUpdate(childrenOnly,st,doc.docNode)):function()
  {
   Docs.PerformSyncUpdate(childrenOnly,st,doc.docNode);
  },doc.updates);
 };
 Doc.RunBetween=function(ldelim,rdelim,doc)
 {
  var st;
  Docs.LinkPrevElement(rdelim,doc.docNode);
  st=Docs.CreateDelimitedRunState(ldelim,rdelim,doc.docNode);
  View.Sink(An.get_UseAnimations()||Settings.BatchUpdatesEnabled()?Mailbox.StartProcessor(Docs.PerformAnimatedUpdate(false,st,doc.docNode)):function()
  {
   Docs.PerformSyncUpdate(false,st,doc.docNode);
  },doc.updates);
 };
 Doc.get_Empty=function()
 {
  return Doc.Mk(null,View.Const());
 };
 Doc.Flatten=function(view)
 {
  return Doc.EmbedView(View.Map(Doc.Concat,view));
 };
 Doc.Element=function(name,attr$1,children)
 {
  var a,a$1;
  a=AttrProxy.Concat(attr$1);
  a$1=Doc.Concat(children);
  return Elt$1.New(self.document.createElement(name),a,a$1);
 };
 Doc.Concat=function(xs)
 {
  var x;
  x=Array.ofSeqNonCopying(xs);
  return Array.TreeReduce(Doc.get_Empty(),Doc.Append,x);
 };
 Doc.TextNode=function(v)
 {
  return Doc.Mk({
   $:5,
   $0:self.document.createTextNode(v)
  },View.Const());
 };
 Doc.TextView=function(txt)
 {
  var node;
  node=Docs.CreateTextNode();
  return Doc.Mk({
   $:4,
   $0:node
  },View.Map(function(t)
  {
   Docs.UpdateTextNode(node,t);
  },txt));
 };
 Doc.Append=function(a,b)
 {
  return Doc.Mk({
   $:0,
   $0:a.docNode,
   $1:b.docNode
  },View.Map2Unit(a.updates,b.updates));
 };
 Doc.New=Runtime$1.Ctor(function(docNode,updates)
 {
  Obj.New.call(this);
  this.docNode=docNode;
  this.updates=updates;
 },Doc);
 Pervasives$1.NewFromSeq=function(fields)
 {
  var r,e,f;
  r={};
  e=Enumerator.Get(fields);
  try
  {
   while(e.MoveNext())
    {
     f=e.Current();
     r[f[0]]=f[1];
    }
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
  return r;
 };
 CompositeChart=Charts.CompositeChart=Runtime$1.Class({
  get_Charts:function()
  {
   return this.charts;
  }
 },Obj,CompositeChart);
 CompositeChart.New=Runtime$1.Ctor(function(charts)
 {
  Obj.New.call(this);
  this.charts=charts;
 },CompositeChart);
 Charts.defaultChartConfig=function()
 {
  SC$3.$cctor();
  return SC$3.defaultChartConfig;
 };
 Charts.defaultSeriesChartConfig=function()
 {
  SC$3.$cctor();
  return SC$3.defaultSeriesChartConfig;
 };
 Charts.defaultColorConfig=function()
 {
  SC$3.$cctor();
  return SC$3.defaultColorConfig;
 };
 Numeric.TryParseInt32=function(s,r)
 {
  return Numeric.TryParse(s,-2147483648,2147483647,r);
 };
 View.Map=function(fn,a)
 {
  return View.CreateLazy(function()
  {
   return Snap.Map(fn,a());
  });
 };
 View.CreateLazy=function(observe)
 {
  var lv;
  lv={
   c:null,
   o:observe
  };
  return function()
  {
   var c,$1;
   c=lv.c;
   return c===null?(c=lv.o(),lv.c=c,($1=c.s,$1!=null&&$1.$==0)?lv.o=null:Snap.WhenObsoleteRun(c,function()
   {
    lv.c=null;
   }),c):c;
  };
 };
 View.Bind=function(fn,view)
 {
  return View.Join(View.Map(fn,view));
 };
 View.Join=function(a)
 {
  return View.CreateLazy(function()
  {
   return Snap.Join(a());
  });
 };
 View.Sink=function(act,a)
 {
  function loop()
  {
   Snap.WhenRun(a(),act,function()
   {
    Concurrency.scheduler().Fork(loop);
   });
  }
  Concurrency.scheduler().Fork(loop);
 };
 View.MapSeqCached=function(conv,view)
 {
  return View.MapSeqCachedBy(Global.id,conv,view);
 };
 View.Const=function(x)
 {
  var o;
  o=Snap.New({
   $:0,
   $0:x
  });
  return function()
  {
   return o;
  };
 };
 View.MapSeqCachedBy=function(key,conv,view)
 {
  var state;
  state=[new Dictionary.New$5()];
  return View.Map(function(xs)
  {
   var prevState,newState,result;
   prevState=state[0];
   newState=new Dictionary.New$5();
   result=Array.mapInPlace(function(x)
   {
    var k,res;
    k=key(x);
    res=prevState.ContainsKey(k)?prevState.Item(k):conv(x);
    newState.set_Item(k,res);
    return res;
   },Arrays.ofSeq(xs));
   state[0]=newState;
   return result;
  },view);
 };
 View.Map3=function(fn,a,a$1,a$2)
 {
  return View.CreateLazy(function()
  {
   return Snap.Map3(fn,a(),a$1(),a$2());
  });
 };
 View.Sequence=function(views)
 {
  return View.CreateLazy(function()
  {
   return Snap.Sequence(Seq.map(function(a)
   {
    return a();
   },views));
  });
 };
 View.Map2=function(fn,a,a$1)
 {
  return View.CreateLazy(function()
  {
   return Snap.Map2(fn,a(),a$1());
  });
 };
 View.Map2Unit=function(a,a$1)
 {
  return View.CreateLazy(function()
  {
   return Snap.Map2Unit(a(),a$1());
  });
 };
 MidPrjFuji_Templates.page1=function(h)
 {
  Templates.LoadLocalTemplates("index");
  return h?Templates.NamedTemplate("index",{
   $:1,
   $0:"page1"
  },h):void 0;
 };
 MidPrjFuji_Templates.listitem=function(h)
 {
  Templates.LoadLocalTemplates("index");
  return h?Templates.NamedTemplate("index",{
   $:1,
   $0:"listitem"
  },h):void 0;
 };
 MidPrjFuji_Templates.homepage=function(h)
 {
  Templates.LoadLocalTemplates("index");
  return h?Templates.NamedTemplate("index",{
   $:1,
   $0:"homepage"
  },h):void 0;
 };
 MidPrjFuji_Router.r=function()
 {
  return RouterOperators.JSUnion(void 0,[[null,[[null,[]]],[]],[null,[[null,["page1"]]],[]]]);
 };
 Var$1=UI.Var$1=Runtime$1.Class({},Obj,Var$1);
 Var$1.Create$1=function(v)
 {
  return new ConcreteVar.New(false,Snap.New({
   $:2,
   $0:v,
   $1:[]
  }),v);
 };
 ListModel=UI.ListModel=Runtime$1.Class({
  Append:function(item)
  {
   var $this,v,t,m;
   $this=this;
   v=this["var"].Get();
   t=this.key(item);
   m=Arrays.tryFindIndex(function(it)
   {
    return Unchecked.Equals($this.key(it),t);
   },v);
   if(m!=null&&m.$==1)
    this["var"].Set(this.storage.SSetAt(m.$0,item,v));
   else
    this["var"].Set(this.storage.SAppend(item,v));
   this.ObsoleteKey(t);
  },
  ObsoleteKey:function(key)
  {
   var m,o;
   m=(o=null,[this.it.TryGetValue(key,{
    get:function()
    {
     return o;
    },
    set:function(v)
    {
     o=v;
    }
   }),o]);
   if(m[0])
    {
     Snap.Obsolete(m[1]);
     this.it.RemoveKey(key);
    }
  },
  GetEnumerator:function()
  {
   return Enumerator.Get(this["var"].Get());
  },
  GetEnumerator0:function()
  {
   return Enumerator.Get0(this["var"].Get());
  }
 },Obj,ListModel);
 ListModel.New=Runtime$1.Ctor(function(key,storage)
 {
  ListModel.New$3.call(this,key,Var$1.Create$1(Arrays.ofSeq(Seq.distinctBy(key,storage.SInit()))),storage);
 },ListModel);
 ListModel.New$3=Runtime$1.Ctor(function(key,_var,storage)
 {
  Obj.New.call(this);
  this.key=key;
  this["var"]=_var;
  this.storage=storage;
  this.v=View.Map(function(x)
  {
   return x.slice();
  },this["var"].get_View());
  this.it=new Dictionary.New$5();
 },ListModel);
 ListModel.FromSeq=function(init)
 {
  return ListModel.Create(Global.id,init);
 };
 ListModel.Create=function(key,init)
 {
  return ListModel.CreateWithStorage(key,Storage.InMemory(Arrays.ofSeq(init)));
 };
 ListModel.CreateWithStorage=function(key,storage)
 {
  return new ListModel.New(key,storage);
 };
 Router.InstallHash=function(onParseError,router)
 {
  var _var;
  _var=Var$1.Create$1(void 0);
  Router.InstallHashInto(_var,onParseError,router);
  return _var;
 };
 Router.InstallHashInto=function(_var,onParseError,router)
 {
  function parse(h)
  {
   return RouterModule.Parse(router,Route.FromHash(h,{
    $:1,
    $0:true
   }));
  }
  function cur()
  {
   return Router.getCurrentHash(parse,onParseError);
  }
  function set(value)
  {
   if(!Unchecked.Equals(_var.Get(),value))
    _var.Set(value);
  }
  set(cur());
  self.addEventListener("popstate",function()
  {
   return set(cur());
  },false);
  self.addEventListener("hashchange",function()
  {
   return set(cur());
  },false);
  self.document.body.addEventListener("click",function(ev)
  {
   var o,o$1,href;
   o=(o$1=Router.findLinkHref(ev.target),o$1==null?null:(href=o$1.$0,Strings.StartsWith(href,"#")?parse(href):null));
   return o==null?null:(set(o.$0),ev.preventDefault());
  },false);
  View.Sink(function(value)
  {
   var url;
   if(!Unchecked.Equals(value,cur()))
    {
     url=RouterModule.HashLink(router,value);
     self.history.pushState(null,null,url);
    }
  },_var.get_View());
 };
 Router.getCurrentHash=function(parse,onParseError)
 {
  var h,m;
  h=self.location.hash;
  m=parse(h);
  return m==null?((function($1)
  {
   return function($2)
   {
    return $1("Failed to parse route: "+Utils.toSafe($2));
   };
  }(function(s)
  {
   console.log(s);
  }))(h),onParseError):m.$0;
 };
 Router.findLinkHref=function(n)
 {
  while(true)
   if(n.tagName=="A")
    return Option.ofObj(n.getAttribute("href"));
   else
    if(n===self.document.body)
     return null;
    else
     n=n.parentNode;
 };
 Seq.map=function(f,s)
 {
  return{
   GetEnumerator:function()
   {
    var en;
    en=Enumerator.Get(s);
    return new T.New(null,null,function(e)
    {
     return en.MoveNext()&&(e.c=f(en.Current()),true);
    },function()
    {
     en.Dispose();
    });
   }
  };
 };
 Seq.iteri=function(p,s)
 {
  var i,e;
  i=0;
  e=Enumerator.Get(s);
  try
  {
   while(e.MoveNext())
    {
     p(i,e.Current());
     i=i+1;
    }
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.length=function(s)
 {
  var i,e;
  i=0;
  e=Enumerator.Get(s);
  try
  {
   while(e.MoveNext())
    i=i+1;
   return i;
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.choose=function(f,s)
 {
  return Seq.collect(function(x)
  {
   var m;
   m=f(x);
   return m==null?T$1.Empty:List.ofArray([m.$0]);
  },s);
 };
 Seq.maxBy=function(f,s)
 {
  var e,m,fm,x,fx;
  e=Enumerator.Get(s);
  try
  {
   if(!e.MoveNext())
    Seq.seqEmpty();
   m=e.Current();
   fm=f(m);
   while(e.MoveNext())
    {
     x=e.Current();
     fx=f(x);
     if(Unchecked.Compare(fx,fm)===1)
      {
       m=x;
       fm=fx;
      }
    }
   return m;
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.append=function(s1,s2)
 {
  return{
   GetEnumerator:function()
   {
    var e1,first;
    e1=Enumerator.Get(s1);
    first=[true];
    return new T.New(e1,null,function(x)
    {
     var x$1;
     return x.s.MoveNext()?(x.c=x.s.Current(),true):(x$1=x.s,!Unchecked.Equals(x$1,null)?x$1.Dispose():void 0,x.s=null,first[0]&&(first[0]=false,x.s=Enumerator.Get(s2),x.s.MoveNext()?(x.c=x.s.Current(),true):(x.s.Dispose(),x.s=null,false)));
    },function(x)
    {
     var x$1;
     x$1=x.s;
     if(!Unchecked.Equals(x$1,null))
      x$1.Dispose();
    });
   }
  };
 };
 Seq.delay=function(f)
 {
  return{
   GetEnumerator:function()
   {
    return Enumerator.Get(f());
   }
  };
 };
 Seq.iter=function(p,s)
 {
  var e;
  e=Enumerator.Get(s);
  try
  {
   while(e.MoveNext())
    p(e.Current());
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.mapi=function(f,s)
 {
  return Seq.map2(f,Seq.initInfinite(Global.id),s);
 };
 Seq.collect=function(f,s)
 {
  return Seq.concat(Seq.map(f,s));
 };
 Seq.seqEmpty=function()
 {
  return Operators.FailWith("The input sequence was empty.");
 };
 Seq.head=function(s)
 {
  var e;
  e=Enumerator.Get(s);
  try
  {
   return e.MoveNext()?e.Current():Seq.insufficient();
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.indexed=function(s)
 {
  return Seq.mapi(function($1,$2)
  {
   return[$1,$2];
  },s);
 };
 Seq.tryFindIndex=function(ok,s)
 {
  var e,loop,i;
  e=Enumerator.Get(s);
  try
  {
   loop=true;
   i=0;
   while(loop&&e.MoveNext())
    if(ok(e.Current()))
     loop=false;
    else
     i=i+1;
   return loop?null:{
    $:1,
    $0:i
   };
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.tryPick=function(f,s)
 {
  var e,r;
  e=Enumerator.Get(s);
  try
  {
   r=null;
   while(Unchecked.Equals(r,null)&&e.MoveNext())
    r=f(e.Current());
   return r;
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.init=function(n,f)
 {
  return Seq.take(n,Seq.initInfinite(f));
 };
 Seq.isEmpty=function(s)
 {
  var e;
  e=Enumerator.Get(s);
  try
  {
   return!e.MoveNext();
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.map2=function(f,s1,s2)
 {
  return{
   GetEnumerator:function()
   {
    var e1,e2;
    e1=Enumerator.Get(s1);
    e2=Enumerator.Get(s2);
    return new T.New(null,null,function(e)
    {
     return e1.MoveNext()&&e2.MoveNext()&&(e.c=f(e1.Current(),e2.Current()),true);
    },function()
    {
     e1.Dispose();
     e2.Dispose();
    });
   }
  };
 };
 Seq.initInfinite=function(f)
 {
  return{
   GetEnumerator:function()
   {
    return new T.New(0,null,function(e)
    {
     e.c=f(e.s);
     e.s=e.s+1;
     return true;
    },void 0);
   }
  };
 };
 Seq.concat=function(ss)
 {
  return{
   GetEnumerator:function()
   {
    var outerE;
    function next(st)
    {
     var m;
     while(true)
      {
       m=st.s;
       if(Unchecked.Equals(m,null))
       {
        if(outerE.MoveNext())
         {
          st.s=Enumerator.Get(outerE.Current());
          st=st;
         }
        else
         {
          outerE.Dispose();
          return false;
         }
       }
       else
        if(m.MoveNext())
         {
          st.c=m.Current();
          return true;
         }
        else
         {
          st.Dispose();
          st.s=null;
          st=st;
         }
      }
    }
    outerE=Enumerator.Get(ss);
    return new T.New(null,null,next,function(st)
    {
     var x;
     x=st.s;
     if(!Unchecked.Equals(x,null))
      x.Dispose();
     if(!Unchecked.Equals(outerE,null))
      outerE.Dispose();
    });
   }
  };
 };
 Seq.take=function(n,s)
 {
  n<0?Seq.nonNegative():void 0;
  return{
   GetEnumerator:function()
   {
    var e;
    e=[Enumerator.Get(s)];
    return new T.New(0,null,function(o)
    {
     var en;
     o.s=o.s+1;
     return o.s>n?false:(en=e[0],Unchecked.Equals(en,null)?Seq.insufficient():en.MoveNext()?(o.c=en.Current(),o.s===n?(en.Dispose(),e[0]=null):void 0,true):(en.Dispose(),e[0]=null,Seq.insufficient()));
    },function()
    {
     var x;
     x=e[0];
     if(!Unchecked.Equals(x,null))
      x.Dispose();
    });
   }
  };
 };
 Seq.nth=function(index,s)
 {
  var pos,e;
  if(index<0)
   Operators.FailWith("negative index requested");
  pos=-1;
  e=Enumerator.Get(s);
  try
  {
   while(pos<index)
    {
     !e.MoveNext()?Seq.insufficient():void 0;
     pos=pos+1;
    }
   return e.Current();
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.fold=function(f,x,s)
 {
  var r,e;
  r=x;
  e=Enumerator.Get(s);
  try
  {
   while(e.MoveNext())
    r=f(r,e.Current());
   return r;
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.distinctBy=function(f,s)
 {
  return{
   GetEnumerator:function()
   {
    var o,seen;
    o=Enumerator.Get(s);
    seen=new HashSet.New$3();
    return new T.New(null,null,function(e)
    {
     var cur,has;
     if(o.MoveNext())
      {
       cur=o.Current();
       has=seen.SAdd(f(cur));
       while(!has&&o.MoveNext())
        {
         cur=o.Current();
         has=seen.SAdd(f(cur));
        }
       return has&&(e.c=cur,true);
      }
     else
      return false;
    },function()
    {
     o.Dispose();
    });
   }
  };
 };
 Seq.compareWith=function(f,s1,s2)
 {
  var e1,$1,e2,r,loop;
  e1=Enumerator.Get(s1);
  try
  {
   e2=Enumerator.Get(s2);
   try
   {
    r=0;
    loop=true;
    while(loop&&r===0)
     if(e1.MoveNext())
      r=e2.MoveNext()?f(e1.Current(),e2.Current()):1;
     else
      if(e2.MoveNext())
       r=-1;
      else
       loop=false;
    $1=r;
   }
   finally
   {
    if(typeof e2=="object"&&"Dispose"in e2)
     e2.Dispose();
   }
   return $1;
  }
  finally
  {
   if(typeof e1=="object"&&"Dispose"in e1)
    e1.Dispose();
  }
 };
 Seq.forall2=function(p,s1,s2)
 {
  return!Seq.exists2(function($1,$2)
  {
   return!p($1,$2);
  },s1,s2);
 };
 Seq.exists2=function(p,s1,s2)
 {
  var e1,$1,e2,r;
  e1=Enumerator.Get(s1);
  try
  {
   e2=Enumerator.Get(s2);
   try
   {
    r=false;
    while(!r&&e1.MoveNext()&&e2.MoveNext())
     r=p(e1.Current(),e2.Current());
    $1=r;
   }
   finally
   {
    if(typeof e2=="object"&&"Dispose"in e2)
     e2.Dispose();
   }
   return $1;
  }
  finally
  {
   if(typeof e1=="object"&&"Dispose"in e1)
    e1.Dispose();
  }
 };
 Seq.rev=function(s)
 {
  return Seq.delay(function()
  {
   return Arrays.ofSeq(s).slice().reverse();
  });
 };
 Seq.max=function(s)
 {
  var e,m,x;
  e=Enumerator.Get(s);
  try
  {
   if(!e.MoveNext())
    Seq.seqEmpty();
   m=e.Current();
   while(e.MoveNext())
    {
     x=e.Current();
     if(Unchecked.Compare(x,m)===1)
      m=x;
    }
   return m;
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 Seq.distinct=function(s)
 {
  return Seq.distinctBy(Global.id,s);
 };
 Seq.unfold=function(f,s)
 {
  return{
   GetEnumerator:function()
   {
    return new T.New(s,null,function(e)
    {
     var m;
     m=f(e.s);
     return m==null?false:(e.c=m.$0[0],e.s=m.$0[1],true);
    },void 0);
   }
  };
 };
 Seq.forall=function(p,s)
 {
  return!Seq.exists(function(x)
  {
   return!p(x);
  },s);
 };
 Seq.exists=function(p,s)
 {
  var e,r;
  e=Enumerator.Get(s);
  try
  {
   r=false;
   while(!r&&e.MoveNext())
    r=p(e.Current());
   return r;
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 };
 ChartConfig.New=function(Title)
 {
  return{
   Title:Title
  };
 };
 SeriesChartConfig.New=function(XAxis,YAxis,FillColor,StrokeColor,IsFilled)
 {
  return{
   XAxis:XAxis,
   YAxis:YAxis,
   FillColor:FillColor,
   StrokeColor:StrokeColor,
   IsFilled:IsFilled
  };
 };
 SC$2.$cctor=function()
 {
  SC$2.$cctor=Global.ignore;
  SC$2.defaultSize={
   $:0,
   $0:500,
   $1:200
  };
 };
 Dictionary=Collections.Dictionary=Runtime$1.Class({
  set_Item:function(k,v)
  {
   this.set(k,v);
  },
  ContainsKey:function(k)
  {
   var $this,d;
   $this=this;
   d=this.data[this.hash(k)];
   return d==null?false:Arrays.exists(function(a)
   {
    return $this.equals.apply(null,[(Operators.KeyValue(a))[0],k]);
   },d);
  },
  TryGetValue:function(k,res)
  {
   var $this,d,v;
   $this=this;
   d=this.data[this.hash(k)];
   return d==null?false:(v=Arrays.tryPick(function(a)
   {
    var a$1;
    a$1=Operators.KeyValue(a);
    return $this.equals.apply(null,[a$1[0],k])?{
     $:1,
     $0:a$1[1]
    }:null;
   },d),v!=null&&v.$==1&&(res.set(v.$0),true));
  },
  RemoveKey:function(k)
  {
   return this.remove(k);
  },
  Keys:function()
  {
   return new KeyCollection.New(this);
  },
  set:function(k,v)
  {
   var $this,h,d,m;
   $this=this;
   h=this.hash(k);
   d=this.data[h];
   if(d==null)
    {
     this.count=this.count+1;
     this.data[h]=new Global.Array({
      K:k,
      V:v
     });
    }
   else
    {
     m=Arrays.tryFindIndex(function(a)
     {
      return $this.equals.apply(null,[(Operators.KeyValue(a))[0],k]);
     },d);
     m==null?(this.count=this.count+1,d.push({
      K:k,
      V:v
     })):d[m.$0]={
      K:k,
      V:v
     };
    }
  },
  remove:function(k)
  {
   var $this,h,d,r;
   $this=this;
   h=this.hash(k);
   d=this.data[h];
   return d==null?false:(r=Arrays.filter(function(a)
   {
    return!$this.equals.apply(null,[(Operators.KeyValue(a))[0],k]);
   },d),Arrays.length(r)<d.length&&(this.count=this.count-1,this.data[h]=r,true));
  },
  Item:function(k)
  {
   return this.get(k);
  },
  GetEnumerator:function()
  {
   return Enumerator.Get0(Arrays.concat(JS.GetFieldValues(this.data)));
  },
  Values:function()
  {
   return new ValueCollection.New(this);
  },
  get:function(k)
  {
   var $this,d;
   $this=this;
   d=this.data[this.hash(k)];
   return d==null?DictionaryUtil.notPresent():Arrays.pick(function(a)
   {
    var a$1;
    a$1=Operators.KeyValue(a);
    return $this.equals.apply(null,[a$1[0],k])?{
     $:1,
     $0:a$1[1]
    }:null;
   },d);
  }
 },Obj,Dictionary);
 Dictionary.New$5=Runtime$1.Ctor(function()
 {
  Dictionary.New$6.call(this,[],Unchecked.Equals,Unchecked.Hash);
 },Dictionary);
 Dictionary.New$6=Runtime$1.Ctor(function(init,equals,hash)
 {
  var e,x;
  Obj.New.call(this);
  this.equals=equals;
  this.hash=hash;
  this.count=0;
  this.data=[];
  e=Enumerator.Get(init);
  try
  {
   while(e.MoveNext())
    {
     x=e.Current();
     this.set(x.K,x.V);
    }
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 },Dictionary);
 ColorConfig.New=function(PointColor,PointHighlightFill,PointHighlightStroke,PointStrokeColor)
 {
  return{
   PointColor:PointColor,
   PointHighlightFill:PointHighlightFill,
   PointHighlightStroke:PointHighlightStroke,
   PointStrokeColor:PointStrokeColor
  };
 };
 FSharpEvent=Control.FSharpEvent=Runtime$1.Class({},Obj,FSharpEvent);
 FSharpEvent.New=Runtime$1.Ctor(function()
 {
  Obj.New.call(this);
  this.event=Event$1.New(Runtime$1.MarkResizable([]));
 },FSharpEvent);
 SC$3.$cctor=function()
 {
  var rand;
  SC$3.$cctor=Global.ignore;
  SC$3.defaultChartConfig=ChartConfig.New("Chart");
  SC$3.defaultSeriesChartConfig=SeriesChartConfig.New("x","y",new Color({
   $:0,
   $0:220,
   $1:220,
   $2:220,
   $3:0.2
  }),new Color({
   $:0,
   $0:220,
   $1:220,
   $2:220,
   $3:1
  }),true);
  SC$3.defaultColorConfig=ColorConfig.New(new Color({
   $:0,
   $0:220,
   $1:220,
   $2:220,
   $3:1
  }),new Color({
   $:1,
   $0:"#fff"
  }),new Color({
   $:0,
   $0:220,
   $1:220,
   $2:220,
   $3:1
  }),new Color({
   $:1,
   $0:"#fff"
  }));
  SC$3.defaultPolarData=(rand=new Random.New(),function(label)
  {
   return function(data)
   {
    var p,r,g,b;
    p=(r=rand.Next(0,256),(g=rand.Next(0,256),(b=rand.Next(0,256),[new Color({
     $:0,
     $0:r,
     $1:g,
     $2:b,
     $3:1
    }),new Color({
     $:0,
     $0:r,
     $1:g,
     $2:b,
     $3:0.6
    })])));
    return PolarData.New(data,p[0],p[1],label);
   };
  });
 };
 Snap.Map=function(fn,sn)
 {
  var m,res;
  m=sn.s;
  return m!=null&&m.$==0?Snap.New({
   $:0,
   $0:fn(m.$0)
  }):(res=Snap.New({
   $:3,
   $0:[],
   $1:[]
  }),(Snap.When(sn,function(a)
  {
   Snap.MarkDone(res,sn,fn(a));
  },res),res));
 };
 Snap.WhenObsoleteRun=function(snap,obs)
 {
  var m;
  m=snap.s;
  if(m==null)
   obs();
  else
   m!=null&&m.$==2?m.$1.push(obs):m!=null&&m.$==3?m.$1.push(obs):void 0;
 };
 Snap.When=function(snap,avail,obs)
 {
  var m;
  m=snap.s;
  if(m==null)
   Snap.Obsolete(obs);
  else
   m!=null&&m.$==2?(Snap.EnqueueSafe(m.$1,obs),avail(m.$0)):m!=null&&m.$==3?(m.$0.push(avail),Snap.EnqueueSafe(m.$1,obs)):avail(m.$0);
 };
 Snap.MarkDone=function(res,sn,v)
 {
  var $1;
  if($1=sn.s,$1!=null&&$1.$==0)
   Snap.MarkForever(res,v);
  else
   Snap.MarkReady(res,v);
 };
 Snap.EnqueueSafe=function(q,x)
 {
  var qcopy,i,$1,o;
  q.push(x);
  if(q.length%20===0)
   {
    qcopy=q.slice(0);
    Queue.Clear(q);
    for(i=0,$1=Arrays.length(qcopy)-1;i<=$1;i++){
     o=Arrays.get(qcopy,i);
     if(typeof o=="object")
      (function(sn)
      {
       if(sn.s)
        q.push(sn);
      }(o));
     else
      (function(f)
      {
       q.push(f);
      }(o));
    }
   }
  else
   void 0;
 };
 Snap.MarkForever=function(sn,v)
 {
  var m,qa,i,$1;
  m=sn.s;
  if(m!=null&&m.$==3)
   {
    sn.s={
     $:0,
     $0:v
    };
    qa=m.$0;
    for(i=0,$1=Arrays.length(qa)-1;i<=$1;i++)(Arrays.get(qa,i))(v);
   }
  else
   void 0;
 };
 Snap.MarkReady=function(sn,v)
 {
  var m,qa,i,$1;
  m=sn.s;
  if(m!=null&&m.$==3)
   {
    sn.s={
     $:2,
     $0:v,
     $1:m.$1
    };
    qa=m.$0;
    for(i=0,$1=Arrays.length(qa)-1;i<=$1;i++)(Arrays.get(qa,i))(v);
   }
  else
   void 0;
 };
 Snap.Join=function(snap)
 {
  var res;
  res=Snap.New({
   $:3,
   $0:[],
   $1:[]
  });
  Snap.When(snap,function(x)
  {
   var y;
   y=x();
   Snap.When(y,function(v)
   {
    var $1,$2;
    if(($1=y.s,$1!=null&&$1.$==0)&&($2=snap.s,$2!=null&&$2.$==0))
     Snap.MarkForever(res,v);
    else
     Snap.MarkReady(res,v);
   },res);
  },res);
  return res;
 };
 Snap.WhenRun=function(snap,avail,obs)
 {
  var m;
  m=snap.s;
  if(m==null)
   obs();
  else
   m!=null&&m.$==2?(m.$1.push(obs),avail(m.$0)):m!=null&&m.$==3?(m.$0.push(avail),m.$1.push(obs)):avail(m.$0);
 };
 Snap.Map3=function(fn,sn1,sn2,sn3)
 {
  var $1,$2,$3,res;
  function cont(a)
  {
   var m,$4,$5,$6;
   if(!(m=res.s,m!=null&&m.$==0||m!=null&&m.$==2))
    {
     $4=Snap.ValueAndForever(sn1);
     $5=Snap.ValueAndForever(sn2);
     $6=Snap.ValueAndForever(sn3);
     if($4!=null&&$4.$==1)
      $5!=null&&$5.$==1?$6!=null&&$6.$==1?$4.$0[1]&&$5.$0[1]&&$6.$0[1]?Snap.MarkForever(res,fn($4.$0[0],$5.$0[0],$6.$0[0])):Snap.MarkReady(res,fn($4.$0[0],$5.$0[0],$6.$0[0])):void 0:void 0;
    }
  }
  $1=sn1.s;
  $2=sn2.s;
  $3=sn3.s;
  return $1!=null&&$1.$==0?$2!=null&&$2.$==0?$3!=null&&$3.$==0?Snap.New({
   $:0,
   $0:fn($1.$0,$2.$0,$3.$0)
  }):Snap.Map3Opt1(fn,$1.$0,$2.$0,sn3):$3!=null&&$3.$==0?Snap.Map3Opt2(fn,$1.$0,$3.$0,sn2):Snap.Map3Opt3(fn,$1.$0,sn2,sn3):$2!=null&&$2.$==0?$3!=null&&$3.$==0?Snap.Map3Opt4(fn,$2.$0,$3.$0,sn1):Snap.Map3Opt5(fn,$2.$0,sn1,sn3):$3!=null&&$3.$==0?Snap.Map3Opt6(fn,$3.$0,sn1,sn2):(res=Snap.New({
   $:3,
   $0:[],
   $1:[]
  }),(Snap.When(sn1,cont,res),Snap.When(sn2,cont,res),Snap.When(sn3,cont,res),res));
 };
 Snap.Sequence=function(snaps)
 {
  var snaps$1,res,w;
  function cont(a)
  {
   var vs;
   if(w[0]===0)
    {
     vs=Arrays.map(function(s)
     {
      var m;
      m=s.s;
      return m!=null&&m.$==0?m.$0:m!=null&&m.$==2?m.$0:Operators.FailWith("value not found by View.Sequence");
     },snaps$1);
     if(Arrays.forall(function(_)
     {
      var $1;
      $1=_.s;
      return $1!=null&&$1.$==0;
     },snaps$1))
      Snap.MarkForever(res,vs);
     else
      Snap.MarkReady(res,vs);
    }
   else
    w[0]=w[0]-1;
  }
  snaps$1=Arrays.ofSeq(snaps);
  return snaps$1.length==0?Snap.New({
   $:0,
   $0:[]
  }):(res=Snap.New({
   $:3,
   $0:[],
   $1:[]
  }),(w=[Arrays.length(snaps$1)-1],(Arrays.iter(function(s)
  {
   Snap.When(s,cont,res);
  },snaps$1),res)));
 };
 Snap.Map2=function(fn,sn1,sn2)
 {
  var $1,$2,res;
  function cont(a)
  {
   var m,$3,$4;
   if(!(m=res.s,m!=null&&m.$==0||m!=null&&m.$==2))
    {
     $3=Snap.ValueAndForever(sn1);
     $4=Snap.ValueAndForever(sn2);
     if($3!=null&&$3.$==1)
      $4!=null&&$4.$==1?$3.$0[1]&&$4.$0[1]?Snap.MarkForever(res,fn($3.$0[0],$4.$0[0])):Snap.MarkReady(res,fn($3.$0[0],$4.$0[0])):void 0;
    }
  }
  $1=sn1.s;
  $2=sn2.s;
  return $1!=null&&$1.$==0?$2!=null&&$2.$==0?Snap.New({
   $:0,
   $0:fn($1.$0,$2.$0)
  }):Snap.Map2Opt1(fn,$1.$0,sn2):$2!=null&&$2.$==0?Snap.Map2Opt2(fn,$2.$0,sn1):(res=Snap.New({
   $:3,
   $0:[],
   $1:[]
  }),(Snap.When(sn1,cont,res),Snap.When(sn2,cont,res),res));
 };
 Snap.Map2Unit=function(sn1,sn2)
 {
  var $1,$2,res;
  function cont()
  {
   var m,$3,$4;
   if(!(m=res.s,m!=null&&m.$==0||m!=null&&m.$==2))
    {
     $3=Snap.ValueAndForever(sn1);
     $4=Snap.ValueAndForever(sn2);
     if($3!=null&&$3.$==1)
      $4!=null&&$4.$==1?$3.$0[1]&&$4.$0[1]?Snap.MarkForever(res,null):Snap.MarkReady(res,null):void 0;
    }
  }
  $1=sn1.s;
  $2=sn2.s;
  return $1!=null&&$1.$==0?$2!=null&&$2.$==0?Snap.New({
   $:0,
   $0:null
  }):sn2:$2!=null&&$2.$==0?sn1:(res=Snap.New({
   $:3,
   $0:[],
   $1:[]
  }),(Snap.When(sn1,cont,res),Snap.When(sn2,cont,res),res));
 };
 Snap.Copy=function(sn)
 {
  var m,res,res$1;
  m=sn.s;
  return m==null?sn:m!=null&&m.$==2?(res=Snap.New({
   $:2,
   $0:m.$0,
   $1:[]
  }),(Snap.WhenObsolete(sn,res),res)):m!=null&&m.$==3?(res$1=Snap.New({
   $:3,
   $0:[],
   $1:[]
  }),(Snap.When(sn,function(v)
  {
   Snap.MarkDone(res$1,sn,v);
  },res$1),res$1)):sn;
 };
 Snap.Map3Opt1=function(fn,x,y,sn3)
 {
  return Snap.Map(function(z)
  {
   return fn(x,y,z);
  },sn3);
 };
 Snap.Map3Opt2=function(fn,x,z,sn2)
 {
  return Snap.Map(function(y)
  {
   return fn(x,y,z);
  },sn2);
 };
 Snap.Map3Opt3=function(fn,x,sn2,sn3)
 {
  return Snap.Map2(function($1,$2)
  {
   return fn(x,$1,$2);
  },sn2,sn3);
 };
 Snap.Map3Opt4=function(fn,y,z,sn1)
 {
  return Snap.Map(function(x)
  {
   return fn(x,y,z);
  },sn1);
 };
 Snap.Map3Opt5=function(fn,y,sn1,sn3)
 {
  return Snap.Map2(function($1,$2)
  {
   return fn($1,y,$2);
  },sn1,sn3);
 };
 Snap.Map3Opt6=function(fn,z,sn1,sn2)
 {
  return Snap.Map2(function($1,$2)
  {
   return fn($1,$2,z);
  },sn1,sn2);
 };
 Snap.ValueAndForever=function(snap)
 {
  var m;
  m=snap.s;
  return m!=null&&m.$==0?{
   $:1,
   $0:[m.$0,true]
  }:m!=null&&m.$==2?{
   $:1,
   $0:[m.$0,false]
  }:null;
 };
 Snap.Map2Opt1=function(fn,x,sn2)
 {
  return Snap.Map(function(y)
  {
   return fn(x,y);
  },sn2);
 };
 Snap.Map2Opt2=function(fn,y,sn1)
 {
  return Snap.Map(function(x)
  {
   return fn(x,y);
  },sn1);
 };
 Snap.WhenObsolete=function(snap,obs)
 {
  var m;
  m=snap.s;
  if(m==null)
   Snap.Obsolete(obs);
  else
   m!=null&&m.$==2?Snap.EnqueueSafe(m.$1,obs):m!=null&&m.$==3?Snap.EnqueueSafe(m.$1,obs):void 0;
 };
 ConcreteVar=UI.ConcreteVar=Runtime$1.Class({
  get_View:function()
  {
   return this.view;
  },
  Set:function(v)
  {
   if(this.isConst)
    (function($1)
    {
     return $1("WebSharper.UI: invalid attempt to change value of a Var after calling SetFinal");
    }(function(s)
    {
     console.log(s);
    }));
   else
    {
     Snap.Obsolete(this.snap);
     this.current=v;
     this.snap=Snap.New({
      $:2,
      $0:v,
      $1:[]
     });
    }
  },
  Get:function()
  {
   return this.current;
  },
  SetFinal:function(v)
  {
   if(this.isConst)
    (function($1)
    {
     return $1("WebSharper.UI: invalid attempt to change value of a Var after calling SetFinal");
    }(function(s)
    {
     console.log(s);
    }));
   else
    {
     Snap.Obsolete(this.snap);
     this.isConst=true;
     this.current=v;
     this.snap=Snap.New({
      $:0,
      $0:v
     });
    }
  },
  UpdateMaybe:function(f)
  {
   var m;
   m=f(this.Get());
   if(m!=null&&m.$==1)
    this.Set(m.$0);
  }
 },Var,ConcreteVar);
 ConcreteVar.New=Runtime$1.Ctor(function(isConst,initSnap,initValue)
 {
  var $this;
  $this=this;
  Var.New.call(this);
  this.isConst=isConst;
  this.current=initValue;
  this.snap=initSnap;
  this.view=function()
  {
   return $this.snap;
  };
  this.id=Fresh.Int();
 },ConcreteVar);
 TextView=TemplateHoleModule.TextView=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  ForTextView:function()
  {
   return{
    $:1,
    $0:this.fillWith
   };
  },
  get_AsChoiceView:function()
  {
   return{
    $:1,
    $0:this.fillWith
   };
  }
 },TemplateHole,TextView);
 TextView.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },TextView);
 VarStr=TemplateHoleModule.VarStr=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  ForTextView:function()
  {
   return{
    $:1,
    $0:this.fillWith.get_View()
   };
  },
  AddAttribute:function(addAttr,el)
  {
   (addAttr(el))(AttrModule.Value(this.fillWith));
  },
  get_AsChoiceView:function()
  {
   return{
    $:1,
    $0:View.Map(Global.String,this.fillWith.get_View())
   };
  }
 },TemplateHole,VarStr);
 VarStr.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },VarStr);
 Docs.CreateEmbedNode=function()
 {
  return{
   Current:null,
   Dirty:false
  };
 };
 Docs.UpdateEmbedNode=function(node,upd)
 {
  node.Current=upd;
  node.Dirty=true;
 };
 Docs.CreateRunState=function(parent,doc)
 {
  return RunState.New(NodeSet.get_Empty(),Docs.CreateElemNode(parent,Attrs.EmptyAttr(),doc));
 };
 Docs.PerformAnimatedUpdate=function(childrenOnly,st,doc)
 {
  var _;
  return An.get_UseAnimations()?(_=null,Concurrency.Delay(function()
  {
   var cur,change,enter;
   cur=NodeSet.FindAll(doc);
   change=Docs.ComputeChangeAnim(st,cur);
   enter=Docs.ComputeEnterAnim(st,cur);
   return Concurrency.Bind(An.Play(An.Append(change,Docs.ComputeExitAnim(st,cur))),function()
   {
    return Concurrency.Bind(Docs.SyncElemNodesNextFrame(childrenOnly,st),function()
    {
     return Concurrency.Bind(An.Play(enter),function()
     {
      st.PreviousNodes=cur;
      return Concurrency.Return(null);
     });
    });
   });
  })):Docs.SyncElemNodesNextFrame(childrenOnly,st);
 };
 Docs.PerformSyncUpdate=function(childrenOnly,st,doc)
 {
  var cur;
  cur=NodeSet.FindAll(doc);
  Docs.SyncElemNode(childrenOnly,st.Top);
  st.PreviousNodes=cur;
 };
 Docs.LinkPrevElement=function(el,children)
 {
  Docs.InsertDoc(el.parentNode,children,el);
 };
 Docs.CreateDelimitedRunState=function(ldelim,rdelim,doc)
 {
  return RunState.New(NodeSet.get_Empty(),Docs.CreateDelimitedElemNode(ldelim,rdelim,Attrs.EmptyAttr(),doc));
 };
 Docs.LinkElement=function(el,children)
 {
  Docs.InsertDoc(el,children,null);
 };
 Docs.InsertBeforeDelim=function(afterDelim,doc)
 {
  var p,before;
  p=afterDelim.parentNode;
  before=self.document.createTextNode("");
  p.insertBefore(before,afterDelim);
  Docs.LinkPrevElement(afterDelim,doc);
  return before;
 };
 Docs.CreateElemNode=function(el,attr$1,children)
 {
  var attr$2;
  Docs.LinkElement(el,children);
  attr$2=Attrs.Insert(el,attr$1);
  return DocElemNode.New(attr$2,children,null,el,Fresh.Int(),Runtime$1.GetOptional(attr$2.OnAfterRender));
 };
 Docs.SyncElemNodesNextFrame=function(childrenOnly,st)
 {
  function a(ok)
  {
   Global.requestAnimationFrame(function()
   {
    Docs.SyncElemNode(childrenOnly,st.Top);
    ok();
   });
  }
  return Settings.BatchUpdatesEnabled()?Concurrency.FromContinuations(function($1,$2,$3)
  {
   return a.apply(null,[$1,$2,$3]);
  }):(Docs.SyncElemNode(childrenOnly,st.Top),Concurrency.Return(null));
 };
 Docs.ComputeExitAnim=function(st,cur)
 {
  return An.Concat(Arrays.map(function(n)
  {
   return Attrs.GetExitAnim(n.Attr);
  },NodeSet.ToArray(NodeSet.Except(cur,NodeSet.Filter(function(n)
  {
   return Attrs.HasExitAnim(n.Attr);
  },st.PreviousNodes)))));
 };
 Docs.ComputeEnterAnim=function(st,cur)
 {
  return An.Concat(Arrays.map(function(n)
  {
   return Attrs.GetEnterAnim(n.Attr);
  },NodeSet.ToArray(NodeSet.Except(st.PreviousNodes,NodeSet.Filter(function(n)
  {
   return Attrs.HasEnterAnim(n.Attr);
  },cur)))));
 };
 Docs.ComputeChangeAnim=function(st,cur)
 {
  var relevant;
  function a(n)
  {
   return Attrs.HasChangeAnim(n.Attr);
  }
  relevant=function(a$1)
  {
   return NodeSet.Filter(a,a$1);
  };
  return An.Concat(Arrays.map(function(n)
  {
   return Attrs.GetChangeAnim(n.Attr);
  },NodeSet.ToArray(NodeSet.Intersect(relevant(st.PreviousNodes),relevant(cur)))));
 };
 Docs.SyncElemNode=function(childrenOnly,el)
 {
  !childrenOnly?Docs.SyncElement(el):void 0;
  Docs.Sync(el.Children);
  Docs.AfterRender(el);
 };
 Docs.InsertDoc=function(parent,doc,pos)
 {
  var d,b,a;
  while(true)
   if(doc!=null&&doc.$==1)
    return Docs.InsertNode(parent,doc.$0.El,pos);
   else
    if(doc!=null&&doc.$==2)
     {
      d=doc.$0;
      d.Dirty=false;
      doc=d.Current;
     }
    else
     if(doc==null)
      return pos;
     else
      if(doc!=null&&doc.$==4)
       return Docs.InsertNode(parent,doc.$0.Text,pos);
      else
       if(doc!=null&&doc.$==5)
        return Docs.InsertNode(parent,doc.$0,pos);
       else
        if(doc!=null&&doc.$==6)
         return Arrays.foldBack(function($1,$2)
         {
          return(((Runtime$1.Curried3(function(parent$1,el,pos$1)
          {
           return el==null||el.constructor===Object?Docs.InsertDoc(parent$1,el,pos$1):Docs.InsertNode(parent$1,el,pos$1);
          }))(parent))($1))($2);
         },doc.$0.Els,pos);
        else
         {
          b=doc.$1;
          a=doc.$0;
          doc=a;
          pos=Docs.InsertDoc(parent,b,pos);
         }
 };
 Docs.CreateDelimitedElemNode=function(ldelim,rdelim,attr$1,children)
 {
  var el,attr$2;
  el=ldelim.parentNode;
  Docs.LinkPrevElement(rdelim,children);
  attr$2=Attrs.Insert(el,attr$1);
  return DocElemNode.New(attr$2,children,{
   $:1,
   $0:[ldelim,rdelim]
  },el,Fresh.Int(),Runtime$1.GetOptional(attr$2.OnAfterRender));
 };
 Docs.CreateTextNode=function()
 {
  return{
   Text:self.document.createTextNode(""),
   Dirty:false,
   Value:""
  };
 };
 Docs.UpdateTextNode=function(n,t)
 {
  n.Value=t;
  n.Dirty=true;
 };
 Docs.SyncElement=function(el)
 {
  function hasDirtyChildren(el$1)
  {
   function dirty(doc)
   {
    var t,b,a,d;
    while(true)
     {
      if(doc!=null&&doc.$==0)
       {
        b=doc.$1;
        a=doc.$0;
        if(dirty(a))
         return true;
        else
         doc=b;
       }
      else
       if(doc!=null&&doc.$==2)
        {
         d=doc.$0;
         if(d.Dirty)
          return true;
         else
          doc=d.Current;
        }
       else
        return doc!=null&&doc.$==6&&(t=doc.$0,t.Dirty||Arrays.exists(hasDirtyChildren,t.Holes));
     }
   }
   return dirty(el$1.Children);
  }
  Attrs.Sync(el.El,el.Attr);
  if(hasDirtyChildren(el))
   Docs.DoSyncElement(el);
 };
 Docs.Sync=function(doc)
 {
  var d,t,n,b,a;
  while(true)
   {
    if(doc!=null&&doc.$==1)
     return Docs.SyncElemNode(false,doc.$0);
    else
     if(doc!=null&&doc.$==2)
      {
       n=doc.$0;
       doc=n.Current;
      }
     else
      if(doc==null)
       return null;
      else
       if(doc!=null&&doc.$==5)
        return null;
       else
        if(doc!=null&&doc.$==4)
         {
          d=doc.$0;
          return d.Dirty?(d.Text.nodeValue=d.Value,d.Dirty=false):null;
         }
        else
         if(doc!=null&&doc.$==6)
          {
           t=doc.$0;
           Arrays.iter(function(h)
           {
            Docs.SyncElemNode(false,h);
           },t.Holes);
           Arrays.iter(function(t$1)
           {
            Attrs.Sync(t$1[0],t$1[1]);
           },t.Attrs);
           return Docs.AfterRender(t);
          }
         else
          {
           b=doc.$1;
           a=doc.$0;
           Docs.Sync(a);
           doc=b;
          }
   }
 };
 Docs.AfterRender=function(el)
 {
  var m;
  m=Runtime$1.GetOptional(el.Render);
  if(m!=null&&m.$==1)
   {
    m.$0(el.El);
    Runtime$1.SetOptional(el,"Render",null);
   }
 };
 Docs.InsertNode=function(parent,node,pos)
 {
  DomUtility.InsertAt(parent,pos,node);
  return node;
 };
 Docs.DoSyncElement=function(el)
 {
  var parent,p,m;
  function ins(doc,pos)
  {
   var t,d,b,a;
   while(true)
    {
     if(doc!=null&&doc.$==1)
      return doc.$0.El;
     else
      if(doc!=null&&doc.$==2)
       {
        d=doc.$0;
        if(d.Dirty)
         {
          d.Dirty=false;
          return Docs.InsertDoc(parent,d.Current,pos);
         }
        else
         doc=d.Current;
       }
      else
       if(doc==null)
        return pos;
       else
        if(doc!=null&&doc.$==4)
         return doc.$0.Text;
        else
         if(doc!=null&&doc.$==5)
          return doc.$0;
         else
          if(doc!=null&&doc.$==6)
           {
            t=doc.$0;
            t.Dirty?t.Dirty=false:void 0;
            return Arrays.foldBack(function($1,$2)
            {
             return $1==null||$1.constructor===Object?ins($1,$2):$1;
            },t.Els,pos);
           }
          else
           {
            b=doc.$1;
            a=doc.$0;
            doc=a;
            pos=ins(b,pos);
           }
    }
  }
  parent=el.El;
  DomNodes.Iter((p=el.El,function(e)
  {
   DomUtility.RemoveNode(p,e);
  }),DomNodes.Except(DomNodes.DocChildren(el),DomNodes.Children(el.El,Runtime$1.GetOptional(el.Delimiters))));
  ins(el.Children,(m=Runtime$1.GetOptional(el.Delimiters),m!=null&&m.$==1?m.$0[1]:null));
 };
 HashSet=Collections.HashSet=Runtime$1.Class({
  SAdd:function(item)
  {
   return this.add(item);
  },
  Contains:function(item)
  {
   var arr;
   arr=this.data[this.hash(item)];
   return arr==null?false:this.arrContains(item,arr);
  },
  add:function(item)
  {
   var h,arr;
   h=this.hash(item);
   arr=this.data[h];
   return arr==null?(this.data[h]=[item],this.count=this.count+1,true):this.arrContains(item,arr)?false:(arr.push(item),this.count=this.count+1,true);
  },
  arrContains:function(item,arr)
  {
   var c,i,$1,l;
   c=true;
   i=0;
   l=arr.length;
   while(c&&i<l)
    if(this.equals.apply(null,[arr[i],item]))
     c=false;
    else
     i=i+1;
   return!c;
  },
  GetEnumerator:function()
  {
   return Enumerator.Get(HashSetUtil.concat(this.data));
  },
  ExceptWith:function(xs)
  {
   var e;
   e=Enumerator.Get(xs);
   try
   {
    while(e.MoveNext())
     this.Remove(e.Current());
   }
   finally
   {
    if(typeof e=="object"&&"Dispose"in e)
     e.Dispose();
   }
  },
  Count:function()
  {
   return this.count;
  },
  IntersectWith:function(xs)
  {
   var other,all,i,$1,item;
   other=new HashSet.New$4(xs,this.equals,this.hash);
   all=HashSetUtil.concat(this.data);
   for(i=0,$1=all.length-1;i<=$1;i++){
    item=all[i];
    if(!other.Contains(item))
     this.Remove(item);
   }
  },
  Remove:function(item)
  {
   var arr;
   arr=this.data[this.hash(item)];
   return arr==null?false:this.arrRemove(item,arr)&&(this.count=this.count-1,true);
  },
  CopyTo:function(arr,index)
  {
   var all,i,$1;
   all=HashSetUtil.concat(this.data);
   for(i=0,$1=all.length-1;i<=$1;i++)Arrays.set(arr,i+index,all[i]);
  },
  arrRemove:function(item,arr)
  {
   var c,i,$1,l;
   c=true;
   i=0;
   l=arr.length;
   while(c&&i<l)
    if(this.equals.apply(null,[arr[i],item]))
     {
      arr.splice.apply(arr,[i,1]);
      c=false;
     }
    else
     i=i+1;
   return!c;
  }
 },Obj,HashSet);
 HashSet.New$3=Runtime$1.Ctor(function()
 {
  HashSet.New$4.call(this,[],Unchecked.Equals,Unchecked.Hash);
 },HashSet);
 HashSet.New$4=Runtime$1.Ctor(function(init,equals,hash)
 {
  var e;
  Obj.New.call(this);
  this.equals=equals;
  this.hash=hash;
  this.data=[];
  this.count=0;
  e=Enumerator.Get(init);
  try
  {
   while(e.MoveNext())
    this.add(e.Current());
  }
  finally
  {
   if(typeof e=="object"&&"Dispose"in e)
    e.Dispose();
  }
 },HashSet);
 HashSet.New$2=Runtime$1.Ctor(function(init)
 {
  HashSet.New$4.call(this,init,Unchecked.Equals,Unchecked.Hash);
 },HashSet);
 TemplateInitializer.$cctor=function()
 {
  TemplateInitializer.$cctor=Global.ignore;
  TemplateInitializer.initialized=new Dictionary.New$5();
 };
 TemplateInitializer=Server.TemplateInitializer=Runtime$1.Class({},Obj,TemplateInitializer);
 TemplateInitializer.GetOrAddHoleFor=function(id,holeName,initHole)
 {
  var d,m,o,h;
  TemplateInitializer.$cctor();
  d=TemplateInitializer.GetHolesFor(id);
  m=(o=null,[d.TryGetValue(holeName,{
   get:function()
   {
    return o;
   },
   set:function(v)
   {
    o=v;
   }
  }),o]);
  return m[0]?m[1]:(h=initHole(),(d.set_Item(holeName,h),h));
 };
 TemplateInitializer.GetHolesFor=function(id)
 {
  var m,o,d;
  TemplateInitializer.$cctor();
  m=(o=null,[TemplateInitializer.initialized.TryGetValue(id,{
   get:function()
   {
    return o;
   },
   set:function(v)
   {
    o=v;
   }
  }),o]);
  return m[0]?m[1]:(d=new Dictionary.New$5(),(TemplateInitializer.initialized.set_Item(id,d),d));
 };
 VarFloatUnchecked=TemplateHoleModule.VarFloatUnchecked=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  ForTextView:function()
  {
   return{
    $:1,
    $0:View.Map(Global.String,this.fillWith.get_View())
   };
  },
  AddAttribute:function(addAttr,el)
  {
   (addAttr(el))(AttrModule.FloatValueUnchecked(this.fillWith));
  },
  get_AsChoiceView:function()
  {
   return{
    $:1,
    $0:View.Map(Global.String,this.fillWith.get_View())
   };
  }
 },TemplateHole,VarFloatUnchecked);
 VarFloatUnchecked.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },VarFloatUnchecked);
 VarBool=TemplateHoleModule.VarBool=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  ForTextView:function()
  {
   return{
    $:1,
    $0:View.Map(Global.String,this.fillWith.get_View())
   };
  },
  AddAttribute:function(addAttr,el)
  {
   (addAttr(el))(AttrModule.Checked(this.fillWith));
  },
  get_AsChoiceView:function()
  {
   return{
    $:1,
    $0:View.Map(Global.String,this.fillWith.get_View())
   };
  }
 },TemplateHole,VarBool);
 VarBool.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },VarBool);
 VarDateTime=TemplateHoleModule.VarDateTime=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  ForTextView:function()
  {
   return{
    $:1,
    $0:View.Map(function(v)
    {
     return(new Date(v)).toLocaleString();
    },this.fillWith.get_View())
   };
  },
  AddAttribute:function(addAttr,el)
  {
   (addAttr(el))(AttrModule.DateTimeValue(this.fillWith));
  },
  get_AsChoiceView:function()
  {
   return{
    $:1,
    $0:View.Map(function(v)
    {
     return(new Date(v)).toLocaleString();
    },this.fillWith.get_View())
   };
  }
 },TemplateHole,VarDateTime);
 VarDateTime.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },VarDateTime);
 VarFile=TemplateHoleModule.VarFile=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  ForTextView:function()
  {
   return{
    $:1,
    $0:View.Map(Global.String,this.fillWith.get_View())
   };
  },
  AddAttribute:function(addAttr,el)
  {
   (addAttr(el))(AttrModule.FileValue(this.fillWith));
  },
  get_AsChoiceView:function()
  {
   return{
    $:1,
    $0:View.Map(Global.String,this.fillWith.get_View())
   };
  }
 },TemplateHole,VarFile);
 VarFile.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },VarFile);
 VarDomElement=TemplateHoleModule.VarDomElement=Runtime$1.Class({
  get_Name:function()
  {
   return this.name;
  },
  get_Value:function()
  {
   return this.fillWith;
  }
 },TemplateHole,VarDomElement);
 VarDomElement.New=Runtime$1.Ctor(function(name,fillWith)
 {
  TemplateHole.New.call(this);
  this.name=name;
  this.fillWith=fillWith;
 },VarDomElement);
 RouterOperators.JSUnion=function(t,cases)
 {
  var parseCases;
  function getTag(value)
  {
   var constIndex;
   function p($1)
   {
    return $1!=null&&$1.$==1&&Unchecked.Equals(value,$1.$0);
   }
   constIndex=Seq.tryFindIndex(function($1)
   {
    return p($1[0]);
   },cases);
   return constIndex!=null&&constIndex.$==1?constIndex.$0:value.$;
  }
  function readFields(tag,value)
  {
   return Arrays.init(Arrays.length((Arrays.get(cases,tag))[2]),function(i)
   {
    return value["$"+Global.String(i)];
   });
  }
  function createCase(tag,fieldValues)
  {
   var o,m$1,$1;
   o=t==null?{}:new t();
   m$1=Arrays.get(cases,tag);
   return($1=m$1[0],$1!=null&&$1.$==1)?m$1[0].$0:(o.$=tag,Seq.iteri(function(i,v)
   {
    o["$"+Global.String(i)]=v;
   },fieldValues),o);
  }
  function m(i,a)
  {
   var fields;
   function m$1(m$2,p)
   {
    return[i,m$2,p,fields];
   }
   fields=a[2];
   return Seq.map(function($1)
   {
    return m$1($1[0],$1[1]);
   },a[1]);
  }
  parseCases=Arrays.ofSeq(Seq.collect(function($1)
  {
   return m($1[0],$1[1]);
  },Seq.indexed(cases)));
  return Router$1.New$1(function(path)
  {
   function m$1(i,m$2,s,fields)
   {
    var m$3,p,m$4;
    function collect(fields$1)
    {
     return function(path$1)
     {
      return function(acc)
      {
       var t$1;
       function m$5(p$1,a)
       {
        return((collect(t$1))(p$1))(new T$1({
         $:1,
         $0:a,
         $1:acc
        }));
       }
       return fields$1.$==1?(t$1=fields$1.$1,Seq.collect(function($1)
       {
        return m$5($1[0],$1[1]);
       },fields$1.$0.Parse(path$1))):[[path$1,createCase(i,Arrays.ofList(List.rev(acc)))]];
      };
     };
    }
    return RouterOperators.isCorrectMethod(m$2,path.Method)?(m$3=List$1.startsWith(List.ofArray(s),path.Segments),m$3==null?[]:(p=m$3.$0,(m$4=List.ofArray(fields),m$4.$==0?[[Route.New(p,path.QueryArgs,path.FormData,path.Method,path.Body),createCase(i,[])]]:((collect(m$4))(Route.New(p,path.QueryArgs,path.FormData,path.Method,path.Body)))(T$1.Empty)))):[];
   }
   return Seq.collect(function($1)
   {
    return m$1($1[0],$1[1],$1[2],$1[3]);
   },parseCases);
  },function(value)
  {
   var tag,p,fields,p$1,casePath,fieldParts;
   function m$1(v,f)
   {
    return f.Write(v);
   }
   tag=getTag(value);
   p=Arrays.get(cases,tag);
   fields=p[2];
   p$1=Arrays.get(p[1],0);
   casePath=[Route.Segment(List.ofArray(p$1[1]),p$1[0])];
   return fields.length==0?{
    $:1,
    $0:casePath
   }:(fieldParts=(((Runtime$1.Curried3(Arrays.map2))(m$1))(readFields(tag,value)))(fields),Arrays.forall(function(o)
   {
    return o!=null;
   },fieldParts)?{
    $:1,
    $0:Seq.append(casePath,Seq.collect(function(o)
    {
     return o.$0;
    },fieldParts))
   }:null);
  });
 };
 RouterOperators.isCorrectMethod=function(m,p)
 {
  return p!=null&&p.$==1?m!=null&&m.$==1?Unchecked.Equals(p.$0,m.$0):true:!(m!=null&&m.$==1);
 };
 RouterModule.Parse=function(router,path)
 {
  function c(path$1,value)
  {
   return path$1.Segments.$==0?{
    $:1,
    $0:value
   }:null;
  }
  return Seq.tryPick(function($1)
  {
   return c($1[0],$1[1]);
  },router.Parse(path));
 };
 RouterModule.HashLink=function(router,endpoint)
 {
  return"#"+RouterModule.Link(router,endpoint);
 };
 RouterModule.Link=function(router,endpoint)
 {
  var m;
  m=RouterModule.Write(router,endpoint);
  return m==null?"":m.$0.ToLink();
 };
 RouterModule.Write=function(router,endpoint)
 {
  var o;
  o=router.Write(endpoint);
  return o==null?null:{
   $:1,
   $0:Route.Combine(o.$0)
  };
 };
 Route=Sitelets.Route=Runtime$1.Class({
  ToLink:function()
  {
   return PathUtil.WriteLink(this.Segments,this.QueryArgs);
  }
 },null,Route);
 Route.FromHash=function(path,strict)
 {
  var m,h;
  m=path.indexOf("#");
  return m===-1?Route.get_Empty():(h=path.substring(m+1),strict!=null&&strict.$0?h==""||h=="/"?Route.get_Empty():Strings.StartsWith(h,"/")?Route.FromUrl(h.substring(1),{
   $:1,
   $0:true
  }):Route.Segment$2(h):Route.FromUrl(path.substring(m),{
   $:1,
   $0:false
  }));
 };
 Route.Segment=function(s,m)
 {
  var i;
  i=Route.get_Empty();
  return Route.New(s,i.QueryArgs,i.FormData,m,i.Body);
 };
 Route.get_Empty=function()
 {
  return Route.New(T$1.Empty,new FSharpMap.New([]),new FSharpMap.New([]),null,{
   $:1,
   $0:null
  });
 };
 Route.FromUrl=function(path,strict)
 {
  var p,m,i;
  p=(m=path.indexOf("?"),m===-1?[path,new FSharpMap.New([])]:[Strings.Substring(path,0,m),Route.ParseQuery(path.substring(m+1))]);
  i=Route.get_Empty();
  return Route.New(List.ofArray(Strings.SplitChars(p[0],["/"],strict!=null&&strict.$0?0:1)),p[1],i.FormData,i.Method,i.Body);
 };
 Route.Segment$2=function(s)
 {
  var i;
  i=Route.get_Empty();
  return Route.New(List.ofArray([s]),i.QueryArgs,i.FormData,i.Method,i.Body);
 };
 Route.ParseQuery=function(q)
 {
  return Map.OfArray(Arrays.ofSeq(Arrays.choose(function(kv)
  {
   var m,v;
   m=Strings.SplitChars(kv,["="],0);
   return!Unchecked.Equals(m,null)&&m.length===2?(v=Arrays.get(m,1),{
    $:1,
    $0:[Arrays.get(m,0),v]
   }):((function($1)
   {
    return function($2)
    {
     return $1("wrong format for query argument: "+Utils.toSafe($2));
    };
   }(function(s)
   {
    console.log(s);
   }))(kv),null);
  },Strings.SplitChars(q,["&"],0))));
 };
 Route.Combine=function(paths)
 {
  var paths$1,m,method,body,segments,queryArgs,formData;
  paths$1=Arrays.ofSeq(paths);
  m=Arrays.length(paths$1);
  return m===0?Route.get_Empty():m===1?Arrays.get(paths$1,0):(method=null,body=null,segments=[],queryArgs=new FSharpMap.New([]),formData=new FSharpMap.New([]),Arrays.iter(function(p)
  {
   var m$1,m$2;
   m$1=p.Method;
   if(m$1!=null&&m$1.$==1)
    method=m$1;
   m$2=p.Body;
   if(m$2==null)
    ;
   else
    body=m$2;
   queryArgs=Map.FoldBack(function(k,v,t)
   {
    return t.Add$1(k,v);
   },queryArgs,p.QueryArgs);
   formData=Map.FoldBack(function(k,v,t)
   {
    return t.Add$1(k,v);
   },formData,p.FormData);
   List.iter(function(a)
   {
    segments.push(a);
   },p.Segments);
  },paths$1),Route.New(List.ofSeq(segments),queryArgs,formData,method,body));
 };
 Route.New=function(Segments,QueryArgs,FormData,Method,Body)
 {
  return new Route({
   Segments:Segments,
   QueryArgs:QueryArgs,
   FormData:FormData,
   Method:Method,
   Body:Body
  });
 };
 attr=HtmlModule.attr=Runtime$1.Class({},Obj,attr);
 AttrModule.Style=function(name,value)
 {
  return Attrs.Static(function(el)
  {
   el.style.setProperty(name,value);
  });
 };
 AttrModule.OnAfterRender=function(callback)
 {
  return new AttrProxy({
   $:4,
   $0:callback
  });
 };
 AttrModule.Handler=function(name,callback)
 {
  return Attrs.Static(function(el)
  {
   el.addEventListener(name,function(d)
   {
    return(callback(el))(d);
   },false);
  });
 };
 AttrModule.Dynamic=function(name,view)
 {
  return Attrs.Dynamic(view,function(el)
  {
   return function(v)
   {
    return el.setAttribute(name,v);
   };
  });
 };
 AttrModule.Value=function(_var)
 {
  return AttrModule.ValueWith(BindVar.StringApply(),_var);
 };
 AttrModule.FloatValueUnchecked=function(_var)
 {
  return AttrModule.ValueWith(BindVar.FloatApplyUnchecked(),_var);
 };
 AttrModule.Checked=function(_var)
 {
  return AttrModule.ValueWith(BindVar.BoolCheckedApply(),_var);
 };
 AttrModule.DateTimeValue=function(_var)
 {
  return AttrModule.ValueWith(BindVar.DateTimeApplyUnchecked(),_var);
 };
 AttrModule.FileValue=function(_var)
 {
  return AttrModule.ValueWith(BindVar.FileApplyUnchecked(),_var);
 };
 AttrModule.ValueWith=function(bind,_var)
 {
  var p;
  p=bind(_var);
  return AttrProxy.Append(Attrs.Static(p[0]),AttrModule.DynamicCustom(p[1],p[2]));
 };
 AttrModule.DynamicCustom=function(set,view)
 {
  return Attrs.Dynamic(view,set);
 };
 Enumerator.Get=function(x)
 {
  return x instanceof Global.Array?Enumerator.ArrayEnumerator(x):Unchecked.Equals(typeof x,"string")?Enumerator.StringEnumerator(x):x.GetEnumerator();
 };
 Enumerator.ArrayEnumerator=function(s)
 {
  return new T.New(0,null,function(e)
  {
   var i;
   i=e.s;
   return i<Arrays.length(s)&&(e.c=Arrays.get(s,i),e.s=i+1,true);
  },void 0);
 };
 Enumerator.StringEnumerator=function(s)
 {
  return new T.New(0,null,function(e)
  {
   var i;
   i=e.s;
   return i<s.length&&(e.c=s[i],e.s=i+1,true);
  },void 0);
 };
 Enumerator.Get0=function(x)
 {
  return x instanceof Global.Array?Enumerator.ArrayEnumerator(x):Unchecked.Equals(typeof x,"string")?Enumerator.StringEnumerator(x):"GetEnumerator0"in x?x.GetEnumerator0():x.GetEnumerator();
 };
 T=Enumerator.T=Runtime$1.Class({
  MoveNext:function()
  {
   var m;
   m=this.n(this);
   this.e=m?1:2;
   return m;
  },
  Current:function()
  {
   return this.e===1?this.c:this.e===0?Operators.FailWith("Enumeration has not started. Call MoveNext."):Operators.FailWith("Enumeration already finished.");
  },
  Dispose:function()
  {
   if(this.d)
    this.d(this);
  }
 },Obj,T);
 T.New=Runtime$1.Ctor(function(s,c,n,d)
 {
  Obj.New.call(this);
  this.s=s;
  this.c=c;
  this.n=n;
  this.d=d;
  this.e=0;
 },T);
 Option.fold=function(f,s,x)
 {
  return x==null?s:f(s,x.$0);
 };
 Option.ofObj=function(o)
 {
  return o==null?null:{
   $:1,
   $0:o
  };
 };
 Slice.array=function(source,start,finish)
 {
  var f,f$1;
  return start==null?finish!=null&&finish.$==1?(f=finish.$0,f<0?[]:source.slice(0,f+1)):[]:finish==null?source.slice(start.$0):(f$1=finish.$0,f$1<0?[]:source.slice(start.$0,f$1+1));
 };
 Slice.string=function(source,start,finish)
 {
  var f,f$1;
  return start==null?finish!=null&&finish.$==1?(f=finish.$0,f<0?"":source.slice(0,f+1)):"":finish==null?source.slice(start.$0):(f$1=finish.$0,f$1<0?"":source.slice(start.$0,f$1+1));
 };
 BatchUpdater=ChartJsInternal.BatchUpdater=Runtime$1.Class({
  Update:function(updater)
  {
   var $this,o;
   function doUpdate()
   {
    $this.handle[0]=null;
    $this.count[0]=0;
    updater();
   }
   $this=this;
   o=this.handle[0];
   if(o==null)
    ;
   else
    Global.clearTimeout(o.$0);
   if(this.count[0]<this.maxCount)
    {
     this.count[0]++;
     this.handle[0]={
      $:1,
      $0:Global.setTimeout(doUpdate,this.interval)
     };
    }
   else
    doUpdate();
  }
 },Obj,BatchUpdater);
 BatchUpdater.New=Runtime$1.Ctor(function(interval,maxCount)
 {
  Obj.New.call(this);
  this.interval=interval==null?75:interval.$0;
  this.maxCount=maxCount==null?10:maxCount.$0;
  this.handle=[null];
  this.count=[0];
 },BatchUpdater);
 Util.observer=function(h)
 {
  return{
   OnCompleted:function()
   {
    return null;
   },
   OnError:function()
   {
    return null;
   },
   OnNext:h
  };
 };
 Seq$1.headOption=function(s)
 {
  return Seq.isEmpty(s)?null:{
   $:1,
   $0:Seq.nth(0,s)
  };
 };
 Reactive.Select=function(io,fn)
 {
  return Reactive.New(function(o)
  {
   return io.Subscribe(Util.observer(function(v)
   {
    o.OnNext(fn(v));
   }));
  });
 };
 Reactive.New=function(fn)
 {
  return{
   Subscribe:fn
  };
 };
 Reactive.Return=function(x)
 {
  return Reactive.New(function(o)
  {
   o.OnNext(x);
   o.OnCompleted();
   return Reactive.NewDisposable(Global.ignore);
  });
 };
 Reactive.CombineLast=function(io1,io2,f)
 {
  return Reactive.New(function(o)
  {
   var lv1s,lv2s,o1,o2,d1,d2;
   function update()
   {
    if(lv1s.length>0&&lv2s.length>0)
     o.OnNext(f(lv1s.shift(),lv2s.shift()));
   }
   lv1s=[];
   lv2s=[];
   o1=Reactive.NewObserver(function(x)
   {
    lv1s.push(x);
    update();
   },Global.ignore);
   o2=Reactive.NewObserver(function(y)
   {
    lv2s.push(y);
    update();
   },Global.ignore);
   d1=io1.Subscribe(o1);
   d2=io2.Subscribe(o2);
   return Reactive.NewDisposable(function()
   {
    d1.Dispose();
    d2.Dispose();
   });
  });
 };
 Reactive.NewDisposable=function(d)
 {
  return{
   Dispose:function()
   {
    return d();
   }
  };
 };
 Reactive.NewObserver=function(onNext,onComplete)
 {
  return{
   OnNext:onNext,
   OnCompleted:function()
   {
    return onComplete();
   },
   OnError:function()
   {
    return null;
   }
  };
 };
 Reactive$1.SequenceOnlyNew=function(streams)
 {
  var m;
  m=List.ofSeq(streams);
  return m.$==1?Reactive$1.sequence(Reactive.Select(m.$0,function(v)
  {
   return[v];
  }),m.$1):Reactive.Return([]);
 };
 Reactive$1.sequence=function(acc,a)
 {
  var xs,x;
  while(true)
   if(a.$==1)
    {
     xs=a.$1;
     x=a.$0;
     acc=(function(acc$1,x$1)
     {
      return function(f)
      {
       return Reactive.CombineLast(acc$1,x$1,function($1,$2)
       {
        return(f($1))($2);
       });
      };
     }(acc,x))(function(o)
     {
      return function(c)
      {
       return Seq.append(o,[c]);
      };
     });
     a=xs;
    }
   else
    return acc;
 };
 T$1=List.T=Runtime$1.Class({
  GetEnumerator:function()
  {
   return new T.New(this,null,function(e)
   {
    var m;
    m=e.s;
    return m.$==0?false:(e.c=m.$0,e.s=m.$1,true);
   },void 0);
  }
 },null,T$1);
 T$1.Empty=new T$1({
  $:0
 });
 List.ofArray=function(arr)
 {
  var r,i,$1;
  r=T$1.Empty;
  for(i=Arrays.length(arr)-1,$1=0;i>=$1;i--)r=new T$1({
   $:1,
   $0:Arrays.get(arr,i),
   $1:r
  });
  return r;
 };
 List.rev=function(l)
 {
  var res,r;
  res=T$1.Empty;
  r=l;
  while(r.$==1)
   {
    res=new T$1({
     $:1,
     $0:r.$0,
     $1:res
    });
    r=r.$1;
   }
  return res;
 };
 List.ofSeq=function(s)
 {
  var e,$1,go,r,res,t;
  if(s instanceof T$1)
   return s;
  else
   if(s instanceof Global.Array)
    return List.ofArray(s);
   else
    {
     e=Enumerator.Get(s);
     try
     {
      go=e.MoveNext();
      if(!go)
       $1=T$1.Empty;
      else
       {
        res=new T$1({
         $:1
        });
        r=res;
        while(go)
         {
          r.$0=e.Current();
          if(e.MoveNext())
           r=(t=new T$1({
            $:1
           }),r.$1=t,t);
          else
           go=false;
         }
        r.$1=T$1.Empty;
        $1=res;
       }
      return $1;
     }
     finally
     {
      if(typeof e=="object"&&"Dispose"in e)
       e.Dispose();
     }
    }
 };
 List.head=function(l)
 {
  return l.$==1?l.$0:List.listEmpty();
 };
 List.tail=function(l)
 {
  return l.$==1?l.$1:List.listEmpty();
 };
 List.listEmpty=function()
 {
  return Operators.FailWith("The input list was empty.");
 };
 List.iter=function(f,l)
 {
  var r;
  r=l;
  while(r.$==1)
   {
    f(List.head(r));
    r=List.tail(r);
   }
 };
 SC$4.$cctor=function()
 {
  SC$4.$cctor=Global.ignore;
  SC$4.LoadedTemplates=new Dictionary.New$5();
  SC$4.LocalTemplatesLoaded=false;
  SC$4.GlobalHoles=new Dictionary.New$5();
  SC$4.TextHoleRE="\\${([^}]+)}";
  SC$4.RenderedFullDocTemplate=null;
 };
 Event$1=Event.Event=Runtime$1.Class({
  Subscribe$1:function(observer)
  {
   var $this;
   function h(a,x)
   {
    return observer.OnNext(x);
   }
   function dispose()
   {
    $this.RemoveHandler$1(h);
   }
   $this=this;
   this.AddHandler$1(h);
   return{
    Dispose:function()
    {
     return dispose();
    }
   };
  },
  AddHandler$1:function(h)
  {
   this.Handlers.push(h);
  },
  RemoveHandler$1:function(h)
  {
   var o,o$1;
   o=Seq.tryFindIndex(function(y)
   {
    return Unchecked.Equals(h,y);
   },this.Handlers);
   if(o==null)
    ;
   else
    {
     o$1=this.Handlers;
     o$1.splice.apply(o$1,[o.$0,1]);
    }
  },
  Dispose:Global.ignore,
  Subscribe:function(observer)
  {
   return this.Subscribe$1(observer);
  }
 },null,Event$1);
 Event$1.New=function(Handlers)
 {
  return new Event$1({
   Handlers:Handlers
  });
 };
 Random=WebSharper.Random=Runtime$1.Class({
  Next:function(minValue,maxValue)
  {
   return minValue>maxValue?Operators.FailWith("'minValue' cannot be greater than maxValue."):minValue+Math.floor(Math.random()*(maxValue-minValue));
  }
 },Obj,Random);
 Random.New=Runtime$1.Ctor(function()
 {
  Obj.New.call(this);
 },Random);
 PolarData.New=function(Value,Color$1,Highlight,Label)
 {
  return{
   Value:Value,
   Color:Color$1,
   Highlight:Highlight,
   Label:Label
  };
 };
 Snap.Obsolete=function(sn)
 {
  var $1,m,i,$2,o;
  m=sn.s;
  if(m==null||(m!=null&&m.$==2?($1=m.$1,false):m!=null&&m.$==3?($1=m.$1,false):true))
   void 0;
  else
   {
    sn.s=null;
    for(i=0,$2=Arrays.length($1)-1;i<=$2;i++){
     o=Arrays.get($1,i);
     if(typeof o=="object")
      (function(sn$1)
      {
       Snap.Obsolete(sn$1);
      }(o));
     else
      o();
    }
   }
 };
 Snap.New=function(State)
 {
  return{
   s:State
  };
 };
 Fresh.Int=function()
 {
  Fresh.set_counter(Fresh.counter()+1);
  return Fresh.counter();
 };
 Fresh.set_counter=function($1)
 {
  SC$5.$cctor();
  SC$5.counter=$1;
 };
 Fresh.counter=function()
 {
  SC$5.$cctor();
  return SC$5.counter;
 };
 DictionaryUtil.notPresent=function()
 {
  throw new KeyNotFoundException.New();
 };
 Storage.InMemory=function(init)
 {
  return new ArrayStorage.New(init);
 };
 Router$1.New$1=function(Parse,Write)
 {
  return{
   Parse:Parse,
   Write:Write
  };
 };
 List$1.startsWith=function(s,l)
 {
  var $1;
  switch(s.$==1?l.$==1?Unchecked.Equals(s.$0,l.$0)?($1=[l.$0,l.$1,s.$0,s.$1],1):2:2:0)
  {
   case 0:
    return{
     $:1,
     $0:l
    };
   case 1:
    return List$1.startsWith($1[3],$1[1]);
   case 2:
    return null;
  }
 };
 AttrProxy=UI.AttrProxy=Runtime$1.Class({},null,AttrProxy);
 AttrProxy.Create=function(name,value)
 {
  return Attrs.Static(function(el)
  {
   el.setAttribute(name,value);
  });
 };
 AttrProxy.Handler=function(event,q)
 {
  return AttrProxy.HandlerImpl(event,q);
 };
 AttrProxy.Concat=function(xs)
 {
  var x;
  x=Array.ofSeqNonCopying(xs);
  return Array.TreeReduce(Attrs.EmptyAttr(),AttrProxy.Append,x);
 };
 AttrProxy.HandlerImpl=function(event,q)
 {
  return Attrs.Static(function(el)
  {
   el.addEventListener(event,function(d)
   {
    return(q(el))(d);
   },false);
  });
 };
 AttrProxy.Append=function(a,b)
 {
  return Attrs.AppendTree(a,b);
 };
 Attrs.Static=function(attr$1)
 {
  return new AttrProxy({
   $:3,
   $0:attr$1
  });
 };
 Attrs.Insert=function(elem,tree)
 {
  var nodes,oar,arr;
  function loop(node)
  {
   var b,a;
   while(true)
    if(!(node===null))
    {
     if(node!=null&&node.$==1)
      return nodes.push(node.$0);
     else
      if(node!=null&&node.$==2)
       {
        b=node.$1;
        a=node.$0;
        loop(a);
        node=b;
       }
      else
       return node!=null&&node.$==3?node.$0(elem):node!=null&&node.$==4?oar.push(node.$0):null;
    }
    else
     return null;
  }
  nodes=[];
  oar=[];
  loop(tree);
  arr=nodes.slice(0);
  return Dyn.New(elem,Attrs.Flags(tree),arr,oar.length===0?null:{
   $:1,
   $0:function(el)
   {
    Seq.iter(function(f)
    {
     f(el);
    },oar);
   }
  });
 };
 Attrs.Updates=function(dyn)
 {
  return Array.MapTreeReduce(function(x)
  {
   return x.NChanged();
  },View.Const(),View.Map2Unit,dyn.DynNodes);
 };
 Attrs.Empty=function(e)
 {
  return Dyn.New(e,0,[],null);
 };
 Attrs.Flags=function(a)
 {
  return a!==null&&a.hasOwnProperty("flags")?a.flags:0;
 };
 Attrs.Dynamic=function(view,set)
 {
  return new AttrProxy({
   $:1,
   $0:new DynamicAttrNode.New(view,set)
  });
 };
 Attrs.EmptyAttr=function()
 {
  SC$9.$cctor();
  return SC$9.EmptyAttr;
 };
 Attrs.HasExitAnim=function(attr$1)
 {
  var flag;
  flag=2;
  return(attr$1.DynFlags&flag)===flag;
 };
 Attrs.GetExitAnim=function(dyn)
 {
  return Attrs.GetAnim(dyn,function($1,$2)
  {
   return $1.NGetExitAnim($2);
  });
 };
 Attrs.HasEnterAnim=function(attr$1)
 {
  var flag;
  flag=1;
  return(attr$1.DynFlags&flag)===flag;
 };
 Attrs.GetEnterAnim=function(dyn)
 {
  return Attrs.GetAnim(dyn,function($1,$2)
  {
   return $1.NGetEnterAnim($2);
  });
 };
 Attrs.HasChangeAnim=function(attr$1)
 {
  var flag;
  flag=4;
  return(attr$1.DynFlags&flag)===flag;
 };
 Attrs.GetChangeAnim=function(dyn)
 {
  return Attrs.GetAnim(dyn,function($1,$2)
  {
   return $1.NGetChangeAnim($2);
  });
 };
 Attrs.AppendTree=function(a,b)
 {
  var x;
  return a===null?b:b===null?a:(x=new AttrProxy({
   $:2,
   $0:a,
   $1:b
  }),(Attrs.SetFlags(x,Attrs.Flags(a)|Attrs.Flags(b)),x));
 };
 Attrs.GetAnim=function(dyn,f)
 {
  return An.Concat(Arrays.map(function(n)
  {
   return f(n,dyn.DynElem);
  },dyn.DynNodes));
 };
 Attrs.Sync=function(elem,dyn)
 {
  Arrays.iter(function(d)
  {
   d.NSync(elem);
  },dyn.DynNodes);
 };
 Attrs.SetFlags=function(a,f)
 {
  a.flags=f;
 };
 DomUtility.ParseHTMLIntoFakeRoot=function(elem)
 {
  var root,tag,m,p,w;
  function unwrap(elt,a)
  {
   var i;
   while(true)
    if(a===0)
     return elt;
    else
     {
      i=a;
      elt=elt.lastChild;
      a=i-1;
     }
  }
  root=self.document.createElement("div");
  return!DomUtility.rhtml().test(elem)?(root.appendChild(self.document.createTextNode(elem)),root):(tag=(m=DomUtility.rtagName().exec(elem),Unchecked.Equals(m,null)?"":Arrays.get(m,1).toLowerCase()),(p=(w=(DomUtility.wrapMap())[tag],w?w:DomUtility.defaultWrap()),(root.innerHTML=p[1]+elem.replace(DomUtility.rxhtmlTag(),"<$1></$2>")+p[2],unwrap(root,p[0]))));
 };
 DomUtility.rhtml=function()
 {
  SC$7.$cctor();
  return SC$7.rhtml;
 };
 DomUtility.wrapMap=function()
 {
  SC$7.$cctor();
  return SC$7.wrapMap;
 };
 DomUtility.defaultWrap=function()
 {
  SC$7.$cctor();
  return SC$7.defaultWrap;
 };
 DomUtility.rxhtmlTag=function()
 {
  SC$7.$cctor();
  return SC$7.rxhtmlTag;
 };
 DomUtility.rtagName=function()
 {
  SC$7.$cctor();
  return SC$7.rtagName;
 };
 DomUtility.IterSelector=function(el,selector,f)
 {
  var l,i,$1;
  l=el.querySelectorAll(selector);
  for(i=0,$1=l.length-1;i<=$1;i++)f(l[i]);
 };
 DomUtility.ChildrenArray=function(element)
 {
  var a,i,$1;
  a=[];
  for(i=0,$1=element.childNodes.length-1;i<=$1;i++)a.push(element.childNodes[i]);
  return a;
 };
 DomUtility.IterSelectorDoc=function(selector,f)
 {
  var l,i,$1;
  l=self.document.querySelectorAll(selector);
  for(i=0,$1=l.length-1;i<=$1;i++)f(l[i]);
 };
 DomUtility.InsertAt=function(parent,pos,node)
 {
  var m;
  if(!(node.parentNode===parent&&pos===(m=node.nextSibling,Unchecked.Equals(m,null)?null:m)))
   parent.insertBefore(node,pos);
 };
 DomUtility.RemoveNode=function(parent,el)
 {
  if(el.parentNode===parent)
   parent.removeChild(el);
 };
 Prepare.convertTextNode=function(n)
 {
  var m,li,$1,s,strRE,hole;
  m=null;
  li=0;
  s=n.textContent;
  strRE=new Global.RegExp(Templates.TextHoleRE(),"g");
  while(m=strRE.exec(s),m!==null)
   {
    n.parentNode.insertBefore(self.document.createTextNode(Slice.string(s,{
     $:1,
     $0:li
    },{
     $:1,
     $0:strRE.lastIndex-Arrays.get(m,0).length-1
    })),n);
    li=strRE.lastIndex;
    hole=self.document.createElement("span");
    hole.setAttribute("ws-replace",Arrays.get(m,1).toLowerCase());
    n.parentNode.insertBefore(hole,n);
   }
  strRE.lastIndex=0;
  n.textContent=Slice.string(s,{
   $:1,
   $0:li
  },null);
 };
 Prepare.failNotLoaded=function(name)
 {
  console.warn("Instantiating non-loaded template",name);
 };
 Prepare.fillTextHole=function(instance,fillWith,templateName)
 {
  var m;
  m=instance.querySelector("[ws-replace]");
  return Unchecked.Equals(m,null)?(console.warn("Filling non-existent text hole",templateName),null):(m.parentNode.replaceChild(self.document.createTextNode(fillWith),m),{
   $:1,
   $0:m.getAttribute("ws-replace")
  });
 };
 Prepare.removeHolesExcept=function(instance,dontRemove)
 {
  function run(attrName)
  {
   Templates.foreachNotPreserved(instance,"["+attrName+"]",function(e)
   {
    if(!dontRemove.Contains(e.getAttribute(attrName)))
     e.removeAttribute(attrName);
   });
  }
  run("ws-attr");
  run("ws-onafterrender");
  run("ws-var");
  Templates.foreachNotPreserved(instance,"[ws-hole]",function(e)
  {
   if(!dontRemove.Contains(e.getAttribute("ws-hole")))
    {
     e.removeAttribute("ws-hole");
     while(e.hasChildNodes())
      e.removeChild(e.lastChild);
    }
  });
  Templates.foreachNotPreserved(instance,"[ws-replace]",function(e)
  {
   if(!dontRemove.Contains(e.getAttribute("ws-replace")))
    e.parentNode.removeChild(e);
  });
  Templates.foreachNotPreserved(instance,"[ws-on]",function(e)
  {
   e.setAttribute("ws-on",Strings.concat(" ",Arrays.filter(function(x)
   {
    return dontRemove.Contains(Arrays.get(Strings.SplitChars(x,[":"],1),1));
   },Strings.SplitChars(e.getAttribute("ws-on"),[" "],1))));
  });
  Templates.foreachNotPreserved(instance,"[ws-attr-holes]",function(e)
  {
   var holeAttrs,i,$1,attrName,_this;
   holeAttrs=Strings.SplitChars(e.getAttribute("ws-attr-holes"),[" "],1);
   for(i=0,$1=holeAttrs.length-1;i<=$1;i++){
    attrName=Arrays.get(holeAttrs,i);
    e.setAttribute(attrName,(_this=new Global.RegExp(Templates.TextHoleRE(),"g"),e.getAttribute(attrName).replace(_this,function($2,$3)
    {
     return dontRemove.Contains($3)?$2:"";
    })));
   }
  });
 };
 Prepare.fillInstanceAttrs=function(instance,fillWith)
 {
  var name,m,i,$1,a;
  Prepare.convertAttrs(fillWith);
  name=fillWith.nodeName.toLowerCase();
  m=instance.querySelector("[ws-attr="+name+"]");
  if(Unchecked.Equals(m,null))
   console.warn("Filling non-existent attr hole",name);
  else
   {
    m.removeAttribute("ws-attr");
    for(i=0,$1=fillWith.attributes.length-1;i<=$1;i++){
     a=fillWith.attributes.item(i);
     if(a.name=="class"&&m.hasAttribute("class"))
      m.setAttribute("class",m.getAttribute("class")+" "+a.nodeValue);
     else
      m.setAttribute(a.name,a.nodeValue);
    }
   }
 };
 Prepare.mapHoles=function(t,mappings)
 {
  function run(attrName)
  {
   Templates.foreachNotPreserved(t,"["+attrName+"]",function(e)
   {
    var m,o;
    m=(o=null,[mappings.TryGetValue(e.getAttribute(attrName).toLowerCase(),{
     get:function()
     {
      return o;
     },
     set:function(v)
     {
      o=v;
     }
    }),o]);
    if(m[0])
     e.setAttribute(attrName,m[1]);
   });
  }
  run("ws-hole");
  run("ws-replace");
  run("ws-attr");
  run("ws-onafterrender");
  run("ws-var");
  Templates.foreachNotPreserved(t,"[ws-on]",function(e)
  {
   e.setAttribute("ws-on",Strings.concat(" ",Arrays.map(function(x)
   {
    var a,m,o;
    a=Strings.SplitChars(x,[":"],1);
    m=(o=null,[mappings.TryGetValue(Arrays.get(a,1),{
     get:function()
     {
      return o;
     },
     set:function(v)
     {
      o=v;
     }
    }),o]);
    return m[0]?Arrays.get(a,0)+":"+m[1]:x;
   },Strings.SplitChars(e.getAttribute("ws-on"),[" "],1))));
  });
  Templates.foreachNotPreserved(t,"[ws-attr-holes]",function(e)
  {
   var holeAttrs,i,$1;
   holeAttrs=Strings.SplitChars(e.getAttribute("ws-attr-holes"),[" "],1);
   for(i=0,$1=holeAttrs.length-1;i<=$1;i++)(function()
   {
    var attrName;
    function f(s,a)
    {
     var a$1;
     a$1=Operators.KeyValue(a);
     return s.replace(new Global.RegExp("\\${"+a$1[0]+"}","ig"),"${"+a$1[1]+"}");
    }
    attrName=Arrays.get(holeAttrs,i);
    return e.setAttribute(attrName,(((Runtime$1.Curried3(Seq.fold))(f))(e.getAttribute(attrName)))(mappings));
   }());
  });
 };
 Prepare.fill=function(fillWith,p,n)
 {
  while(true)
   if(fillWith.hasChildNodes())
    n=p.insertBefore(fillWith.lastChild,n);
   else
    return null;
 };
 Prepare.convertAttrs=function(el)
 {
  var attrs,toRemove,events,holedAttrs,i,$1,a,_this;
  function lowercaseAttr(name)
  {
   var m;
   m=el.getAttribute(name);
   if(m==null)
    ;
   else
    el.setAttribute(name,m.toLowerCase());
  }
  attrs=el.attributes;
  toRemove=[];
  events=[];
  holedAttrs=[];
  for(i=0,$1=attrs.length-1;i<=$1;i++){
   a=attrs.item(i);
   if(Strings.StartsWith(a.nodeName,"ws-on")&&a.nodeName!="ws-onafterrender"&&a.nodeName!="ws-on")
    {
     toRemove.push(a.nodeName);
     events.push(Slice.string(a.nodeName,{
      $:1,
      $0:"ws-on".length
     },null)+":"+a.nodeValue.toLowerCase());
    }
   else
    !Strings.StartsWith(a.nodeName,"ws-")&&(new Global.RegExp(Templates.TextHoleRE())).test(a.nodeValue)?(a.nodeValue=(_this=new Global.RegExp(Templates.TextHoleRE(),"g"),a.nodeValue.replace(_this,function($2,$3)
    {
     return"${"+$3.toLowerCase()+"}";
    })),holedAttrs.push(a.nodeName)):void 0;
  }
  if(!(events.length==0))
   el.setAttribute("ws-on",Strings.concat(" ",events));
  if(!(holedAttrs.length==0))
   el.setAttribute("ws-attr-holes",Strings.concat(" ",holedAttrs));
  lowercaseAttr("ws-hole");
  lowercaseAttr("ws-replace");
  lowercaseAttr("ws-attr");
  lowercaseAttr("ws-onafterrender");
  lowercaseAttr("ws-var");
  Arrays.iter(function(a$1)
  {
   el.removeAttribute(a$1);
  },toRemove);
 };
 Seq.insufficient=function()
 {
  return Operators.FailWith("The input sequence has an insufficient number of elements.");
 };
 Seq.nonNegative=function()
 {
  return Operators.FailWith("The input must be non-negative.");
 };
 Arrays.mapiInPlace=function(f,arr)
 {
  var i,$1;
  for(i=0,$1=arr.length-1;i<=$1;i++)arr[i]=f(i,arr[i]);
  return arr;
 };
 Arrays.mapInPlace=function(f,arr)
 {
  var i,$1;
  for(i=0,$1=arr.length-1;i<=$1;i++)arr[i]=f(arr[i]);
 };
 KeyCollection=Collections.KeyCollection=Runtime$1.Class({
  GetEnumerator:function()
  {
   return Enumerator.Get(Seq.map(function(kvp)
   {
    return kvp.K;
   },this.d));
  }
 },Obj,KeyCollection);
 KeyCollection.New=Runtime$1.Ctor(function(d)
 {
  Obj.New.call(this);
  this.d=d;
 },KeyCollection);
 DocElemNode=UI.DocElemNode=Runtime$1.Class({
  Equals:function(o)
  {
   return this.ElKey===o.ElKey;
  },
  GetHashCode:function()
  {
   return this.ElKey;
  }
 },null,DocElemNode);
 DocElemNode.New=function(Attr,Children,Delimiters,El,ElKey,Render)
 {
  var $1;
  return new DocElemNode(($1={
   Attr:Attr,
   Children:Children,
   El:El,
   ElKey:ElKey
  },(Runtime$1.SetOptional($1,"Delimiters",Delimiters),Runtime$1.SetOptional($1,"Render",Render),$1)));
 };
 Elt$1=UI.Elt=Runtime$1.Class({},Doc,Elt$1);
 Elt$1.TreeNode=function(tree,updates)
 {
  var rvUpdates,x;
  function m(a,a$1)
  {
   return Attrs.Updates(a$1);
  }
  rvUpdates=Updates.Create(updates);
  return new Elt$1.New$1({
   $:6,
   $0:tree
  },View.Map2Unit((x=Arrays.map(function($1)
  {
   return m($1[0],$1[1]);
  },tree.Attrs),Array.TreeReduce(View.Const(),View.Map2Unit,x)),rvUpdates.v),Arrays.get(tree.Els,0),rvUpdates);
 };
 Elt$1.New=function(el,attr$1,children)
 {
  var node,rvUpdates;
  node=Docs.CreateElemNode(el,attr$1,children.docNode);
  rvUpdates=Updates.Create(children.updates);
  return new Elt$1.New$1({
   $:1,
   $0:node
  },View.Map2Unit(Attrs.Updates(node.Attr),rvUpdates.v),el,rvUpdates);
 };
 Elt$1.New$1=Runtime$1.Ctor(function(docNode,updates,elt,rvUpdates)
 {
  Doc.New.call(this,docNode,updates);
  this.docNode$1=docNode;
  this.updates$1=updates;
  this.elt=elt;
  this.rvUpdates=rvUpdates;
 },Elt$1);
 An.get_UseAnimations=function()
 {
  return Anims.UseAnimations();
 };
 An.Play=function(anim)
 {
  var _;
  _=null;
  return Concurrency.Delay(function()
  {
   return Concurrency.Bind(An.Run(Global.ignore,Anims.Actions(anim)),function()
   {
    Anims.Finalize(anim);
    return Concurrency.Return(null);
   });
  });
 };
 An.Append=function(a,a$1)
 {
  return{
   $:0,
   $0:AppendList.Append(a.$0,a$1.$0)
  };
 };
 An.Run=function(k,anim)
 {
  var dur;
  function a(ok)
  {
   function loop(start)
   {
    return function(now)
    {
     var t;
     t=now-start;
     anim.Compute(t);
     k();
     return t<=dur?void Global.requestAnimationFrame(function(t$1)
     {
      (loop(start))(t$1);
     }):ok();
    };
   }
   Global.requestAnimationFrame(function(t)
   {
    (loop(t))(t);
   });
  }
  dur=anim.Duration;
  return dur===0?Concurrency.Zero():Concurrency.FromContinuations(function($1,$2,$3)
  {
   return a.apply(null,[$1,$2,$3]);
  });
 };
 An.Concat=function(xs)
 {
  return{
   $:0,
   $0:AppendList.Concat(Seq.map(Anims.List,xs))
  };
 };
 An.get_Empty=function()
 {
  return{
   $:0,
   $0:AppendList.Empty()
  };
 };
 Settings.BatchUpdatesEnabled=function()
 {
  SC$6.$cctor();
  return SC$6.BatchUpdatesEnabled;
 };
 Mailbox.StartProcessor=function(procAsync)
 {
  var st;
  function work()
  {
   var _;
   _=null;
   return Concurrency.Delay(function()
   {
    return Concurrency.Bind(procAsync,function()
    {
     var m;
     m=st[0];
     return Unchecked.Equals(m,1)?(st[0]=0,Concurrency.Zero()):Unchecked.Equals(m,2)?(st[0]=1,work()):Concurrency.Zero();
    });
   });
  }
  st=[0];
  return function()
  {
   var m;
   m=st[0];
   if(Unchecked.Equals(m,0))
    {
     st[0]=1;
     Concurrency.Start(work(),null);
    }
   else
    Unchecked.Equals(m,1)?st[0]=2:void 0;
  };
 };
 ArrayStorage=Storage.ArrayStorage=Runtime$1.Class({
  SSetAt:function(idx,elem,arr)
  {
   Arrays.set(arr,idx,elem);
   return arr;
  },
  SAppend:function(i,arr)
  {
   arr.push(i);
   return arr;
  },
  SInit:function()
  {
   return this.init;
  }
 },Obj,ArrayStorage);
 ArrayStorage.New=Runtime$1.Ctor(function(init)
 {
  Obj.New.call(this);
  this.init=init;
 },ArrayStorage);
 FSharpMap=Collections.FSharpMap=Runtime$1.Class({
  Equals:function(other)
  {
   return this.Count()===other.Count()&&Seq.forall2(Unchecked.Equals,this,other);
  },
  GetEnumerator:function()
  {
   return Enumerator.Get(Seq.map(function(kv)
   {
    return{
     K:kv.Key,
     V:kv.Value
    };
   },BalancedTree.Enumerate(false,this.tree)));
  },
  Count:function()
  {
   var tree;
   tree=this.tree;
   return tree==null?0:tree.Count;
  },
  GetHashCode:function()
  {
   return Unchecked.Hash(Arrays.ofSeq(this));
  },
  Add$1:function(k,v)
  {
   return new FSharpMap.New$1(BalancedTree.Add(Pair.New(k,v),this.tree));
  },
  get_IsEmpty:function()
  {
   return this.tree==null;
  },
  get_Tree:function()
  {
   return this.tree;
  },
  CompareTo0:function(other)
  {
   return Seq.compareWith(Unchecked.Compare,this,other);
  }
 },Obj,FSharpMap);
 FSharpMap.New=Runtime$1.Ctor(function(s)
 {
  FSharpMap.New$1.call(this,MapUtil.fromSeq(s));
 },FSharpMap);
 FSharpMap.New$1=Runtime$1.Ctor(function(tree)
 {
  Obj.New.call(this);
  this.tree=tree;
 },FSharpMap);
 Map.OfArray=function(a)
 {
  return new FSharpMap.New$1(BalancedTree.OfSeq(Seq.map(function($1)
  {
   return Pair.New($1[0],$1[1]);
  },a)));
 };
 Map.FoldBack=function(f,m,s)
 {
  return Seq.fold(function(s$1,kv)
  {
   return f(kv.Key,kv.Value,s$1);
  },s,BalancedTree.Enumerate(true,m.get_Tree()));
 };
 Map.ToSeq=function(m)
 {
  return Seq.map(function(kv)
  {
   return[kv.Key,kv.Value];
  },BalancedTree.Enumerate(false,m.get_Tree()));
 };
 Strings.StartsWith=function(t,s)
 {
  return t.substring(0,s.length)==s;
 };
 Strings.concat=function(separator,strings)
 {
  return Arrays.ofSeq(strings).join(separator);
 };
 Strings.SplitChars=function(s,sep,opts)
 {
  return Strings.Split(s,new Global.RegExp("["+Strings.RegexEscape(sep.join(""))+"]"),opts);
 };
 Strings.Substring=function(s,ix,ct)
 {
  return s.substr(ix,ct);
 };
 Strings.Split=function(s,pat,opts)
 {
  return opts===1?Arrays.filter(function(x)
  {
   return x!=="";
  },Strings.SplitWith(s,pat)):Strings.SplitWith(s,pat);
 };
 Strings.RegexEscape=function(s)
 {
  return s.replace(new Global.RegExp("[-\\/\\\\^$*+?.()|[\\]{}]","g"),"\\$&");
 };
 Strings.SplitWith=function(str,pat)
 {
  return str.split(pat);
 };
 Strings.forall=function(f,s)
 {
  return Seq.forall(f,Strings.protect(s));
 };
 Strings.IsNullOrEmpty=function(x)
 {
  return x==null||x=="";
 };
 Strings.Join=function(sep,values)
 {
  return values.join(sep);
 };
 Strings.protect=function(s)
 {
  return s==null?"":s;
 };
 Utils.toSafe=function(s)
 {
  return s==null?"":s;
 };
 Concurrency.Delay=function(mk)
 {
  return function(c)
  {
   try
   {
    (mk(null))(c);
   }
   catch(e)
   {
    c.k({
     $:1,
     $0:e
    });
   }
  };
 };
 Concurrency.Bind=function(r,f)
 {
  return Concurrency.checkCancel(function(c)
  {
   r(AsyncBody.New(function(a)
   {
    var x;
    if(a.$==0)
     {
      x=a.$0;
      Concurrency.scheduler().Fork(function()
      {
       try
       {
        (f(x))(c);
       }
       catch(e)
       {
        c.k({
         $:1,
         $0:e
        });
       }
      });
     }
    else
     Concurrency.scheduler().Fork(function()
     {
      c.k(a);
     });
   },c.ct));
  });
 };
 Concurrency.Zero=function()
 {
  SC$10.$cctor();
  return SC$10.Zero;
 };
 Concurrency.Start=function(c,ctOpt)
 {
  var ct,d;
  ct=(d=(Concurrency.defCTS())[0],ctOpt==null?d:ctOpt.$0);
  Concurrency.scheduler().Fork(function()
  {
   if(!ct.c)
    c(AsyncBody.New(function(a)
    {
     if(a.$==1)
      Concurrency.UncaughtAsyncError(a.$0);
    },ct));
  });
 };
 Concurrency.Return=function(x)
 {
  return function(c)
  {
   c.k({
    $:0,
    $0:x
   });
  };
 };
 Concurrency.scheduler=function()
 {
  SC$10.$cctor();
  return SC$10.scheduler;
 };
 Concurrency.checkCancel=function(r)
 {
  return function(c)
  {
   if(c.ct.c)
    Concurrency.cancel(c);
   else
    r(c);
  };
 };
 Concurrency.defCTS=function()
 {
  SC$10.$cctor();
  return SC$10.defCTS;
 };
 Concurrency.UncaughtAsyncError=function(e)
 {
  console.log("WebSharper: Uncaught asynchronous exception",e);
 };
 Concurrency.FromContinuations=function(subscribe)
 {
  return function(c)
  {
   var continued;
   function once(cont)
   {
    if(continued[0])
     Operators.FailWith("A continuation provided by Async.FromContinuations was invoked multiple times");
    else
     {
      continued[0]=true;
      Concurrency.scheduler().Fork(cont);
     }
   }
   continued=[false];
   subscribe(function(a)
   {
    once(function()
    {
     c.k({
      $:0,
      $0:a
     });
    });
   },function(e)
   {
    once(function()
    {
     c.k({
      $:1,
      $0:e
     });
    });
   },function(e)
   {
    once(function()
    {
     c.k({
      $:2,
      $0:e
     });
    });
   });
  };
 };
 Concurrency.cancel=function(c)
 {
  c.k({
   $:2,
   $0:new OperationCanceledException.New(c.ct)
  });
 };
 Dyn.New=function(DynElem,DynFlags,DynNodes,OnAfterRender)
 {
  var $1;
  $1={
   DynElem:DynElem,
   DynFlags:DynFlags,
   DynNodes:DynNodes
  };
  Runtime$1.SetOptional($1,"OnAfterRender",OnAfterRender);
  return $1;
 };
 SC$5.$cctor=function()
 {
  SC$5.$cctor=Global.ignore;
  SC$5.counter=0;
 };
 Attribute=TemplateHoleModule.Attribute=Runtime$1.Class({
  get_Value:function()
  {
   return this.fillWith;
  },
  get_Name:function()
  {
   return this.name;
  }
 },TemplateHole,Attribute);
 Event$2=TemplateHoleModule.Event=Runtime$1.Class({
  get_Value:function()
  {
   return this.fillWith;
  },
  get_Name:function()
  {
   return this.name;
  }
 },TemplateHole,Event$2);
 AfterRender=TemplateHoleModule.AfterRender=Runtime$1.Class({
  get_Value:function()
  {
   return this.fillWith;
  },
  get_Name:function()
  {
   return this.name;
  }
 },TemplateHole,AfterRender);
 AfterRenderQ=TemplateHoleModule.AfterRenderQ=Runtime$1.Class({
  get_Value:function()
  {
   return this.fillWith;
  },
  get_Name:function()
  {
   return this.name;
  }
 },TemplateHole,AfterRenderQ);
 Array.TreeReduce=function(defaultValue,reduction,array)
 {
  var l;
  function loop(off)
  {
   return function(len)
   {
    var $1,l2;
    switch(len<=0?0:len===1?off>=0&&off<l?1:($1=len,2):($1=len,2))
    {
     case 0:
      return defaultValue;
     case 1:
      return Arrays.get(array,off);
     case 2:
      l2=len/2>>0;
      return reduction((loop(off))(l2),(loop(off+l2))(len-l2));
    }
   };
  }
  l=Arrays.length(array);
  return(loop(0))(l);
 };
 Array.mapInPlace=function(f,arr)
 {
  var i,$1;
  for(i=0,$1=arr.length-1;i<=$1;i++)arr[i]=f(arr[i]);
  return arr;
 };
 Array.ofSeqNonCopying=function(xs)
 {
  var q,o;
  if(xs instanceof Global.Array)
   return xs;
  else
   if(xs instanceof T$1)
    return Arrays.ofList(xs);
   else
    if(xs===null)
     return[];
    else
     {
      q=[];
      o=Enumerator.Get(xs);
      try
      {
       while(o.MoveNext())
        q.push(o.Current());
       return q;
      }
      finally
      {
       if(typeof o=="object"&&"Dispose"in o)
        o.Dispose();
      }
     }
 };
 Array.MapTreeReduce=function(mapping,defaultValue,reduction,array)
 {
  var l;
  function loop(off)
  {
   return function(len)
   {
    var $1,l2;
    switch(len<=0?0:len===1?off>=0&&off<l?1:($1=len,2):($1=len,2))
    {
     case 0:
      return defaultValue;
     case 1:
      return mapping(Arrays.get(array,off));
     case 2:
      l2=len/2>>0;
      return reduction((loop(off))(l2),(loop(off+l2))(len-l2));
    }
   };
  }
  l=Arrays.length(array);
  return(loop(0))(l);
 };
 Updates=UI.Updates=Runtime$1.Class({},null,Updates);
 Updates.Create=function(v)
 {
  var _var;
  _var=null;
  _var=Updates.New(v,null,function()
  {
   var c;
   c=_var.s;
   return c===null?(c=Snap.Copy(_var.c()),_var.s=c,Snap.WhenObsoleteRun(c,function()
   {
    _var.s=null;
   }),c):c;
  });
  return _var;
 };
 Updates.New=function(Current,Snap$1,VarView)
 {
  return new Updates({
   c:Current,
   s:Snap$1,
   v:VarView
  });
 };
 ValueCollection=Collections.ValueCollection=Runtime$1.Class({
  GetEnumerator:function()
  {
   return Enumerator.Get(Seq.map(function(kvp)
   {
    return kvp.V;
   },this.d));
  }
 },Obj,ValueCollection);
 ValueCollection.New=Runtime$1.Ctor(function(d)
 {
  Obj.New.call(this);
  this.d=d;
 },ValueCollection);
 RunState.New=function(PreviousNodes,Top)
 {
  return{
   PreviousNodes:PreviousNodes,
   Top:Top
  };
 };
 NodeSet.get_Empty=function()
 {
  return{
   $:0,
   $0:new HashSet.New$3()
  };
 };
 NodeSet.FindAll=function(doc)
 {
  var q;
  function recF(recI,$1)
  {
   var x,b,a,el,em;
   while(true)
    switch(recI)
    {
     case 0:
      if($1!=null&&$1.$==0)
       {
        b=$1.$1;
        a=$1.$0;
        recF(0,a);
        $1=b;
       }
      else
       if($1!=null&&$1.$==1)
        {
         el=$1.$0;
         $1=el;
         recI=1;
        }
       else
        if($1!=null&&$1.$==2)
         {
          em=$1.$0;
          $1=em.Current;
         }
        else
         return $1!=null&&$1.$==6?(x=$1.$0.Holes,(function(a$1)
         {
          return function(a$2)
          {
           Arrays.iter(a$1,a$2);
          };
         }(loopEN))(x)):null;
      break;
     case 1:
      q.push($1);
      $1=$1.Children;
      recI=0;
      break;
    }
  }
  function loop(node)
  {
   return recF(0,node);
  }
  function loopEN(el)
  {
   return recF(1,el);
  }
  q=[];
  loop(doc);
  return{
   $:0,
   $0:new HashSet.New$2(q)
  };
 };
 NodeSet.Filter=function(f,a)
 {
  return{
   $:0,
   $0:HashSet$1.Filter(f,a.$0)
  };
 };
 NodeSet.Except=function(a,a$1)
 {
  return{
   $:0,
   $0:HashSet$1.Except(a.$0,a$1.$0)
  };
 };
 NodeSet.ToArray=function(a)
 {
  return HashSet$1.ToArray(a.$0);
 };
 NodeSet.Intersect=function(a,a$1)
 {
  return{
   $:0,
   $0:HashSet$1.Intersect(a.$0,a$1.$0)
  };
 };
 Anims.UseAnimations=function()
 {
  SC$8.$cctor();
  return SC$8.UseAnimations;
 };
 Anims.Actions=function(a)
 {
  return Anims.ConcatActions(Arrays.choose(function(a$1)
  {
   return a$1.$==1?{
    $:1,
    $0:a$1.$0
   }:null;
  },AppendList.ToArray(a.$0)));
 };
 Anims.Finalize=function(a)
 {
  Arrays.iter(function(a$1)
  {
   if(a$1.$==0)
    a$1.$0();
  },AppendList.ToArray(a.$0));
 };
 Anims.ConcatActions=function(xs)
 {
  var xs$1,m,dur,xs$2;
  xs$1=Array.ofSeqNonCopying(xs);
  m=Arrays.length(xs$1);
  return m===0?Anims.Const():m===1?Arrays.get(xs$1,0):(dur=Seq.max(Seq.map(function(anim)
  {
   return anim.Duration;
  },xs$1)),(xs$2=Arrays.map(function(x)
  {
   return Anims.Prolong(dur,x);
  },xs$1),Anims.Def(dur,function(t)
  {
   Arrays.iter(function(anim)
   {
    anim.Compute(t);
   },xs$2);
  })));
 };
 Anims.List=function(a)
 {
  return a.$0;
 };
 Anims.Const=function(v)
 {
  return Anims.Def(0,function()
  {
   return v;
  });
 };
 Anims.Def=function(d,f)
 {
  return{
   Compute:f,
   Duration:d
  };
 };
 Anims.Prolong=function(nextDuration,anim)
 {
  var comp,dur,last;
  comp=anim.Compute;
  dur=anim.Duration;
  last=Lazy.Create(function()
  {
   return anim.Compute(anim.Duration);
  });
  return{
   Compute:function(t)
   {
    return t>=dur?last.f():comp(t);
   },
   Duration:nextDuration
  };
 };
 SC$6.$cctor=function()
 {
  SC$6.$cctor=Global.ignore;
  SC$6.BatchUpdatesEnabled=true;
 };
 Tree.New=function(Node$1,Left,Right,Height,Count)
 {
  return{
   Node:Node$1,
   Left:Left,
   Right:Right,
   Height:Height,
   Count:Count
  };
 };
 Pair=Collections.Pair=Runtime$1.Class({
  Equals:function(other)
  {
   return Unchecked.Equals(this.Key,other.Key);
  },
  GetHashCode:function()
  {
   return Unchecked.Hash(this.Key);
  },
  CompareTo0:function(other)
  {
   return Unchecked.Compare(this.Key,other.Key);
  }
 },null,Pair);
 Pair.New=function(Key,Value)
 {
  return new Pair({
   Key:Key,
   Value:Value
  });
 };
 SC$7.$cctor=function()
 {
  var table;
  SC$7.$cctor=Global.ignore;
  SC$7.rxhtmlTag=new Global.RegExp("<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\\w:]+)[^>]*)\\/>","gi");
  SC$7.rtagName=new Global.RegExp("<([\\w:]+)");
  SC$7.rhtml=new Global.RegExp("<|&#?\\w+;");
  SC$7.wrapMap=(table=[1,"<table>","</table>"],{
   option:[1,"<select multiple='multiple'>","</select>"],
   legend:[1,"<fieldset>","</fieldset>"],
   area:[1,"<map>","</map>"],
   param:[1,"<object>","</object>"],
   thead:table,
   tbody:table,
   tfoot:table,
   tr:[2,"<table><tbody>","</tbody></table>"],
   col:[2,"<table><colgroup>","</colgoup></table>"],
   td:[3,"<table><tbody><tr>","</tr></tbody></table>"]
  });
  SC$7.defaultWrap=[0,"",""];
 };
 Queue.Clear=function(a)
 {
  a.splice(0,Arrays.length(a));
 };
 HashSetUtil.concat=function(o)
 {
  var r,k;
  r=[];
  for(var k$1 in o)r.push.apply(r,o[k$1]);
  return r;
 };
 SC$8.$cctor=function()
 {
  SC$8.$cctor=Global.ignore;
  SC$8.CubicInOut=Easing.Custom(function(t)
  {
   var t2;
   t2=t*t;
   return 3*t2-2*(t2*t);
  });
  SC$8.UseAnimations=true;
 };
 AppendList.Append=function(x,y)
 {
  return x.$==0?y:y.$==0?x:{
   $:2,
   $0:x,
   $1:y
  };
 };
 AppendList.ToArray=function(xs)
 {
  var out;
  function loop(xs$1)
  {
   var y,x;
   while(true)
    if(xs$1.$==1)
     return out.push(xs$1.$0);
    else
     if(xs$1.$==2)
      {
       y=xs$1.$1;
       x=xs$1.$0;
       loop(x);
       xs$1=y;
      }
     else
      return xs$1.$==3?Arrays.iter(function(v)
      {
       out.push(v);
      },xs$1.$0):null;
  }
  out=[];
  loop(xs);
  return out.slice(0);
 };
 AppendList.Concat=function(xs)
 {
  var x;
  x=Array.ofSeqNonCopying(xs);
  return Array.TreeReduce(AppendList.Empty(),AppendList.Append,x);
 };
 AppendList.Empty=function()
 {
  SC$11.$cctor();
  return SC$11.Empty;
 };
 MapUtil.fromSeq=function(s)
 {
  var a;
  a=Arrays.ofSeq(Seq.map(function($1)
  {
   return Pair.New($1[0],$1[1]);
  },Seq.distinctBy(function(t)
  {
   return t[0];
  },Seq.rev(s))));
  Arrays.sortInPlace(a);
  return BalancedTree.Build(a,0,a.length-1);
 };
 Scheduler=Concurrency.Scheduler=Runtime$1.Class({
  Fork:function(action)
  {
   var $this;
   $this=this;
   this.robin.push(action);
   if(this.idle)
    {
     this.idle=false;
     Global.setTimeout(function()
     {
      $this.tick();
     },0);
    }
  },
  tick:function()
  {
   var loop,$this,t;
   $this=this;
   t=Date.now();
   loop=true;
   while(loop)
    if(this.robin.length===0)
     {
      this.idle=true;
      loop=false;
     }
    else
     {
      (this.robin.shift())();
      Date.now()-t>40?(Global.setTimeout(function()
      {
       $this.tick();
      },0),loop=false):void 0;
     }
  }
 },Obj,Scheduler);
 Scheduler.New=Runtime$1.Ctor(function()
 {
  Obj.New.call(this);
  this.idle=true;
  this.robin=[];
 },Scheduler);
 PathUtil.WriteLink=function(s,q)
 {
  var query;
  query=q.get_IsEmpty()?"":"?"+PathUtil.WriteQuery(q);
  return"/"+PathUtil.Concat(s)+query;
 };
 PathUtil.Concat=function(xs)
 {
  var sb,start;
  sb=[];
  start=true;
  List.iter(function(x)
  {
   if(!Strings.IsNullOrEmpty(x))
    {
     start?start=false:sb.push("/");
     sb.push(x);
    }
  },xs);
  return Strings.Join("",Arrays.ofSeq(sb));
 };
 PathUtil.WriteQuery=function(q)
 {
  function m(k,v)
  {
   return k+"="+v;
  }
  return Strings.concat("&",Seq.map(function($1)
  {
   return m($1[0],$1[1]);
  },Map.ToSeq(q)));
 };
 KeyNotFoundException=WebSharper.KeyNotFoundException=Runtime$1.Class({},Error,KeyNotFoundException);
 KeyNotFoundException.New=Runtime$1.Ctor(function()
 {
  KeyNotFoundException.New$1.call(this,"The given key was not present in the dictionary.");
 },KeyNotFoundException);
 KeyNotFoundException.New$1=Runtime$1.Ctor(function(message)
 {
  this.message=message;
  Object.setPrototypeOf(this,KeyNotFoundException.prototype);
 },KeyNotFoundException);
 BalancedTree.OfSeq=function(data)
 {
  var a;
  a=Arrays.ofSeq(Seq.distinct(data));
  Arrays.sortInPlace(a);
  return BalancedTree.Build(a,0,a.length-1);
 };
 BalancedTree.Enumerate=function(flip,t)
 {
  function gen(t$1,spine)
  {
   var t$2;
   while(true)
    if(t$1==null)
     return spine.$==1?{
      $:1,
      $0:[spine.$0[0],[spine.$0[1],spine.$1]]
     }:null;
    else
     if(flip)
      {
       t$2=t$1;
       t$1=t$2.Right;
       spine=new T$1({
        $:1,
        $0:[t$2.Node,t$2.Left],
        $1:spine
       });
      }
     else
      {
       t$2=t$1;
       t$1=t$2.Left;
       spine=new T$1({
        $:1,
        $0:[t$2.Node,t$2.Right],
        $1:spine
       });
      }
  }
  return Seq.unfold(function($1)
  {
   return gen($1[0],$1[1]);
  },[t,T$1.Empty]);
 };
 BalancedTree.Build=function(data,min,max)
 {
  var center,left,right;
  return max-min+1<=0?null:(center=(min+max)/2>>0,(left=BalancedTree.Build(data,min,center-1),(right=BalancedTree.Build(data,center+1,max),BalancedTree.Branch(Arrays.get(data,center),left,right))));
 };
 BalancedTree.Branch=function(node,left,right)
 {
  var a,b;
  return Tree.New(node,left,right,1+(a=left==null?0:left.Height,(b=right==null?0:right.Height,Unchecked.Compare(a,b)===1?a:b)),1+(left==null?0:left.Count)+(right==null?0:right.Count));
 };
 BalancedTree.Add=function(x,t)
 {
  return BalancedTree.Put(function($1,$2)
  {
   return $2;
  },x,t);
 };
 BalancedTree.Put=function(combine,k,t)
 {
  var p,t$1;
  p=BalancedTree.Lookup(k,t);
  t$1=p[0];
  return t$1==null?BalancedTree.Rebuild(p[1],BalancedTree.Branch(k,null,null)):BalancedTree.Rebuild(p[1],BalancedTree.Branch(combine(t$1.Node,k),t$1.Left,t$1.Right));
 };
 BalancedTree.Lookup=function(k,t)
 {
  var spine,t$1,loop,m;
  spine=[];
  t$1=t;
  loop=true;
  while(loop)
   if(t$1==null)
    loop=false;
   else
    {
     m=Unchecked.Compare(k,t$1.Node);
     if(m===0)
      loop=false;
     else
      m===1?(spine.unshift([true,t$1.Node,t$1.Left]),t$1=t$1.Right):(spine.unshift([false,t$1.Node,t$1.Right]),t$1=t$1.Left);
    }
  return[t$1,spine];
 };
 BalancedTree.Rebuild=function(spine,t)
 {
  var t$1,i,$1,m,x,l,m$1,x$1,r,m$2;
  function h(x$2)
  {
   return x$2==null?0:x$2.Height;
  }
  t$1=t;
  for(i=0,$1=Arrays.length(spine)-1;i<=$1;i++){
   t$1=(m=Arrays.get(spine,i),m[0]?(x=m[1],(l=m[2],h(t$1)>h(l)+1?h(t$1.Left)===h(t$1.Right)+1?(m$1=t$1.Left,BalancedTree.Branch(m$1.Node,BalancedTree.Branch(x,l,m$1.Left),BalancedTree.Branch(t$1.Node,m$1.Right,t$1.Right))):BalancedTree.Branch(t$1.Node,BalancedTree.Branch(x,l,t$1.Left),t$1.Right):BalancedTree.Branch(x,l,t$1))):(x$1=m[1],(r=m[2],h(t$1)>h(r)+1?h(t$1.Right)===h(t$1.Left)+1?(m$2=t$1.Right,BalancedTree.Branch(m$2.Node,BalancedTree.Branch(t$1.Node,t$1.Left,m$2.Left),BalancedTree.Branch(x$1,m$2.Right,r))):BalancedTree.Branch(t$1.Node,t$1.Left,BalancedTree.Branch(x$1,t$1.Right,r)):BalancedTree.Branch(x$1,t$1,r))));
  }
  return t$1;
 };
 DynamicAttrNode=UI.DynamicAttrNode=Runtime$1.Class({
  NChanged:function()
  {
   return this.updates;
  },
  NGetExitAnim:function(parent)
  {
   return An.get_Empty();
  },
  NGetEnterAnim:function(parent)
  {
   return An.get_Empty();
  },
  NGetChangeAnim:function(parent)
  {
   return An.get_Empty();
  },
  NSync:function(parent)
  {
   if(this.dirty)
    {
     (this.push(parent))(this.value);
     this.dirty=false;
    }
  }
 },Obj,DynamicAttrNode);
 DynamicAttrNode.New=Runtime$1.Ctor(function(view,push)
 {
  var $this;
  $this=this;
  Obj.New.call(this);
  this.push=push;
  this.value=void 0;
  this.dirty=false;
  this.updates=View.Map(function(x)
  {
   $this.value=x;
   $this.dirty=true;
  },view);
 },DynamicAttrNode);
 SC$9.$cctor=function()
 {
  var g,s,g$1,s$1,g$2,s$2,g$3,s$3,g$4,s$4,g$5,s$5,g$6,s$6;
  SC$9.$cctor=Global.ignore;
  SC$9.EmptyAttr=null;
  SC$9.BoolCheckedApply=function(_var)
  {
   function set(el,v)
   {
    return v!=null&&v.$==1?void(el.checked=v.$0):null;
   }
   return[function(el)
   {
    el.addEventListener("change",function()
    {
     return _var.Get()!=el.checked?_var.Set(el.checked):null;
    });
   },function($1)
   {
    return function($2)
    {
     return set($1,$2);
    };
   },View.Map(function(a)
   {
    return{
     $:1,
     $0:a
    };
   },_var.get_View())];
  };
  SC$9.StringSet=function(el)
  {
   return function(s$7)
   {
    el.value=s$7;
   };
  };
  SC$9.StringGet=function(el)
  {
   return{
    $:1,
    $0:el.value
   };
  };
  SC$9.StringApply=(g=BindVar.StringGet(),(s=BindVar.StringSet(),function(v)
  {
   return BindVar.ApplyValue(g,s,v);
  }));
  SC$9.DateTimeSetUnchecked=function(el)
  {
   return function(i)
   {
    el.value=(new Date(i)).toLocaleString();
   };
  };
  SC$9.DateTimeGetUnchecked=function(el)
  {
   var s$7,m,o,m$1;
   s$7=el.value;
   return String.isBlank(s$7)?{
    $:1,
    $0:-8640000000000000
   }:(m=(o=0,[(m$1=DateUtil.TryParse(s$7),m$1!=null&&m$1.$==1&&(o=m$1.$0,true)),o]),m[0]?{
    $:1,
    $0:m[1]
   }:null);
  };
  SC$9.DateTimeApplyUnchecked=(g$1=BindVar.DateTimeGetUnchecked(),(s$1=BindVar.DateTimeSetUnchecked(),function(v)
  {
   return BindVar.ApplyValue(g$1,s$1,v);
  }));
  SC$9.FileSetUnchecked=function()
  {
   return function()
   {
    return null;
   };
  };
  SC$9.FileGetUnchecked=function(el)
  {
   var files;
   files=el.files;
   return{
    $:1,
    $0:Arrays.ofSeq(Seq.delay(function()
    {
     return Seq.map(function(i)
     {
      return files.item(i);
     },Operators.range(0,files.length-1));
    }))
   };
  };
  SC$9.FileApplyUnchecked=(g$2=BindVar.FileGetUnchecked(),(s$2=BindVar.FileSetUnchecked(),function(v)
  {
   return BindVar.FileApplyValue(g$2,s$2,v);
  }));
  SC$9.IntSetUnchecked=function(el)
  {
   return function(i)
   {
    el.value=Global.String(i);
   };
  };
  SC$9.IntGetUnchecked=function(el)
  {
   var s$7,pd;
   s$7=el.value;
   return String.isBlank(s$7)?{
    $:1,
    $0:0
   }:(pd=+s$7,pd!==pd>>0?null:{
    $:1,
    $0:pd
   });
  };
  SC$9.IntApplyUnchecked=(g$3=BindVar.IntGetUnchecked(),(s$3=BindVar.IntSetUnchecked(),function(v)
  {
   return BindVar.ApplyValue(g$3,s$3,v);
  }));
  SC$9.IntSetChecked=function(el)
  {
   return function(i)
   {
    var i$1;
    i$1=i.get_Input();
    return el.value!=i$1?void(el.value=i$1):null;
   };
  };
  SC$9.IntGetChecked=function(el)
  {
   var s$7,m,o;
   s$7=el.value;
   return{
    $:1,
    $0:String.isBlank(s$7)?(el.checkValidity?el.checkValidity():true)?new CheckedInput({
     $:2,
     $0:s$7
    }):new CheckedInput({
     $:1,
     $0:s$7
    }):(m=(o=0,[Numeric.TryParseInt32(s$7,{
     get:function()
     {
      return o;
     },
     set:function(v)
     {
      o=v;
     }
    }),o]),m[0]?new CheckedInput({
     $:0,
     $0:m[1],
     $1:s$7
    }):new CheckedInput({
     $:1,
     $0:s$7
    }))
   };
  };
  SC$9.IntApplyChecked=(g$4=BindVar.IntGetChecked(),(s$4=BindVar.IntSetChecked(),function(v)
  {
   return BindVar.ApplyValue(g$4,s$4,v);
  }));
  SC$9.FloatSetUnchecked=function(el)
  {
   return function(i)
   {
    el.value=Global.String(i);
   };
  };
  SC$9.FloatGetUnchecked=function(el)
  {
   var s$7,pd;
   s$7=el.value;
   return String.isBlank(s$7)?{
    $:1,
    $0:0
   }:(pd=+s$7,Global.isNaN(pd)?null:{
    $:1,
    $0:pd
   });
  };
  SC$9.FloatApplyUnchecked=(g$5=BindVar.FloatGetUnchecked(),(s$5=BindVar.FloatSetUnchecked(),function(v)
  {
   return BindVar.ApplyValue(g$5,s$5,v);
  }));
  SC$9.FloatSetChecked=function(el)
  {
   return function(i)
   {
    var i$1;
    i$1=i.get_Input();
    return el.value!=i$1?void(el.value=i$1):null;
   };
  };
  SC$9.FloatGetChecked=function(el)
  {
   var s$7,i;
   s$7=el.value;
   return{
    $:1,
    $0:String.isBlank(s$7)?(el.checkValidity?el.checkValidity():true)?new CheckedInput({
     $:2,
     $0:s$7
    }):new CheckedInput({
     $:1,
     $0:s$7
    }):(i=+s$7,Global.isNaN(i)?new CheckedInput({
     $:1,
     $0:s$7
    }):new CheckedInput({
     $:0,
     $0:i,
     $1:s$7
    }))
   };
  };
  SC$9.FloatApplyChecked=(g$6=BindVar.FloatGetChecked(),(s$6=BindVar.FloatSetChecked(),function(v)
  {
   return BindVar.ApplyValue(g$6,s$6,v);
  }));
 };
 Easing=UI.Easing=Runtime$1.Class({},Obj,Easing);
 Easing.Custom=function(f)
 {
  return new Easing.New(f);
 };
 Easing.New=Runtime$1.Ctor(function(transformTime)
 {
  Obj.New.call(this);
  this.transformTime=transformTime;
 },Easing);
 AsyncBody.New=function(k,ct)
 {
  return{
   k:k,
   ct:ct
  };
 };
 SC$10.$cctor=function()
 {
  SC$10.$cctor=Global.ignore;
  SC$10.noneCT=CT.New(false,[]);
  SC$10.scheduler=new Scheduler.New();
  SC$10.defCTS=[new CancellationTokenSource.New()];
  SC$10.Zero=Concurrency.Return();
  SC$10.GetCT=function(c)
  {
   c.k({
    $:0,
    $0:c.ct
   });
  };
 };
 CT.New=function(IsCancellationRequested,Registrations)
 {
  return{
   c:IsCancellationRequested,
   r:Registrations
  };
 };
 HashSet$1.Filter=function(ok,set)
 {
  return new HashSet.New$2(Arrays.filter(ok,HashSet$1.ToArray(set)));
 };
 HashSet$1.Except=function(excluded,included)
 {
  var set;
  set=new HashSet.New$2(HashSet$1.ToArray(included));
  set.ExceptWith(HashSet$1.ToArray(excluded));
  return set;
 };
 HashSet$1.ToArray=function(set)
 {
  var arr;
  arr=Arrays.create(set.Count(),void 0);
  set.CopyTo(arr,0);
  return arr;
 };
 HashSet$1.Intersect=function(a,b)
 {
  var set;
  set=new HashSet.New$2(HashSet$1.ToArray(a));
  set.IntersectWith(HashSet$1.ToArray(b));
  return set;
 };
 BindVar.ApplyValue=function(get,set,_var)
 {
  var expectedValue;
  function f(a,o)
  {
   return o==null?null:a(o.$0);
  }
  expectedValue=null;
  return[function(el)
  {
   function onChange()
   {
    _var.UpdateMaybe(function(v)
    {
     var $1;
     expectedValue=get(el);
     return expectedValue!=null&&expectedValue.$==1&&(!Unchecked.Equals(expectedValue.$0,v)&&($1=[expectedValue,expectedValue.$0],true))?$1[0]:null;
    });
   }
   el.addEventListener("change",onChange);
   el.addEventListener("input",onChange);
   el.addEventListener("keypress",onChange);
  },function(x)
  {
   var $1;
   $1=set(x);
   return function($2)
   {
    return f($1,$2);
   };
  },View.Map(function(v)
  {
   var $1;
   return expectedValue!=null&&expectedValue.$==1&&(Unchecked.Equals(expectedValue.$0,v)&&($1=expectedValue.$0,true))?null:{
    $:1,
    $0:v
   };
  },_var.get_View())];
 };
 BindVar.StringSet=function()
 {
  SC$9.$cctor();
  return SC$9.StringSet;
 };
 BindVar.StringGet=function()
 {
  SC$9.$cctor();
  return SC$9.StringGet;
 };
 BindVar.DateTimeSetUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.DateTimeSetUnchecked;
 };
 BindVar.DateTimeGetUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.DateTimeGetUnchecked;
 };
 BindVar.FileApplyValue=function(get,set,_var)
 {
  var expectedValue;
  function f(a,o)
  {
   return o==null?null:a(o.$0);
  }
  expectedValue=null;
  return[function(el)
  {
   el.addEventListener("change",function()
   {
    _var.UpdateMaybe(function(v)
    {
     var $1;
     expectedValue=get(el);
     return expectedValue!=null&&expectedValue.$==1&&(expectedValue.$0!==v&&($1=[expectedValue,expectedValue.$0],true))?$1[0]:null;
    });
   });
  },function(x)
  {
   var $1;
   $1=set(x);
   return function($2)
   {
    return f($1,$2);
   };
  },View.Map(function(v)
  {
   var $1;
   return expectedValue!=null&&expectedValue.$==1&&(Unchecked.Equals(expectedValue.$0,v)&&($1=expectedValue.$0,true))?null:{
    $:1,
    $0:v
   };
  },_var.get_View())];
 };
 BindVar.FileSetUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.FileSetUnchecked;
 };
 BindVar.FileGetUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.FileGetUnchecked;
 };
 BindVar.IntSetUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.IntSetUnchecked;
 };
 BindVar.IntGetUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.IntGetUnchecked;
 };
 BindVar.IntSetChecked=function()
 {
  SC$9.$cctor();
  return SC$9.IntSetChecked;
 };
 BindVar.IntGetChecked=function()
 {
  SC$9.$cctor();
  return SC$9.IntGetChecked;
 };
 BindVar.FloatSetUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.FloatSetUnchecked;
 };
 BindVar.FloatGetUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.FloatGetUnchecked;
 };
 BindVar.FloatSetChecked=function()
 {
  SC$9.$cctor();
  return SC$9.FloatSetChecked;
 };
 BindVar.FloatGetChecked=function()
 {
  SC$9.$cctor();
  return SC$9.FloatGetChecked;
 };
 BindVar.StringApply=function()
 {
  SC$9.$cctor();
  return SC$9.StringApply;
 };
 BindVar.FloatApplyUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.FloatApplyUnchecked;
 };
 BindVar.BoolCheckedApply=function()
 {
  SC$9.$cctor();
  return SC$9.BoolCheckedApply;
 };
 BindVar.DateTimeApplyUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.DateTimeApplyUnchecked;
 };
 BindVar.FileApplyUnchecked=function()
 {
  SC$9.$cctor();
  return SC$9.FileApplyUnchecked;
 };
 String.isBlank=function(s)
 {
  return Strings.forall(Char.IsWhiteSpace,s);
 };
 CheckedInput=UI.CheckedInput=Runtime$1.Class({
  get_Input:function()
  {
   return this.$==1?this.$0:this.$==2?this.$0:this.$1;
  }
 },null,CheckedInput);
 CancellationTokenSource=WebSharper.CancellationTokenSource=Runtime$1.Class({},Obj,CancellationTokenSource);
 CancellationTokenSource.New=Runtime$1.Ctor(function()
 {
  Obj.New.call(this);
  this.c=false;
  this.pending=null;
  this.r=[];
  this.init=1;
 },CancellationTokenSource);
 DomNodes.Children=function(elem,delims)
 {
  var n,o,a;
  if(delims!=null&&delims.$==1)
   {
    a=[];
    n=delims.$0[0].nextSibling;
    while(n!==delims.$0[1])
     {
      a.push(n);
      n=n.nextSibling;
     }
    return{
     $:0,
     $0:a
    };
   }
  else
   return{
    $:0,
    $0:Arrays.init(elem.childNodes.length,(o=elem.childNodes,function(a$1)
    {
     return o[a$1];
    }))
   };
 };
 DomNodes.Except=function(a,a$1)
 {
  var excluded;
  excluded=a.$0;
  return{
   $:0,
   $0:Arrays.filter(function(n)
   {
    return Arrays.forall(function(k)
    {
     return!(n===k);
    },excluded);
   },a$1.$0)
  };
 };
 DomNodes.Iter=function(f,a)
 {
  Arrays.iter(f,a.$0);
 };
 DomNodes.DocChildren=function(node)
 {
  var q;
  function loop(doc)
  {
   var x,d,b,a;
   while(true)
    {
     if(doc!=null&&doc.$==2)
      {
       d=doc.$0;
       doc=d.Current;
      }
     else
      if(doc!=null&&doc.$==1)
       return q.push(doc.$0.El);
      else
       if(doc==null)
        return null;
       else
        if(doc!=null&&doc.$==5)
         return q.push(doc.$0);
        else
         if(doc!=null&&doc.$==4)
          return q.push(doc.$0.Text);
         else
          if(doc!=null&&doc.$==6)
           {
            x=doc.$0.Els;
            return(function(a$1)
            {
             return function(a$2)
             {
              Arrays.iter(a$1,a$2);
             };
            }(function(a$1)
            {
             if(a$1==null||a$1.constructor===Object)
              loop(a$1);
             else
              q.push(a$1);
            }))(x);
           }
          else
           {
            b=doc.$1;
            a=doc.$0;
            loop(a);
            doc=b;
           }
    }
  }
  q=[];
  loop(node.Children);
  return{
   $:0,
   $0:Array.ofSeqNonCopying(q)
  };
 };
 Char.IsWhiteSpace=function(c)
 {
  return c.match(new Global.RegExp("\\s"))!==null;
 };
 DateUtil.TryParse=function(s)
 {
  var d;
  d=Date.parse(s);
  return Global.isNaN(d)?null:{
   $:1,
   $0:d
  };
 };
 Numeric.TryParse=function(s,min,max,r)
 {
  var x,ok;
  x=+s;
  ok=x===x-x%1&&x>=min&&x<=max;
  if(ok)
   r.set(x);
  return ok;
 };
 OperationCanceledException=WebSharper.OperationCanceledException=Runtime$1.Class({},Error,OperationCanceledException);
 OperationCanceledException.New=Runtime$1.Ctor(function(ct)
 {
  OperationCanceledException.New$1.call(this,"The operation was canceled.",null,ct);
 },OperationCanceledException);
 OperationCanceledException.New$1=Runtime$1.Ctor(function(message,inner,ct)
 {
  this.message=message;
  this.inner=inner;
  Object.setPrototypeOf(this,OperationCanceledException.prototype);
  this.ct=ct;
 },OperationCanceledException);
 Lazy.Create=function(f)
 {
  return LazyRecord.New(false,f,Lazy.forceLazy);
 };
 Lazy.forceLazy=function()
 {
  var v;
  v=this.v();
  this.c=true;
  this.v=v;
  this.f=Lazy.cachedLazy;
  return v;
 };
 Lazy.cachedLazy=function()
 {
  return this.v;
 };
 SC$11.$cctor=function()
 {
  SC$11.$cctor=Global.ignore;
  SC$11.Empty={
   $:0
  };
 };
 LazyRecord.New=function(created,evalOrVal,force)
 {
  return{
   c:created,
   v:evalOrVal,
   f:force
  };
 };
 Runtime$1.OnLoad(function()
 {
  App.Main();
 });
}(self));


if (typeof WebSharper !=='undefined') {
  WebSharper.Runtime.ScriptBasePath = '/Content/';
  WebSharper.Runtime.Start();
}
