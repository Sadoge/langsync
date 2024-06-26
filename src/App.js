import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';
import Sidebar from './components/Sidebar';
import NewProjectDialog from './components/NewProjectDialog';
import TranslationEditorDialog from './components/TranslationEditorDialog';
import LanguageJsonDialog from './components/LanguageJsonDialog';
import ProgressIndicator from './components/ProgressIndicator';
import SearchInput from './components/SearchInput';
import AddLanguageDialog from './components/AddLanguageDialog';
import UpdateMainLanguageDialog from './components/UpdateMainLanguageDialog';
import Auth from './components/Auth';
import supabase from './supabaseClient';
import { languages } from './languages';

const App = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [translations, setTranslations] = useState({});
  const [filteredTranslations, setFilteredTranslations] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [projectLanguages, setProjectLanguages] = useState([]);
  const [mainLanguage, setMainLanguage] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);
  const [isLanguageJsonDialogOpen, setIsLanguageJsonDialogOpen] = useState(false);
  const [isAddLanguageDialogOpen, setIsAddLanguageDialogOpen] = useState(false);
  const [isUpdateMainLanguageDialogOpen, setIsUpdateMainLanguageDialogOpen] = useState(false);
  const [languageJsonData, setLanguageJsonData] = useState({});
  const [jsonDialogLanguage, setJsonDialogLanguage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        fetchProjects(session.user.id);
      } else {
        setProjects([]);
        setSelectedProject(null);
      }
    };

    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        fetchProjects(session.user.id);
      } else {
        setProjects([]);
        setSelectedProject(null);
      }
    });

    getSession();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      setSession(null);
      setUser(null);
      setProjects([]);
      setSelectedProject(null);
    }
  };

  useEffect(() => {
    const filterAndSortTranslations = (translations) => {
      return Object.fromEntries(
        Object.entries(translations)
          .filter(([key, { main_value }]) =>
            key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            main_value.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      );
    };

    setFilteredTranslations(filterAndSortTranslations(translations));
  }, [searchTerm, translations]);

  const fetchProjects = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);
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

  const fetchProjectLanguages = async (projectId) => {
    try {
      const { data: projectLanguagesData, error: projectLanguagesError } = await supabase.from('project_languages').select('*').eq('project_id', projectId);
      if (projectLanguagesError) {
        console.error('Error fetching project languages:', projectLanguagesError);
        return;
      }
      setProjectLanguages(projectLanguagesData);
      const mainLang = projectLanguagesData.find(lang => lang.is_main);
      setMainLanguage(mainLang.language_code);
      setSelectedLanguage(mainLang.language_code);
    } catch (error) {
      console.error('Unexpected error fetching project languages:', error);
    }
  };

  const handleProjectSelect = async (project) => {
    try {
      setSelectedProject(project);
      await fetchTranslations(project.id);
      await fetchProjectLanguages(project.id);
    } catch (error) {
      console.error('Unexpected error fetching project details:', error);
    }
  };

  const handleTranslationSubmit = async (newTranslations) => {
    setIsProcessing(true);
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

        setProgress(Math.round(((i + 1) / totalEntries) * 100));
      }

      await fetchTranslations(selectedProject.id);
    } catch (error) {
      console.error('Unexpected error adding translations:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const translate = async (text, existingTranslations) => {
    try {
      const translations = { ...existingTranslations };

      for (const { language_code } of projectLanguages) {
        if (language_code !== mainLanguage && !translations[language_code]) {
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
              'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
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
    } catch (error) {
      console.error('Error translating text:', error);
      return existingTranslations;
    }
  };

  const handleNewProjectSubmit = async (newProjectName, mainLanguageCode) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user logged in');
        return;
      }

      // Step 1: Insert the new project
      const { data: insertData, error: insertError } = await supabase
        .from('projects')
        .insert([{ name: newProjectName, user_id: user.id }])
        .select(); // Use .select() to return the inserted data

      console.log('Insert response:', insertData, insertError); // Log the insert response

      if (insertError) {
        console.error('Error creating project:', insertError);
        return;
      }

      if (!insertData || insertData.length === 0) {
        console.error('No data returned from project creation');
        return;
      }

      const projectData = insertData[0];

      // Step 2: Insert the main language
      const { error: langError } = await supabase
        .from('project_languages')
        .insert([{ project_id: projectData.id, language_code: mainLanguageCode, is_main: true }]);

      console.log('Main language insertion response:', langError); // Log the response for debugging

      if (langError) {
        console.error('Error inserting main language:', langError);
        return;
      }

      // Update the projects state with the new project
      setProjects([...projects, projectData]);
    } catch (error) {
      console.error('Unexpected error creating project:', error);
    }
  };

  const handleAddNewLanguage = async (languageCode) => {
    try {
      const { error } = await supabase
        .from('project_languages')
        .insert([{ project_id: selectedProject.id, language_code: languageCode, is_main: false }]);
      
      if (error) {
        console.error('Error adding new language:', error);
        return;
      }

      setProjectLanguages([...projectLanguages, { language_code: languageCode, is_main: false }]);
    } catch (error) {
      console.error('Unexpected error adding new language:', error);
    }
  };

  const handleUpdateMainLanguage = async (newMainLanguageCode) => {
    try {
      const { error } = await supabase
        .from('project_languages')
        .update({ is_main: false })
        .eq('project_id', selectedProject.id)
        .eq('is_main', true);

      if (error) {
        console.error('Error updating old main language:', error);
        return;
      }

      const { error: newMainLangError } = await supabase
        .from('project_languages')
        .update({ is_main: true })
        .eq('project_id', selectedProject.id)
        .eq('language_code', newMainLanguageCode);

      if (newMainLangError) {
        console.error('Error setting new main language:', newMainLangError);
        return;
      }

      setMainLanguage(newMainLanguageCode);
      setSelectedLanguage(newMainLanguageCode);
      await fetchProjectLanguages(selectedProject.id);
    } catch (error) {
      console.error('Unexpected error updating main language:', error);
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
      Object.entries(translations)
        .map(([key, { main_value, translations }]) => [
          key, language === mainLanguage ? main_value : translations[language]
        ])
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort keys alphabetically
    );
    setLanguageJsonData(jsonData);
    setJsonDialogLanguage(language);
    setIsLanguageJsonDialogOpen(true);
  };
  const closeLanguageJsonDialog = () => setIsLanguageJsonDialogOpen(false);

  const openAddLanguageDialog = () => setIsAddLanguageDialogOpen(true);
  const closeAddLanguageDialog = () => setIsAddLanguageDialogOpen(false);

  const openUpdateMainLanguageDialog = () => setIsUpdateMainLanguageDialogOpen(true);
  const closeUpdateMainLanguageDialog = () => setIsUpdateMainLanguageDialogOpen(false);

  return (
    <div className="flex h-full bg-gray-100">
      {!session ? (
        <Auth />
      ) : (
        <>
          <Sidebar
            projects={projects}
            handleProjectSelect={handleProjectSelect}
            openNewProjectDialog={openNewProjectDialog}
            user={user}
            onSignOut={handleSignOut}
          />
          <div className="flex-1 p-6 ml-64 overflow-y-auto min-h-screen">
            {isProcessing && <ProgressIndicator progress={progress} />} {/* Show progress indicator */}
            {selectedProject && (
              <>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Translations for {selectedProject.name}</h2>
                    <div>
                      <button onClick={openTranslationDialog} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors">
                        Add Translation
                      </button>
                      <button onClick={openUpdateMainLanguageDialog} className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors">
                        Update Main Language
                      </button>
                    </div>
                  </div>
                  <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} /> {/* Add search input */}
                  <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Key</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">{languages.find(l => l.code === mainLanguage)?.name}</th>
                          {projectLanguages.filter(lang => lang.language_code !== mainLanguage).map(lang => (
                            <th key={lang.language_code} className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">
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
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Add New Language</h3>
                  <div className="flex">
                    <button
                      onClick={openAddLanguageDialog}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors"
                    >
                      Add Language
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

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

      <AddLanguageDialog
        isOpen={isAddLanguageDialogOpen}
        closeModal={closeAddLanguageDialog}
        handleAddLanguage={handleAddNewLanguage}
        existingLanguages={projectLanguages.map(lang => lang.language_code)}
      />

      <UpdateMainLanguageDialog
        isOpen={isUpdateMainLanguageDialogOpen}
        closeModal={closeUpdateMainLanguageDialog}
        handleUpdateMainLanguage={handleUpdateMainLanguage}
        currentMainLanguage={mainLanguage}
      />
    </div>
  );
};

export default App;
