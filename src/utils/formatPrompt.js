function formatPrompt(text) {
  return `A partir do texto abaixo, identifique e retorne um JSON com os seguintes campos: type (Bug, Task, Story, Improvement), summary (título), description (descrição completa), priority (Baixa, Média, Alta, Crítica), component (parte afetada do sistema).\n\nTexto:\n"""${text}"""\n\nResponda apenas com o JSON, sem explicações.`;
}

module.exports = formatPrompt;