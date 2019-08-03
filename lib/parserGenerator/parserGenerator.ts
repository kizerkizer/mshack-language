import {
    SourceCodeBuilder
} from '../codeGenerationLib';

import {
    IGrammar, IDerivation, IParsedTarget
} from '../grammarParser/grammarParser';

import
    builtInTerminals
from './builtInTerminals';

const gen = new SourceCodeBuilder({
    tabWidth: 4
});

const debugMode = true,
    parserDebugMode = true;

const snippets = {

};

interface ICodeGenerator {
    (sc: string, grammar: IGrammar)
}

const generateHeaderComment: ICodeGenerator = (sc: string, grammar: IGrammar) => {
    sc += gen
        .reset()
        .comment(`generated ${new Date()}`)
        .blankLine();
};

const generateBuiltInFunctions: ICodeGenerator = (sc: string, grammar: IGrammar) => {
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
};

const generateNonterminalParseFunctions: ICodeGenerator = (sc: string, grammar: IGrammar) => {
    let { productions } = grammar;
    const getParseFnName = (productionName) => `parse${productionName}`;
    let entryFunctionName: string;
    let scs = {
        successfulParse: (name, numChildren) => {
            return `/* success */ index += scout; scout = 0; return node(\`${name}\`, null, [${new Array(numChildren).fill('').map((_, i) => `temp.\$${i}`).join(`, `)}]);\n`
        },
        failedParse: `/* fail */ scout = 0; return false;`,
    };

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
            let tempVariableIndex = 0;
            derivation
                .filter(target => target.type === "nonterminal")
                .map((target: IParsedTarget) => {
                    let quantifierFunctionName = getQuantifierFunctionName(target);

                    if (target.isPresence) {
                        clauses.push(
                            `/* presence */ ` + 
                            gen
                                .call(quantifierFunctionName, [`parse${target.name}`])
                                .toString()
                        );
                        // do not increment `tempVariableIndex` as no variable used
                    } else {
                        clauses.push(
                            gen
                                .string(`(`)
                                .assignE(`(temp.\$${tempVariableIndex}`, `${quantifierFunctionName}(parse${target.name}))`)
                                .string(`)`)
                                .toString()
                        );
                        tempVariableIndex++;
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
                .string(`${scs.successfulParse(production.name, tempVariableIndex)}\n}\n`);
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
};

const generateLiteralParseFunctions: ICodeGenerator = (sc: string, grammar: IGrammar) => {
    let { productions } = grammar;

    sc += gen
        .comment(`begin literals`)
        .blankLine();
    
    productions.map(production => production.derivations).map((derivations) => {
        derivations.map((derivation) => {
            derivation.filter(target => target.type === `literal`).map((literal) => {
                sc += gen.string(`function parse${literal.name} () {`).nl();
                gen.indent();
                
                if (parserDebugMode) {
                    sc += gen.string(`console.log(\`trying literal "${literal.name}"\`, index, scout);`).nl();
                }
                
                sc += gen.string(`if (source.slice(index + scout, index + scout + ${literal.value.length}) === \`${l.value}\`) {`).nl();
                gen.indent();
                
                sc += gen.string(`scout += ${literal.value.length}; return node(\`${literal.name}\`, \`${literal.value}\`, []);`).nl();
                gen.dedent();
                
                sc += gen.string(`}`).nl();
                sc += gen.string(`return false;`).nl();
                gen.dedent();
                
                sc += gen.string(`}`);
                sc += gen.blankLine();
            });
        });
    });
    
    sc += gen
        .comment(`end literals`)
        .blankLine();
};

const generateTerminalParseFunctions: ICodeGenerator = (sc: string, grammar: IGrammar) => {
    let { productions } = grammar;

    sc += gen
        .comment(`begin non-terminals`)
        .blankLine();
    
    productions.map(production => production.derivations).map((derivations) => {
        derivations.map((derivation) => {
            derivation.filter(target => target.type === `terminal`).map((terminal) => {
                sc += gen.string(`function parse${terminal.name} () {`).nl();
                gen.indent();
                
                if (parserDebugMode) {
                    sc += gen.string(`console.log(\`trying terminal "${terminal.name}"\`, index, scout);`).nl();
                }

                if (builtInTerminals[terminal.name]) {
                    sc += builtInTerminals[terminal.name].parseFn;
                } else {
                    debugMode && console.error(`Invalid terminal <${terminal.name}>`)
                }

                gen.dedent();
                sc += gen.string(`}`);
                sc += gen.blankLine();
            });
        });
    });
    
    sc += gen
        .comment(`end non-terminals`)
        .blankLine();
};

const getQuantifierFunctionName = (target: IParsedTarget) => {
    let quantifierFunction = `quantifyOnce`;
    if (target.quantifier === `*`) {
        quantifierFunction = `quantifyZeroOrMore`
    }
    if (target.quantifier === `+`) {
        quantifierFunction = `quantifyOneOrMore`
    }
    return quantifierFunction;
};

const generateInitialVariables: ICodeGenerator = (sc: string, grammar: IGrammar) => {
    sc += `const preRoot = {
        root: null
    };\n\n`;

    sc += gen
        .reset()
        .let(`source: string`, `\`\``)
        .beginLine()
        .let(`index: number`, `0`)
        .beginLine()
        .let(`scout: number`, `0`)
        .blankLine();
};

const generateParser = (grammar: IGrammar) => {
    /* generate a parser for the language */
    let sc = ``, // source code
        literals = [];
    
    generateHeaderComment(sc, grammar);

    generateBuiltInFunctions(sc, grammar);

    generateInitialVariables(sc, grammar);

    gen.reset();

    generateNonterminalParseFunctions(sc, grammar);
    
    gen.reset();

    generateLiteralParseFunctions(sc, grammar);

    generateTerminalParseFunctions(sc, grammar);

    sc += gen.string(`const parse: (sourceCode: string) => any = (sourceCode: string) => { source = sourceCode;  let result = ${entryFunctionName}(); ${parserDebugMode ? `console.log(\`\\n---\\n\`, source.slice(0, index + scout));` : ``}\nreturn result;}`).nl();
    sc += gen.string(`export { parse }`).blankLine();
    sc += gen.comment(`end generated code`).beginLine();

    debugMode && console.log(sc);

    return sc;
};

export {
    generateParser,
    IGrammar
};