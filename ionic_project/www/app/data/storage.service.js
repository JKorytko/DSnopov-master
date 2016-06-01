(function() {
  angular.module('pd.data')
    .service('storage', ['$q', storageService]);

  function storageService($q) {
    var db,
      storage;

    function _getWordObjectByIndex(indexName) {
      var indexRequest,
        deferred = $q.defer();

      indexRequest = db
        .transaction('words')
        .objectStore('words')
        .index('word')
        .get(indexName);

      indexRequest.onsuccess = function (e) {
        var wordObject = e.target.result;
        if (wordObject) {
          deferred.resolve(wordObject);
        } else {
          deferred.reject({message: 'There is no such word in the database.'});
        }
      };

      return deferred.promise;
    }

    function initDatabase() {
      var openDBRequest = indexedDB.open('pocketDictionaryDB', 1),
        deferred = $q.defer();

      openDBRequest.onerror = function(e) {
        console.warn(e);
        deferred.reject(e);
      };

      openDBRequest.onupgradeneeded = function(e) {
        var wordsOS;
        console.log('open() onupgradeneeded', e);
        db = e.target.result;
        wordsOS = db.createObjectStore('words', {keyPath: 'wordId', autoIncrement: true});
        wordsOS.createIndex('word', 'word', {unique: true});
        db.createObjectStore('entries', {keyPath: 'entryId', autoIncrement: true});
        db.createObjectStore('synSets', {keyPath: 'synSetId'});
      };

      openDBRequest.onsuccess = function(e) {
        console.log('indexedDB.open() onsuccess', e);
        db = e.target.result;
        db.onerror = function(e) {
          console.warn('db error', e);
        };
        deferred.resolve(db);
      };
      
      return deferred.promise;
    }
    
    // todo: refactor
    function saveWordToDB(data) {
      var synSetIds = [],
        entryIds = [],
        deferred = $q.defer(),
        synSetsTransaction, synSetsOS,
        entriesTransaction, entriesOS,
        wordTransaction;

      synSetsTransaction = db.transaction('synSets', 'readwrite');
      synSetsOS = synSetsTransaction.objectStore('synSets');
      data.wordnet.forEach(function (v) {
        synSetIds.push(v.synSetId);
        synSetsOS.put(v);
      });

      synSetsTransaction.onerror = function (e) {
        deferred.reject(e);
      };

      synSetsTransaction.oncomplete = function () {
        entriesTransaction = db.transaction('entries', 'readwrite');
        entriesOS = entriesTransaction.objectStore('entries');
        data.webster.forEach(function (v) {
          entriesOS.add(v).onsuccess = function (e) {
            entryIds.push(e.target.result);
          };
        });

        entriesTransaction.onerror = function (e) {
          synSetsTransaction.abort();
          deferred.reject(e);
        };

        entriesTransaction.oncomplete = function() {
          wordTransaction = db.transaction('words', 'readwrite');
          wordTransaction.objectStore('words').add({
            word: data.word,
            synSetIds: synSetIds,
            entryIds: entryIds
          });

          wordTransaction.onerror = function (e) {
            synSetsTransaction.abort();
            entriesTransaction.abort();
            deferred.reject(e);
          };

          wordTransaction.oncomplete = function (e) {
            deferred.resolve(e);
          };
        };
      };
      
      return deferred.promise;
    }

    // todo: refactor
    function removeWordFromDB(word) {
      var deferred = $q.defer();
      
      _getWordObjectByIndex(word)
        .then(function (wordObject) {
          var synSetsTransaction, synSetsOS,
            entriesTransaction, entriesOS,
            wordTransaction;

          synSetsTransaction = db.transaction('synSets', 'readwrite');
          synSetsOS = synSetsTransaction.objectStore('synSets');
          wordObject.synSetIds.forEach(function (v) {
            synSetsOS.delete(v);
          });

          synSetsTransaction.onerror = function (e) {
            deferred.reject(e);
          };

          synSetsTransaction.oncomplete = function () {
            entriesTransaction = db.transaction('entries', 'readwrite');
            entriesOS = entriesTransaction.objectStore('entries');
            wordObject.entryIds.forEach(function (v) {
              entriesOS.delete(v);
            });

            entriesTransaction.onerror = function (e) {
              synSetsTransaction.abort();
              deferred.reject(e);
            };

            entriesTransaction.oncomplete = function() {
              wordTransaction = db.transaction('words', 'readwrite');
              wordTransaction.objectStore('words').delete(wordObject.wordId);

              wordTransaction.onerror = function (e) {
                synSetsTransaction.abort();
                entriesTransaction.abort();
                deferred.reject(e);
              };

              wordTransaction.oncomplete = function (e) {
                deferred.resolve(e);
              };
            };
          };
        }, function (reason) {
          deferred.reject(reason);
        });
      
      return deferred.promise;
    }

    // todo: refactor
    function getWordFromDB(word) {
      var deferred = $q.defer();

      _getWordObjectByIndex(word)
        .then(function (wordObject) {
          var synSets = [], entries = [],
            synSetsTransaction, synSetsOS,
            entriesTransaction, entriesOS;

          synSetsTransaction = db.transaction('synSets');
          synSetsOS = synSetsTransaction.objectStore('synSets');
          wordObject.synSetIds.forEach(function (v) {
            synSetsOS.get(v).onsuccess = function (e) {
              synSets.push(e.target.result);
            };
          });

          synSetsTransaction.onerror = function (e) {
            deferred.reject(e);
          };

          synSetsTransaction.oncomplete = function () {
            entriesTransaction = db.transaction('entries');
            entriesOS = entriesTransaction.objectStore('entries');
            wordObject.entryIds.forEach(function (v) {
              entriesOS.get(v).onsuccess = function (e) {
                entries.push(e.target.result);
              };
            });

            entriesTransaction.onerror = function (e) {
              deferred.reject(e);
            };

            entriesTransaction.oncomplete = function() {
              deferred.resolve({
                word: wordObject.word,
                isSavedToDB: true,
                suggestions: [],
                webster: entries,
                wordnet: synSets
              });
            };
          };
        }, function (reason) {
          deferred.reject(reason);
        });

      return deferred.promise;
    }

    function getAllWordObjects() {
      var results = [],
        cursorRequest,
        deferred = $q.defer();

      cursorRequest = db
        .transaction('words')
        .objectStore('words')
        .index('word')
        .openCursor();

      cursorRequest.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          deferred.resolve(results);
        }

      };

      return deferred.promise;
    }

    storage = {
      initDatabase: initDatabase,
      saveWordToDB: saveWordToDB,
      removeWordFromDB: removeWordFromDB,
      getWordFromDB: getWordFromDB,
      getAllWordObjects: getAllWordObjects
    };

    return storage;
  }
})();