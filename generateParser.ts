import * as
    fs
from 'fs';

import {
    parseGrammar
} from './src/grammar-parser/lib/grammarParser';

import {
    generateParser
} from './src/parser-generator/lib/parserGenerator';

const grammarSource: string = fs.readFileSync(`./kizerlang.kzrgrammar`, `utf8`);

const grammar = parseGrammar(grammarSource);
fs.writeFileSync(`./out/grammarResult.json`, JSON.stringify(grammar, null, 4));

const sourceCode = generateParser(grammar);
fs.writeFileSync(`parser.generated.ts`, sourceCode);