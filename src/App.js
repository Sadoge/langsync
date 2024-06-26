import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css'; // Ensure this import is present
import Sidebar from './components/Sidebar';
import NewProjectDialog from './components/NewProjectDialog';
import TranslationEditorDialog from './components/TranslationEditorDialog';
import LanguageJsonDialog from './components/LanguageJsonDialog';
import ProgressIndicator from './components/ProgressIndicator'; // Import the ProgressIndicator component
import SearchInput from './components/SearchInput'; // Import the SearchInput component
import supabase from './supabaseClient'; // Import the Supabase client

const App = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [translations, setTranslations] = useState({});
  const [filteredTranslations, setFilteredTranslations] = useState({}); // State for filtered translations
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
  const [isProcessing, setIsProcessing] = useState(false); // State for processing status
  const [progress, setProgress] = useState(0); // State for progress
  const [searchTerm, setSearchTerm] = useState(''); // State for search term

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    // Filter translations based on search term
    if (searchTerm) {
      const filtered = Object.fromEntries(
        Object.entries(translations).filter(([key, { main_value }]) =>
          key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          main_value.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredTranslations(filtered);
    } else {
      setFilteredTranslations(translations);
    }
  }, [searchTerm, translations]);

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

  const fetchTranslations = async (projectId) => {
    try {
      const { data: translationsData, error: translationsError } = await supabase.from('translations').select('*').eq('project_id', projectId);
      if (translationsError) {
        console.error('Error fetching translations:', translationsError);
        return;
      }
      setTranslations(translationsData.reduce((acc, { key, main_value, translations }) => {
        acc[key] = { main_value, translations };
        return acc;
      }, {}));
    } catch (error) {
      console.error('Unexpected error fetching translations:', error);
    }
  };

  const handleProjectSelect = async (project) => {
    try {
      setSelectedProject(project);
      await fetchTranslations(project.id);

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

  const handleTranslationSubmit = async (newTranslations) => {
    setIsProcessing(true); // Set processing status to true
    const translationEntries = Object.entries(newTranslations);
    const totalEntries = translationEntries.length;
    
    try {
      for (let i = 0; i < totalEntries; i++) {
        const [key, main_value] = translationEntries[i];
        const updatedTranslations = await translate(main_value, {});
        const { error } = await supabase
          .from('translations')
          .upsert([{ project_id: selectedProject.id, key, main_value, translations: updatedTranslations }], {
            onConflict: ['project_id', 'key']
          });
        if (error) {
          console.error('Error adding translations:', error);
        }

        // Update progress
        setProgress(Math.round(((i + 1) / totalEntries) * 100));
      }

      await fetchTranslations(selectedProject.id);
    } catch (error) {
      console.error('Unexpected error adding translations:', error);
    } finally {
      setIsProcessing(false); // Set processing status to false
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
    <div className="flex h-full bg-gray-100">
      <Sidebar projects={projects} handleProjectSelect={handleProjectSelect} openNewProjectDialog={openNewProjectDialog} />
      <div className="flex-1 p-6 ml-64 overflow-y-auto min-h-screen">
        {isProcessing && <ProgressIndicator progress={progress} />} {/* Show progress indicator */}
        {selectedProject && (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Translations for {selectedProject.name}</h2>
                <button onClick={openTranslationDialog} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors">
                  Add Translation
                </button>
              </div>
              <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} /> {/* Add search input */}
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
                    {Object.entries(filteredTranslations).map(([key, { main_value, translations }]) => (
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
