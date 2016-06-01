(function() {
  angular.module('pd.data')
    .service('wordModel', ['$q', '$http', '$ionicLoading', 'constants', 'helpers', 'storage', wordModel]);

  function wordModel($q, $http, $ionicLoading, constants, helpers, storage) {
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

    function _getWebsterSuggestions(dataXML) {
      var suggestions = [],
        entriesNodes = dataXML.getElementsByTagName('entry');

      if (!entriesNodes.length) { /* incorrect word, show suggestions */
        Array.prototype.forEach.call(dataXML.getElementsByTagName('suggestion'), function (v) {
          suggestions.push(v.childNodes[0].nodeValue);
        });
        return suggestions;
      }
    }

    function _getWordnetQuerySPARQL(word) {
      return [
        'PREFIX wn: <http://www.w3.org/2006/03/wn/wn20/schema/>',
        'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
        'SELECT ?synSet ?synSetId ?gloss ?synSetWord ',
        'WHERE {',
          '?queryWordSense rdfs:label "' + word + '" .',
          '?synSet wn:synsetId ?synSetId ;',
            'wn:gloss ?gloss ;',
            'wn:containsWordSense ?queryWordSense ;',
            'wn:containsWordSense ?wordSense .',
          '?wordSense rdfs:label ?synSetWord',
        '}'
      ].join('');
    }

    function _getSynSetPartOfSpeech(synSetURI) {
      var splitted = synSetURI.split('-'),
        partOfSpeech = splitted[splitted.length - 2];
      return partOfSpeech === 'adjectivesatellite' ? 'adjective' : partOfSpeech;
    }

    function _parseWordnetJSON(dataJSON) {
      var synSets = [],
        synSetIdToIndexMap = {};

      dataJSON.results.bindings.forEach(function (v) {
        var synSetId = parseInt(v.synSetId.value, 10),
          synSetIndex = synSetIdToIndexMap[synSetId],
          synSet;
        if (typeof synSetIndex === 'number') {
          //we have already saved this particular synSet, just add the synSetWord to its words array
          synSets[synSetIndex].synSetWords.push(v.synSetWord.value);
        } else {
          synSet = {
            synSetId: synSetId,
            partOfSpeech: _getSynSetPartOfSpeech(v.synSet.value),
            gloss: v.gloss.value,
            synSetWords: [v.synSetWord.value]
          };
          synSetIndex = synSets.push(synSet) - 1; //get current synSet index in the synSets array
          synSetIdToIndexMap[synSetId] = synSetIndex; //save this index
        }
      });

      return synSets;
    }

    function _requestWordnetData() {
      console.warn('starting wordnet request');
      return $http.get(constants.WORDNET_URL, {
        params: {
          format: 'json',
          query: _getWordnetQuerySPARQL(model.data.word)
        }
      });
    }

    function _parseWordnetData(response) {
      console.warn('success wordnet request', response);
      model.data.wordnet = _parseWordnetJSON(response.data);
    }

    function _requestWebsterData() {
      console.warn('starting webster request');
      return $http.get(constants.WEBSTER_URL + model.data.word, {params: {key: constants.WEBSTER_KEY}});
    }

    function _parseWebsterData(response) {
      console.warn('success webster request', response);
      var XML = $.parseXML(response.data),
        suggestions = _getWebsterSuggestions(XML);
      if (suggestions) {
        model.data.suggestions = suggestions;
        return $q.reject({
          title: 'The word is not found.',
          msg: 'Click on a spelling suggestion or try your search again.'
        });
      } else {
        model.data.suggestions = [];
        model.data.webster = _parseWebsterXML(model.data.word, XML);
      }
    }

    function _requestAndParseWord() {
      console.warn('there is no such word in the DB, requesting it');
      model.data.isSavedToDB = false;
      return _requestWebsterData()
        .then(_parseWebsterData)
        .then(_requestWordnetData)
        .then(_parseWordnetData);
    }

    function _handleWordErrors(reason) {
      if (reason && reason.title) {
        helpers.showAlert(reason.title, reason.msg);
      } else {
        helpers.showAlert('Network error.');
      }
      return $q.reject(reason);
    }

    model =  {

      data: {
        word: '',
        isSavedToDB: false,
        suggestions: [],
        webster: [],
        wordnet: []
      },

      getWord: function () {
        $ionicLoading.show();
        return storage.getWordFromDB(model.data.word)
          .then(function (word) {
            console.warn('get word from DB success', word);
            model.data = word;
          }, _requestAndParseWord)
          .catch(_handleWordErrors)
          .finally(function () {
            $ionicLoading.hide();
          });
      },

      toggleDBPresence: function () {
        if (model.data.isSavedToDB) {
          storage.removeWordFromDB(model.data.word)
            .then(function () {
              model.data.isSavedToDB = false;
            }, function () {
              helpers.showAlert('Database error.');
            });
        } else {
          storage.saveWordToDB(angular.copy(model.data))
            .then(function () {
              model.data.isSavedToDB = true;
            }, function () {
              helpers.showAlert('Database error.');
            });
        }
      }

    };

    return model;
  }
})();