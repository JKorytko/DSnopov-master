RAD.view('view.word_definition', RAD.Blanks.View.extend({
    url: 'src/modules/word_definition/word_definition.ejs',
    events: {
        'click .main-header__btn_back': 'goBack'
    },
    onInitialize: function() {
        this.model = RAD.model('word_definition');
    },
    onStartAttach: function() {
        this.application.isCurrentScreenDefinition = true;
    },
    onEndDetach: function() {
        this.application.isCurrentScreenDefinition = false;
    },
    goBack: function() {
        this.publish('navigation.show', {
            container_id: '#screen',
            content: 'view.search',
            animation: 'fade'
        });
    }
}));