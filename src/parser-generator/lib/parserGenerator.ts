import {
    SourceCodeBuilder
} from '../../../libOLD/codeGenerationLib';

import {
    IGrammar, IDerivation, IParsedTarget, IProduction
} from '../../grammar-parser/lib/grammarParser';

import
    builtInTerminals
from './builtInTerminals';

import IParsedGrammarElement from '../../grammar-parser/lib/IParsedGrammarElement';

import * as codeTemplates from './codeTemplates';
import template_Func from './templates/func';
import { template_CommentS } from './templates/comment';

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

const generateHeaderComment: ICodeGenerator = (grammar: IGrammar) => template_CommentS(`generated ${new Date()}`);

const generateHelperFunctions: ICodeGenerator = (grammar: IGrammar) => {
    let sc = ``;
    
    sc += codeTemplates.template_Fn_createNode();
    
    sc += codeTemplates.template_Fn_quantifyOnce();

    sc += codeTemplates.template_Fn_quantifyZeroOrMore();

    sc += codeTemplates.template_Fn_quantifyOneOrMore();
        
    sc += codeTemplates.template_Fn_quantifyAtLeast();
    
    sc += codeTemplates.template_Fn_processAliasesAndAST();

    sc += codeTemplates.template_Fn_postProcessTree();
    
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
        
        let bodySc = ``;
            
        gen.indent();
        
        parserDebugMode && (bodySc += gen.string(`console.log(\`trying ${production.name}\`);\n`));
            
        bodySc += gen
            .string(`if (index >= source.length) return false;\n`);
        bodySc += gen
            .string(`const temp: { [key: string]: any } = {}; // holds $0, $1, ... variables \n\n`);
        bodySc += gen
            .assign(`const scoutOriginal`, `scout`);

        gen.reset();
        
        production.derivations.map((derivation) => {
            // TODO:
            //sc += `let ${derivation.map((_, i) => `\$${i}`)};\n`;
            bodySc += gen.string(`if (\n`);
            
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

            bodySc += 
                gen.tab(2).toString() +
                clauses.join(
                    gen
                        .reset()
                        .string(` &&`)
                        .nl()
                        .tab(2)
                        .toString()
                );
            
            bodySc += gen
                .nl()
                .string(`) {`)
                .nl();
            
            parserDebugMode && (sc += `console.log(\`parsed ${production.name}\`);\n`);
            
            bodySc += gen
                .string(`${scs.successfulParse(production.name, tempVariableIndex, production.isEntryProduction, production.isAbstractProduction)}\n}\n`);
        });
        
        parserDebugMode && (bodySc += gen.string(`console.log(\`no parsed ${production.name}\`);\n`));
        
        bodySc += gen
            .string(`${scs.failedParse}`)
            .nl();
            
        /*sc += gen
            .dedent()
            .string(`};`)
            .blankLine(); DELETE */
        
        sc += template_Func(
            getParseFnNameForTarget(production),
            [
                `parameters = []`,
                `alias = null`
            ],
            bodySc
        );
        
        //sc += gen
            //.string(`const ${getParseFnNameForTarget(production)} = (parameters = [], alias = null) => {\n`);
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

    sc += generateHelperFunctions(grammar);

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