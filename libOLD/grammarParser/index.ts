interface Target {
    readonly type: TargetType;
    readonly value: string;
}

enum TargetType {
    LiteralTarget = 'LiteralTarget',
    TerminalTarget = 'TerminalTarget',
    NonTerminalTarget = 'NonTerminalTarget'
}

interface LiteralTarget extends Target {
    
}

interface TerminalTarget extends Target {
    readonly name: string;
}

interface NonTerminalTarget extends Target {
    readonly production: Production;
}

interface Terminal {
    readonly type: TerminalType
    readonly definition: string;
}

enum TerminalType {
    LiteralTerminal,
    RegexTerminal,
    BuiltInTerminal
}

interface Derivation {
    readonly tokens: Target[];
}

interface Production {
    readonly nonTerminalName: string;
    readonly derivations: Derivation[];
}

interface Grammar {
    readonly productions: Production[];
    readonly startingProduction: Production;
}

const parseGrammar: (grammarSource: string) => Grammar = (grammarSource: string): Grammar => {
    return null; // TODO
};

export {
    Target as Token,
    LiteralTarget,
    TerminalTarget,
    NonTerminalTarget,
    Derivation,
    Production,
    Grammar,
    parseGrammar
};