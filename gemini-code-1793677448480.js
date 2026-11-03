import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const SYSTEM_INSTRUCTION = `Você é um Assistente de Estudos IA especialista em Concursos Públicos para Professores, atuando na plataforma "Aprova Professor — Conceição do Almeida 2026". 
Sua missão é ajudar candidatos a se prepararem para o concurso público da Prefeitura Municipal de Conceição do Almeida, Bahia.
Você domina:
1. Conhecimentos Pedagógicos: Psicologia da educação, Piaget, Vygotsky, Wallon, planejamento, metodologias, avaliação formativa e somativa, gestão democrática, PPP, educação inclusiva, BNCC, educação infantil, alfabetização e letramento.
2. Legislação Educacional: Constituição Federal (Arts. 205-214), LDB (Lei 9.394/96), ECA (Lei 8.069/90), PNE (Lei 13.005/2014), Lei Brasileira de Inclusão (13.146/2015), FUNDEB (Lei 14.113/2020), DCNs e BNCC.
3. Disciplinas Básicas e Específicas do edital de Conceição do Almeida (Língua Portuguesa, Matemática, Conhecimentos Específicos do cargo selecionado).
Responda de forma clara, didática, estruturada em Markdown, mantendo o contexto da conversa e auxiliando o aluno em explicações conceituais, planos de estudo, análise de questões e dúvidas legais.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, cargo } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Histórico de mensagens inválido ou ausente.' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Chave de API do Gemini não configurada no servidor. Configure a variável GEMINI_API_KEY no arquivo .env.' 
      });
    }

    // Format conversation history for Gemini API
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      system_instruction: {
        parts: [{ text: `${SYSTEM_INSTRUCTION} O cargo atual do candidato na plataforma é: "${cargo || 'Professor'}".` }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      return res.status(502).json({ error: 'Falha na comunicação com a API de Inteligência Artificial. Tente novamente mais tarde.' });
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(502).json({ error: 'A IA não retornou uma resposta válida.' });
    }

    res.json({ reply });
  } catch (err) {
    console.error('Server error in /api/chat:', err);
    res.status(500).json({ error: 'Erro interno no servidor ao processar a mensagem.' });
  }
});

app.listen(PORT, () => {
  console.log(`[Aprova Professor] Servidor rodando na porta ${PORT}`);
});