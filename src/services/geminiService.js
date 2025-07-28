const axios = require('axios');

async function analyzeTicketWithGemini(text, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Monta exemplos do histórico para o prompt
  let historyPrompt = '';
  if (history.length > 0) {
    historyPrompt = `
Considere os exemplos de tickets já criados abaixo para se inspirar no padrão de escrita, detalhamento e contexto das descrições. Use-os para criar descrições menos genéricas e mais alinhadas ao time/projeto:

${history.map((h, i) => 
  `Exemplo ${i+1}:
Entrada: "${h.input}"
Saída: ${JSON.stringify(h.output, null, 2)}
`).join('\n')}
`;
  }

  const prompt = `
Você é um assistente que recebe descrições livres de problemas, bugs ou melhorias de software e precisa criar tickets prontos para serem criados no Jira, destinados ao time de desenvolvimento.

${historyPrompt}
Sua resposta deve conter APENAS um JSON com as seguintes propriedades:

{
  "summary": "Título direto e técnico do ticket",
  "issuetype": "Tarefa" | "Subtarefa" | "História" | "Bug" | "Epic",
  "priority": "Highest" | "High" | "Medium" | "Low" | "Lowest",
  "description": "\\n\\nDescrição:\\n🎯 Objetivo\\n\\n✅ Critérios de aceitação"
}

A propriedade "issuetype" deve ser obrigatoriamente um dos seguintes valores (exatamente como listado):
- Tarefa
- Subtarefa
- História
- Bug
- Epic

O que se referir a layout, design ou UX deve ser criado com a prioridade mais baixa.
As seções dentro da descrição devem ser claras, técnicas, detalhadas e alinhadas ao contexto do time, evitando respostas genéricas. Use linguagem adequada para um time de desenvolvimento.

Exemplo de entrada:
"O botão de salvar na tela de edição falha ao enviar os dados no mobile."

Exemplo de saída esperada:
{
  "summary": "Falha no botão de salvar na tela de edição mobile",
  "issuetype": "Bug",
  "priority": "High",
  "description": "\\n🎯 Objetivo\\nGarantir que o botão de salvar funcione corretamente na tela de edição do aplicativo mobile.\\n\\n✅ Critérios de aceitação\\n- Dados enviados com sucesso\\n- Mensagem de confirmação exibida\\n- Compatibilidade com Android e iOS"
}

Responda APENAS com o JSON, sem explicações adicionais.

Texto de entrada:
"""${text}"""
`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const response = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000
  });

  let content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  content = content.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error('Não foi possível interpretar a resposta do Gemini como JSON. Resposta: ' + content);
  }
}

module.exports = { analyzeTicketWithGemini };