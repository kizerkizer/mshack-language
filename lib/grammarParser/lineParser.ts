enum LineType {
    ProductionLine
};

class Line {
    private _source: string;
    private _type: LineType;
    
    constructor (source: string, type: LineType) {
        this._source = source;
        this._type = type;
    }
    
    get source () {
        return this._source;
    }
    
    get type () {
        return this._type;
    }
}

class ProductionLine extends Line {
    private _name: string;
    private _isAbstract: boolean;
    private _isEntry: boolean;
    
    constructor (source: string, name: string, isAbstract: boolean, isEntry: boolean) {
        super(source, LineType.ProductionLine);
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
}

interface ILineParserFunction {
    (line: string): Line | false;
};

const tryParseProduction: ILineParserFunction = (line) => {
    let isAbstract = false,
        isEntry = false,
        originalLine = line + ``;
    if (line.startsWith(`abstract`)) {
        line = line.replace(`abstract`, ``).trim();
        isAbstract = true;
    }
    if (line.charAt(0) === `$`) {
        isEntry = true;
    }
    if (/[$A-Za-z]/.test(line)) {
        const parsedLine = new ProductionLine(originalLine, line, isAbstract, isEntry);
        return parsedLine;
    }
    return false;
};

const parseLine = (line: string, lineNumber: number) => {
    let parsedLine = null;
    if (parsedLine = tryParseProduction(line)) {
        return parsedLine;
    }
};

const getLines = (grammarSourceCode: string) => {
    //const lines = grammarSourceCode.replace(/;[^\n]*\n/g, `\n`).trim().split(`\n`);
    const lines = grammarSourceCode.split(`\n`);
    const parsedLines = lines.map(parseLine);
};