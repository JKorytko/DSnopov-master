(function() {
  angular.module('pd.word_definition', [])
    .controller('WordDefinitionController', ['$scope', 'wordModel', WordDefinitionController]);

  function WordDefinitionController($scope, wordModel) {
    $scope.data = wordModel.data;

    $scope.toggleDBPresence = function () {
      wordModel.toggleDBPresence();
    }
  }
})();