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
    const { text, language } = req.body;
    console.log('Received request:', { language, textLength: text?.length });
    
    if (!text) {
      console.log('Missing text in request');
      res.status(400).json({ message: 'Text is required' });
      return;
    }

    const systemPrompts: Record<string, string> = {
      'en-GB': "You are a professional British English editor. Analyze the text and provide specific grammar, spelling, and style corrections following British English conventions. Format your response as a list of corrections, each starting with '•'.",
      'en-US': "You are a professional American English editor. Analyze the text and provide specific grammar, spelling, and style corrections following American English conventions. Format your response as a list of corrections, each starting with '•'.",
      'fr': "You are a professional French language editor. Analyze the text and provide specific grammar, spelling, and style corrections following French language conventions. Format your response as a list of corrections, each starting with '•'.",
      'ar': "You are a professional Arabic language editor. Analyze the text and provide specific grammar, spelling, and style corrections following Arabic language conventions. Format your response as a list of corrections, each starting with '•'.",
      'ha': "You are a professional Hausa language editor. Analyze the text and provide specific grammar, spelling, and style corrections following Hausa language conventions. Format your response as a list of corrections, each starting with '•'.",
      'yo': "You are a professional Yorùbá language editor. Analyze the text and provide specific grammar, spelling, and style corrections following Yorùbá language conventions. Format your response as a list of corrections, each starting with '•'.",
      'ig': "You are a professional Igbo language editor. Analyze the text and provide specific grammar, spelling, and style corrections following Igbo language conventions. Format your response as a list of corrections, each starting with '•'.",
      'zu': "You are a professional Zulu language editor. Analyze the text and provide specific grammar, spelling, and style corrections following Zulu language conventions. Format your response as a list of corrections, each starting with '•'."
    };

    const selectedPrompt = systemPrompts[language as keyof typeof systemPrompts];
    console.log('Selected language prompt:', { language, hasPrompt: !!selectedPrompt });

    if (!selectedPrompt) {
      console.warn('Unknown language requested:', language);
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { 
        role: "system" as const, 
        content: selectedPrompt || systemPrompts['en-GB']
      },
      { 
        role: "user" as const, 
        content: `Check this text for grammar and style issues in ${language} language: ${text}` 
      }
    ];

    console.log('Sending to OpenAI:', { 
      language, 
      messageCount: messages.length,
      systemPromptPreview: typeof messages[0].content === 'string' 
        ? messages[0].content.substring(0, 50) 
        : 'Content is not a string'
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.3,
      max_tokens: Number(process.env.MAX_TOKENS_PER_REQUEST) || 1000
    });

    const correctionText = completion.choices[0].message.content || '';
    const corrections = correctionText
      .split('\n')
      .filter(line => line.trim().startsWith('•'))
      .map(line => line.trim());

    console.log('Processing response:', { 
      hasContent: !!correctionText,
      correctionsCount: corrections.length 
    });

    res.json({ 
      corrections,
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

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { 
        role: "system" as const, 
        content: `You are a professional translator. Translate text to ${targetLanguage} while preserving meaning and context.` 
      },
      { 
        role: "user" as const, 
        content: `Translate this text to ${targetLanguage}: ${text}` 
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
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