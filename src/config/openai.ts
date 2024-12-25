import OpenAI from 'openai';

if (!process.env.OPEN_AI_API_KEY) {
  throw new Error('OpenAI API key is missing in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
  maxRetries: 3,
});

export default openai; 