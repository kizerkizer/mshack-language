/**
 *
 * Simple "parser" for the language's grammar's language.
 *
 */

import
    builtInTerminals
from './builtInTerminals';

const debugMode = true;

const pushCurrentProduction = (grammar, ctx) => {
    grammar.productions.push({
        name: ctx.currentProduction,
        derivations: Array.from(ctx.currentDerivations),
        isEntryProduction: ctx.currentProduction.trim().startsWith(`$`),
        isAbstractProduction: ctx.currentProductionIsAbstract
    });
    ctx.currentProduction = null;
    ctx.currentDerivations = [];
    ctx.currentProductionIsAbstract = false;
};

const parseLines = (lines) => {
    const grammar = {
        productions: []
    },
        ctx = {
            currentProduction: null,
            currentDerivations: [],
            currentProductionIsAbstract: false
        };
    
    /* parse `language.grammar` file and populate `grammar` object */
    lines.map((line: string, i) => {

        debugMode && console.log(`${i}: ${line}`);
        
        if (/[$A-Za-z]/.test(line.charAt(0))) {
                    
            /* new production */
            
            if (ctx.currentProduction) {
                pushCurrentProduction(grammar, ctx);
            }
           
            if (line.startsWith(`abstract`)) {
                ctx.currentProductionIsAbstract = true;
                line = line.replace(`abstract`, ``);
            }
            
            ctx.currentProduction = line.trim();
        } else if (line.startsWith(`    |`)) {
            
            /* new derivation for current production */
        
            let to = [];

            line.replace(`    |`, ``).trim().split(` `).map((target) => {
                debugMode && console.log(`   [target] ${target}`);

                // handle presence target
                let matchResult = null,
                isPresence = false;
                if (matchResult = target.match(/\(([^\)]+)\)/)) {
                debugMode && console.log(`presence target ${target} detected`);
                target = target.replace(/\(([^\)]+)\)/, matchResult[1]);
                isPresence = true;
                }

                // handle quantifier
                let q = null;
                if (q = target.match(/{([*|+])}/)) {
                    debugMode && console.log(`quantifier ${q[1]}`);
                    q = q[1];
                }
                target = target.replace(/{([*|+])}/, ``);
                
                // literal, non-terminal, built-in?
                if (target.startsWith(`"`)) {
                    let raw = target.replace(/"/g, ``);
                    to.push({
                        type: `literal`,
                        name: `Literal_${raw.replace(/ /g, `_`)}`,
                        value: raw,
                        quantifier: q,
                        isPresence
                    });
                } else if (target.startsWith(`<`)) {
                    to.push(Object.assign({}, builtInTerminals[target], { quantifier: q }));
                } else {
                    to.push({
                        type: `nonterminal`,
                        productionName: target,
                        quantifier: q,
                        isPresence
                    });
                }
            });

            ctx.currentDerivations.push(to);
        } else if (line === `\n` || line === ``) {
            // ignore
        } else {
            // TODO
            //debugMode && console.log(`Bad line:`);
            //debugMode && console.log(line);
        }
    });

    if (ctx.currentProduction) {
        pushCurrentProduction(grammar, ctx);
    }
    
    debugMode && console.log(JSON.stringify(grammar, null, 4));
    
    return grammar;
};

const parseGrammar = (grammarSourceCode: string) => {
    return parseLines(grammarSourceCode.replace(/;[^\n]*\n/g, `\n`).split(`\n`));
}

export {
    parseGrammar
};