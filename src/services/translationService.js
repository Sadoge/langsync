import supabase from '../supabaseClient';
import axios from 'axios';

export const addTranslations = async (projectId, newTranslations, projectLanguages, mainLanguage, apiKey) => {
  const translationEntries = Object.entries(newTranslations);
  const totalEntries = translationEntries.length;
  const progressUpdates = [];

  for (let i = 0; i < totalEntries; i++) {
    const [key, main_value] = translationEntries[i];
    const updatedTranslations = await translate(main_value, projectLanguages, mainLanguage, apiKey);
    const { error } = await supabase
      .from('translations')
      .upsert([{ project_id: projectId, key, main_value, translations: updatedTranslations }], {
        onConflict: ['project_id', 'key']
      });

    if (error) {
      throw new Error(error.message);
    }

    progressUpdates.push(Math.round(((i + 1) / totalEntries) * 100));
  }

  return progressUpdates;
};

const translate = async (text, projectLanguages, mainLanguage, apiKey) => {
  const translations = {};

  for (const { language_code } of projectLanguages) {
    if (language_code !== mainLanguage) {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a translation assistant. Translate the following text to ${language_code}.`
          },
          {
            role: 'user',
            content: text
          }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.choices && response.data.choices.length > 0) {
        translations[language_code] = response.data.choices[0].message.content.trim();
      } else {
        console.error(`No translation found for language: ${language_code}`);
      }
    }
  }

  return translations;
};
