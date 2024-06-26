import React from 'react';
import { languages } from '../languages';

const TranslationTable = ({
  filteredTranslations,
  projectLanguages,
  mainLanguage,
  openLanguageJsonDialog
}) => (
  <div className="overflow-x-auto bg-white shadow-md rounded-lg">
    <table className="min-w-full bg-white border border-gray-200">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700 w-1/4">Key</th>
          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700 w-1/4">{languages.find(l => l.code === mainLanguage)?.name}</th>
          {projectLanguages.filter(lang => lang.language_code !== mainLanguage).map(lang => (
            <th key={lang.language_code} className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700 w-1/4">
              {languages.find(l => l.code === lang.language_code)?.name}
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
              <td key={lang.language_code} className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{translations[lang.language_code]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TranslationTable;
