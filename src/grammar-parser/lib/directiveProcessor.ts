import { IGrammar } from "../../parser-generator/lib/parserGenerator";

import { IDirective } from "./grammarParser";

const handlers: { [directiveType: string]: IDirectiveHandler } = {};

interface IDirectiveHandler {
    (grammar: IGrammar, directive: IDirective): void;
}

handlers[`terminal`] = (grammar: IGrammar, directive: IDirective): void => {
    let [ terminalName, terminalValue ] = directive.parameters;
    terminalName = terminalName.replace(`<`, ``).replace(`>`, ``);
    grammar.productions.map((production) => {
        production.derivations.map((derivation) => {
            derivation.map((target) => {
                if (target.value === terminalName) {
                    target.type = `literal`;
                    target.name = terminalName;
                    target.value = terminalValue;
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