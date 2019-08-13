const template_CommentM = (text: string) => {
    let string = `/`,
        lines = text.split(/\n/g);
    string += lines.map(line => `* ${line}\n`);
    string += `*/\n`;
    return string; 
};

const template_CommentS = (text: string) => `// ${text}\n`;

export {
    template_CommentM,
    template_CommentS
};