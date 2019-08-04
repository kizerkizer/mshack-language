// TODO 
// This should sit in between lineParser and grammarParser. 
// Should export an interface of "grammar elements/components" (not make mention of lines/grammar source; abstracted away);.
// The grammarParser should assemble the stream of IGrammarElements into a Grammar. "Delinearizes" the stream into a data structure.

interface IGrammarElement {
    
}

enum GrammarElementType {
    Production,
    Rule,
    Directive,
}

interface IGrammarProduction {
    
}

interface IGrammarRule {

}

interface IGrammarDirective {

}

interface IGrammarElementProvider {
    [Symbol.iterator]: Iterable<IGrammarElement>;
}