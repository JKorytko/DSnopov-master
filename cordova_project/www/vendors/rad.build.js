/**
 * RAD.js
 * v.0.93b development version
 * Mobidev.biz
 * Date: 02/18/14
 */

(function (document, window) {
    var defaultOptions = {
        defaultBackstack: false,
        backstackType: 'custom',
        defaultAnimation: 'slide',
        animationTimeout: 3000,
        debug: false
    };

    // Core Utils
    // ----------

    function execute(func, args, context) {
        if (typeof func !== "function") {
            return;
        }
        if (context && context instanceof Object) {
            func.apply(context, args);
        } else {
            func(args);
        }
    }

    function isArray(value) {
        return (Object.prototype.toString.call(value) === '[object Array]');
    }

    /**
     *
     * registers namespace and places object there OR return existing one
     * @param {string} destination
     * @param {object} [obj]
     *
     * */

    function namespace(destination, obj) {
        if (typeof destination != 'string') {
            throw new Error('Can\'t create namespace, destination or object specified incorrectly.');
        }
        var parts = destination.split('.'),
            parent = window.RAD,
            pl,
            i;
        if (parts[0] === "RAD") {
            parts = parts.slice(1);
        }
        pl = parts.length;
        for (i = 0; i < pl; i += 1) {
            //create a property if it doesn't exist
            if (parent[parts[i]] === undefined) {
                if (i === pl - 1) {
                    parent[parts[i]] = obj;
                } else {
                    parent[parts[i]] = {};
                }
            }
            parent = parent[parts[i]];
        }
        return parent;
    }

    function ScriptLoader() {
        var loader = this,
            isLoaded = false;

        function loadScript(url, checkCallback) {

            if (!url || typeof url != 'string') {
                throw new Error('Can\'t load script, URL is incorrect');
            }

            var script = document.createElement("script");

            script.type = "text/javascript";
            script.async = true;

            if (script.readyState) {  //IE
                script.onreadystatechange = function () {
                    if (script.readyState === "loaded" || script.readyState === "complete") {
                        script.onreadystatechange = null;
                        checkCallback();
                    }
                };
            } else {
                script.onload = checkCallback;
                script.onerror = checkCallback;
            }

            script.src = url;
            document.head.appendChild(script);
        }

        function loadArray(urls, callback, context) {
            var i, l = urls.length, counter = 0;

            loader.arr = null;
            loader.callback = null;
            loader.context = null;

            function check() {
                counter += 1;
                if (counter === l) {
                    execute(callback, null, context);
                }
            }

            for (i = 0; i < l; i += 1) {
                loadScript(urls[i], check);
            }
        }

        function onLoad() {
            isLoaded = true;
            loader.loadScripts = loadArray;
            if (loader.arr && loader.callback) {
                loader.loadScripts(loader.arr, loader.callback, loader.context);
            }
        }

        loader.loadScripts = function (urls, callback, context) {
            loader.arr = urls;
            loader.callback = callback;
            loader.context = context;
        };

        if (window.attachEvent) {
            window.attachEvent('onload', onLoad);
        } else {
            window.addEventListener('load', onLoad, false);
        }

        return loader;
    }

    function closest(element, className) {
        var result, el;
        el = element;

        while (!result && el != null) {
            if (el.classList && el.classList.contains(className)) {
                result = el;
            } else if (el.className && el.className.indexOf(className) >= 0){
                result = el; // old browsers support
            }
            el = el.parentNode;
        }

        return result;
    }

    function preventBodyTouch(e) {
        var tracker = this.scrollTracker;
        if (!tracker.scrollView || (tracker.scrollRequest && ((e.touches[0].screenY > tracker.startIOSTouch && tracker.scrollView.scrollTop === 0) || (tracker.scrollView.scrollTop >= tracker.scrollEnd && e.touches[0].screenY < tracker.startIOSTouch)))) {
            e.preventDefault();
        }
        tracker = null;
    }

    function startBodyTouch(e) {
        var tracker = this.scrollTracker = this.scrollTracker || {};

        tracker.scrollView = closest(e.target, 'native-scroll');
        tracker.scrollRequest = false;
        if (!!tracker.scrollView && tracker.scrollView.firstElementChild) {
            tracker.startIOSTouch = e.touches[0].screenY;
            tracker.scrollRequest = true;
            tracker.scrollEnd = tracker.scrollView.firstElementChild.offsetHeight - tracker.scrollView.offsetHeight;
        }
        tracker = null;
    }

    function prepareEnvironment(options) {
        var isIOS = navigator.userAgent.match(/(iPad|iPhone|iPod|iOS)/gi) ? true : false,
            isAndroid = (/android/gi).test(window.navigator.appVersion);

        options = options || {};

        if (options.scrollBounce === undefined) {
            options.scrollBounce = true;
        }

        _.templateSettings = options.templateSettings || {
            evaluate: /\{\{#([\s\S]+?)\}\}/g,
            interpolate: /\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,
            escape: /\{\{\{([\s\S]+?)\}\}\}/g
        };

        if (isIOS) {
            // Prevent window bounce while scrolling
            if (options.scrollBounce) {
//                window.addEventListener('touchstart', startBodyTouch, false);
//                window.addEventListener('touchmove', preventBodyTouch, false);
            }

            window.document.body.className += ' ios';
        } else if (isAndroid) {
            window.document.body.className += ' android';
        }
    }

    /**
     *
     * @param {string} modelID
     * @param {function} [model] - constructor
     * @param {boolean} [instantiate] - should the constructor be written to namespace or an instance of it (application-level model)
     *
     * */

    function modelMethod(modelID, model, instantiate) {
        var modelInstance = model, id = modelID;
        if (typeof model === 'function' && (instantiate === undefined || instantiate === true)) {
            modelInstance = new model();
        }

        if (modelID.indexOf('RAD.models.') === -1) {
            id = 'RAD.models.' + modelID;
        }

        return namespace(id, modelInstance);
    }

    /**
     *
     * @param {function} application - constructor
     * @param {boolean} instantiate - should the constructor be written to namespace or an instance of it
     *
     * */

    function registerApp(application, instantiate) {
        var app = application;
        if (typeof application === 'function' && (instantiate === undefined || instantiate === true)) {
            app = new application(window.RAD.core);
        }
        RAD.application = app;
        return app;
    }

    // Publisher/Subscriber
    // ------------------

    function PubSub() {
        var channels = {}, sticky = {}, debug = false, separator = '.';

        function log() {
            if (debug) {
                window.console.log.apply(null, arguments);
            }
        }
        function isObject(testObj) {
            return Object.prototype.toString.call(testObj) === '[object Object]';
        }
        function generateQuickGuid() {
            return Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);
        }

        // Returns function which logic depends on passed arguments values.
        function createChecker(callback, contextObject) {
            if (callback && contextObject) {

                // compare by matching with both callback and context
                return function(subscriber, fn, context) {
                    return subscriber.callback === fn && subscriber.context === context;
                };
            }
            if (typeof callback === 'function') {

                // compare only by callback
                return function(subscriber, fn) {
                    return subscriber.callback === fn;
                };
            }
            // if only one parameter passed
            if (isObject(callback)) {

                // compare only by context
                return function(subscriber, context) {
                    return subscriber.context === context;
                };
            }

            return function() {};
        }

        return {

            printLog: function (flag) {
                debug = flag;
                return this;
            },

            channels: function() {
                return channels;
            },

            setSeparator: function (sprtr) {
                separator = sprtr;
                return this;
            },

            /**
             *
             * @param {string} channel  - channel to publish message, example - "network.getData"
             * @param [data] - any type of data
             * @param {string} [type]
             *
             * */

            publish: function (channel, data, type) {
                var index, i, l, length, subscription, receiver, parts = channel.split(separator), currentChannel;

                log(this.radID + " publish:", arguments);

                //attach sticky message
                if (type === "sticky") {
                    sticky[channel] = arguments;
                }

                //post message
                for (index = 0, length = parts.length; index < length; index += 1) {
                    currentChannel = parts.slice(0, index + 1).join(separator);
                    if (channels[currentChannel]) {
                        for (i = 0, l = channels[currentChannel].length; i < l; i += 1) {
                            subscription = channels[currentChannel][i];
                            subscription.callback.apply(subscription.context, arguments);
                            receiver = subscription.context.options || subscription.context;
                            log("receiver:" + receiver.radID + " channel:" + currentChannel, arguments);
                        }
                    }
                }

                return this;
            },

            /**
             *
             * @param {string} channel - channel to publish message, example - "network.getData"
             * @param {function} fn - callback
             * @param {object} context - context for callback
             *
             * */

            subscribe: function (channel, fn, context) {

                if (!channel || typeof channel != 'string') {
                    throw new Error('Can\'t subscribe to channel, incorrect channel name');
                }

                if (typeof fn != 'function') {
                    throw new Error('Can\'t subscribe to channel, callback is not a function');
                }

                var cntx = context || this,
                    parts = channel.split(separator),
                    index, length, currentChannel;

                channels[channel] = channels[channel] || [];
                channels[channel].push({ context: cntx, callback: fn});

                log("subscribe to channel:" + channel, arguments);

                //post sticky messages
                for (index = 0, length = parts.length; index < length; index += 1) {
                    currentChannel = parts.slice(0, index + 1).join(separator);
                    if (sticky[currentChannel]) {
                        fn.apply(cntx, sticky[currentChannel]);
                    }
                }

                return this;
            },
            /**
             * - .unsubscribe('some.channel', callback, context) - remove subscribers from 'some.channel', which was
             * registered with the same callback and context;
             * - .unsubscribe('some.channel', callback) - remove subscribers which have the same callback but no matter what context;
             * - .unsubscribe('some.channel', context)  - remove all subscribers form 'some.channel', which match context;
             * - .unsubscribe(context) - remove all subscribers which have the same context from all channels;
             */
            unsubscribe: function (channel, fn, context) {
                var index,
                    subscribers,
                    channelName,
                    checkSubscriber;

                if (arguments.length == 0) {
                    return false;
                }

                // Remove subscriber from specific channel
                if (typeof channel === 'string' && channels[channel]) {

                    // Remove all subscribers from channel
                    if (!fn && !context) {
                        delete channels[channel];
                        return false;
                    }

                    // create check function which logic depends on passed arguments values
                    checkSubscriber = createChecker(fn, context);
                    subscribers = channels[channel];
                    index = subscribers.length;

                    while (index--) {
                        // Remove matched subscribers
                        if (checkSubscriber(subscribers[index], fn, context)) {
                            subscribers.splice(index, 1);
                        }
                    }
                    if (!channels[channel].length) {
                        delete channels[channel];
                    }
                    return false;
                }

                // Remove all subscribers with specified context if it was passed as a single argument.
                if (isObject(channel)) {
                    context = channel;
                    for (channelName in channels) {
                        if (channels.hasOwnProperty(channelName)) {

                            subscribers = channels[channelName];
                            index = subscribers.length;
                            while (index--) {
                                if (subscribers[index].context === context) {
                                    subscribers.splice(index, 1);
                                }
                            }
                            // remove channel if it empty
                            if (!subscribers.length) {
                                delete channels[channelName];
                            }
                        }
                    }

                }

            }
        };
    }

    // ServiceLocator
    // --------------

    function ServiceLocator() {
        var servicesWrap = {},
            serviceMixin,
            debug = false;

        function log() {
            if (debug) {
                window.console.log(arguments);
            }
        }

        function mix(object) {
            var mixins = Array.prototype.slice.call(arguments, 1), key, i;
            object.__mixins = [];
            for (i = 0; i < mixins.length; ++i) {
                for (key in mixins[i]) {
                    if (object[key] === undefined) {
                        object[key] = mixins[i][key];
                        object.__mixins.push(key);
                    }
                }
            }
        }

        function invoke(Constr, mixin, args) {
            var instance;

            function Temp(mixins) {
                var i, key;
                if (!mixins) return this;
                this.__mixins = [];
                for (i = 0; i < mixins.length; ++i) {
                    for (key in mixins[i]) {
                        this[key] = mixin[i][key];
                        this.__mixins.push(key);
                    }
                }
            }

            Temp.prototype = Constr.prototype;
            Constr.prototype = new Temp(mixin);
            instance = new Constr(args);
            Constr.prototype = Temp.prototype;

            return instance;
        }

        function deleteProp(object, propList) {
            var j;

            if (!object || propList.recursion > 1000) return;

            propList.recursion += 1;
            if (object.hasOwnProperty('__mixins')) {
                for (j = 0; j < propList.length; j++) {
                    delete object[propList[j]];
                }
                delete object.__mixins;
            } else {
                deleteProp(Object.getPrototypeOf(object), propList);
            }
        }

        function unmix(object) {
            object.__mixins.recursion = 0;
            deleteProp(object, object.__mixins);

            return object;
        }

        function createObj(id) {
            log("create: " + id);
            return servicesWrap[id].instance = invoke(servicesWrap[id].creator, [
                {radID: id},
                serviceMixin
            ]);
        }

        return {

            printLog: function (flag) {
                debug = flag;
                return this;
            },

            setMixin: function (obj) {
                serviceMixin = obj;
                return this;
            },

            getLocator: function() {
                return servicesWrap;
            },

            register: function (value, obj, instantiate) {

                function track(id){
                    if (servicesWrap[id] === undefined) {
                        if (typeof obj === "function" && (instantiate === true || instantiate === undefined)) {
                            servicesWrap[id] = {
                                creator: obj
                            };
                        } else {
                            mix(obj, {radID: id}, serviceMixin);
                            servicesWrap[id] = {
                                instance: obj
                            };
                        }
                    } else {
                        log('You try register already registered module:' + id + '!');
                    }
                }

                if (Object.prototype.toString.call(value) === '[object Array]') {
                    for(var i = value.length - 1; i > -1; i--){
                        track(value[i]);
                    }
                } else {
                    track(value);
                }
                return this;
            },

            registerAll: function (arrayOfServices) {
                var i, service, radID, obj, instantiate;

                for (i = 0; i < arrayOfServices.length; ++i) {
                    service = arrayOfServices[i];
                    radID = service.radID || service.ID || service.id;
                    obj = service.service || service.obj || service.object || service.creator;
                    instantiate = (service.instantiate !== undefined) ? !!service.instantiate : true;
                    this.register(radID, obj, instantiate);
                }
                return this;
            },

            get: function (id) {
                if (servicesWrap[id] === undefined) {
                    log('Error - ' + id + ' is not registered!');
                    return null;
                }

                return servicesWrap[id].instance || createObj(id);
            },

            // Instantiate and return registered services. You can define filter function which takes service ID
            // as argument and returns true or false. In this case instances will be created only for services
            // which will pass filter checking.
            instantiateAll: function (filter) {
                var radID, result = [];
                filter = filter || function() {
                    return true;
                };

                for (radID in servicesWrap) {
                    if ( servicesWrap.hasOwnProperty(radID) && servicesWrap[radID].creator && !servicesWrap[radID].instance && filter(radID) ) {

                        result.push(createObj(radID));
                    }
                }
                return result;
            },

            getAllInstantiate: function (withConstructor) {
                var radID, result = [], flag;
                for (radID in servicesWrap) {
                    flag = (withConstructor) ? !!servicesWrap[radID].creator : true;
                    if (servicesWrap.hasOwnProperty(radID) && servicesWrap[radID].instance && servicesWrap[radID].creator) {
                        result.push(radID);
                    }
                }
                return result;
            },

            removeInstance: function(id) {
                if (!servicesWrap[id] || !servicesWrap[id].instance) {
                    return false;
                }
                delete servicesWrap[id].instance;
            },

            unregister: function (value, removeMixin) {
                var result, i;

                function remove(id){
                    var serviceData, instance;
                    serviceData = servicesWrap[id];
                    if (removeMixin && serviceData && serviceData.instance) {
                        instance = serviceData.instance;
                        unmix(instance);
                    }
                    delete servicesWrap[id];
                    return serviceData.instance;
                }

                if (Object.prototype.toString.call(value) === '[object Array]') {
                    result = [];
                    for (i = value.length - 1; i > -1; i--) {
                        result.push(remove(value[i]));
                    }
                } else {
                    result = remove(value);
                }
                return result;
            },

            unregisterAll: function (removeMixins) {
                var id, result = [], instance;

                for (id  in servicesWrap) {
                    if ( servicesWrap.hasOwnProperty(id)) {
                        instance = this.unregister(id, removeMixins);
                        if (instance) result.push(instance);
                    }
                }
                return result;
            }

        };
    }

    // Core
    function Core($, document, window) {
        var self = this,
            app = {},
            serviceLocator = new ServiceLocator(),
            pubsub = new PubSub();

        self.options = defaultOptions;

        self.initialize = function (application, options) {
            app = application || app;

            serviceLocator.setMixin({
                subscribe: pubsub.subscribe,
                unsubscribe: pubsub.unsubscribe,
                publish: pubsub.publish,
                application: app
            });

            if (options) {
                self.options = options;
            }
            if (self.options.plugins && isArray(self.options.plugins)) {
                self.registerAll(self.options.plugins);
            }

            prepareEnvironment(options);
            this.startPlugins();
            this.isInitialize = true;
        };

        self.register = function(value, obj, instantiate) {
            serviceLocator.register(value, obj, instantiate);
        };

        self.registerAll = function(arrayOfServices) {
            serviceLocator.registerAll(arrayOfServices);
        };

        self.getView = function (viewID, extras) {
            var view = serviceLocator.get(viewID);

            if (extras && view && view.setExtras) {
                view.setExtras(extras);
            }
            return view;
        };

        self.getService = self.getView;

        self.startViewOrService = function (viewID, extras) {
            var view = serviceLocator.get(viewID);

            if (view.setExtras) {
                view.setExtras(extras);
            }

        };

        self.startService = function(service) {
            var result;

            if(!service) {
                result = serviceLocator.instantiateAll(function(id) {
                    return id.split('.')[0] === 'service';
                });
            } else {
                if(Object.prototype.toString.call(service) === '[object Array]') {
                    result = [];
                    for(var i = 0; i < service.length; i++) {
                        result[i] = serviceLocator.get(service[i]);
                    }
                } else {
                    result = serviceLocator.get(service);
                }
            }

            return result;
        };

        self.startPlugins = function() {
            return serviceLocator.instantiateAll(function(id){
                var parts = id ? id.split('.') : [];
                return parts[0] === 'plugin';
            });
        };

        self.startAll = function(filter) {
            return serviceLocator.instantiateAll(filter);
        };

        // TODO: review and test this method. Can be a problem with setTimeout and children
        self.stop = function (viewID, callback, context) {
            var view = this.getView(viewID),
                length,
                index;

            if (view) {
                if (view.children) {
                    for (index = 0, length = view.children.length; index < length; index += 1) {
                        self.stop(view.children[index].content, null);
                    }
                }

                window.setTimeout(function() {
                    if (typeof view.destroy === 'function') {
                        view.destroy();
                    } else {
                        pubsub.unsubscribe(view);
                    }

                    serviceLocator.removeInstance(viewID);

                    execute(callback, null, context);

                    if (self.options.debug) {
                        window.console.log("destroy:" + viewID);
                    }
                }, 0);
            }
        };

        // TODO: check how view's children will be handled in this case
        self.stopAll = function () {
            var views = serviceLocator.unregisterAll(),
                i;

            for (i = views.length - 1; i > -1; i--) {
                if (typeof views[i].destroy === 'function') {
                    views[i].destroy();
                } else {
                    pubsub.unsubscribe(views[i]);
                }
            }
        };

        self.extractExtras = function (data) {
            try {
                return data.extras;
            } catch (err) {
                return null;
            }
        };

        self.getAllInstantiate = function() {
            return serviceLocator.getAllInstantiate();
        };

        self.document = document;
        self.window = window;
        self.$ = $;
        self.channels = pubsub.channels;
        self.subscribe = pubsub.subscribe;
        self.unsubscribe = pubsub.unsubscribe;
        self.publish = pubsub.publish;
        self.getLocator = serviceLocator.getLocator; //TODO: oly for test purpose.

        return self;
    }

    // Setup RAD namespaces
    window.RAD = {
        core: new Core(window.jQuery, document, window),
        model: modelMethod,
        application: registerApp,
        namespace: namespace
    };

    namespace('RAD.view', namespace('RAD.service', namespace('RAD.plugin', function (id, fabric, instantiate) {
        var i, l;
        if (isArray(id)) {
            for (i = 0, l = id.length; i < l; i += 1) {
                window.RAD.core.register(id[i], fabric, instantiate);
            }
        } else {
            window.RAD.core.register(id, fabric, instantiate);
        }
    })));
    namespace('RAD.views', {});
    namespace('RAD.services', {});
    namespace('RAD.plugins', {});
    namespace('RAD.models', {});
    namespace('RAD.utils', {});
    namespace('RAD.scriptLoader', new ScriptLoader());
    namespace('RAD.Class', (function () {
        var self = function () {
        };

        function isFn(fn) {
            return typeof fn === "function";
        }

        self.extend = function (proto) {
            var key, k = function (magic) { // call initialize only if there's no magic cookie
                if (magic !== isFn && isFn(this.initialize)) {
                    this.initialize.apply(this, arguments);
                }
            };
            k.prototype = new this(isFn); // use our private method as magic cookie
            for (key in proto) {
                (function (fn, sfn) { // create a closure
                    k.prototype[key] = !isFn(fn) || !isFn(sfn) ? fn : // add _super method
                        function () {
                            this._super = sfn;
                            return fn.apply(this, arguments);
                        };
                }(proto[key], k.prototype[key]));
            }
            k.prototype.constructor = k;
            k.extend = this.extend || this.create;
            return k;
        };
        return self;
    }()));

}(document, window));


// Very simple Deferred object
RAD.namespace('RAD.Blanks.Deferred', function () {
    return {
        listeners: [],
        done: function (fn) {
            this.listeners.push(fn);
        },
        doneFirstTask: function (fn) {
            this.firstTask = fn;
        },
        doneLastTask: function (fn) {
            this.lastTask = fn;
        },
        resolve: function () {
            var self = this, index, length, fn;
            self.resolve = function () {
            };
            self.done = function (fn) {
                if (typeof fn === 'function') {
                    fn();
                }
            };
            self.doneLastTask = self.doneFirstTask = self.done;
            if (typeof self.firstTask === 'function') {
                self.firstTask();
            }

            for (index = 0, length = self.listeners.length; index < length; index += 1) {
                fn = self.listeners[index];
                if (typeof fn === 'function') {
                    fn();
                }
            }

            if (typeof self.lastTask === 'function') {
                self.lastTask();
            }
            delete self.listeners;
        }
    };
});

// Custom Errors
// -------------
RAD.namespace('RAD.Errors.Render', ( function() {
        function RenderError(msg) {
            this.name = 'Render Error';
            this.message = msg;
        }
        RenderError.prototype = new Error();
        RenderError.prototype.constructor = RenderError;

        return RenderError;
    }() )
);


// All instances of RAD.Blanks.Service, RAD.Blanks.Plugin and RAD.Blanks.View
// have several extra methods and properties inherited from Core:
// - publish
// - subscribe
// - unsubscribe
// - application - reference to Application object

RAD.namespace('RAD.Blanks.Service', RAD.Class.extend({
    initialize: function () {
        this.subscribe(this.radID, this.onReceiveMsg, this);
        this.onInitialize();
    },
    destroy: function () {
        this.onDestroy();
        this.unsubscribe(this);
    },
    onInitialize: function () {},
    onReceiveMsg: function () {},
    onDestroy: function () {}
}));

RAD.namespace('RAD.Blanks.Plugin', RAD.Class.extend({
    initialize: function () {
        this.subscribe(this.radID, this.onReceiveMsg, this);
        this.onInitialize();
    },
    destroy: function () {
        this.onDestroy();
        this.unsubscribe(this);
    },
    onInitialize: function () {},
    onReceiveMsg: function () {},
    onDestroy: function () {}
}));


// Predefined Views
// ----------------

RAD.namespace('RAD.Blanks.View', Backbone.View.extend({
    className: 'backbone-view',

    attributes: {
        'data-role': 'view'
    },

    listen: ['add', 'remove', 'fetch', 'sort', 'change', 'reset'],

    getChildren: function () {
        if (!this.children) {
            this.children = [];
        }
        return this.children;
    },

    initialize: function () {
        var self = this;

        self.loader = RAD.Blanks.Deferred();
        self.renderRequest = true;

        // Backward compatibility
        self.viewID = this.radID;

        self.finish = function () {
            RAD.core.stop(self.viewID);
        };

        // ensure that 'children' property will be always defined
        self.getChildren();

        // Use compiled template if it exists. If no - use Ajax to load template.
        if (window.JST && window.JST[self.url]) {
            self.template = window.JST[self.url];
            self.bindModel(self.model);
            self.loader.resolve();
        } else {
            self.ajax = $.get(self.url, function (data) {
                if (self.ajax) {
                    self.template = _.template(data);
                    self.bindModel(self.model);
                    self.loader.resolve();
                }
                self.ajax = null;
            }, 'text');
        }

        self.subscribe(self.radID, self.receiveMsg, self);

        self.oninit();
        self.onInitialize();

        return self;
    },

    setExtras: function (extras) {
        if (extras !== this.extras) {
            this.onNewExtras(extras);
            this.extras = extras;
        }
    },

    bindModel: function (model) {
        var self = this, i;
        if (model) {
            self.model = model;
            for (i = this.listen.length - 1; i > -1; i -= 1) {
                self.listenTo(model, self.listen[i], self.render);
            }
            if (self.template && !self.renderRequest) {
                model.trigger('change');
            }
        }
    },

    unbindModel: function (forceRender) {
        if (this.model) {
            this.stopListening(this.model);
            this.model = null;
            if (forceRender) {
                this.render();
            }
        }
    },

    changeModel: function (newModel) {
        var self = this;
        self.unbindModel();
        self.bindModel(newModel);
    },

    insertSubview: function (data, callback) {
        var content = RAD.core.getView(data.content, data.extras),
            container = this.el.querySelector(data.container_id);

        if (data && data.backstack) {
            RAD.core.publish("router.beginTransition", data);
        }

        content.appendIn(container, function () {
            container.setAttribute('view', data.content);
            if (typeof data.callback === 'function') {
                if (typeof data.context === 'object') {
                    data.callback.call(data.context);
                } else {
                    data.callback();
                }
            }

            if (typeof callback === 'function') {
                callback();
            }
        });
    },

    render: function (callback) {
        var virtualEl = document.createElement('div'),
            virtualTemplates,
            self = this,
            json = (self.model) ? self.model.toJSON() : undefined,
            children = self.getChildren(),
            counter = children.length,
            childView,
            index,
            length;

        function check() {
            counter -= 1;
            if (counter <= 0) {
                self.onrender();
                self.onEndRender();
                self.dispatchScrollRefresh();
                self.renderRequest = false;

                if (typeof callback === 'function') {
                    callback();
                }
            }
        }

        function prepareInnerTemplates() {
            var templates,
                i, length;

            // if innerTemplates property was set to 'false' - view was already checked and no [data-template] was found.
            if (self.innerTemplates === false) {
                return;
            }

            templates = self.el.querySelectorAll('[data-template]');

            if (templates.length) {
                // convert NodeList into Array
                self.innerTemplates = [];
                for (i = 0, length = templates.length; i < length; i++) {
                    self.innerTemplates[i] = templates[i];
                }
            } else {
                self.innerTemplates = false;
            }
        }

        self.onStartRender();

        // detach children
        for (index = 0, length = children.length; index < length; index += 1) {
            childView = RAD.core.getView(children[index].content, children[index].extras);
            if (childView) {
                childView.detach();
            } else {
                throw new RAD.Errors.Render('Child view ['+children[index].content+'] is not registered. Please check parent view ['+ self.radID+'] ');
            }
        }

        try {
            if (self.innerTemplates && !self.renderRequest) {
                virtualEl.innerHTML = self.template({model: json, view: self});
                virtualTemplates = virtualEl.querySelectorAll('[data-template]');

                for (index = 0, length = self.innerTemplates.length; index < length; index++ ) {
                    self.innerTemplates[index].parentNode.replaceChild(virtualTemplates[index], self.innerTemplates[index]);
                    self.innerTemplates[index] = virtualTemplates[index];
                }
            } else {
                self.el.innerHTML = self.template({model: json, view: self});
                prepareInnerTemplates();
            }
        } catch (e) {
            throw new Error(e.message + '. Caused during rendering: '+ self.radID );
        }

        //attach children
        if (children.length > 0) {
            for (index = 0, length = children.length; index < length; index += 1) {
                childView = RAD.core.getView(children[index].content, children[index].extras);
                if (childView) {
                    this.insertSubview(children[index], check);
                } else {
                    throw new RAD.Errors.Render('Cannot insert child view ['+children[index].content+']. It is not registered. Please check parent view ['+ self.radID+'] ');
                }
            }
        } else {
            check();
        }

        return self;
    },

    appendIn: function (container, callback) {
        var self = this;

        if (!container) {
            throw new RAD.Errors.Render('Cannot insert view [' + self.radID + ']. Target container does not exist');
        }

        container.appendChild(this.el);
        if (this.renderRequest) {
            this.loader.doneFirstTask(function () {
                self.render(callback);
            });
        } else {
            callback();
        }
    },

    dispatchScrollRefresh: function (target) {
        var el = target || this.el,
            event = document.createEvent('Event');

        if(el.parentNode) {
            event.initEvent('scrollRefresh', true, true);
            el.parentNode.dispatchEvent(event);
        }
    },

    receiveMsg: function msgFunc(msg, data) {
        var self = this,
            parts = msg.split('.');

        switch (parts[2]) {
            case 'attach_start':
                self.loader.done(function () {
                    self.onBeforeAttach();
                });
                break;
            case 'attach':
                self.loader.done(function () {
                    self.onattach();
                    self.onStartAttach(msg, data);
                });
                break;
            case 'attach_complete':
                self.loader.doneLastTask(function () {
                    self.onEndAttach(msg, data);
                });
                break;
            case 'detach':
                self.ondetach();
                self.onEndDetach(msg, data);
                break;
            default:
                self.onReceiveMsg(msg, data);
                break;
        }

        return self;
    },

    detach: function () {
        if (this.$el) {
            this.$el.detach();
        }
    },

    destroy: function () {
        var property,
            self = this;

        if (self.ajax) {
            self.ajax.abort();
            self.ajax = null;
        }

        self.onDestroy();
        self.ondestroy();
        self.unbindModel();
        self.off(null, null, self);

        self.unsubscribe(self);

        // Unbind view
        self.undelegateEvents();
        self.$el.removeData().off();
        // Remove view attribute from parent container
        self.$el.parent().removeAttr('view');
        //Remove view from DOM
        self.remove();

        for (property in self) {
            if (self.hasOwnProperty(property)) {
                delete self[property];
            }
        }

        return this;
    },

    //stubs for inner service callback functions
    oninit: function () {},
    onattach: function () {},
    ondetach: function () {},
    onrender: function () {},
    ondestroy: function () {},

    //stubs for external service callback functions
    onInitialize: function () {},
    onNewExtras: function () {},
    onReceiveMsg: function () {},
    onStartRender: function () {},
    onEndRender: function () {},
    onBeforeAttach: function () {},
    onStartAttach: function () {},
    onEndAttach: function () {},
    onEndDetach: function () {},
    onDestroy: function () {}
}));

RAD.namespace('RAD.Blanks.ScrollableView', RAD.Blanks.View.extend({
    className: 'scroll-view',
    oninit: function() {
        var self = this;
        self._onScrollRefresh = function(e) {
            e.stopPropagation();
            self.refreshScroll();
        }
    },
    onrender: function() {
        this.refreshScroll();
    },
    onattach: function () {
        this.el.addEventListener('scrollRefresh', this._onScrollRefresh, false);
        this.attachScroll();
    },
    ondetach: function () {
        this.el.removeEventListener('scrollRefresh', this._onScrollRefresh, false);
        this.detachScroll();
    },
    refreshScroll: function() {
        var wrapper;

        if(!this.mScroll) {
            return;
        }

        wrapper = this.el.querySelector('.scroll-view') || this.el;
        if(this.mScroll.wrapper === wrapper && this.mScroll.scroller === wrapper.children[0]) {
            this.mScroll.refresh();
        } else { // we lost link to the correct DOM element - reattach iScroll
            this.detachScroll();
            this.attachScroll();
        }
    },
    attachScroll: function() {
        var wrapper = this.el.querySelector('.scroll-view') || this.el,
            options = this.scrollOptions ? this.scrollOptions : {};

        this.mScroll = new window.IScroll(wrapper, options);
    },
    detachScroll: function() {
        this.mScroll.destroy();
        this.mScroll = null;
    }
}));

// Define Plugins
// --------------

// Plugin provide ability to use different css animations for page transitions. Default css animations described in transitions.css
(function() {
    RAD.plugin('plugin.animateTransition', RAD.Blanks.Plugin.extend({
        onInitialize: function() {
            this.subscribe('animateTransition', this.applyTransition, this)
        },
        applyTransition: function(channel, data) {
            if (data) {
                animateTransition(data);
            }
        }
    }));

    var animateTransition = (function(){
        "use strict";
        var prefixes = ["webkit", "moz", "MS", "o", ""],
            overlay = document.createElement('div');

        overlay.className = 'transition-overlay';

        // Utils
        function showOverlay() {
            document.body.appendChild(overlay);
        }
        function hideOverlay() {
            if (overlay.parentNode) {
                document.body.removeChild(overlay);
            }
        }
        function getElement(selector) {
            if (!selector) {
                return null;
            }
            return selector.tagName ? selector : document.querySelector(selector);
        }
        function addPrefixedEvent(element, eventName, callback) {
            for (var i = 0; i < prefixes.length; i++) {
                if (!prefixes[i]) {
                    eventName = eventName.toLowerCase();
                }
                element.addEventListener(prefixes[i]+eventName, callback, false);
            }
        }
        function removePrefixedEvent(element, eventName, callback) {
            for (var i = 0; i < prefixes.length; i++) {
                if (!prefixes[i]) {
                    eventName = eventName.toLowerCase();
                }
                element.removeEventListener(prefixes[i]+eventName, callback, false);
            }
        }
        function hasClass(obj,cname) {
            return (obj.className ? obj.className.match(new RegExp('(\\s|^)'+cname+'(\\s|$)')) : false);
        }
        function addClass(obj,cname) {
            if (obj && !hasClass(obj,cname)) {
                obj.className += " "+cname;
            }
        }
        function removeClass(obj,cname) {
            if (obj && hasClass(obj,cname)) {
                obj.className=obj.className.replace(new RegExp('(\\s|^)'+cname+'(?=\\s|$)'),'');
            }
        }
        function getFakeEventObj(name) {
            return {
                type: 'fake',
                animationName: name || 'none',
                stopPropagation: function() {}
            }
        }

        function pagesTransition(options) {
            var container,
                pageIn,
                pageOut,
                animationName,

                pageInClassName,
                pageOutClassName,
                transitionTypeName,

                beforeTransition,
                onTransitionStart,
                onTransitionEnd,

                timer,
                timeOut = 3500;

            // initialize options
            options = options || {};

            container           = getElement(options.container) || document.body;
            pageIn              = getElement(options.pageIn);
            pageOut             = getElement(options.pageOut);
            animationName       = options.animation || 'none';

            beforeTransition    = options.beforeTransition  || function() {};
            onTransitionStart   = options.onTransitionStart || function() {};
            onTransitionEnd     = options.onTransitionEnd   || function() {};

            pageInClassName     = 'transition-view-to-show';
            pageOutClassName    = 'transition-view-to-hide';
            transitionTypeName  = 'transition-'+animationName;

            if (pageIn === pageOut) { return; }

            // Stop animation if any of pages still in animation process
            if ( (pageIn && pageIn.busy) || (pageOut && pageOut.busy)) {
                throw new Error("New animation cannot be applied to the same element until previous animation is not finished.");
            }

             // You can use beforeTransition callback to define extra logic.
             // If result of the callback will be false then pages transition will be aborted.
            if (beforeTransition && beforeTransition(pageIn, pageOut, container) === false) {
                return;
            }

            // Init onAnimationStart event handler
            function onAnimationStart(e) {
                if (e.animationName !== animationName) {
                    return;
                }
                onTransitionStart(pageIn, pageOut, container, e);
                removePrefixedEvent(container, 'AnimationStart', onAnimationStart);
            }
            addPrefixedEvent(container, 'AnimationStart', onAnimationStart);

            // Init onAnimationEnd event handler
            function onAnimationEnd(e) {
                if (e.animationName !== animationName) {
                    return;
                }
                e.stopPropagation();
                if (pageIn) {
                    pageIn.busy = false;
                }
                if (pageOut) {
                    window.setTimeout(function() {
                        pageOut.busy = false;
                        container.removeChild(pageOut);
                        removeClass(pageOut, pageOutClassName);
                        onTransitionEnd(pageIn, pageOut, container, e);
                        removeClass(container, transitionTypeName);
                        removeClass(pageIn, pageInClassName);
                        hideOverlay();
                    }, 50);
                } else {
                    onTransitionEnd(pageIn, pageOut, container, e);
                    removeClass(container, transitionTypeName);
                    removeClass(pageIn, pageInClassName);
                    hideOverlay();
                }

                if (timer) {
                    clearTimeout(timer);
                }
                removePrefixedEvent(container, 'AnimationEnd', onAnimationEnd);
            }
            addPrefixedEvent(container, 'AnimationEnd', onAnimationEnd);

            // If animation was not set - show new page without transition
            if (animationName === 'none') {
                if (pageIn) {
                    container.appendChild(pageIn);
                }

                onTransitionStart(pageIn, pageOut, container, getFakeEventObj());

                if (pageOut) {
                    // Small timeout to prevent screen flickering
                    window.setTimeout(function(){
                        container.removeChild(pageOut);
                        onTransitionEnd(pageIn, pageOut, container, getFakeEventObj());
                    }, 50);
                } else {
                    onTransitionEnd(pageIn, pageOut, container, getFakeEventObj());
                }
                return;
            }

            // Init pages transition:
            // ----------------------
            // Prepare new page for transition.
            if (pageIn) {
                pageIn.busy = true;
                addClass(pageIn, pageInClassName);
                container.appendChild(pageIn);
            }

            // Prepare current page for transition
            if (pageOut) {
                pageOut.busy = true;
                addClass(pageOut, pageOutClassName);
            }

            // Enable overlay layer to protect from accidental clicks until animation ends
            showOverlay();

            // Set timeout for case if onAnimationEnd event will not occur
            timer = window.setTimeout(function() {
                onAnimationEnd( getFakeEventObj(animationName) );
            }, timeOut);

            // Add predefined CSS class to start CSS animation
            addClass(container, transitionTypeName);

        }

        return pagesTransition;
    }());
}());


// Register Navigation Plugin
(function(){
    RAD.plugin("plugin.navigator", Navigator);


    function Navigator() {
        var self = this,
            core = RAD.core,
            id = this.radID,
            defaultBackstack = (core.options && core.options.defaultBackstack !== undefined) ? core.options.defaultBackstack : false;

        function getSubviewsID(view) {
            var i,
                j,
                children,
                index,
                length,
                childID,
                views,
                result = [];

            if (!view) {
                return result;
            }

            children = view.getChildren();
            for (index = 0, length = children.length; index < length; index += 1) {
                childID = children[index].content;
                result.push(childID);
                views = getSubviewsID(core.getView(childID));
                for (i = 0, j = views.length; i < j; i += 1) {
                    result.push(views[i]);
                }
            }
            return result;
        }

        function publishToGroup(msg, subscrabers) {
            var i, l;

            for (i = 0, l = subscrabers.length; i < l; i += 1) {
                core.publish(subscrabers[i] + '.' + msg);
            }
        }

        function setupPopupPosition(popup, target, gravity, width, height) {
            var winW = window.innerWidth,
                winH = window.innerHeight,
                popupW = width || popup.clientWidth,
                popupH = height || popup.clientHeight,
                popupX = 0,
                popupY = 0,

                $target = target ? $(target) : $(document.body),
                targetY = $target.offset().top,
                targetX = $target.offset().left,
                targetW = $target.outerWidth(),
                targetH = $target.outerHeight(),

                nullTargetOffsetX = target ? 0 : popupW,
                nullTargetOffsetY = target ? 0 : popupH,

                gravityEnable = gravity && ("top bottom left right center".indexOf(gravity) !== -1),
                popupStyle = window.getComputedStyle(popup),
                pointer = popup.querySelector('.popup-pointer'),
                pointerOffsetLeft = 0,
                pointerOffsetTop = 0;

            function inRect(left, top, right, bottom, width, height) {
                return (width < (right - left)) && (height < (bottom - top));
            }

            if (!gravityEnable) {
                gravity = 'center';
                if (inRect(0, 0, targetX, winH, popupW, popupH)) {
                    gravity = 'left';
                }
                if (inRect(0, targetY + targetH, winW, winH, popupW, popupH)) {
                    gravity = 'bottom';
                }
                if (inRect(targetX + targetW, 0, winW, winH, popupW, popupH)) {
                    gravity = 'right';
                }
                if (inRect(0, 0, winW, targetY, popupW, popupH)) {
                    gravity = 'top';
                }
            }

            //setup popup position
            switch (gravity) {
                case 'center':
                    popupX = (winW - popupW) / 2;
                    popupY = (winH - popupH) / 2;
                    break;
                case 'top':
                    popupX = targetX - popupW / 2 + targetW / 2;
                    popupY = targetY - popupH + nullTargetOffsetY;
                    break;
                case 'bottom':
                    popupX = targetX - popupW / 2 + targetW / 2;
                    popupY = targetY + targetH - nullTargetOffsetY;
                    break;
                case 'left':
                    popupY = targetY - popupH / 2 + targetH / 2;
                    popupX = targetX - popupW + nullTargetOffsetX;
                    break;
                case 'right':
                    popupY = targetY - popupH / 2 + targetH / 2;
                    popupX = targetX + targetW - nullTargetOffsetX;
                    break;
                default:
                    break;
            }

            popup.style.left = Math.round(popupX + window.pageXOffset) + 'px';
            popup.style.top = Math.round(popupY + window.pageYOffset) + 'px';
            popup.style.width = width + 'px';
            popup.style.height = height + 'px';

            //setup pointer position
            if (pointer) {
                pointer.style.top = '';
                pointer.style.left = '';
                pointer.className = 'popup-pointer ' + gravity;

                if (gravity === 'top' || gravity === 'bottom') {
                    pointerOffsetLeft = (pointer.offsetWidth / 2) + parseInt(popupStyle.paddingLeft, 10);
                    pointer.style.left = (targetX + Math.round(target.offsetWidth / 2)) - popupX - pointerOffsetLeft + 'px';
                }
                if (gravity === 'left' || gravity === 'right') {
                    pointerOffsetTop = (pointer.offsetHeight / 2) + parseInt(popupStyle.paddingTop, 10);
                    pointer.style.top = (targetY + Math.round(target.offsetHeight / 2)) - popupY - pointerOffsetTop + 'px';
                }
            }
        }

        function getParentViewIDForSelector(selector) {
            var result;

            function recursion(element) {
                if (!element || !element.parentNode) {
                    return null;
                }

                element = element.parentNode;
                if (element && element.getAttribute) {
                    result = element.getAttribute('view');
                    if (result) {
                        return result;
                    } else {
                        return recursion(element);
                    }
                }
            }

            return (typeof selector === 'string') ? recursion(core.document.querySelector(selector)) : null;
        }

        //remove old child from parent view and add new information about child
        function updateChildren(datawrapper) {
            var parentViewID = getParentViewIDForSelector(datawrapper.container_id), parentView, children,
                newChildOptions, index, length, child;

            if (parentViewID) {
                parentView = core.getView(parentViewID);
                children = parentView.getChildren();
                newChildOptions = {
                    container_id: datawrapper.container_id,
                    content: datawrapper.content,
                    animation: datawrapper.animation
                };

                if (children) {
                    for (index = 0, length = children.length; index < length; index += 1) {
                        child = children[index];
                        if (child.container_id === newChildOptions.container_id) {
                            children.splice(index, 1);
                            break;
                        }
                    }
                }

                children.push(newChildOptions);
            }
        }

        function renderView(view, callback) {
            if (view && view.renderRequest) {
                view.loader.doneFirstTask(function () {
                    view.render(callback);
                });
            } else {
                if (typeof callback === 'function') {
                    callback();
                }
            }
        }

        function navigateView(data) {
            var animation, container, oldViewId, newViewId, oldView, newView, detachedViews, attachedViews, attachViews;

            animation = data.animation || core.options.defaultAnimation;
            // prepare animation by suffix
            if (animation !== 'none' && animation.indexOf('-in') === -1 && animation.indexOf('-out') === -1) {
                if (data.direction) {
                    animation += '-out';
                } else {
                    animation += '-in';
                }
            }

            container = data.container_id.tagName ? data.container_id : document.querySelector(data.container_id);

            if (!container) {
                throw new Error("Cannot navigate view ["+ data.content + "]. Target container ["+data.container_id+"] was not found");
            }

            oldViewId = container.getAttribute('view');
            oldView = core.getView(oldViewId);
            newViewId = data.content;
            newView = core.getView(newViewId, core.extractExtras(data));

            detachedViews = getSubviewsID(oldView);
            attachedViews = getSubviewsID(newView);
            detachedViews.push(oldViewId);
            attachedViews.push(newViewId);

            attachViews = function () {
                publishToGroup('attach_start', attachedViews);
                container.setAttribute('view', newViewId);

                core.publish('animateTransition', {
                    container: container,
                    pageIn: newView ? newView.el : null,
                    pageOut: oldView ? oldView.el : null,
                    animation: animation,
                    beforeTransition: function() {
                        if (data.beforeTransition) {
                            return data.beforeTransition.apply(arguments);
                        }
                    },
                    onTransitionStart: function () {
                        publishToGroup('attach', attachedViews);
                        core.publish("navigation.start", data);
                    },
                    onTransitionEnd: function (pageIn, pageOut, container) {
                        updateChildren(data);

                        publishToGroup('detach', detachedViews);
                        publishToGroup('attach_complete', attachedViews);

                        if (typeof data.callback === 'function') {
                            data.callback(data, pageIn, pageOut, container);
                        }
                        core.publish("navigation.end", data);
                        core.publish("router.endTransition", data);
                    }
                });

            };

            renderView(newView, attachViews);
        }

        // helper function
        function stopPropagation(e) {
            e.stopPropagation();
        }

        function showSingle(data) {
            var viewId, view, attachView;

            viewId = data.content;
            view   = core.getView(viewId, data.extras);
            data.animation    = data.animation || 'fade';
            view.el.animation = data.animation; // save animation name for future using in closeSingle()
            if (view.el.timeout) {
                window.clearTimeout(view.el.timeout);
            }
            // remove onCloseListener in case when we popup was reopened
            if (view.el.onCloseListener) {
                view.el.removeEventListener('click', stopPropagation, false);
                document.body.removeEventListener('click', view.el.onCloseListener, false);
                view.el.onCloseListener = null;
            }
            attachView = function () {
                core.publish(viewId + '.attach_start');
                core.publish('animateTransition', {
                    pageIn: view.el,
                    animation: data.animation + '-in',
                    onTransitionStart: function () {
                        setupPopupPosition(view.el, data.target, data.gravity, data.width, data.height);
                        core.publish(viewId + '.attach');
                    },
                    onTransitionEnd: function () {
                        core.publish(viewId + '.attach_complete');
                        // setup timeout to close popup
                        if (typeof data.showTime === 'number') {
                            view.el.timeout = window.setTimeout(function() {
                                closeSingle({content: viewId});
                            }, data.showTime);
                        }
                        // setup autoclose when user click outside
                        if (data.outsideClose) {
                            view.el.onCloseListener = function(e) {
                                closeSingle({content: viewId});
                            };
                            view.el.addEventListener('click', stopPropagation, false);
                            document.body.addEventListener('click', view.el.onCloseListener, false);
                        }
                    }
                });
            };
            renderView(view, attachView);
        }

        function closeSingle(data) {
            var viewId, view;

            viewId = data.content;
            view   = core.getView(viewId);
            if (view.el.timeout) {
                window.clearTimeout(view.el.timeout);
            }
            if (view.el.onCloseListener) {
                view.el.removeEventListener('click', stopPropagation, false);
                document.body.removeEventListener('click', view.el.onCloseListener, false);
                view.el.onCloseListener = null;
            }
            core.publish('animateTransition', {
                pageOut: view.el,
                animation: view.el.animation + '-out',
                onTransitionEnd: function () {
                    core.publish(viewId + '.detach');
                }
            });
        }

        function showWindow(data) {
            var container = document.createElement('div'),
                className = data.className || 'modal-container';

            if (data.position) {
                className += ' pos-' + data.position;
            } else {
                className += ' pos-center-center';
            }

            // setup outside close
            if (data.outsideClose) {
                container.listener = function (e) {
                    if(e.target === container) {
                        closeWindow({content: data.content});
                    }
                };
                container.addEventListener('click', container.listener, false);
            }

            data.animation = data.animation || 'none';
            data.container_id = container;
            container.className = className;
            container.animation = data.animation; // save animation to use it when we close dialog

            data.beforeTransition = function() {
                document.body.appendChild(container);
            };
            navigateView(data);
        }

        function closeWindow(data) {
            var container = document.querySelector('[view="' + data.content + '"]'),
                closeAnimation;

            if(!container) {
                return;
            }
            closeAnimation = container.animation && container.animation !== 'none' ? container.animation + '-out' : 'none';
            data.animation = data.animation || closeAnimation;
            data.container_id = container;
            data.content = '';
            data.callback = function (data, pageIn, pageOut, container) {
                document.body.removeChild(container);
            };

            if (container.listener) {
                container.removeEventListener('click', container.listener);
                container.listener = null;
            }

            navigateView(data);
        }

        function onNavigationEvent(channel, data) {
            var parts = channel.split('.');
            switch (parts[1]) {
                case 'show':
                    // init BackStack
                    if (data.backstack || defaultBackstack) {
                        core.publish("router.beginTransition", data);
                    }
                    navigateView(data);
                    break;
                case 'back':
                    data.direction = (data.direction !== undefined) ? data.direction : true;
                    navigateView(data);
                    break;
                case 'dialog':
                    if (parts[2] === 'show') {
                        showWindow(data);
                    }
                    if (parts[2] === 'close') {
                        closeWindow(data);
                    }
                    break;
                case 'toast':
                case 'popup':
                    if (parts[2] === 'show') {
                        showSingle(data);
                    }
                    if (parts[2] === 'close') {
                        closeSingle(data);
                    }
                    break;
            }
        }

        //initialization (auto constructor)
        core.subscribe('navigation', onNavigationEvent, self);
        self.viewID = id;

        self.destroy = function () {
            core.unsubscribe(self);
        };
    }
}());