interface ASTNode {
    type: string;
    contents: { [key: string]: ASTNode | ASTNode[] } | null
}