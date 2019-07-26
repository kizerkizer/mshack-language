import { parse } from './parser.generated';

const main = () => {

let code2 = `
    do __burn_bridges
do __nothing
pause __burn_bridges
 do __fight_fire
do __nothing
do __fight_fire
cancel __fight_fire
resume __burn_bridges
cancel __nothing
cancel __burn_bridges
cancel __burn_bridges
do __nothing`;

    let result = parse(code2);
    console.log(JSON.stringify(result, null, 4));
};

main();