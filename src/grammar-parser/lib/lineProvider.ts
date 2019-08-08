interface LineProvider {
    next(): string | null;
}

class FromStringLineProvider implements LineProvider {
    private _string: string;
    private _lines: string[];
    private _nextLineIndex: number = 0;

    constructor (string: string) {
        this._string = string;
        this._lines = string.replace(/\r/g, ``).split(`\n`);
    }
    
    next () {
            if (this._nextLineIndex >= this._lines.length) {
                return null;
            }
            return this._lines[this._nextLineIndex++];
    }
}

export {
    LineProvider,
    FromStringLineProvider
};