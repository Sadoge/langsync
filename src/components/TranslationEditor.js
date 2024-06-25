import React from 'react';

const TranslationEditor = ({ translations, selectedLanguage, mainLanguage, handleJsonChange, jsonError, handleTranslationSubmit, setSelectedLanguage }) => {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold mb-2">Translations</h2>
      <div className="mb-2">
        <label className="block mb-1">
          Select Language:
          <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="p-2 border border-gray-300 rounded w-full">
            <option value={mainLanguage}>{mainLanguage}</option>
            {Object.keys(translations).filter(lang => lang !== mainLanguage).map(language => (
              <option key={language} value={language}>{language}</option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        value={JSON.stringify(
          Object.fromEntries(
            Object.entries(translations).map(([key, { main_value, translations }]) => [
              key, selectedLanguage === mainLanguage ? main_value : translations[selectedLanguage]
            ])
          ), null, 2)}
        onChange={handleJsonChange}
        className="p-2 border border-gray-300 rounded w-full h-64 mb-2"
      />
      {jsonError && <p className="text-red-500">{jsonError}</p>}
      <button onClick={handleTranslationSubmit} className="px-4 py-2 bg-green-500 text-white rounded">
        Save Translations
      </button>
    </div>
  );
};

export default TranslationEditor;
