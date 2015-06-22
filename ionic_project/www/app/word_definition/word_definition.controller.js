(function() {
  angular.module('pd.word_definition', [])
    .controller('WordDefinitionController', ['$scope', 'wordInfo', WordDefinitionController]);

  function WordDefinitionController($scope, wordInfo) {
    $scope.wordInfo = wordInfo;

  }
})();