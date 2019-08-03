import { IGrammar } from "../parserGenerator/parserGenerator";

import { IDirective } from "./grammarParser";

const handlers: { [directiveType: string]: IDirectiveHandler } = {};

interface IDirectiveHandler {
    (grammar: IGrammar, directive: IDirective): void;
}

handlers[`nonterminal`] = (grammar: IGrammar, directive: IDirective): void => {
    let [ nonTerminalName, nonTerminalValue ] = directive.parameters;
    nonTerminalName = nonTerminalName.replace(`<`, ``).replace(`>`, ``);
    grammar.productions.map((production) => {
        production.derivations.map((derivation) => {
            derivation.map((target) => {
                if (target.value === nonTerminalName) {
                    target.type = `literal`;
                    target.value = nonTerminalValue;
                }
            });
        })
    })
};

const processDirectives = (grammar: IGrammar) => {
    let { directives } = grammar;
    for (let directive of directives) {
        if (handlers[directive.directiveType]) {
            handlers[directive.directiveType](grammar, directive);
        } else {
            console.error(`Invalid directive "${directive.directiveType}"`); // TODO
        }
    }
};

export {
    processDirectives
}