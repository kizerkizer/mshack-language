/**
 * Simple "parser" for the language's grammar's language.
 */

import * as 
    fs
from 'fs';

const builtInTerminals = {
    '<newline>': {
        type: `literal`,
        name: `NewLine`,
        string: `\n`
    }
};

const grammarSource: string = fs.readFileSync(`./language.grammar`, `utf8`),
    grammar = {
        productions: []
    };

let currentProduction = null,
    currentDerivations = [];
    
let lines = grammarSource.split(`\n`);

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
                    name: `Literal_${raw}`,
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

console.log(JSON.stringify(grammar));