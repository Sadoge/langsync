import React, { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import TranslationTable from './components/TranslationTable';
import NewProjectDialog from './components/NewProjectDialog';
import TranslationEditorDialog from './components/TranslationEditorDialog';
import LanguageJsonDialog from './components/LanguageJsonDialog';
import ProgressIndicator from './components/ProgressIndicator';
import SearchInput from './components/SearchInput';
import AddLanguageDialog from './components/AddLanguageDialog';
import UpdateMainLanguageDialog from './components/UpdateMainLanguageDialog';
import Auth from './components/Auth';
import { useAuth } from './context/AuthContext';
import { createProject } from './services/projectService';
import { addTranslations } from './services/translationService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import supabase from './supabaseClient';
import useFetchProjects from './hooks/useFetchProjects';

const App = () => {
  const { session, user, signOut } = useAuth();
  const { projects, fetchProjects } = useFetchProjects(user?.id);
  const [selectedProject, setSelectedProject] = useState(null);
  const [translations, setTranslations] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [projectLanguages, setProjectLanguages] = useState([]);
  const [mainLanguage, setMainLanguage] = useState('');
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [filteredTranslations, setFilteredTranslations] = useState({});
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);
  const [isLanguageJsonDialogOpen, setIsLanguageJsonDialogOpen] = useState(false);
  const [isAddLanguageDialogOpen, setIsAddLanguageDialogOpen] = useState(false);
  const [isUpdateMainLanguageDialogOpen, setIsUpdateMainLanguageDialogOpen] = useState(false);
  const [languageJsonData, setLanguageJsonData] = useState({});
  const [jsonDialogLanguage, setJsonDialogLanguage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [jsonError, setJsonError] = useState(null); // Define jsonError state

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    await fetchTranslations(project.id);
    await fetchProjectLanguages(project.id);
  };

  const fetchTranslations = async (projectId) => {
    try {
      const { data: translationsData, error: translationsError } = await supabase.from('translations').select('*').eq('project_id', projectId);
      if (translationsError) {
        toast.error('Error fetching translations: ' + translationsError.message);
        console.error('Error fetching translations:', translationsError);
        return;
      }
      const translations = translationsData.reduce((acc, { key, main_value, translations }) => {
        acc[key] = { main_value, translations };
        return acc;
      }, {});
      setTranslations(translations);
      setFilteredTranslations(translations); // Set filteredTranslations
    } catch (error) {
      toast.error('Unexpected error fetching translations');
      console.error('Unexpected error fetching translations:', error);
    }
  };
  

  const fetchProjectLanguages = async (projectId) => {
    try {
      const { data: projectLanguagesData, error: projectLanguagesError } = await supabase.from('project_languages').select('*').eq('project_id', projectId);
      if (projectLanguagesError) {
        toast.error('Error fetching project languages: ' + projectLanguagesError.message);
        console.error('Error fetching project languages:', projectLanguagesError);
        return;
      }
      setProjectLanguages(projectLanguagesData);
      const mainLang = projectLanguagesData.find(lang => lang.is_main);
      setMainLanguage(mainLang.language_code);
      setSelectedLanguage(mainLang.language_code);
    } catch (error) {
      toast.error('Unexpected error fetching project languages');
      console.error('Unexpected error fetching project languages:', error);
    }
  };

  const handleTranslationSubmit = async (newTranslations) => {
    setIsProcessing(true);
    try {
      const progressUpdates = await addTranslations(selectedProject.id, newTranslations, projectLanguages, mainLanguage, process.env.REACT_APP_OPENAI_API_KEY);
      progressUpdates.forEach(progress => setProgress(progress));
      toast.success('Translations added successfully');
    } catch (error) {
      toast.error('Unexpected error adding translations');
      console.error('Unexpected error adding translations:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewProjectSubmit = async (newProjectName, mainLanguageCode) => {
    try {
      await createProject(newProjectName, user.id, mainLanguageCode);
      toast.success('Project created successfully');
      fetchProjects(user.id); // Fetch projects again to refresh the list
    } catch (error) {
      toast.error('Unexpected error creating project');
      console.error('Unexpected error creating project:', error);
    }
  };

  const handleAddNewLanguage = async (languageCode) => {
    try {
      const { error } = await supabase
        .from('project_languages')
        .insert([{ project_id: selectedProject.id, language_code: languageCode, is_main: false }]);
      
      if (error) {
        toast.error('Error adding new language: ' + error.message);
        console.error('Error adding new language:', error);
        return;
      }

      setProjectLanguages([...projectLanguages, { language_code: languageCode, is_main: false }]);
      toast.success('Language added successfully');
    } catch (error) {
      toast.error('Unexpected error adding new language');
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
        toast.error('Error updating old main language: ' + error.message);
        console.error('Error updating old main language:', error);
        return;
      }

      const { error: newMainLangError } = await supabase
        .from('project_languages')
        .update({ is_main: true })
        .eq('project_id', selectedProject.id)
        .eq('language_code', newMainLanguageCode);

      if (newMainLangError) {
        toast.error('Error setting new main language: ' + newMainLangError.message);
        console.error('Error setting new main language:', newMainLangError);
        return;
      }

      setMainLanguage(newMainLanguageCode);
      setSelectedLanguage(newMainLanguageCode);
      await fetchProjectLanguages(selectedProject.id);
      toast.success('Main language updated successfully');
    } catch (error) {
      toast.error('Unexpected error updating main language');
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
      toast.error('Invalid JSON format');
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
    <div className="flex h-screen bg-gray-100">
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      {!session ? (
        <Auth />
      ) : (
        <>
          <Sidebar
            projects={projects}
            handleProjectSelect={handleProjectSelect}
            openNewProjectDialog={openNewProjectDialog}
            user={user}
            onSignOut={signOut}
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
                  <TranslationTable
                    filteredTranslations={filteredTranslations}
                    projectLanguages={projectLanguages}
                    mainLanguage={mainLanguage}
                    openLanguageJsonDialog={openLanguageJsonDialog}
                  />
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
