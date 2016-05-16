(function() {
  angular.module('pd.vocabulary', [])
    .controller('VocabularyController', ['$scope', 'groupByFirstLetterFilter', 'wordsModel', VocabularyController]);

  function VocabularyController($scope, groupByFirstLetter, wordsModel) {
    $scope.groupedWords = groupByFirstLetter(wordsModel.data.words);
  }
})();