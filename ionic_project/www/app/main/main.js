(function() {
  var constants = {
    REQUEST_URL: 'http://crossorigin.me/http://www.dictionaryapi.com/api/v1/references/learners/xml/',
//    REQUEST_URL: 'http://www.dictionaryapi.com/api/v1/references/learners/xml/',
    KEY: 'ca61d361-999f-451a-9277-269313df9b3d'
  };

  angular.module('pd',
    [
      'ionic',
      'pd.data',
      'pd.menu',
      'pd.vocabulary',
      'pd.search',
      'pd.word_definition'
    ])
    .constant("constants", constants)
    .constant('$ionicLoadingConfig', {
      template: 'Loading...'
    })
    .run(['$ionicPlatform', '$rootScope', run]);

  function run($ionicPlatform, $rootScope) {
    $ionicPlatform.ready(function() {
      if (window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }
      if (window.StatusBar) {
        StatusBar.styleDefault();
      }
    });

   $rootScope.$on('$stateChangeSuccess', function () {
     console.log('$stateChangeSuccess event', arguments);
   });

   $rootScope.$on('$stateChangeStart', function () {
     console.log('$stateChangeStart event', arguments);
   });

   $rootScope.$on('$stateNotFound', function () {
     console.warn('$stateNotFound event', arguments);
   });

   $rootScope.$on('$stateChangeError', function () {
     console.warn('$stateChangeError event', arguments);
   });
  }
})();