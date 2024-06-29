import React, { useState } from 'react';
import supabase from '../supabaseClient';
import { languages } from '../languages';
import { translateBatch } from '../services/translationService';
import { toast } from 'react-toastify';

const LanguageManager = ({ projectId, projectLanguages, fetchProjectLanguages, fetchTranslations }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAddLanguage = async () => {
    if (!selectedLanguage) {
      toast.error('Please select a language');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    toast.info('Adding new language and translating keys...');

    try {
      // Add the new language to the project
      const { error: langError } = await supabase
        .from('project_languages')
        .insert([{ project_id: projectId, language_code: selectedLanguage, is_main: false }]);
      if (langError) {
        toast.error('Error adding new language: ' + langError.message);
        setIsProcessing(false);
        return;
      }

      // Fetch existing translations
      const { data: existingTranslations, error: fetchError } = await supabase
        .from('translations')
        .select('*')
        .eq('project_id', projectId);

      if (fetchError) {
        toast.error('Error fetching existing translations: ' + fetchError.message);
        console.error('Error fetching existing translations:', fetchError);
        setIsProcessing(false);
        return;
      }

      // Extract keys and main values
      const keys = existingTranslations.map(({ key }) => key);
      const mainValues = existingTranslations.map(({ main_value }) => main_value);

      // Batch translate main values to the new language
      const translations = await translateBatch(mainValues, selectedLanguage, process.env.REACT_APP_OPENAI_API_KEY);

      // Update translations in database
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const main_value = mainValues[i];
        const translation = translations[i];

        // Check if the translation for the new language already exists
        const existingTranslation = existingTranslations.find(t => t.key === key);

        // Only add the new translation if it doesn't already exist
        if (existingTranslation && !existingTranslation.translations[selectedLanguage]) {
          const updatedTranslations = { ...existingTranslation.translations, [selectedLanguage]: translation };

          const { error: updateError } = await supabase
            .from('translations')
            .update({ translations: updatedTranslations })
            .eq('project_id', projectId)
            .eq('key', key);

          if (updateError) {
            console.error('Error updating translations:', updateError);
          }
        }

        // Update progress
        setProgress(Math.round(((i + 1) / keys.length) * 100));
      }

      // Refresh project languages and translations
      await fetchProjectLanguages(projectId);
      await fetchTranslations(projectId);

      toast.success('Language added and translations updated successfully');
    } catch (error) {
      toast.error('Unexpected error adding new language and updating translations');
      console.error('Unexpected error adding new language and updating translations:', error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleDeleteLanguage = async (languageCode) => {
    try {
      const { error: langError } = await supabase
        .from('project_languages')
        .delete()
        .eq('project_id', projectId)
        .eq('language_code', languageCode);
      if (langError) {
        toast.error('Error deleting language: ' + langError.message);
        return;
      }
      await fetchProjectLanguages(projectId);
      await fetchTranslations(projectId);
      toast.success('Language deleted successfully');
    } catch (error) {
      toast.error('Unexpected error deleting language');
      console.error('Unexpected error deleting language:', error);
    }
  };

  return (
    <div className="language-manager">
      <h3 className="text-lg font-semibold mb-2">Manage Languages</h3>
      <div className="mb-4">
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a language to add</option>
          {languages.filter(lang => !projectLanguages.some(pl => pl.language_code === lang.code)).map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
        <button
          onClick={handleAddLanguage}
          className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
        >
          Add Language
        </button>
      </div>
      {isProcessing && (
        <div className="mb-4">
          <div className="relative pt-1">
            <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200">
              <div
                style={{ width: `${progress}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              ></div>
            </div>
            <p className="text-center text-sm mt-2">{progress}%</p>
          </div>
        </div>
      )}
      <div className="language-list">
        {projectLanguages.map((lang) => (
          <div key={lang.language_code} className="flex items-center justify-between mt-2">
            <span>{languages.find(l => l.code === lang.language_code)?.name || lang.language_code}</span>
            <button
              onClick={() => handleDeleteLanguage(lang.language_code)}
              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LanguageManager;
