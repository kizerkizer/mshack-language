enum LineType {
    ProductionLine,
    RawDerivationLine
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
    
    constructor (name: string, isAbstract: boolean, isEntry: boolean) {
        super(LineType.ProductionLine);
        this._name = name;
        this._isAbstract = isAbstract;
        this._isEntry = isEntry;
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
};

class RawDerivationLine extends Line {
    private _unparsedTargets: string[];
    
    constructor (unparsedTargets: string[]) {
        super(LineType.ProductionLine);
        this._unparsedTargets = unparsedTargets;
    }
    
    get unparsedTargets () {
        return this._unparsedTargets;
    }
}

interface ILineParserFunction {
    (line: string): Line | false;
};

const tryParseProduction: ILineParserFunction = (line) => {
    let isAbstract = false,
        isEntry = false;
    if (line.startsWith(`abstract`)) {
        line = line.replace(`abstract`, ``).trim();
        isAbstract = true;
    }
    if (line.charAt(0) === `$`) {
        isEntry = true;
    }
    if (/^[$A-Za-z]+$/.test(line)) {
        const parsedLine = new ProductionLine(line, isAbstract, isEntry);
        return parsedLine;
    }
    return false;
};

const tryParseRawDerivation: ILineParserFunction = (line) => {
    let unparsedTargets = [];
    if (line.startsWith(`    |`)) {
        line = line.replace(`    |`, ``).trim();
        unparsedTargets = line.split(` `); // TODO quoted strings
        const parsedLine = new RawDerivationLine(unparsedTargets);
        return parsedLine;
    }
    return false;
};

const lineParsers: ILineParserFunction[] = [
    tryParseProduction,
    tryParseRawDerivation,
];

const extractComment = (line: string) => {
    let comment = null;
    let commentMatch = line.match(/;([^\n]*)\n/g);
    if (commentMatch[0]) {
        comment = commentMatch[1];
        line = line.replace(/;[^\n]*\n/g, `\n`);
    }
    return {
        line,
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
    let { line: uncommentedLine, comment } = extractComment(line);
    if (isIgnorableLine(line)) {
        return false;
    }
    lineParsers.map((lineParser) => {
        if (parsedLine = lineParser(uncommentedLine)) {
            return;
        }
    });
    if (!parsedLine) {
        return new Error(`Syntax errror!`);
    }
    if (comment) {
        parsedLine.comment = comment;
    }
    parsedLine.source = line;
    return parsedLine;
};

const getLines = (grammarSourceCode: string) => {
    //const lines = grammarSourceCode.replace(/;[^\n]*\n/g, `\n`).trim().split(`\n`);
    const lines = grammarSourceCode.split(`\n`);
    const parsedLines = lines.map(parseLine).filter(line => !!line);
    return parsedLines;
};