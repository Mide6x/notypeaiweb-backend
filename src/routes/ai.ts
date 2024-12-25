import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import { isAuthenticated } from '../middleware/auth';
import openai from '../config/openai';
import Summary from '../models/Summary';
import { User } from '../types/auth';

const router = express.Router();

// Rate limiting middleware
const aiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: Number(process.env.MAX_REQUESTS_PER_DAY) || 100,
  message: 'Too many requests from this IP, please try again after 24 hours'
});

// Apply rate limiting to all AI routes
router.use(aiLimiter);

// AI Text Summarizer
router.post('/summarize', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { text, mode } = req.body;
    const userId = (req.user as User)._id;
    
    if (!text) {
      res.status(400).json({ message: 'Text is required' });
      return;
    }

    // Define system prompts for different modes
    const systemPrompts = {
      natural: "You are a professional summarizer. Provide a natural, conversational summary that's easy to understand while maintaining key points. Make it sound human.",
      fluency: "You are a professional summarizer. Create a smooth, flowing summary that emphasizes readability and coherence.",
      academic: "You are a professional academic summarizer. Provide a formal, structured summary using academic language and maintaining technical accuracy.",
      creative: "You are a creative writer. Provide an engaging and imaginative summary that captures the essence of the text in a unique way."
    };

    // Get the appropriate system prompt based on mode
    const systemPrompt = systemPrompts[mode as keyof typeof systemPrompts] || systemPrompts.natural;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Summarize this text: ${text}` }
      ],
      temperature: mode === 'creative' ? 0.8 : 0.5, // Higher temperature for creative mode
      max_tokens: Number(process.env.MAX_TOKENS_PER_REQUEST) || 500
    });

    const savedSummary = await Summary.create({
      userId,
      text,
      summary: completion.choices[0].message.content,
      mode
    });

    // Keep only last 5 summaries
    await Summary.deleteMany({
      userId,
      createdAt: { 
        $lt: savedSummary.createdAt,
        $nin: await Summary.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .distinct('createdAt')
      }
    });

    res.json({ 
      summary: completion.choices[0].message.content,
      usage: completion.usage
    });
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ 
      message: 'Error processing summarization request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Grammar Editor
router.post('/grammar', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    
    if (!text) {
      res.status(400).json({ message: 'Text is required' });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a professional editor. Fix grammar and improve writing while maintaining the original meaning." },
        { role: "user", content: `Edit this text for grammar and clarity: ${text}` }
      ],
      temperature: 0.3,
      max_tokens: Number(process.env.MAX_TOKENS_PER_REQUEST) || 1000
    });

    res.json({ 
      correctedText: completion.choices[0].message.content,
      usage: completion.usage
    });
  } catch (error) {
    console.error('Grammar correction error:', error);
    res.status(500).json({ 
      message: 'Error processing grammar correction request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Language Translator
router.post('/translate', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, targetLanguage } = req.body;
    
    if (!text || !targetLanguage) {
      res.status(400).json({ message: 'Text and target language are required' });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: `You are a professional translator. Translate text to ${targetLanguage} while preserving meaning and context.` },
        { role: "user", content: `Translate this text to ${targetLanguage}: ${text}` }
      ],
      temperature: 0.3,
      max_tokens: Number(process.env.MAX_TOKENS_PER_REQUEST) || 1000
    });

    res.json({ 
      translatedText: completion.choices[0].message.content,
      usage: completion.usage
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      message: 'Error processing translation request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/summaries', isAuthenticated, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const userId = (req.user as User)._id;
    const summaries = await Summary.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ 
      message: 'Error fetching summaries',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 