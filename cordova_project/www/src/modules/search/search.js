RAD.view('view.search', RAD.Blanks.View.extend({
    url: 'src/modules/search/search.ejs',
    events: {
        'submit .main-form': 'onSubmit',
        'click .main-form__search-btn': 'requestWord',
        'click .search-error__suggestions a': 'showSuggestionDefinition'
    },
    onInitialize: function() {
        this.definitionModel = RAD.model('word_definition');
    },
    onEndRender: function() {
        this.searchInput = this.el.querySelector('.main-form__search-input');
        this.searchError = this.el.querySelector('.search-error');
        this.searchSuggestions = this.el.querySelector('.search-error__suggestions');
    },
    onEndDetach: function() {
        this.setInitState();
    },
    onSubmit: function(e) {
        e.preventDefault();
        this.requestWord();
    },
    showSuggestionDefinition: function(e) {
        this.requestWord(e.target.textContent);
    },
    showWordDefinition: function() {
        this.publish('navigation.show', {
            container_id: '#screen',
            content: 'view.word_definition',
            animation: 'fade'
        });
    },
    requestWord: function(word) {
        var self = this,
            word = word || $.trim(this.searchInput.value).toLowerCase();

        if(!word) {
            return;
        }

        this.application.showOverlay();
        $.get(this.application.constants.REQUEST_URL + word, {key: this.application.constants.KEY})
            .success(function(xml) {
                self.parseXML(word, xml);
            })
            .error(function() {
                navigator.notification.alert(
                    'Network error.',  // message
                    function() {},         // callback
                    'Error',            // title
                    'Ok'                  // buttonName
                );
            })
            .complete(function() {
                self.application.hideOverlay();
            });
    },
    parseXML: function(word, xml) {
        var entries = xml.getElementsByTagName('entry'),
            suggestions;

        if(entries.length) {
            this.definitionModel.parseWordEntriesAndSet(word, entries);
            this.showWordDefinition();
        } else {
            suggestions = xml.getElementsByTagName('suggestion');
            this.showError(suggestions);
        }
    },
    showError: function(suggestions) {
        var html = '';

        for(var i = 0, l = suggestions.length; i < l; i++) {
            html += '<a href="#">' + suggestions[i].childNodes[0].nodeValue + '</a>';
        }
        this.searchSuggestions.innerHTML = html;
        this.searchError.style.display = 'block';
    },
    setInitState: function() {
        this.searchInput.value = '';
        this.searchError.style.display = 'none';
    }
}));