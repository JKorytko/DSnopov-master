(function() {
  angular.module('pd')
    .config(['$stateProvider', '$urlRouterProvider', config]);

  function config($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'app/menu/menu.html',
        controller: 'MenuController'
      })
      .state('app.vocabulary', {
        url: '/vocabulary',
        views: {
          'menuContent': {
            templateUrl: 'app/vocabulary/vocabulary.html'
          }
        }
      })
      .state('app.add_word', {
        url: '/add_word',
        views: {
          'menuContent': {
            templateUrl: 'app/add_word/add_word.html',
            controller: 'AddWordController'
          }
        }
      });

    $urlRouterProvider.otherwise('/app/vocabulary');
  }
})();