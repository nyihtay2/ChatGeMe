import express from 'express';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import LlamaAPIClient from 'llama-api-client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const openai = () => process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const gemini = () => process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const llama = () => process.env.LLAMA_API_KEY ? new LlamaAPIClient({ apiKey: process.env.LLAMA_API_KEY }) : null;
const modelNames = {
  chatgpt: process.env.OPENAI_MODEL || 'gpt-6.2-astra',
  gemini: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  meta: process.env.LLAMA_MODEL || 'Llama-4-Maverick-17B-128E-Instruct-FP8'
};

app.get('/api/status', (_req, res) => {
  res.json({ app: 'ChatGeMe', providers: {
    chatgpt: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    meta: !!process.env.LLAMA_API_KEY
  }});
});

function normalizeHistory(history = []) {
  return history.slice(-16).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 12000) }));
}
async function askOpenAI(history, instruction = '') {
  const client = openai(); if (!client) throw new Error('OpenAI API key မထည့်ရသေးပါ');
  const response = await client.responses.create({
    model: modelNames.chatgpt,
    instructions: instruction || 'You are ChatGeMe, a helpful assistant. Reply in the language used by the user. Be accurate and clearly state uncertainty.',
    input: normalizeHistory(history)
  });
  return response.output_text || 'အဖြေမရရှိပါ။';
}
async function askGemini(history, instruction = '') {
  const client = gemini(); if (!client) throw new Error('Gemini API key မထည့်ရသေးပါ');
  const contents = normalizeHistory(history).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const result = await client.models.generateContent({
    model: modelNames.gemini,
    contents,
    config: { systemInstruction: instruction || 'You are a helpful AI assistant. Reply in the user’s language. Be accurate and state uncertainty.' }
  });
  return result.text || 'အဖြေမရရှိပါ။';
}
async function askMeta(history, instruction = '') {
  const client = llama(); if (!client) throw new Error('Meta Llama API key မထည့်ရသေးပါ');
  const messages = normalizeHistory(history).map(m => ({ role: m.role, content: m.content }));
  if (instruction) messages.unshift({ role: 'system', content: instruction });
  const result = await client.chat.completions.create({ model: modelNames.meta, messages });
  return result.completion_message?.content || result.choices?.[0]?.message?.content || 'အဖြေမရရှိပါ။';
}

app.post('/api/chat', async (req, res) => {
  try {
    const { provider = 'chatgeme', history = [] } = req.body || {};
    const safeHistory = normalizeHistory(history);
    if (!safeHistory.length || !safeHistory.at(-1).content.trim()) return res.status(400).json({ error: 'မေးခွန်းတစ်ခု ရေးပေးပါ။' });
    if (provider === 'chatgpt' || provider === 'gemini' || provider === 'meta') {
      const fn = provider === 'chatgpt' ? askOpenAI : provider === 'gemini' ? askGemini : askMeta;
      return res.json({ provider, answer: await fn(safeHistory), model: modelNames[provider] });
    }
    const jobs = [
      ['chatgpt', () => askOpenAI(safeHistory, 'Analyze the user request independently. Give a useful, well-reasoned answer in the user’s language. Mention assumptions and uncertainty.')],
      ['gemini', () => askGemini(safeHistory, 'Analyze the user request independently. Give a useful, well-reasoned answer in the user’s language. Mention assumptions and uncertainty.')],
      ['meta', () => askMeta(safeHistory, 'Analyze the user request independently. Give a useful, well-reasoned answer in the user’s language. Mention assumptions and uncertainty.')]
    ];
    const results = await Promise.allSettled(jobs.map(async ([name, fn]) => ({ provider: name, answer: await fn() })));
    const answers = results.map((r, i) => r.status === 'fulfilled' ? r.value : ({ provider: jobs[i][0], error: r.reason?.message || 'Provider error' }));
    const successful = answers.filter(a => a.answer);
    if (!successful.length) return res.status(503).json({ error: 'AI သုံးမျိုးလုံးထံမှ အဖြေမရပါ။ API Key နှင့် Billing ကို စစ်ဆေးပါ။', details: answers });
    let finalAnswer;
    if (process.env.OPENAI_API_KEY) {
      try {
        const synthesisHistory = [{ role: 'user', content:
          `User's original question:\n${safeHistory.at(-1).content}\n\nIndependent AI responses:\n${successful.map(a => `--- ${a.provider.toUpperCase()} ---\n${a.answer}`).join('\n\n')}\n\nSynthesize the strongest, most accurate answer. Reconcile disagreements, do not invent consensus, flag uncertainty, and answer in the user's language. Do not merely concatenate the responses.`
        }];
        finalAnswer = await askOpenAI(synthesisHistory, 'You are the chief editor of ChatGeMe. Compare independent model answers and produce one accurate, balanced, practical final answer.');
      } catch { finalAnswer = successful.map(a => `### ${a.provider.toUpperCase()}\n${a.answer}`).join('\n\n'); }
    } else {
      finalAnswer = successful.map(a => `### ${a.provider.toUpperCase()}\n${a.answer}`).join('\n\n') + '\n\nမှတ်ချက် - နောက်ဆုံးပေါင်းစပ်အဖြေထုတ်ရန် OPENAI_API_KEY လိုအပ်သည်။';
    }
    res.json({ provider: 'chatgeme', answer: finalAnswer, panel: answers, partial: successful.length !== 3 });
  } catch (error) {
    console.error('ChatGeMe error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

app.get('/{*splat}', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ChatGeMe listening on ${port}`));
