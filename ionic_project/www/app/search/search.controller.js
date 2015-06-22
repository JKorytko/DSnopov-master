(function() {
  angular.module('pd.search', [])
    .controller('SearchController', ['$scope', '$state', '$ionicPopup', 'wordService', SearchController]);

  function SearchController($scope, $state, $ionicPopup, wordService) {
    $scope.model = {};

    function showAlert(title, msg) {
      $ionicPopup.alert({
        title: title,
        template: msg
      });
    }

    $scope.showDefinition = function() {
      wordService.requestWordInfo($scope.model.word)
        .then(function () {
          $state.go('app.word_definition');
        }, function (error) {
          if(error.msg) {
            showAlert(error.msg);
          } else {
            showAlert('The word is not found.', 'Click on a spelling suggestion or try your search again.');
            $scope.model.suggestions = error.suggestions;
          }
        });
    };

    $scope.onSuggestionClick = function(suggestion) {
      $scope.model.word = suggestion;
      $scope.showDefinition();
    }
  }
})();