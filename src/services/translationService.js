import axios from 'axios';

export const translateBatch = async (texts, targetLanguage, openaiApiKey) => {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a translation assistant. Translate the following text to ${targetLanguage}. Each text is separated by "###".`
        },
        {
          role: 'user',
          content: texts.join(' ### ')
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.choices && response.data.choices.length > 0) {
      const translations = response.data.choices[0].message.content.trim().split('###').map(text => text.trim());
      return translations;
    } else {
      console.error(`No translations found for texts: ${texts}`);
      return [];
    }
  } catch (error) {
    console.error('Error translating text:', error);
    return [];
  }
};