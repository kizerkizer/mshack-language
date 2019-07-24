/**
 *
 * Simple "parser" for the language's grammar's language.
 *
 */

import * as 
    fs
from 'fs';

const debugMode = false;

const parserDebugMode = true;

const builtInTerminals = {
    '<newline>': {
        type: `literal`,
        name: `NewLine`,
        value: String.raw`\\n`,
        parseFn: `function parseNewLine () {
            ${parserDebugMode ? `console.log(\`trying <newline>\`);\n` : ``} 
            if (source[index + scout] === \`\\n\`) {
                scout++;
                return true;
            }
            return false;
        }`
    },
    '<eof>': {
        type: `eof`,
        name: `EndOfFile`,
        value: null,
        parseFn: `function parseEndOfFile () {
            ${parserDebugMode ? `console.log(\`trying <eof>\`);\n` : ``} 
            if (index === source.length) {
                return true;
            }
            return false;
        }`
    },
    '<space>': {
        type: `literal`,
        name: `Space`,
        value: ` `,
        parseFn: `function parseSpace () {
            ${parserDebugMode ? `console.log(\`trying <space>\`, index, scout);\n` : ``} 
            if (source[index + scout] === \` \`) {
                scout++;
                return true;
            }
            return false;
        }`
    },
    '<whitespace>': {
        type: `ws`,
        name: `Whitespace`,
        value: null,
        parseFn: `function parseWhitespace () {
            ${parserDebugMode ? `console.log(\`trying <whitespace>\`, index, scout);\n` : ``} 
            let i;
            for (i = 0; index + scout + i < source.length; i++) {
                if (source[index + scout + i] === \` \` || source[index + scout + i] === \`\\t\` || source[index + scout + i] === \`\\n\`) {
                    // let loop continue
                } else {
                    break;
                }
            }
            scout += i;
            return true;
        }`
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
        derivations: Array.from(currentDerivations),
        isEntryProduction: currentProduction.trim().startsWith(`$`)
    });
    currentProduction = null;
    currentDerivations = [];
}
  
/* parse `language.grammar` file and populate `grammar` object */
lines.map((line, i) => {

    debugMode && console.log(`${i}: ${line}`);
    
    if (/^[$A-Za-z]+$/.test(line.trim())) {
                
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
    },
    literals = [];

const getParseFnName = (productionName) => `parse${productionName}`;

sc += `// generated ${new Date()}\n\n`;
sc += `let source: string, index = 0, scout = 0;\n\n`;

sc += `// begin built-ins\n`
Object.values(builtInTerminals).map((b) => {
    if (b.parseFn) {
        sc += b.parseFn;
        sc += `\n\n`;
    }
});
sc += `// end built-ins\n\n`;

let entryFunctionName: string;

productions.map((production) => {
    //sc += `/*\n * `;
    //sc +=  JSON.stringify(production, null, 4).split(`\n`).join(`\n * `);
    //sc += `\n*/\n`;
    if (production.isEntryProduction) {
        entryFunctionName = getParseFnName(production.name);
    }
    sc += `const ${getParseFnName(production.name)} = () => {\n`;
    parserDebugMode && (sc += `    console.log(\`trying ${production.name}\`);\n`);
    sc += `    if (index >= source.length) return false;\n`
    production.derivations.map((derivation) => {
        sc += `    if (\n`;
        let clauses = [];
        derivation.map((to) => {
            if (to.type === `literal` || to.type === `eof` || to.type === `ws`) {
                clauses.push(`parse${to.name}()`);
                to.type === `literal`
                    && builtInTerminals[`<${to.name.toLowerCase()}>`] === undefined
                    && literals.push(to);
            } else if (to.type === `nonterminal`) {
                clauses.push(`parse${to.productionName}()`);
            } else {
                debugMode && console.log(`Invalid derivation:`)
                debugMode && console.log(JSON.stringify(to, null, 4));
            }
        });
        sc += `        ` + clauses.join(` &&\n        `);
        sc += `\n    ) {\n`;
        parserDebugMode && (sc += `console.log(\`parsed ${production.name}\`);\n`);
        sc += `${scs.successfulParse}\n    }\n`;
    });
    parserDebugMode && (sc += `    console.log(\`no parsed ${production.name}\`);\n`);
    sc += `    ${scs.failedParse}\n`;
    sc += `};\n\n`;
});

sc += `// begin literals\n`;
literals.map((l) => {
    sc +=  `function parse${l.name} () {\n`;
    if (parserDebugMode) {
        sc += `    console.log(\`trying literal "${l.name}"\`, index, scout);`;
    }
    sc += `    if (source.slice(index + scout, index + scout + ${l.value.length}) === \`${l.value}\`) {\n`;
    sc += `        scout += ${l.value.length}; return true;\n    }\n`;
    sc += `    return false;\n}\n\n`;
});
sc += `// end literals\n\n`;

sc += `const parse: (sourceCode: string) => boolean = (sourceCode: string) => { source = sourceCode; return ${entryFunctionName}(); }\n`
sc += `export { parse }\n\n`

sc += `// end generated code`;
debugMode && console.log(sc);
fs.writeFileSync(`parser.generated.ts`, sc);