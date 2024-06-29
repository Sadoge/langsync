import React, { useState } from 'react';

const TranslationTable = ({ filteredTranslations, projectLanguages, mainLanguage, openLanguageJsonDialog, handleUpdateTranslation }) => {
  const [editableKey, setEditableKey] = useState(null);
  const [editableLang, setEditableLang] = useState(null);
  const [tempValue, setTempValue] = useState('');

  const handleEdit = (key, lang, value) => {
    setEditableKey(key);
    setEditableLang(lang);
    setTempValue(value);
  };

  const handleSave = () => {
    handleUpdateTranslation(editableKey, editableLang, tempValue);
    setEditableKey(null);
    setEditableLang(null);
    setTempValue('');
  };

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Key</th>
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">{mainLanguage}</th>
            {projectLanguages.filter(lang => lang.language_code !== mainLanguage).map(lang => (
              <th key={lang.language_code} className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                {lang.language_code}
                <button
                  onClick={() => openLanguageJsonDialog(lang.language_code)}
                  className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-400 transition-colors"
                >
                  View JSON
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {Object.entries(filteredTranslations)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([key, { main_value, translations }]) => (
              <tr key={key}>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{key}</td>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  {editableKey === key && editableLang === mainLanguage ? (
                    <input
                      type="text"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={handleSave}
                      className="w-full"
                    />
                  ) : (
                    <span onClick={() => handleEdit(key, mainLanguage, main_value)}>{main_value}</span>
                  )}
                </td>
                {projectLanguages.filter(lang => lang.language_code !== mainLanguage).map(lang => (
                  <td key={lang.language_code} className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                    {editableKey === key && editableLang === lang.language_code ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleSave}
                        className="w-full"
                      />
                    ) : (
                      <span onClick={() => handleEdit(key, lang.language_code, translations[lang.language_code])}>
                        {translations[lang.language_code]}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TranslationTable;