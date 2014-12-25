RAD.model('word_definition', Backbone.Collection.extend({
    parseWordEntriesAndSet: function(word, entries) {
        var wordEntries = [], entryObj, entryWord,
            inflections, inflectionsNodes, tempChildren,
            $def, $sns, $dts, $vis, examples, definitions,
            bracketsRegExp = /\[+/,
            $entry,
            i, l, j, len;

        for(i = 0, l = entries.length; i < l; i++) {
            definitions = [];
            entryObj = {};
            $entry = $(entries[i]);
            entryWord = $entry.attr('id');
            if(bracketsRegExp.test(entryWord)) {
                entryObj['word'] = entryWord.substr(0, word.length);
            } else {
                entryObj['word'] = entryWord;
            }
            if(entryObj['word'] !== word) {
                continue;
            }

            entryObj['pronunciation'] = $entry.children('pr').text();
            entryObj['functionalLabel'] = $entry.children('fl').text();

            /* inflections */
            inflections = '';
            inflectionsNodes = $entry.children('in');
            inflectionsNodes.each(function(i, el) {
                tempChildren = el.childNodes;
                for(j = 0; j < tempChildren.length; j++) {
                    if(tempChildren[j].nodeName == 'if') {
                        inflections += '<span class="definition__if">' + tempChildren[j].childNodes[0].nodeValue + '</span> '
                    }
                    if(tempChildren[j].nodeName == 'il') {
                        inflections += '<span class="definition__il">' + tempChildren[j].childNodes[0].nodeValue + '</span> '
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
                definitions.push({
                    sn: $sns.eq(j).text(),
                    definition: $dts.get(j).childNodes[0].nodeValue,
                    examples: examples
                });

            }
            entryObj['definitions'] = definitions;

            wordEntries.push(entryObj);
        }

        this.reset(wordEntries);
    }
}), true);