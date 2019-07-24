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
        value: `\n`,
        parseFn: (source, index, scout) => {
            if (source[index + scout] === `\n`) {
                scout++;
                return true;
            }
            return false;
        }
    },
    '<eof>': {
        type: `eof`,
        name: `EndOfFile`,
        value: null,
        parseFn: (source, index, scout) => {
            if (index === source.length) {
                return true;
            }
            return false;
        }
    }
};

const grammarSource: string = fs.readFileSync(`./language.grammar`, `utf8`),
    grammar = {
        productions: []
    };

let currentProduction = null,
    currentDerivations = [],
    lines = grammarSource.split(`\n`);

const pushCurrentProduction = () => {
    grammar.productions.push({
        name: currentProduction,
        derivations: Array.from(currentDerivations)
    });
    currentProduction = null;
    currentDerivations = [];
}
  
/* parse `language.grammar` file and populate `grammar` object */
lines.map((line, i) => {

    debugMode && console.log(`${i}: ${line}`);
    
    if (/^[A-Za-z]+$/.test(line.trim())) {
                
        /* new production */
        
        if (currentProduction) {
            pushCurrentProduction();
        }
        
        currentProduction = line.trim();
    } else if (line.startsWith(`    |`)) {
        
        /* new derivation for current production */
       
        let to = [];

        line.replace(`    |`, ``).trim().split(` `).map((target) => {
            debugMode && console.log(`   [target] ${target}`);
            if (target.startsWith(`"`)) {
                let raw = target.replace(/"/g, ``);
                to.push({
                    type: `literal`,
                    name: `Literal_${raw.replace(/ /g, `_`)}`,
                    value: raw
                });
            } else if (target.startsWith(`<`)) {
                to.push(builtInTerminals[target]);
            } else {
                to.push({
                    type: `nonterminal`,
                    productionName: target
                });
            }
        });
        
        currentDerivations.push(to);
    } else if (line === `\n` || line === ``) {
        // ignore
    } else {
        // TODO
        //debugMode && console.log(`Bad line:`);
        //debugMode && console.log(line);
    }
});

if (currentProduction) {
    pushCurrentProduction();
}

debugMode && console.log(JSON.stringify(grammar, null, 4));

/* generate a parser for the language */
let sc = ``, // source code
    { productions } = grammar,
    scs = {
        successfulParse: `/* success */ index += scout; scout = 0; return true;`,
        failedParse: `/* fail */ scout = 0; return false;`,
    };

const getParseFnName = (productionName) => `parse${productionName}`;

sc += `// generated ${new Date()}\n\n`;
sc += `let source, index = 0, scout = 0;\n\n`;

Object.values(builtInTerminals).map((b) => {
    if (b.parseFn) {
        sc += b.parseFn;
    }
});

productions.map((production) => {
    //sc += `/*\n * `;
    //sc +=  JSON.stringify(production, null, 4).split(`\n`).join(`\n * `);
    //sc += `\n*/\n`;
    sc += `const ${getParseFnName(production.name)} = () => {\n`;
    sc += `if (index >= source.length) return false;\n`
    production.derivations.map((derivation) => {
        sc += `    if (\n`;
        let clauses = [];
        derivation.map((to) => {
            if (to.type === `literal` || to.type === `eof`) {
                clauses.push(`parse${to.name}()`);
            } else if (to.type === `nonterminal`) {
                clauses.push(`parse${to.productionName}()`);
            } else {
                debugMode && console.log(`Invalid derivation:`)
                debugMode && console.log(JSON.stringify(to, null, 4));
            }
        });
        sc += `        ` + clauses.join(` &&\n        `);
        sc += `\n    ) {\n        ${scs.successfulParse}\n    }\n`;
    });
    sc += `    ${scs.failedParse}\n`;
    sc += `};\n\n`;
});

sc += `// end generated code`;

debugMode && console.log(sc);