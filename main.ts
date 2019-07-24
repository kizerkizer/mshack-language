import { parse } from './parser.generated';

const main = () => {
    let code = `foo
    also
       bar`;
    parse(code) ? console.log(`valid`) : console.log(`invalid`);
};

main();