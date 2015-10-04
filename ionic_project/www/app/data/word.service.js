(function() {
  angular.module('pd.data')
    .service('wordService', ['$q', '$http', '$ionicLoading', 'constants', wordService]);

  function wordService($q, $http, $ionicLoading, constants) {
    var wordInfo;

    function parseWordInfoXML(word, XML) {
      var wordEntries = [], entryObj, entryWord,
        inflections, inflectionsNodes, tempChildren,
        $def, $sns, $dts, $vis, examples, definitions,
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
          entryObj['word'] = entryWord.substr(0, word.length);
        } else {
          entryObj['word'] = entryWord;
        }
        if (entryObj['word'] !== word) {
          if(i + 1 === entries.length && !wordEntries.length) {
            $entry = $(entries[0]);
            entryObj['word'] = $entry.attr('id').toLowerCase();
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
        $sns = $def.find('sn');
        $dts = $def.find('dt');
        for (j = 0, len = $dts.length; j < len; j++) {
          examples = [];
          $vis = $dts.eq(j).find('vi');
          $vis.each(function (index, vi) {
            examples.push($(vi).text());
          });
          if (examples.length) {
            definitions.push({
              sn: $dts.length === $sns.length ? $sns.eq(j).text() : null,
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

    function checkResponse(word, dataXML) {
      var suggestionsNodes = dataXML.getElementsByTagName('suggestion'), suggestions = [],
        entriesNodes = dataXML.getElementsByTagName('entry');

      if (!entriesNodes.length) {
        for(var i = 0; i < suggestionsNodes.length; i++) {
          suggestions[i] = suggestionsNodes[i].childNodes[0].nodeValue;
        }
        console.warn(suggestions, suggestionsNodes);
        return $q.reject({suggestions: suggestions});
      } else {
        wordInfo = parseWordInfoXML(word, dataXML);
        return wordInfo;
      }
    }

    function requestWordInfo(word) {
      $ionicLoading.show();
      return $http.get(constants.REQUEST_URL + word, {params: {key: constants.KEY}})
        .then(function (response) {
          return checkResponse(word, $.parseXML(response.data));
        }, function () {
          return $q.reject({msg: 'Network error.'});
        })
        .finally(function () {
          $ionicLoading.hide(); //todo: angular $http interceptors?
        });
    }

    function getWordInfo() {
      return wordInfo;
    }

    return {
      requestWordInfo: requestWordInfo,
      getWordInfo: getWordInfo
    };
  }
})();