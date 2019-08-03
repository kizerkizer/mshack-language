/**
 *
 * Simple "parser" for the language's grammar's language.
 *
 */

import {
    Line,
    LineType,
    getLines,
    DerivationLine,
    ProductionLine
} from './lineParser';

const debugMode = true;

const pushCurrentProduction = (grammar, ctx) => {
    grammar.productions.push({
        name: ctx.currentProduction,
        derivations: Array.from(ctx.currentDerivations),
        isEntryProduction: ctx.currentProductionIsEntry,
        isAbstractProduction: ctx.currentProductionIsAbstract
    });
    ctx.currentProduction = null;
    ctx.currentDerivations = [];
    ctx.currentProductionIsAbstract = false;
    ctx.currentProductionIsEntry = false;
};

const parseLines = (lines: Line[]) => {
    const grammar = {
        productions: []
    },
        ctx = {
            currentProduction: null,
            currentDerivations: [],
            currentProductionIsAbstract: false,
            currentProductionIsEntry: false
        };
    
    lines.map((line: Line, i) => {

        debugMode && console.log(`${i}: ${line.source}`);
        
        if (line.type === LineType.ProductionLine) {
                    
            /* new production */
            
            if (ctx.currentProduction) {
                pushCurrentProduction(grammar, ctx);
            }

            let productionLine = (<ProductionLine> line);
            
            ctx.currentProduction = productionLine.name;
            ctx.currentProductionIsAbstract = productionLine.isAbstract;
            ctx.currentProductionIsEntry = productionLine.isEntry;
        } else if (line.type === LineType.DerivationLine) {
            
            /* new derivation for current production */
            ctx.currentDerivations.push((<DerivationLine> line).targets);
        } else {
            // TODO
        }
    });

    if (ctx.currentProduction) {
        pushCurrentProduction(grammar, ctx);
    }
    
    debugMode && console.log(JSON.stringify(grammar, null, 4));
    
    return grammar;
};

const parseGrammar = (source: string) => {
    return parseLines(getLines(source));
}

export {
    parseGrammar
};