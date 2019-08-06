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
    return encodeURIComponent(value)
        .replace(/%/g, `_pct_`)
        .replace(/\-/g, `_hyphen_`)
        .replace(/\~/g, `_tilde_`)
        .replace(/\./g, `_dot_`)
        .replace(/\(/g, `_leftparen_`)
        .replace(/\)/g, `_rightparen_`)
        .replace(/'/g, `_squote_`)
        .replace(/"/g, `_dquote_`)
        .replace(/`/g, `_backtickquote_`);
        
     // TODO rewrite; find better way of naming
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
        .function(`node`, [
            `name`, `value`, `children`, 
            gen
                .reset()
                .assignE(`properties`, `{}`)
                .toString()
            ],
            gen
                .new()
                .string(
                gen
                    .new()
                    .return(
                    gen
                        .new()
                        .objectL([
                            [`name`],
                            [`value`],
                            [`properties`],
                            [`children`],
                        ])
                        .toString()
                    )
                    .toString()
                )
                .toString()
        )
        .blankLine();
    
    sc +=
`function quantifyOnce (parseFn, ...rest) {
    return parseFn(...rest);
}\n\n`

    sc +=
`function quantifyZeroOrMore (parseFn, ...rest) {
    return quantifyAtLeast(0, parseFn, ...rest);
}\n\n`

    sc +=
`function quantifyOneOrMore (parseFn, ...rest) {
    return quantifyAtLeast(1, parseFn, ...rest);
}\n\n`
        
    sc +=
`function quantifyAtLeast (n, parseFn, ...rest) {
    let nodes = [], currentNode = null;
    while (currentNode = parseFn(...rest)) {
        nodes.push(currentNode);
    }
    if (nodes.length >= n) {
        return node(\`List\`, null, nodes, {
            isEntry: false, 
            isAbstract: true,
            alias: null
        });
    }
    return false;
}\n\n`

sc +=
`function processAbstract (tree) {
    // process abstract nodes
    let reprocess = true;
    while (reprocess) {
        reprocess = false;
        for (let i = tree.children.length - 1; i >= 0; i--) {
            let child = tree.children[i];
            if (child.properties.isAbstract) {
                console.log(\`Removing abstract \${child.name} and replacing with children.\`);

                // children of abstract productions inherit assigned aliases:
                /*if (child.properties.alias) {
                    child.children.map((grandChild) => {
                        grandChild.properties.alias = child.properties.alias; 
                    });
                }*/

                // splice in child's children in place of child:
                tree.children.splice(i, 1, ...(child.children));
                reprocess = true; // must check if any spliced-in children are also abstract
            }
        }
    }
    tree.children.map(child => processAbstract(child));
}`;

sc +=
`function processAliasesAndAST (tree, parent) {
    if (!tree.properties.alias) {
        tree.properties.alias = tree.name;
    }
    tree.type = tree.name;

    let tempValue = tree.value;
    delete tree.value;
    tree.value = tempValue;

    if (tree.children.length > 0) {
        tree.contents = {};
    } else {
        tree.contents = null;
    }

    tree.children.map(child => processAliasesAndAST(child, tree));
    
    if (parent) {
        if (parent.contents[tree.properties.alias] && !Array.isArray(parent.contents[tree.properties.alias])) {
            var temp = parent.contents[tree.properties.alias];
            parent.contents[tree.properties.alias] = [];
            parent.contents[tree.properties.alias].push(temp);
            parent.contents[tree.properties.alias].push(tree);
        } else if (parent.contents[tree.properties.alias] && Array.isArray(parent.contents[tree.properties.alias])) {
            parent.contents[tree.properties.alias].push(tree);
        } else if (parent.contents[tree.properties.alias]) {
            console.error('alias name collision');
            console.log(tree);
            console.log(parent.contents);
            process.exit(1); // TODO
        } else {
            parent.contents[tree.properties.alias] = tree;
        }
    }
    delete tree.children;
    delete tree.properties;
    delete tree.name;
}`

// TODO should move to another module which post-processes and effects parse-tree => AST
sc +=
`function postProcessTree (tree) {
    console.log(\`postProcess \${tree.name}\`);
    processAbstract(tree);
    processAliasesAndAST(tree, null);
}\n\n`;

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
        successfulParse: (name, numChildren, isEntry = false, isAbstract = false) => {
            return `/* success */ index += scout; scout = 0; return node(\`${name}\`, null, [${new Array(numChildren).fill('').map((_, i) => `temp.\$${i}`).join(`, `)}], {
                isEntry: ${isEntry},
                isAbstract: ${isAbstract},
                alias
            });\n`
        },
        failedParse: `/* fail */ scout = scoutOriginal; return false;`,
    };

    productions.map((production) => {
        if (production.isEntryProduction) {
            entryFunctionName = getParseFnNameForTarget(production);
        }
        
        sc += gen
            .string(`const ${getParseFnNameForTarget(production)} = (parameters = [], alias = null) => {\n`);
            
        gen.indent();
        
        parserDebugMode && (sc += gen.string(`console.log(\`trying ${production.name}\`);\n`));
            
        sc += gen
            .string(`if (index >= source.length) return false;\n`);
        sc += gen
            .string(`const temp: { [key: string]: any } = {}; // holds $0, $1, ... variables \n\n`);
        sc += gen
            .assign(`const scoutOriginal`, `scout`);

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
                                .call(quantifierFunctionName, [getParseFnNameForTarget(target), `[${target.parameters.map(parameter => `"${parameter}"`).join(`, `)}], ${target.alias ?  `'${target.alias}'` : `null`}`])
                                .toString()
                        );
                        // do not increment `tempVariableIndex` as no variable used
                    } else {
                        clauses.push(
                            gen
                                .string(`(`)
                                .assignE(`temp.\$${tempVariableIndex}`, `${quantifierFunctionName}(${getParseFnNameForTarget(target)}, [${target.parameters.map(parameter => `"${parameter}"`).join(`, `)}], ${target.alias ? `'${target.alias}'` : `null`})`)
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
                .string(`${scs.successfulParse(production.name, tempVariableIndex, production.isEntryProduction, production.isAbstractProduction)}\n}\n`);
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
                sc += gen.string(`function ${getParseFnNameForTarget(literal)} (parameters = [], alias = null) {`).nl(); // TODO parameters, alias arguments unused
                gen.indent();
                
                if (parserDebugMode) {
                    sc += gen.string(`console.log(\`trying literal "${literal.value}"\`, index, scout);`).nl();
                }
                
                sc += gen.string(`if (source.slice(index + scout, index + scout + ${literal.value.length}) === \`${literal.value}\`) {`).nl();
                gen.indent();
                
                sc += gen.string(`${parserDebugMode ? `console.log(\`parsed literal "${literal.value}"\`); ` : ``}scout += ${literal.value.length}; return node(\`${literal.name ? literal.name : makeValidJSIdentifier(literal.value)}\`, \`${literal.value}\`, [], { isEntry: false, isAbstract: false, alias: ${literal.alias ? `'${literal.alias}'` : literal.alias} });`).nl(); // TODO DRY node() function
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

    sc += gen.string(`const parse: (sourceCode: string) => any = (sourceCode: string) => { source = sourceCode;  let result = ${entryFunctionName}([]); postProcessTree(result); ${parserDebugMode ? `console.log(\`\\n---\\n\`, source.slice(0, index + scout));` : ``}\nreturn result;}`).nl();
    sc += gen.string(`export { parse }`).blankLine();
    sc += gen.comment(`end generated code`).beginLine();

    debugMode && console.log(sc);

    return sc;
};

export {
    generateParser,
    IGrammar
};