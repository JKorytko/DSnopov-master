(function() {
  angular.module('pd')
    .config(['$stateProvider', '$urlRouterProvider', config]);

  function config($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'app/menu/menu.html',
        controller: 'MenuController',
        resolve: {
          database: ['storage', function (storage) {
            return storage.initDatabase();
          }]
        }
      })
      .state('app.vocabulary', {
        url: '/vocabulary',
        resolve: {
          words: ['wordsModel', 'database', function (wordsModel) {
            return wordsModel.getAllWords();
          }]
        },
        views: {
          'menuContent': {
            templateUrl: 'app/vocabulary/vocabulary.html',
            controller: 'VocabularyController'
          }
        }
      })
      .state('app.search', {
        url: '/search',
        views: {
          'menuContent': {
            templateUrl: 'app/search/search.html',
            controller: 'SearchController'
          }
        }
      })
      .state('app.word_definition', {
        url: '/word_definition/:word',
        resolve: {
          requestWord: ['$stateParams', 'wordModel', 'database', function($stateParams, wordModel) {
            wordModel.data.word = $stateParams.word;
            return wordModel.getWord();
          }]
        },
        views: {
          'menuContent': {
            templateUrl: 'app/word_definition/word_definition.html',
            controller: 'WordDefinitionController'
          }
        }
      });

    $urlRouterProvider.otherwise('/app/vocabulary');
  }
})();