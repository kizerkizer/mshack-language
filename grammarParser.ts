/**
 *
 * Simple "parser" for the language's grammar's language.
 *
 */

import * as 
    fs
from 'fs';

const debugMode = true;

const builtInTerminals = {
    '<newline>': {
        type: `literal`,
        name: `NewLine`,
        value: `\n`
    },
    '<eof>': {
        type: `eof`,
        name: `EndOfFile`
    }
};

const grammarSource: string = fs.readFileSync(`./language.grammar`, `utf8`),
    grammar = {
        productions: []
    };

/* parse `language.grammar` file and populate `grammar` object */
let currentProduction = null,
    currentDerivations = [],
    lines = grammarSource.split(`\n`);
  
lines.map((line, i) => {
    
    if (/^[a-z]+$/.test(line.trim()) || i === lines.length - 1) {
                
        /* new production */
        
        if (currentProduction) {
            grammar.productions.push({
                name: currentProduction,
                derivations: Array.from(currentDerivations)
            });
            currentProduction = null;
            currentDerivations = [];
        }
        
        currentProduction = line.trim();
    } else if (line.startsWith(`    |`)) {
        
        /* new derivation for current production */
       
        line.replace(`    |`, ``).trim().split(` `).map((target) => {
            if (target.startsWith(`"`)) {
                let raw = target.replace(/"/g, ``);
                currentDerivations.push({
                    type: `literal`,
                    name: `Literal_${raw.replace(/ /g, `_`)}`,
                    value: raw
                });
            } else if (target.startsWith(`<`)) {
                currentDerivations.push(builtInTerminals[target]);
            } else {
                currentDerivations.push({
                    type: `nonterminal`,
                    productionName: target
                });
            }
        });
    }
});

debugMode && console.log(JSON.stringify(grammar, null, 4)); // ifs are for losers

/* generate a parser for the language */

let sc = ``,
    { productions } = grammar;

productions.map((production) => {
    sc += `const parse${production.name} = () => {\n`;
});

