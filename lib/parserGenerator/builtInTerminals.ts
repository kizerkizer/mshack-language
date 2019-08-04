const builtInTerminals = {
    'newline': {
        parseFn: `function parseTerminal_newline (parameters: string[]) {
            if (source[index + scout] === \`\\n\`) {
                scout++;
                return node(\`NewLine\`, \`\\n\`, []);
            }
            return false;
        }`
    },
    'eof': {
        parseFn: `function parseTerminal_eof (parameters: string[]) {
            if (index === source.length) {
                return node(\`EndOfFile\`, null, []);
            }
            return false;
        }`
    },
    'space': {
        parseFn: `function parseTerminal_space (parameters: string[]) {
            if (source[index + scout] === \` \`) {
                scout++;
                return node(\`Space\`, \` \`, []);
            }
            return false;
        }`
    },
    'whitespace': {
        parseFn: `function parseTerminal_whitespace (parameters: string[]) {
            console.log(\`parseTerminal_whitespace; parameters=\`);
            console.log(parameters);
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
        parseFn: `function parseTerminal_empty (parameters: string[]) { return node (\`Empty\`, \`\`, []);}\n`
    },
    'alpha': {
        parseFn: `function parseTerminal_alpha (parameters: string[]) {
            let i;
            for (i = 0; index + scout + i < source.length; i++) {
                if (/[a-zA-Z]/.test(source[index + scout + i])) {
                    // let loop continue
                } else {
                    break;
                }
            }
            if (i === 0) {
                return false;
            }
            scout += i;
            return node(\`Alpha\`, source.slice(index + scout - i, index + scout), []);
        }`
    }
};

export default builtInTerminals;