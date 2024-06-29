// LanguageManager.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import supabase from '../supabaseClient';
import { languages } from '../languages';
import { toast } from 'react-toastify';

const LanguageManager = ({ projectId, projectLanguages, fetchProjectLanguages, fetchTranslations }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const { user } = useAuth();

  const handleAddLanguage = async () => {
    try {
      const { error: langError } = await supabase
        .from('project_languages')
        .insert([{ project_id: projectId, language_code: selectedLanguage, is_main: false }]);
      if (langError) {
        toast.error('Error adding new language: ' + langError.message);
        return;
      }
      await fetchProjectLanguages(projectId);
      await fetchTranslations(projectId);
      toast.success('Language added successfully');
    } catch (error) {
      toast.error('Unexpected error adding new language');
      console.error('Unexpected error adding new language:', error);
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
