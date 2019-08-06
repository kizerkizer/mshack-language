import {
    Line,
    LineType,
    DirectiveType,
    getLines,
    DerivationLine,
    ProductionLine,
    DirectiveLine,
    IParsedTarget,
} from './lineParser';

import 
    IParsedGrammarElement
from './IParsedGrammarElement';
import { processDirectives } from './directiveProcessor';

const debugMode = true;

type IDerivation = Array<IParsedTarget>;
interface IProduction extends IParsedGrammarElement {
    name: string;
    derivations: IDerivation[];
    isEntryProduction: boolean;
    isAbstractProduction: boolean;
    alias: null | string;
}

interface IDirective extends IParsedGrammarElement {
    directiveType: DirectiveType;
    parameters: string[];
}

interface IGrammar {
    productions: IProduction[];
    directives: IDirective[];
}

const handleDirectiveLine = (grammar: IGrammar, directiveLine: DirectiveLine) => {
    let directive: IDirective = {
        type: `directive`,
        value: directiveLine.source,
        directiveType: directiveLine.directiveType,
        parameters: directiveLine.parameters
    };
    grammar.directives.push(directive);
};

const resetCtx = (ctx) => {
    ctx.currentProduction = null;
    ctx.currentDerivations = [];
    ctx.currentProductionIsAbstract = false;
    ctx.currentProductionIsEntry = false;
    ctx.currentProductionAlias = null;
};

const updateCtx = (ctx, productionLine) => {
    ctx.currentProduction = productionLine.name;
    ctx.currentProductionIsAbstract = productionLine.isAbstract;
    ctx.currentProductionIsEntry = productionLine.isEntry;
    ctx.currentProductionAlias = productionLine.alias;
};

const pushCurrentProduction = (grammar, ctx) => {
    grammar.productions.push({
        name: ctx.currentProduction,
        value: ctx.currentProduction,
        type: 'Production',
        derivations: Array.from(ctx.currentDerivations),
        isEntryProduction: ctx.currentProductionIsEntry,
        isAbstractProduction: ctx.currentProductionIsAbstract,
        alias: ctx.currentProductionAlias + ``
    } as IProduction);
    resetCtx(ctx);
};

const parseLines = (lines: Line[]) => {
    const grammar: IGrammar = {
        productions: [],
        directives: []
    },
        ctx = {
            currentProduction: null,
            currentDerivations: [],
            currentProductionIsAbstract: false,
            currentProductionIsEntry: false,
            currentProductionAlias: null
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
        } else if (line.type === LineType.DirectiveLine) {
            handleDirectiveLine(grammar, <DirectiveLine> line);
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
    let grammar = parseLines(getLines(source));
    processDirectives(grammar);
    return grammar;
};

export {
    parseGrammar,
    IGrammar,
    IProduction,
    IDerivation,
    IDirective,
    IParsedTarget
};