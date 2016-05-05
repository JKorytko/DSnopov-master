(function() {
  angular.module('pd.search', [])
    .controller('SearchController', ['$scope', '$state', 'wordModel', SearchController]);

  function SearchController($scope, $state, wordModel) {
    $scope.inputWord = '';
    $scope.data = wordModel.data;

    $scope.showDefinition = function(word) {
      $state.go('app.word_definition', {word: word});
    };
  }
})();