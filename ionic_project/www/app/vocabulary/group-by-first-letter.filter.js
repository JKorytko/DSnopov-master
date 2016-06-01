(function() {
  angular.module('pd.vocabulary')
    .filter('groupByFirstLetter', listDelimiterFilter);

  function listDelimiterFilter() {
    return function(sortedList) {
      var result = [],
        currentLetter = '';

      sortedList.forEach(function (v) {
        var firstLetter = v.word.substr(0, 1);
        if (firstLetter !== currentLetter) {
          currentLetter = firstLetter;
          result.push({
            letter: firstLetter.toUpperCase(),
            list: [v]
          });
        } else {
          result[result.length - 1].list.push(v);
        }
      });
      
      return result;
    };
  }
})();