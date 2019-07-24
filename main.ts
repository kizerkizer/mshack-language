import { parse } from './parser.generated';

const main = () => {
    let code = `foo also foo also bar also foo`;
    parse(code) ? console.log(`valid`) : console.log(`invalid`);
};

main();