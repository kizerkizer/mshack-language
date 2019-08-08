const builtInTerminals = {
    'newline': {
        parseFn: `function parseTerminal_newline (parameters: string[]) {
            if (source[index + scout] === \`\\n\`) {
                scout++;
                return node(\`newline\`, \`\\n\`, []);
            }
            return false;
        }`
    },
    'eof': {
        parseFn: `function parseTerminal_eof (parameters: string[]) {
            if (index === source.length) {
                return node(\`eof\`, null, []);
            }
            return false;
        }`
    },
    'space': {
        parseFn: `function parseTerminal_space (parameters: string[]) {
            if (source[index + scout] === \` \`) {
                scout++;
                return node(\`space\`, \` \`, []);
            }
            return false;
        }`
    },
    'whitespace': {
        parseFn: `function parseTerminal_whitespace (parameters: string[], alias: string) {
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
            return node(\`whitespace\`, source.slice(index + scout - i, index + scout), []);
        }`
    },
    'empty': {
        parseFn: `function parseTerminal_empty (parameters: string[], alias: string) { return node (\`empty\`, \`\`, []);}\n`
    },
    'alpha': {
        parseFn: `function parseTerminal_alpha (parameters: string[], alias: string) {
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
            return node(\`alpha\`, source.slice(index + scout - i, index + scout), [], {
                isEntry: false,
                isAbstract: false,
                alias: \`\${alias}\`
            });
        }`
    }
};

export default builtInTerminals;