import { parse } from './parser.generated';
import { fstat, writeFileSync } from 'fs';

const evaluate = (node) => {

};

const main = () => {

let code2 = `
    do __burn_bridges
do __nothing
pause __burn_bridges
block_begin
    do __fight_fire
    do __nothing
    do __fight_fire
block_end
cancel __fight_fire
resume __burn_bridges
cancel __nothing
resume "custom"
cancel __burn_bridges
cancel __burn_bridges
do __nothing`;

    let result = parse(code2);
    //console.log(JSON.stringify(result, null, 4));
   
    writeFileSync('./out/parseResult.json', JSON.stringify(result, null, 4));

    evaluate(result);
};

main();