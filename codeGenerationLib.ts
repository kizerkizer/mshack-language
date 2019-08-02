class SourceCodeBuilder {
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
        if (this.representation[this.representation.length - 1] === `\n`) {
            this.tab(this.currentIndentLevel);
        }
        for (let character of str) {
            this.representation += character;
            if (character === `\n`) {
                this.currentTabOffset = 0;
                this.tab(this.currentIndentLevel);
            } else {
                this.currentTabOffset++;
            }
        }
        this.currentTabOffset = this.currentTabOffset % this.tabWidth;
    }
     
    string (str: string) {
        this.addString(str);
        return this;
    }

    new () {
        return new SourceCodeBuilder({
            tabWidth: this.tabWidth
        });
    }
    
    comment (text: string) {
        this.addString(`// ${text}`);
        return this;
    }
    
    reset () {
        this.representation = ``;
        this.currentIndentLevel = 0;
        this.currentTabOffset = 0;
        return this;        
    }
    
    let (name: string, value: string) {
        this.addString(`let ${name} = ${value};`);
        return this;
    }
    
    const (name: string, value: string) {
        this.addString(`const ${name} = ${value};`);
        return this;
    }
    
    function (name: string, parameters: string[], body: string) {
        this.addString(`function ${name} (${parameters.join(`, `)}) {`);
        this.beginLine();
        this.indent();
        this.addString(body);
        this.dedent();
        this.beginLine();
        this.addString(`}`);
        return this;
    }
    
    beginLine () {
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
        if (n === 0) {
            return this;
        }
        this.representation += ` `.repeat(this.tabWidth - this.currentTabOffset);
        return this;
    }
    
    indent () {
        this.currentIndentLevel++;
        return this;
    }
    
    dedent () {
        this.currentIndentLevel--;
        return this;
    }
    
    toString () {
        let representation = this.representation;
        this.representation = ``;
        return representation;
    }
}

export {
    SourceCodeBuilder
};