(function() {
  angular.module('pd.vocabulary', [])
    .controller('VocabularyController', ['$scope', 'wordsModel', VocabularyController]);

  function VocabularyController($scope, wordsModel) {
    $scope.words = wordsModel.data.words;
  }
})();