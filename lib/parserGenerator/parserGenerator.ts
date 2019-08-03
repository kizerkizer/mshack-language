import {
    SourceCodeBuilder
} from '../codeGenerationLib';

import {
    IGrammar, IDerivation, IParsedTarget, IProduction
} from '../grammarParser/grammarParser';

import
    builtInTerminals
from './builtInTerminals';

import IParsedGrammarElement from '../grammarParser/IParsedGrammarElement';

const gen = new SourceCodeBuilder({
    tabWidth: 4
});

let entryFunctionName: string; // TODO get rid of global

const debugMode = true,
    parserDebugMode = true;

interface ICodeGenerator {
    (grammar: IGrammar): string;
}

const makeValidJSIdentifier = (value: string) => {
    return encodeURIComponent(value).replace(/%/g, `_`);
};

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

const getParseFnNameForTarget = (token: IParsedGrammarElement) => `parse${capitalize(token.type)}_${makeValidJSIdentifier(token.value)}`;

const generateHeaderComment: ICodeGenerator = (grammar: IGrammar) => {
    let sc = ``;
    sc += gen
        .reset()
        .comment(`generated ${new Date()}`)
        .blankLine();
    return sc;
};

const generateBuiltInFunctions: ICodeGenerator = (grammar: IGrammar) => {
    let sc = ``;
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
    return sc;
};

const generateNonterminalParseFunctions: ICodeGenerator = (grammar: IGrammar) => {
    let sc = ``;
    let { productions } = grammar;
    let scs = {
        successfulParse: (name, numChildren) => {
            return `/* success */ index += scout; scout = 0; return node(\`${name}\`, null, [${new Array(numChildren).fill('').map((_, i) => `temp.\$${i}`).join(`, `)}]);\n`
        },
        failedParse: `/* fail */ scout = 0; return false;`,
    };

    productions.map((production) => {
        if (production.isEntryProduction) {
            entryFunctionName = getParseFnNameForTarget(production);
        }
        
        sc += gen
            .string(`const ${getParseFnNameForTarget(production)} = () => {\n`);
            
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
                .map((target: IParsedTarget) => {
                    let quantifierFunctionName = getQuantifierFunctionName(target);

                    if (target.isPresence) {
                        clauses.push(
                            `/* presence */ ` + 
                            gen
                                .call(quantifierFunctionName, [getParseFnNameForTarget(target)])
                                .toString()
                        );
                        // do not increment `tempVariableIndex` as no variable used
                    } else {
                        clauses.push(
                            gen
                                .string(`(`)
                                .assignE(`temp.\$${tempVariableIndex}`, `${quantifierFunctionName}(${getParseFnNameForTarget(target)})`)
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
    return sc;
};

const generateLiteralParseFunctions: ICodeGenerator = (grammar: IGrammar) => {
    let sc = ``;
    let { productions } = grammar;

    sc += gen
        .comment(`begin literals`)
        .blankLine();
    
    let seenLiterals = {};

    productions.map(production => production.derivations).map((derivations) => {
        derivations.map((derivation) => {
            derivation.filter(target => target.type === `literal`).map((literal) => {
                if (seenLiterals[literal.value]) {
                    return;
                }
                seenLiterals[literal.value] = true;
                sc += gen.string(`function ${getParseFnNameForTarget(literal)} () {`).nl();
                gen.indent();
                
                if (parserDebugMode) {
                    sc += gen.string(`console.log(\`trying literal "${literal.value}"\`, index, scout);`).nl();
                }
                
                sc += gen.string(`if (source.slice(index + scout, index + scout + ${literal.value.length}) === \`${literal.value}\`) {`).nl();
                gen.indent();
                
                sc += gen.string(`scout += ${literal.value.length}; return node(\`${makeValidJSIdentifier(literal.value)}\`, \`${literal.value}\`, []);`).nl();
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
    
    return sc;
};

const generateTerminalParseFunctions: ICodeGenerator = (grammar: IGrammar) => {
    let sc = ``;
    let { productions } = grammar;

    sc += gen
        .comment(`begin non-terminals`)
        .blankLine();
    
    let seenTerminals = {};
    
    productions.map(production => production.derivations).map((derivations) => {
        derivations.map((derivation) => {
            derivation.filter(target => target.type === `terminal`).map((terminal) => {
                if (seenTerminals[terminal.value]) {
                    return;
                }
                seenTerminals[terminal.value] = true;

                //sc += gen.string(`function ${getParseFnNameForTarget(terminal)} () {`).nl();
                gen.indent();

                
                /*if (parserDebugMode) {
                    sc += gen.string(`console.log(\`trying terminal "${terminal.value}"\`, index, scout);`).nl();
                }*/

                // TODO

                gen.dedent();
                sc += gen.blankLine();
            });
        });
    });
    
    sc += gen
        .comment(`end non-terminals`)
        .blankLine();
    
    return sc;
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

const generateInitialVariables: ICodeGenerator = (grammar: IGrammar) => {
    let sc = ``;
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
    return sc;
};

const generateParser = (grammar: IGrammar) => {
    /* generate a parser for the language */
    let sc = ``; // source code
    
    sc += generateHeaderComment(grammar);

    sc += generateBuiltInFunctions(grammar);

    sc += generateInitialVariables(grammar);

    gen.reset();

    sc += generateNonterminalParseFunctions(grammar);
    
    gen.reset();

    sc += generateLiteralParseFunctions(grammar);

    // sc += generateTerminalParseFunctions(grammar);

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