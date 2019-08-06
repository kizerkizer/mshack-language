import { parse } from './parser.generated';
import { fstat, writeFileSync } from 'fs';

const evaluate = (node) => {

};

const main = () => {

let code2 =
`abcdefg      <- 
    "bar"`;
    let result = parse(code2);
    //console.log(JSON.stringify(result, null, 4));
   
    writeFileSync('./out/parseResult.json', JSON.stringify(result, null, 4));

    evaluate(result);
};

main();