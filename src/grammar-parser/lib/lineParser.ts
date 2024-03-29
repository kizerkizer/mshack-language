import
    IParsedGrammarElement
from './IParsedGrammarElement';
import { LineProvider } from './lineProvider';

enum LineType {
    ProductionLine,
    DerivationLine,
    DirectiveLine
};

abstract class Line {
    private _source: string;
    private _type: LineType;
    
    public comment: string;
    
    constructor (type: LineType) {
        this._type = type;
    }
   
    get source () {
        return this._source;
    }
    
    set source (value: string) {
        this._source = value;
    }
    
    get type () {
        return this._type;
    }
}

class ProductionLine extends Line {
    private _name: string;
    private _isAbstract: boolean;
    private _isEntry: boolean;
    private _alias: string | null;
    
    constructor (name: string, isAbstract: boolean, isEntry: boolean, alias: string | null) {
        super(LineType.ProductionLine);
        this._name = name;
        this._isAbstract = isAbstract;
        this._isEntry = isEntry;
        this._alias = alias;
    }
    
    get name () {
        return this._name;
    }
    
    get isAbstract () {
        return this._isAbstract;
    }
    
    get isEntry () {
        return this._isEntry;
    }

    get alias () {
        return this._alias;
    }
};

interface IParsedTarget extends IParsedGrammarElement {
    quantifier: string;
    isPresence: boolean;
    alias: null | string;
    parameters: string[];
}

class DerivationLine extends Line {
    private _targets: IParsedTarget[];
    
    constructor (targets: IParsedTarget[]) {
        super(LineType.DerivationLine);
        this._targets = targets;
    }
    
    get targets () {
        return this._targets;
    }
}

class DirectiveLine extends Line {
    public directiveType: DirectiveType;
    public parameters: string[];

    constructor (directiveType: DirectiveType, parameters: string[]) {
        super(LineType.DirectiveLine);
        this.directiveType = directiveType;
        this.parameters = parameters;
    }
}

enum DirectiveType {
    DefineNonterminal = 'terminal',
}

interface ILineParserFunction {
    (line: string): Line | false;
};

const tryParseProduction: ILineParserFunction = (line) => {
    let isAbstract = false,
        isEntry = false,
        alias = null;

    if (line.startsWith(`abstract`)) {
        line = line.replace(`abstract`, ``).trim();
        isAbstract = true;
    }

    // handle alias
    let aliasSplit = line.split(`=`);
    if (aliasSplit.length === 2) {
        [line, alias] = aliasSplit;
        if (!/[a-zA-Z_]+/.test(alias)) {
            console.error(`Invalid alias "${alias}"`);
            process.exit(1); // TODO
        } else if (isAbstract) {
            console.error(`Cannot alias an abstract production`);
            process.exit(1); // TODO
        } else {
            console.log(`alias "${alias}" for production line "${line}" detected`)
        }
    }
    
    if (line.charAt(0) === `$`) {
        isEntry = true;
    }
    if (/[$A-Za-z]/.test(line.charAt(0))) {
        const parsedLine = new ProductionLine(line, isAbstract, isEntry, alias);
        return parsedLine;
    }
    return false;
};

let nonterminalParamsRE = /\[([a-z\s]+)\]/;

function parseAlias (target: string) {
    let aliasSplit = target.split(`=`),
        alias = null;
        
    if (aliasSplit.length === 2) {
        [target, alias] = aliasSplit;
        if (!/[a-zA-Z_]+/.test(alias)) {
            console.error(`Invalid alias "${alias}"`);
            return false;
        } else {
            console.log(`alias "${alias}" for "${target}" detected`)
            return alias;
        }
    }
    
    return false;
}

function parsePresence (target: string) {
    let matchResult = null,
        isPresence = false;
    if (matchResult = target.match(/\(([^\)]+)\)/)) {
        console.log(`presence target ${target} detected`);
        target = target.replace(/\(([^\)]+)\)/, matchResult[1]);
        isPresence = true;
    }
    return isPresence;
}

const parseDerivationTargets = (unparsedTargets: string[]): IParsedTarget[] => {
    return unparsedTargets.map((target) => {

        // handle alias
        let alias = parseAlias(target);

        // handle presence target
        let isPresence = parsePresence(target);

        if (isPresence && alias !== null) {
            console.error(`Cannot alias a presence target`);
            process.exit(1); // TODO
        }

        // handle quantifier
        let q = null;
        if (q = target.match(/{([*|+])}/)) {
            console.log(`quantifier ${q[1]}`);
            q = q[1];
        }
        target = target.replace(/{([*|+])}/, ``);
        
        // literal, non-terminal, built-in?
        if (target.startsWith(`"`)) {
            let raw = target.replace(/"/g, ``);
            return {
                type: `literal`,
                value: raw,
                quantifier: q,
                isPresence,
                alias,
                parameters: []
            };
        } else if (target.startsWith(`<`)) {
            let raw = target.replace(/</g, ``).replace(/>/g, ``);
            let match = raw.match(nonterminalParamsRE);
            let parameters = [];
            if (match) {
                console.log(`parameters match`);
                raw = raw.replace(match[0], ``);
                parameters = match[1].trim().split(/\s/);
            }
            return {
                type: `terminal`,
                value: raw,
                quantifier: q,
                isPresence,
                alias,
                parameters
            };
        } else {
            return {
                type: `production`,
                value: target,
                quantifier: q,
                isPresence,
                alias,
                parameters: []
            };
        }
    });
};

const tryParseDerivation: ILineParserFunction = (line) => {
    let unparsedTargets = [];
    if (line.startsWith(`    |`)) {
        line = line.replace(`    |`, ``).trim();
        unparsedTargets = line.split(` `); // TODO quoted strings
        let parsedTargets = parseDerivationTargets(unparsedTargets);
        const parsedLine = new DerivationLine(parsedTargets);
        return parsedLine;
    }
    return false;
};

const directiveRE = /^!([a-z]*)((?:\s[^\s]+)*)$/;

const tryParseDirective: ILineParserFunction = (line) => {
    let match;
    if (match = line.match(directiveRE)) {
        let type = match[1];
        let params = match[2].trim().split(` `);
        const parsedLine = new DirectiveLine(type as DirectiveType, params);
        parsedLine.source = line;
        return parsedLine;
    }
    return false;
};

const lineParsers: ILineParserFunction[] = [
    tryParseDerivation,
    tryParseProduction,
    tryParseDirective,
];

const commentRE = /[^\\];([^\n]*)$/g;

const extractComment = (line: string) => {
    let comment = null,
        commentMatch;
    if (commentMatch = line.match(commentRE)) {
        comment = commentMatch[1];
        line = line.replace(commentMatch[0], `\n`);
    }
    return {
        uncommentedLine: line,
        comment
    };
};

const isIgnorableLine = (line: string) => {
    for (let character of line) {
        if (character === `\n` || character === `` || character === ` ` || character === `\t`) {
            continue;
        }
        return false;
    }
    return true;
}

const parseLine = (line: string, lineNumber: number) => {
    let parsedLine = null;
    let { uncommentedLine, comment } = extractComment(line);
    uncommentedLine = uncommentedLine.replace(/\\;/g, `;`);

    if (isIgnorableLine(uncommentedLine)) {
        return false;
    }
    for (let lineParser of lineParsers) {
        if (parsedLine = lineParser(uncommentedLine)) {
            break;
        }
    }
    if (!parsedLine) {
        return false; // TODO should be syntax error
    }
    if (comment) {
        parsedLine.comment = comment;
    }

    parsedLine.source = line;
    return parsedLine;
};

const getLines = (lineProvider: LineProvider) => {
    let lines = [],
        line;
    while (line = lineProvider.next()) {
        lines.push(line);
    }
    const parsedLines = lines.map(parseLine).filter(line => !!line);
    return parsedLines;
};

export {
    getLines,
    Line,
    ProductionLine,
    DerivationLine,
    DirectiveLine,
    LineType,
    DirectiveType,
    IParsedTarget
};