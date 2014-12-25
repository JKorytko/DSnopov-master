(function () {
    'use strict';
    var scripts = [
        'src/app/app.js',

        'src/modules/search/search.js',
        'src/modules/word_definition/model.js',
        'src/modules/word_definition/word_definition.js'
    ];

    function onEndLoad() {
        var options = {
            defaultBackstack: false,
            defaultAnimation: 'none',
            animationTimeout: 1500,
            debug: false,
            templateSettings: {
                evaluate    : /<%([\s\S]+?)%>/g,
                interpolate : /<%=([\s\S]+?)%>/g,
                escape      : /<%-([\s\S]+?)%>/g
            }
        };

        RAD.core.initialize(RAD.application, options);

        FastClick.attach(document.body);

        RAD.application.start();
    }

    RAD.scriptLoader.loadScripts(scripts, onEndLoad);
})();
