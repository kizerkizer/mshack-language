interface ASTNode {
    type: string;
    value: string;
    contents: { [key: string]: ASTNode | ASTNode[] } | null
}