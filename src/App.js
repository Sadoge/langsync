import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css'; // Ensure this import is present
import Sidebar from './components/Sidebar';
import NewProjectDialog from './components/NewProjectDialog';
import TranslationEditorDialog from './components/TranslationEditorDialog';
import LanguageJsonDialog from './components/LanguageJsonDialog';
import supabase from './supabaseClient'; // Import the Supabase client

const App = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [translations, setTranslations] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [languages, setLanguages] = useState([]);
  const [mainLanguage, setMainLanguage] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);
  const [isLanguageJsonDialogOpen, setIsLanguageJsonDialogOpen] = useState(false);
  const [languageJsonData, setLanguageJsonData] = useState({});
  const [jsonDialogLanguage, setJsonDialogLanguage] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }
      setProjects(data);
    } catch (error) {
      console.error('Unexpected error fetching projects:', error);
    }
  };

  const handleProjectSelect = async (project) => {
    try {
      setSelectedProject(project);

      const { data: translationsData, error: translationsError } = await supabase.from('translations').select('*').eq('project_id', project.id);
      if (translationsError) {
        console.error('Error fetching translations:', translationsError);
        return;
      }
      setTranslations(translationsData.reduce((acc, { key, main_value, translations }) => {
        acc[key] = { main_value, translations };
        return acc;
      }, {}));

      const { data: languagesData, error: languagesError } = await supabase.from('languages').select('language, is_main').eq('project_id', project.id);
      if (languagesError) {
        console.error('Error fetching languages:', languagesError);
        return;
      }

      const mainLang = languagesData.find(lang => lang.is_main);
      setMainLanguage(mainLang.language);
      setSelectedLanguage(mainLang.language);
      setLanguages(languagesData.map(lang => lang.language));
    } catch (error) {
      console.error('Unexpected error fetching project details:', error);
    }
  };

  const handleTranslationSubmit = async () => {
    try {
      for (const [key, { main_value, translations: currentTranslations }] of Object.entries(translations)) {
        if (selectedLanguage === mainLanguage) {
          const updatedTranslations = await translate(main_value, currentTranslations || {});
          const { error } = await supabase
            .from('translations')
            .upsert([{ project_id: selectedProject.id, key, main_value, translations: updatedTranslations }], {
              onConflict: ['project_id', 'key']
            });
          if (error) {
            console.error('Error updating translations:', error);
          }
        } else {
          const { error } = await supabase
            .from('translations')
            .update({ translations: { ...currentTranslations, [selectedLanguage]: currentTranslations[selectedLanguage] } })
            .eq('project_id', selectedProject.id)
            .eq('key', key);
          if (error) {
            console.error('Error updating translations:', error);
          }
        }
      }
    } catch (error) {
      console.error('Unexpected error updating translations:', error);
    }
  };

  const translate = async (text, existingTranslations) => {
    try {
      const translations = { ...existingTranslations };

      for (const language of languages) {
        if (language !== mainLanguage && !translations[language]) {
          const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are a translation assistant. Translate the following text to ${language}.`
              },
              {
                role: 'user',
                content: text
              }
            ]
          }, {
            headers: {
              'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.data.choices && response.data.choices.length > 0) {
            translations[language] = response.data.choices[0].message.content.trim();
          } else {
            console.error(`No translation found for language: ${language}`);
          }
        }
      }

      return translations;
    } catch (error) {
      console.error('Error translating text:', error);
      return existingTranslations;
    }
  };

  const handleNewProjectSubmit = async (newProjectName, mainLanguage) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ name: newProjectName }])
        .single();
      
      if (error) {
        console.error('Error creating project:', error);
        return;
      }

      const { error: langError } = await supabase
        .from('languages')
        .insert([{ project_id: data.id, language: mainLanguage, is_main: true }]);
      
      if (langError) {
        console.error('Error inserting main language:', langError);
        return;
      }

      setProjects([...projects, data]);
    } catch (error) {
      console.error('Unexpected error creating project:', error);
    }
  };

  const handleAddNewLanguage = async () => {
    try {
      const { error } = await supabase
        .from('languages')
        .insert([{ project_id: selectedProject.id, language: newLanguage }]);
      
      if (error) {
        console.error('Error adding new language:', error);
        return;
      }

      setLanguages([...languages, newLanguage]);
      setNewLanguage('');
    } catch (error) {
      console.error('Unexpected error adding new language:', error);
    }
  };

  const handleJsonChange = (e) => {
    try {
      const parsedJson = JSON.parse(e.target.value);
      setJsonError(null);
      setTranslations(
        Object.fromEntries(
          Object.entries(parsedJson).map(([key, value]) => [
            key, {
              main_value: selectedLanguage === mainLanguage ? value : translations[key]?.main_value,
              translations: {
                ...translations[key]?.translations,
                [selectedLanguage]: selectedLanguage !== mainLanguage ? value : translations[key]?.translations[selectedLanguage]
              }
            }
          ])
        )
      );
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  };

  const openNewProjectDialog = () => setIsProjectDialogOpen(true);
  const closeNewProjectDialog = () => setIsProjectDialogOpen(false);

  const openTranslationDialog = () => setIsTranslationDialogOpen(true);
  const closeTranslationDialog = () => setIsTranslationDialogOpen(false);

  const openLanguageJsonDialog = (language) => {
    const jsonData = Object.fromEntries(
      Object.entries(translations).map(([key, { main_value, translations }]) => [
        key, language === mainLanguage ? main_value : translations[language]
      ])
    );
    setLanguageJsonData(jsonData);
    setJsonDialogLanguage(language);
    setIsLanguageJsonDialogOpen(true);
  };
  const closeLanguageJsonDialog = () => setIsLanguageJsonDialogOpen(false);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar projects={projects} handleProjectSelect={handleProjectSelect} openNewProjectDialog={openNewProjectDialog} />
      <div className="flex-1 p-6">
        {selectedProject && (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Translations for {selectedProject.name}</h2>
                <button onClick={openTranslationDialog} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors">
                  Add Translation
                </button>
              </div>
              <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Key</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">{mainLanguage}</th>
                      {languages.filter(lang => lang !== mainLanguage).map(lang => (
                        <th key={lang} className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
                          {lang}
                          <button
                            onClick={() => openLanguageJsonDialog(lang)}
                            className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-400 transition-colors"
                          >
                            View JSON
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {Object.entries(translations).map(([key, { main_value, translations }]) => (
                      <tr key={key}>
                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{key}</td>
                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{main_value}</td>
                        {languages.filter(lang => lang !== mainLanguage).map(lang => (
                          <td key={lang} className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{translations[lang]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Add New Language</h3>
              <div className="flex">
                <input
                  type="text"
                  placeholder="New Language"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="p-2 border border-gray-300 rounded mr-2 flex-1"
                />
                <button onClick={handleAddNewLanguage} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors">
                  Add Language
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <NewProjectDialog
        isOpen={isProjectDialogOpen}
        closeModal={closeNewProjectDialog}
        handleNewProjectSubmit={handleNewProjectSubmit}
      />

      <TranslationEditorDialog
        isOpen={isTranslationDialogOpen}
        closeModal={closeTranslationDialog}
        handleTranslationSubmit={handleTranslationSubmit}
        translations={translations}
        selectedLanguage={selectedLanguage}
        mainLanguage={mainLanguage}
        handleJsonChange={handleJsonChange}
        jsonError={jsonError}
      />

      <LanguageJsonDialog
        isOpen={isLanguageJsonDialogOpen}
        closeModal={closeLanguageJsonDialog}
        language={jsonDialogLanguage}
        jsonData={languageJsonData}
      />
    </div>
  );
};

export default App;
