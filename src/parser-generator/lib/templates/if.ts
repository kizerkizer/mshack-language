const template_If = (conditional, body, hasElse, elseBody) => {
    let string = ``;
    string += `if (${conditional}) {\n${body}\n}`;
    if (hasElse) {
        string += ` else {\n${elseBody}\n}\n`
    } else {
        string += `\n`;
    }
    return string;
};

export default template_If;