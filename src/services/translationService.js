import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RATE_LIMIT_DELAY = 500;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const translateBatch = async (texts, targetLanguage, openaiApiKey) => {
  const CHUNK_SIZE = 25;
  const translations = [];

  const translateChunk = async (chunk, retryCount = 0) => {
    try {
      const numberedTexts = chunk.map((text, index) => `${index + 1}. ${text}`);
      const prompt = `Translate the following ${chunk.length} texts to ${targetLanguage}. Maintain the numbering in your response and ensure you provide exactly ${chunk.length} translations:\n\n${numberedTexts.join('\n')}`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a translation assistant. Translate the given texts accurately, maintaining their original numbering.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content.trim();
        const chunkTranslations = content.split('\n')
          .filter(line => /^\d+\./.test(line))
          .map(line => line.replace(/^\d+\.\s*/, '').trim());

        if (chunkTranslations.length !== chunk.length) {
          console.error(`Mismatch in number of translations returned: expected ${chunk.length}, got ${chunkTranslations.length}`);
          console.log("Original texts:", chunk);
          console.log("Translations received:", chunkTranslations);
          throw new Error(`Mismatch in number of translations returned: expected ${chunk.length}, got ${chunkTranslations.length}`);
        }

        return chunkTranslations;
      } else {
        throw new Error(`No translations found for chunk: ${chunk}`);
      }
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        console.warn(`Retry attempt ${retryCount + 1} for chunk: ${chunk}`);
        await sleep(RETRY_DELAY);
        return translateChunk(chunk, retryCount + 1);
      }
      throw error;
    }
  };

  for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
    const chunk = texts.slice(i, i + CHUNK_SIZE);

    try {
      const chunkTranslations = await translateChunk(chunk);
      translations.push(...chunkTranslations);
      await sleep(RATE_LIMIT_DELAY);
    } catch (error) {
      console.error('Error translating text:', error);
      throw error;
    }
  }

  if (translations.length !== texts.length) {
    console.error("Original texts:", texts);
    console.error("All translations:", translations);
    throw new Error(`Mismatch in total translations returned: expected ${texts.length}, got ${translations.length}`);
  }

  return translations;
};