/**
 *
 * Simple "parser" and parser generator for the language's grammar's language.
 *
 */

import * as
    fs
from 'fs';

import {
    SourceCodeBuilder
} from './codeGenerationLib';

const debugMode = true;

const parserDebugMode = true;

const gen: SourceCodeBuilder = new SourceCodeBuilder({
    tabWidth: 4
});

/*let test = '';

test += gen
    .const('foo', 'bar')
    .beginLine()
    .indent()
    .string('foo bar')
    .beginLine()
    .string('bar foo')
    .beginLine()
    .string('bar foo')
    .dedent()
    .beginLine()
    .string('the end')
    .blankLine()
    .function('foo', ['red', 'yellow'], gen.new().let('foo', 'bar').beginLine().string('return foo;').toString());

console.log(test); process.exit();*/

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

const grammarSource: string = fs.readFileSync(`./language.kzrgrammar`, `utf8`);

const lines = grammarSource.replace(/;[^\n]*\n/g, `\n`).split(`\n`);

const pushCurrentProduction = (grammar, ctx) => {
    grammar.productions.push({
        name: ctx.currentProduction,
        derivations: Array.from(ctx.currentDerivations),
        isEntryProduction: ctx.currentProduction.trim().startsWith(`$`)
    });
    ctx.currentProduction = null;
    ctx.currentDerivations = [];
};

const parseLines = (lines) => {
    const grammar = {
        productions: []
    },
        ctx = {
            currentProduction: null,
            currentDerivations: []
        };
    
    /* parse `language.grammar` file and populate `grammar` object */
    lines.map((line, i) => {

        debugMode && console.log(`${i}: ${line}`);
        
        if (/^[$A-Za-z]+$/.test(line.trim())) {
                    
            /* new production */
            
            if (ctx.currentProduction) {
                pushCurrentProduction(grammar, ctx);
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

let grammar = parseLines(lines);

const generateParser = (grammar) => {
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
       
    sc += gen
        .reset()
        .comment(`generated ${new Date()}`)
        .blankLine();

    sc += gen
        .reset()
        .function(`node`, [`name`, `value`, `children`], 
            gen.new().string(
`return {
    name,
    value,
    children
};`
            ).toString())
        .blankLine();

    sc += `const preRoot = {
        root: null
    };\n\n`;

    const getParseFnName = (productionName) => `parse${productionName}`;

    sc += gen
        .reset()
        .let(`source: string`, `\`\``)
        .beginLine()
        .let(`index: number`, `0`)
        .beginLine()
        .let(`scout: number`, `0`)
        .blankLine();

    sc += gen
        .reset()
        .comment(`begin built-ins`)
        .blankLine();

    Object.values(builtInTerminals).map((b) => {
        if (b.parseFn) {
            sc += b.parseFn;
            sc += gen
                .reset()
                .blankLine();
        }
    });
    
    sc += gen
        .reset()
        .comment(`end built-ins`)
        .blankLine();

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
    
    gen.reset();

    productions.map((production) => {
        if (production.isEntryProduction) {
            entryFunctionName = getParseFnName(production.name);
        }
        
        sc += gen
            .string(`const ${getParseFnName(production.name)} = () => {\n`);
            
        gen.indent();
        
        parserDebugMode && (sc += gen.string(`console.log(\`trying ${production.name}\`);\n`));
            
        sc += gen
            .string(`if (index >= source.length) return false;\n`);
        sc += gen
            .string(`const temp: { [key: string]: any } = {}; // holds $0, $1, ... variables \n\n`);
        
        production.derivations.map((derivation) => {
            // TODO:
            //sc += `let ${derivation.map((_, i) => `\$${i}`)};\n`;
            sc += gen.string(`if (\n`);
            gen.indent();
            
            let clauses = [];
            let toi = 0;
            derivation.map((to) => {
                let quantifierFunction = `quantifyOnce`;
                if (to.quantifier === `*`) {
                    quantifierFunction = `quantifyZeroOrMore`
                }
                if (to.quantifier === `+`) {
                    quantifierFunction = `quantifyOneOrMore`
                }

                if (to.type === `literal` || to.type === `eof` || to.type === `ws`) {
                    if (!to.isPresence) {
                        clauses.push(`(temp.\$${toi} = ${quantifierFunction}(parse${to.name}))`);
                    } else {
                        clauses.push(`/* presence */ (${quantifierFunction}(parse${to.name}))`);
                    }
                    to.type === `literal`
                        && builtInTerminals[`<${to.name.toLowerCase()}>`] === undefined
                        && literals.push(to);
                } else if (to.type === `nonterminal`) {
                    if (!to.isPresence) {
                        clauses.push(`(temp.\$${toi} = ${quantifierFunction}(parse${to.productionName}))`);
                    } else {
                        clauses.push(`/* presence */ (${quantifierFunction}(parse${to.productionName}))`);
                    }
                } else {
                    debugMode && console.log(`Invalid derivation:`)
                    debugMode && console.log(JSON.stringify(to, null, 4));
                }
                if (!to.isPresence) {
                toi++;
                }
            });
            
            sc += gen.string(clauses.join(` &&\n        `));
            sc += gen.string(`\n) {\n`);
            parserDebugMode && (sc += `console.log(\`parsed ${production.name}\`);\n`);
            
            sc += gen.string(`${scs.successfulParse(production.name, toi)}\n}\n`);
            gen.dedent();
        });
        parserDebugMode && (sc += gen.string(`console.log(\`no parsed ${production.name}\`);\n`));
        sc += gen.string(`${scs.failedParse}\n`);
        sc += gen
            .dedent()
            .string(`};`)
            .blankLine();
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

    return sc;
};

let sourceCode = generateParser(grammar);

fs.writeFileSync(`parser.generated.ts`, sourceCode);
