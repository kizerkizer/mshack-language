const template_Fn_createNode = () => 
`
function createNode (name, value, children) {
    return {
        name,
        value,
        properties: {},
        children
    };
}
`;

const template_Fn_quantifyOnce = () =>
`
function quantifyOnce (parseFn, ...rest) {
    return parseFn(...rest);
}\n\n`

const template_Fn_quantifyZeroOrMore = () =>
`
function quantifyZeroOrMore (parseFn, ...rest) {
    return quantifyAtLeast(0, parseFn, ...rest);
}\n\n`;

const template_Fn_quantifyOneOrMore = () =>
`
function quantifyOneOrMore (parseFn, ...rest) {
    return quantifyAtLeast(1, parseFn, ...rest);
}\n\n`;
        
const template_Fn_quantifyAtLeast = () =>
`
function quantifyAtLeast (n, parseFn, ...rest) {
    let nodes = [], currentNode = null;
    while (currentNode = parseFn(...rest)) {
        nodes.push(currentNode);
    }
    if (nodes.length >= n) {
        return node(\`List\`, null, nodes, {
            isEntry: false, 
            isAbstract: true,
            alias: null
        });
    }
    return false;
}\n\n`;

const template_Fn_processAliasesAndAST = () =>
`function processAliasesAndAST (tree, parent) {
    if (!tree.properties.alias) {
        tree.properties.alias = tree.name;
    }
    tree.type = tree.name;

    let tempValue = tree.value;
    delete tree.value;
    tree.value = tempValue;

    if (tree.children.length > 0) {
        tree.contents = {};
    } else {
        tree.contents = null;
    }

    tree.children.map(child => processAliasesAndAST(child, tree));
    
    if (parent) {
        if (parent.contents[tree.properties.alias] && !Array.isArray(parent.contents[tree.properties.alias])) {
            var temp = parent.contents[tree.properties.alias];
            parent.contents[tree.properties.alias] = [];
            parent.contents[tree.properties.alias].push(temp);
            parent.contents[tree.properties.alias].push(tree);
        } else if (parent.contents[tree.properties.alias] && Array.isArray(parent.contents[tree.properties.alias])) {
            parent.contents[tree.properties.alias].push(tree);
        } else if (parent.contents[tree.properties.alias]) {
            console.error('alias name collision');
            console.log(tree);
            console.log(parent.contents);
            process.exit(1); // TODO
        } else {
            parent.contents[tree.properties.alias] = tree;
        }
    }
    delete tree.children;
    delete tree.properties;
    delete tree.name;
}
`;

// TODO should move to another module which post-processes and effects parse-tree => AST
const template_Fn_postProcessTree = () =>
`function postProcessTree (tree) {
    console.log(\`postProcess \${tree.name}\`);
    processAbstract(tree);
    processAliasesAndAST(tree, null);
}\n\n`;

export {
    template_Fn_createNode,
    template_Fn_postProcessTree,
    template_Fn_processAliasesAndAST,
    template_Fn_quantifyAtLeast,
    template_Fn_quantifyOnce,
    template_Fn_quantifyOneOrMore,
    template_Fn_quantifyZeroOrMore,
};