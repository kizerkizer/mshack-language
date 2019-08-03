import * as
    fs
from 'fs';

import {
    getLines
} from './lineClassifier';

const grammarSource: string = fs.readFileSync(`language.kzrgrammar`, `utf8`);
console.log(grammarSource);

let lines = getLines(grammarSource);

console.log(JSON.stringify(lines, null, 2));