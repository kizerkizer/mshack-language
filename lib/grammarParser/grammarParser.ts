import {
    Line,
    LineType,
    getLines,
    DerivationLine,
    ProductionLine,
    IParsedTarget
} from './lineParser';

const debugMode = true;

type IDerivation = Array<IParsedTarget>;
interface IProduction {
    name: string;
    derivations: IDerivation[];
    isEntryProduction: boolean;
    isAbstractProduction: boolean;
}
interface IGrammar {
    productions: IProduction[];
}

const resetCtx = (ctx) => {
    ctx.currentProduction = null;
    ctx.currentDerivations = [];
    ctx.currentProductionIsAbstract = false;
    ctx.currentProductionIsEntry = false;
};

const updateCtx = (ctx, productionLine) => {
    ctx.currentProduction = productionLine.name;
    ctx.currentProductionIsAbstract = productionLine.isAbstract;
    ctx.currentProductionIsEntry = productionLine.isEntry;
};

const pushCurrentProduction = (grammar, ctx) => {
    grammar.productions.push({
        name: ctx.currentProduction,
        derivations: Array.from(ctx.currentDerivations),
        isEntryProduction: ctx.currentProductionIsEntry,
        isAbstractProduction: ctx.currentProductionIsAbstract
    } as IProduction);
    resetCtx(ctx);
};

const parseLines = (lines: Line[]) => {
    const grammar: IGrammar = {
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
            updateCtx(ctx, productionLine);
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

const parseGrammar = (source: string): IGrammar => {
    return parseLines(getLines(source));
};

export {
    parseGrammar,
    IGrammar,
    IProduction,
    IDerivation,
    IParsedTarget
};