import * as
    fs
from 'fs';

import {
    parseGrammar
} from './grammarParser';

const grammarSource: string = fs.readFileSync(`language.kzrgrammar`, `utf8`);

let grammar = parseGrammar(grammarSource);

console.log(JSON.stringify(grammar, null, 2));