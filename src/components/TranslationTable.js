import React from 'react';

const TranslationTable = ({ filteredTranslations, projectLanguages, mainLanguage, openLanguageJsonDialog }) => {
  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Key</th>
            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">{mainLanguage}</th>
            {projectLanguages.filter(lang => lang.language_code !== mainLanguage).map(lang => (
              <th key={lang.name} className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
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
          {Object.entries(filteredTranslations).map(([key, { main_value, translations }]) => (
            <tr key={key}>
              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{key}</td>
              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{main_value}</td>
              {projectLanguages.filter(lang => lang.language_code !== mainLanguage).map(lang => (
                <td key={lang.name} className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{translations[lang.language_code]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TranslationTable;