(function() {
  angular.module('pd.data')
    .service('wordModel', ['$q', '$http', '$ionicLoading', 'constants', 'helpers', wordModel]);

  function wordModel($q, $http, $ionicLoading, constants, helpers) {
    var model;

    function _parseWebsterXML(word, XML) {
      var wordEntries = [], entryObj, entryWord,
        inflections, inflectionsNodes, tempChildren,
        $def, $dts, $vis, examples, definitions,
        bracketsRegExp = /\[+/,
        entries, $entry,
        i, l, j, len;

      entries = XML.getElementsByTagName('entry');
      for (i = 0, l = entries.length; i < l; i++) {
        definitions = [];
        entryObj = {};
        $entry = $(entries[i]);
        entryWord = $entry.attr('id').toLowerCase();
        if (bracketsRegExp.test(entryWord)) {
          entryObj['entryWord'] = entryWord.substr(0, word.length);
        } else {
          entryObj['entryWord'] = entryWord;
        }
        if (entryObj['entryWord'] !== word) {
          if(i + 1 === entries.length && !wordEntries.length) {
            $entry = $(entries[0]);
            entryObj['entryWord'] = $entry.attr('id').toLowerCase();
          } else {
            continue;
          }
        }

        entryObj['pronunciation'] = $entry.children('pr').text();
        entryObj['functionalLabel'] = $entry.children('fl').text();

        /* inflections */
        inflections = [];
        inflectionsNodes = $entry.children('in');
        inflectionsNodes.each(function(i, el) {
          tempChildren = el.childNodes;
          for(j = 0; j < tempChildren.length; j++) {
            if (tempChildren[j].nodeName == 'if') {
              inflections.push({
                value: tempChildren[j].childNodes[0].nodeValue,
                type: 'if'
              });
            }
            if (tempChildren[j].nodeName == 'il') {
              inflections.push({
                value: tempChildren[j].childNodes[0].nodeValue,
                type: 'il'
              });
            }
          }
        });
        entryObj['inflections'] = inflections;

        /* definition */
        $def = $entry.children('def');
        $dts = $def.find('dt');
        for (j = 0, len = $dts.length; j < len; j++) {
          examples = [];
          $vis = $dts.eq(j).find('vi');
          $vis.each(function (index, vi) {
            examples.push($(vi).text());
          });
          if (examples.length) {
            definitions.push({
              definition: $dts.get(j).childNodes[0].nodeValue,
              examples: examples
            });
          }
        }
        entryObj['definitions'] = definitions;

        wordEntries.push(entryObj);
      }

      return wordEntries;
    }

    function _checkWebsterResponse(dataXML) {
      var suggestionsNodes = dataXML.getElementsByTagName('suggestion'),
        entriesNodes = dataXML.getElementsByTagName('entry');

      model.data.suggestions = [];
      if (!entriesNodes.length) { /* incorrect word, show suggestions */
        for(var i = 0; i < suggestionsNodes.length; i++) {
          model.data.suggestions[i] = suggestionsNodes[i].childNodes[0].nodeValue;
        }
        helpers.showAlert('The word is not found.', 
          'Click on a spelling suggestion or try your search again.');
        return $q.reject();
      } else {
        model.data.webster = _parseWebsterXML(model.data.word, dataXML);
      }
    }

    function _getWordnetQuerySPARQL(word) {
      return [
        'PREFIX wn: <http://www.w3.org/2006/03/wn/wn20/schema/>',
        'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
        'SELECT ?synset ?synsetId ?word ?gloss ',
        'WHERE {',
          '?synset rdfs:label "' + word + '" ;',
            'wn:synsetId ?synsetId ;',
            'wn:gloss ?gloss ;',
            'wn:containsWordSense ?wordSense .',
          '?wordSense rdfs:label ?word',
        '}'
      ].join('');
    }

    model =  {

      data: {
        suggestions: [],
        word: '',
        webster: [],
        wordnet: {}
      },

      requestData: function () {
        return $http.get(constants.WORDNET_URL, {
          params: {
            format: 'json',
            query: _getWordnetQuerySPARQL(model.data.word)
          }
        }).then(function () {
          console.warn(arguments);
          return $q.reject();
        })
        // $ionicLoading.show();
        // return $http.get(constants.WEBSTER_URL + model.data.word, {params: {key: constants.WEBSTER_KEY}})
        //   .then(function (response) {
        //     return _checkWebsterResponse($.parseXML(response.data));
        //   }, function () {
        //     helpers.showAlert('Network error.');
        //     return $q.reject();
        //   })
        //   .finally(function () {
        //     $ionicLoading.hide(); //todo: angular $http interceptors?
        //   });
      }

    };

    return model;
  }
})();