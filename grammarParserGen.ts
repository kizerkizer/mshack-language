/**
 *
 * Simple "parser" and parser generator for the language's grammar's language.
 *
 */

import * as
    fs
from 'fs';

const debugMode = true;

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
                return node(\`NewLine\`, \`\\n\`, []);
            }
            return false;
        }`
    },
    '<eof>': {
        type: `eof`,
        name: `EndOfFile`,
        value: null,
        parseFn: `function parseEndOfFile () {
            ${parserDebugMode ? `console.log(\`trying <eof>\`, index, scout, source.length);\n` : ``} 
            if (index === source.length) {
                return node(\`EndOfFile\`, null, []);
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
                return node(\`Space\`, \` \`, []);
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
            let i, epsilon;
            for (i = 0; index + scout + i < source.length; i++) {
                if (source[index + scout + i] === \` \` || source[index + scout + i] === \`\\t\` || source[index + scout + i] === \`\\n\`) {
                    // let loop continue
                } else {
                    break;
                }
            }
            scout += i;
            return node(\`Whitespace\`, source.slice(index + scout - i, index + scout), []);
        }`
    },
    '<empty>': {
        type: 'literal',
        name: `Empty`,
        value: ``,
        parseFn: `function parseEmpty () { return node (\`Empty\`, \`\`, []);}\n`
    }
};

const grammarSource: string = fs.readFileSync(`./language.grammar`, `utf8`),
    grammar = {
        productions: []
    };

let currentProduction = null,
    currentDerivations = [],
    lines = grammarSource.replace(/;[^\n]*\n/g, `\n`).split(`\n`);

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
                    quantifier: q 
                });
            } else if (target.startsWith(`<`)) {
                to.push(Object.assign({}, builtInTerminals[target], { quantifier: q }));
            } else {
                to.push({
                    type: `nonterminal`,
                    productionName: target,
                    quantifier: q  
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
        successfulParse: (name, numChildren) => {
          return `/* success */ index += scout; scout = 0; return node(\`${name}\`, null, [${new Array(numChildren).fill('').map((_, i) => `temp.\$${i}`).join(`, `)}]);\n`
        },
        failedParse: `/* fail */ scout = 0; return false;`,
    },
    literals = [];
sc += `// generated ${new Date()}\n\n`;

sc += `
function node (name, value, children) {
    return {
        name,
        value,
        children
    };
}\n\n`;

sc += `const preRoot = {
    root: null
};\n\n`;


const getParseFnName = (productionName) => `parse${productionName}`;

sc += `let source: string, index = 0, scout = 0;\n\n`;

sc += `// begin built-ins\n`
Object.values(builtInTerminals).map((b) => {
    if (b.parseFn) {
        sc += b.parseFn;
        sc += `\n\n`;
    }
});
sc += `// end built-ins\n\n`;

sc +=
`function quantifyOnce (parseFn) {
    return parseFn();
};\n`

sc +=
`function quantifyZeroOrMore (parseFn) {
    return quantifyAtLeast(0, parseFn);
};\n`

sc +=
`function quantifyOneOrMore (parseFn) {
    return quantifyAtLeast(1, parseFn);
};\n`

sc +=
`function quantifyAtLeast (n, parseFn) {
    let nodes = [], currentNode = null;
    while (currentNode = parseFn()) {
        nodes.push(currentNode);
    }
    if (nodes.length >= n) {
        return node(\`List\`, null, nodes);
    }
    return false;
};\n\n`

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
    sc += `    const temp: { [key: string]: any } = {}; // holds $0, $1, ... variables \n\n`;
    production.derivations.map((derivation) => {
        // TODO:
        //sc += `let ${derivation.map((_, i) => `\$${i}`)};\n`;
        sc += `    if (\n`;
        let clauses = [];
        derivation.map((to, toi) => {
            let quantifierFunction = `quantifyOnce`;
            if (to.quantifier === `*`) {
                quantifierFunction = `quantifyZeroOrMore`
            }
            if (to.quantifier === `+`) {
                quantifierFunction = `quantifyOneOrMore`
            }

            if (to.type === `literal` || to.type === `eof` || to.type === `ws`) {
                clauses.push(`(temp.\$${toi} = ${quantifierFunction}(parse${to.name}))`);
                to.type === `literal`
                    && builtInTerminals[`<${to.name.toLowerCase()}>`] === undefined
                    && literals.push(to);
            } else if (to.type === `nonterminal`) {
                clauses.push(`(temp.\$${toi} = ${quantifierFunction}(parse${to.productionName}))`);
            } else {
                debugMode && console.log(`Invalid derivation:`)
                debugMode && console.log(JSON.stringify(to, null, 4));
            }
        });
        sc += `        ` + clauses.join(` &&\n        `);
        sc += `\n    ) {\n`;
        parserDebugMode && (sc += `console.log(\`parsed ${production.name}\`);\n`);
        sc += `${scs.successfulParse(production.name, derivation.length)}\n    }\n`;
    });
    parserDebugMode && (sc += `    console.log(\`no parsed ${production.name}\`);\n`);
    sc += `    ${scs.failedParse}\n`;
    sc += `};\n\n`;
});

sc += `// begin literals\n`;
literals.map((l) => {
    sc += `function parse${l.name} () {\n`;
    if (parserDebugMode) {
        sc += `    console.log(\`trying literal "${l.name}"\`, index, scout);\n`;
    }
    sc += `    if (source.slice(index + scout, index + scout + ${l.value.length}) === \`${l.value}\`) {\n`;
    sc += `        scout += ${l.value.length}; return node(\`${l.name}\`, \`${l.value}\`, []);\n    }\n`;
    sc += `    return false;\n}\n\n`;
});
sc += `// end literals\n\n`;

sc += `const parse: (sourceCode: string) => any = (sourceCode: string) => { source = sourceCode;  let result = ${entryFunctionName}(); ${parserDebugMode ? `console.log(\`\\n---\\n\`, source.slice(0, index + scout));` : ``}\nreturn result;}\n`
sc += `export { parse }\n\n`

sc += `// end generated code`;
debugMode && console.log(sc);
fs.writeFileSync(`parser.generated.ts`, sc);