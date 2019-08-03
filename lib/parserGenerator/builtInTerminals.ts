const builtInTerminals = {
    'newline': {
        parseFn: `function parseNewLine () {
            if (source[index + scout] === \`\\n\`) {
                scout++;
                return node(\`NewLine\`, \`\\n\`, []);
            }
            return false;
        }`
    },
    'eof': {
        parseFn: `function parseEndOfFile () {
            if (index === source.length) {
                return node(\`EndOfFile\`, null, []);
            }
            return false;
        }`
    },
    'space': {
        parseFn: `function parseSpace () {
            if (source[index + scout] === \` \`) {
                scout++;
                return node(\`Space\`, \` \`, []);
            }
            return false;
        }`
    },
    'whitespace': {
        parseFn: `function parseWhitespace () {
            let i, epsilon;
            for (i = 0; index + scout + i < source.length; i++) {
                if (source[index + scout + i] === \` \` || source[index + scout + i] === \`\\t\` || source[index + scout + i] === \`\\n\`) {
                    // let loop continue
                } else {
                    break;
                }
            }
            scout += i;
            return node(\`Whitespace\`, source.slice(index + scout - i, index + scout), []);
        }`
    },
    'empty': {
        parseFn: `function parseEmpty () { return node (\`Empty\`, \`\`, []);}\n`
    }
};

export default builtInTerminals;