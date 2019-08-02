import * as
    fs
from 'fs';

import {
    parseGrammar
} from './lib/grammarParser';

import {
    generateParser
} from './lib/parserGenerator';

const grammarSource: string = fs.readFileSync(`./language.kzrgrammar`, `utf8`);

const grammar = parseGrammar(grammarSource);

const sourceCode = generateParser(grammar);

fs.writeFileSync(`parser.generated.ts`, sourceCode);