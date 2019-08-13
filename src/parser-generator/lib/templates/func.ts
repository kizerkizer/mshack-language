const template_Func = (name: string, paremeters: string[], body: string) =>
`
function ${name} (${paremeters.join(`, `)}) {
    ${body}
}
`

export default template_Func;