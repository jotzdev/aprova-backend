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
Você domina Conhecimentos Pedagógicos (Piaget, Vygotsky, BNCC, LDB, ECA, avaliação, planejamento) e o edital do concurso.
Responda de forma clara, didática e estruturada em Markdown.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, cargo } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Histórico de mensagens inválido ou ausente.' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Chave de API do Gemini não configurada no servidor (.env).' 
      });
    }

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Endpoint nativo do Gemini v1beta aceita chaves AQ. via header de autorização ou query param
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    
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
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      return res.status(502).json({ error: 'Falha na comunicação com a API do Gemini. Verifique se a chave está ativa.' });
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
