import { Router, Request, Response, RequestHandler } from 'express';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface TranslateRequest {
  text: string;
  targetLanguage: string;
}

const translateHandler: RequestHandler = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body as TranslateRequest;

    if (!text || !targetLanguage) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a translator. Translate the following text to ${targetLanguage}. Only respond with the translation, nothing else.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
    });

    const translation = completion.choices[0]?.message?.content;

    if (!translation) {
      res.status(500).json({ error: 'Translation failed' });
      return;
    }

    res.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
};

router.post('/translate', translateHandler);

export default router; 