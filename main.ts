import { parse } from './parser.generated';

const main = () => {
    let code = `foo
    also
       bar`;
    let result = parse(code);
    console.log(JSON.stringify(result, null, 4));
};

main();