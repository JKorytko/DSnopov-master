RAD.application(function (core) {
    'use strict';
    var app = this;

    app.constants = {
        REQUEST_URL: 'http://www.dictionaryapi.com/api/v1/references/learners/xml/',
        KEY: 'ca61d361-999f-451a-9277-269313df9b3d'
    };

    app.start = function() {
        core.startService();
        core.publish('navigation.show', {
            container_id: '#screen',
            content: 'view.search'
        });
    };

    app.showOverlay = function() {
        document.querySelector('#overlay').style.display = 'block';
    };

    app.hideOverlay = function() {
        document.querySelector('#overlay').style.display = 'none';
    };

    return app;
}, true);