class CodeElement {
    private representation: string;
    private tabWidth: number;
    private currentTabOffset: number;
    private currentIndentLevel: number;
    
    constructor (options) {
        this.representation = ``;
        this.tabWidth = options.tabWidth || 4;
        this.currentTabOffset = 0;
        this.currentIndentLevel = 0;
    }
    
    private addString (str: string) {
        this.representation += str;
        let newlines = 0;
        for (let character of str) {
            if (character === `\n`) {
                newlines++;
            }
        }
        this.currentTabOffset += str.length - newlines;
        this.currentTabOffset = this.currentTabOffset % this.tabWidth;
    }
    
    beginLine () {
        this.addString((` `.repeat(this.tabWidth)).repeat(this.currentIndentLevel));
        this.addString(`\n`);
        return this;
    }
    
    blankLine () {
        this.representation += `\n\n`;
        return this;
    }
    
    newlines (n: number) {
        this.representation += `\n`.repeat(n);
        return this;
    }
    
    blankLines (n: number) {
        this.representation += `\n`.repeat(n + 1);
        return this;
    }
    
    tab (n: number = 1) {
        this.representation += ` `.repeat(this.tabWidth - this.currentTabOffset);
    }
    
    indent (n: number = 1) {
        this.currentIndentLevel += n;
    }
    
    toString () {
        return this.representation;
    }
}