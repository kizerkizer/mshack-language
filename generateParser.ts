import * as
    fs
from 'fs';

import {
    parseGrammar
} from './lib/grammarParser/grammarParser';

import {
    generateParser
} from './lib/parserGenerator/parserGenerator';

const grammarSource: string = fs.readFileSync(`./kizerlang.kzrgrammar`, `utf8`);

const grammar = parseGrammar(grammarSource);

const sourceCode = generateParser(grammar);

fs.writeFileSync(`parser.generated.ts`, sourceCode);