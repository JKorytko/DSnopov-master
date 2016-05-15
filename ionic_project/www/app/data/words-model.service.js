(function() {
  angular.module('pd.data')
    .service('wordsModel', ['storage', wordsModel]);

  function wordsModel(storage) {
    var model;
    
    model =  {

      data: {
        words: []
      },
      
      getAllWords: function () {
        return storage.getAllWordObjects()
          .then(function (words) {
            model.data.words = words;
          });
      }

    };

    return model;
  }
})();