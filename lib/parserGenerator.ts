/**
 * 
 * Generates a parser for the language in TypeScript given a grammar object.
 * 
 */
 
import {
    SourceCodeBuilder
} from './codeGenerationLib';

import
    builtInTerminals
from './builtInTerminals';

const gen = new SourceCodeBuilder({
    tabWidth: 4
});

const debugMode = true,
    parserDebugMode = true;

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
            
        gen.reset();
        
        production.derivations.map((derivation) => {
            // TODO:
            //sc += `let ${derivation.map((_, i) => `\$${i}`)};\n`;
            sc += gen.string(`if (\n`);
            
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
                        clauses.push(
                            gen
                                .string(`(`)
                                .assignE(`(temp.\$${toi}`, `${quantifierFunction}(parse${to.name}))`)
                                .string(`)`)
                                .toString()
                        );
                    } else {
                        clauses.push(
                            `/* presence */ ` + 
                            gen
                                .call(quantifierFunction, [`parse${to.name}`])
                                .toString()
                        );
                    }
                    to.type === `literal`
                        && builtInTerminals[`<${to.name.toLowerCase()}>`] === undefined
                        && literals.push(to);
                } else if (to.type === `nonterminal`) {
                    if (!to.isPresence) {
                        clauses.push(
                            gen
                                .string(`(`)
                                .assignE(`(temp.\$${toi}`, `${quantifierFunction}(parse${to.productionName}))`)
                                .string(`)`)
                                .toString()
                        );
                    } else {
                        clauses.push(
                            `/* presence */ ` + 
                            gen
                                .call(quantifierFunction, [`parse${to.productionName}`])
                                .toString()
                        );
                    }
                } else {
                    debugMode && console.log(`Invalid derivation:`)
                    debugMode && console.log(JSON.stringify(to, null, 4));
                }
                if (!to.isPresence) {
                    toi++;
                }
            });
            
            gen.reset();

            sc += 
                gen.tab(2).toString() +
                clauses.join(
                    gen
                        .reset()
                        .string(` &&`)
                        .nl()
                        .tab(2)
                        .toString()
                );
            
            sc += gen
                .nl()
                .string(`) {`)
                .nl();
            
            parserDebugMode && (sc += `console.log(\`parsed ${production.name}\`);\n`);
            
            sc += gen
                .string(`${scs.successfulParse(production.name, toi)}\n}\n`);
        });
        
        parserDebugMode && (sc += gen.string(`console.log(\`no parsed ${production.name}\`);\n`));
        
        sc += gen
            .string(`${scs.failedParse}`)
            .nl();
            
        sc += gen
            .dedent()
            .string(`};`)
            .blankLine();
    });
    
    gen.reset();

    sc += gen
        .comment(`begin literals`)
        .nl();
    
    literals.map((l) => {
        sc += gen.string(`function parse${l.name} () {`).nl();
        gen.indent();
        
        if (parserDebugMode) {
            sc += gen.string(`console.log(\`trying literal "${l.name}"\`, index, scout);`).nl();
        }
        
        sc += gen.string(`if (source.slice(index + scout, index + scout + ${l.value.length}) === \`${l.value}\`) {`).nl();
        gen.indent();
        
        sc += gen.string(`scout += ${l.value.length}; return node(\`${l.name}\`, \`${l.value}\`, []);`).nl();
        gen.dedent();
        
        sc += gen.string(`}`).nl();
        sc += gen.string(`return false;`).nl();
        gen.dedent();
        
        sc += gen.string(`}`);
        sc += gen.blankLine();
    });
    
    sc += gen.comment(`end literals`).blankLine();

    sc += gen.string(`const parse: (sourceCode: string) => any = (sourceCode: string) => { source = sourceCode;  let result = ${entryFunctionName}(); ${parserDebugMode ? `console.log(\`\\n---\\n\`, source.slice(0, index + scout));` : ``}\nreturn result;}`).nl();
    sc += gen.string(`export { parse }`).blankLine();

    sc += gen.comment(`end generated code`).nl();
    debugMode && console.log(sc);

    return sc;
};

export {
    generateParser
};

