import React, { useState } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import TranslationTable from './components/TranslationTable';
import NewProjectDialog from './components/NewProjectDialog';
import TranslationEditorDialog from './components/TranslationEditorDialog';
import LanguageJsonDialog from './components/LanguageJsonDialog';
import ProgressIndicator from './components/ProgressIndicator';
import SearchInput from './components/SearchInput';
import UpdateMainLanguageDialog from './components/UpdateMainLanguageDialog';
import Auth from './components/Auth';
import { useAuth } from './context/AuthContext';
import { createProject } from './services/projectService';
import { translateBatch } from './services/translationService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import supabase from './supabaseClient';
import useFetchProjects from './hooks/useFetchProjects';
import LanguageManager from './components/LanguageManager'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

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
  const [isUpdateMainLanguageDialogOpen, setIsUpdateMainLanguageDialogOpen] = useState(false);
  const [languageJsonData, setLanguageJsonData] = useState({});
  const [jsonDialogLanguage, setJsonDialogLanguage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    await fetchTranslations(project.id);
    await fetchProjectLanguages(project.id);
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
  
  const fetchTranslations = async (projectId) => {
    try {
      const { data: translationsData, error: translationsError } = await supabase.from('translations').select('*').eq('project_id', projectId);
      if (translationsError) {
        toast.error('Error fetching translations: ' + translationsError.message);
        console.error('Error fetching translations:', translationsError);
        return;
      }
      const fetchedTranslations = translationsData.reduce((acc, { key, main_value, translations }) => {
        acc[key] = { main_value, translations };
        return acc;
      }, {});
      setTranslations(fetchedTranslations);
      setFilteredTranslations(fetchedTranslations); // Ensure filtered translations are set
    } catch (error) {
      toast.error('Unexpected error fetching translations');
      console.error('Unexpected error fetching translations:', error);
    }
  };  
  
  const handleTranslationSubmit = async (newTranslations, setProgress) => {
    setIsProcessing(true);
    setProgress(0);
  
    try {
      const keys = Object.keys(newTranslations);
      const mainValues = keys.map(key => newTranslations[key]);
  
      // Batch translate main values
      const batchTranslations = await Promise.all(
        projectLanguages.map(async ({ language_code }) => {
          if (language_code !== mainLanguage) {
            const translations = await translateBatch(mainValues, language_code, process.env.REACT_APP_OPENAI_API_KEY);
            return { language_code, translations };
          }
          return null;
        })
      );
  
      // Ensure that the translations are correctly mapped back to their original keys
      const updatedTranslations = keys.map((key, index) => {
        const main_value = mainValues[index];
        const translations = batchTranslations.reduce((acc, batch) => {
          if (batch && batch.translations.length === keys.length) {
            acc[batch.language_code] = batch.translations[index];
          } else if (batch) {
            console.error(`Mismatch for language: ${batch.language_code}`);
            acc[batch.language_code] = ""; // Handle mismatch by setting an empty string or appropriate fallback
          }
          return acc;
        }, {});
        return { key, main_value, translations };
      });
  
      // Update translations in database
      for (let i = 0; i < updatedTranslations.length; i++) {
        const { key, main_value, translations } = updatedTranslations[i];
        const { error } = await supabase
          .from('translations')
          .upsert([{ project_id: selectedProject.id, key, main_value, translations }], {
            onConflict: ['project_id', 'key']
          });
  
        if (error) {
          console.error('Error adding translations:', error);
        }
  
        // Update progress
        setProgress(Math.round(((i + 1) / keys.length) * 100));
      }
  
      toast.success('Translations added successfully');
      fetchTranslations(selectedProject.id);
    } catch (error) {
      toast.error('Unexpected error adding translations');
      console.error('Unexpected error adding translations:', error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
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

  const handleUpdateTranslation = async (key, lang, newValue) => {
    try {
      const existingTranslation = translations[key];
  
      if (lang === mainLanguage) {
        existingTranslation.main_value = newValue;
      } else {
        existingTranslation.translations[lang] = newValue;
      }
  
      const { error } = await supabase
        .from('translations')
        .update({
          main_value: existingTranslation.main_value,
          translations: existingTranslation.translations
        })
        .eq('project_id', selectedProject.id)
        .eq('key', key);
  
      if (error) {
        toast.error('Error updating translation: ' + error.message);
        console.error('Error updating translation:', error);
        return;
      }
  
      setTranslations({
        ...translations,
        [key]: existingTranslation
      });
      setFilteredTranslations({
        ...filteredTranslations,
        [key]: existingTranslation
      });
      toast.success('Translation updated successfully');
    } catch (error) {
      toast.error('Unexpected error updating translation');
      console.error('Unexpected error updating translation:', error);
    }
  };  

  const handleDeleteTranslationKey = async (key) => {
    try {
      const { error } = await supabase
        .from('translations')
        .delete()
        .eq('project_id', selectedProject.id)
        .eq('key', key);
  
      if (error) {
        toast.error('Error deleting translation key: ' + error.message);
        console.error('Error deleting translation key:', error);
        return;
      }
  
      const updatedTranslations = { ...translations };
      delete updatedTranslations[key];
      setTranslations(updatedTranslations);
      setFilteredTranslations(updatedTranslations);
      toast.success('Translation key deleted successfully');
    } catch (error) {
      toast.error('Unexpected error deleting translation key');
      console.error('Unexpected error deleting translation key:', error);
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

  const openUpdateMainLanguageDialog = () => setIsUpdateMainLanguageDialogOpen(true);
  const closeUpdateMainLanguageDialog = () => setIsUpdateMainLanguageDialogOpen(false);

  const [isLanguageManagerOpen, setIsLanguageManagerOpen] = useState(false);

  const toggleLanguageManager = () => {
    setIsLanguageManagerOpen(!isLanguageManagerOpen);
  };

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
            onSignOut={signOut}
          />
          <div className="flex-1 p-6 ml-64 overflow-y-auto min-h-screen">
            {isProcessing && <ProgressIndicator progress={progress} />}
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
                  <div className="mb-4">
                    <button
                      onClick={toggleLanguageManager}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                    >
                      {isLanguageManagerOpen ? <FontAwesomeIcon icon={faChevronUp} className="mr-2" /> : <FontAwesomeIcon icon={faChevronDown} className="mr-2" />}
                       Manage Languages
                    </button>
                    {isLanguageManagerOpen && (
                      <div className="mt-4 p-4 bg-white rounded shadow-md">
                        <LanguageManager
                          projectId={selectedProject.id}
                          projectLanguages={projectLanguages}
                          fetchProjectLanguages={fetchProjectLanguages}
                          fetchTranslations={fetchTranslations}
                        />
                      </div>
                    )}
                  </div>
                  <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                  <TranslationTable
                    filteredTranslations={filteredTranslations}
                    projectLanguages={projectLanguages}
                    mainLanguage={mainLanguage}
                    openLanguageJsonDialog={openLanguageJsonDialog}
                    handleUpdateTranslation={handleUpdateTranslation}
                    handleDeleteTranslationKey={handleDeleteTranslationKey}
                  />
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
      <UpdateMainLanguageDialog
        isOpen={isUpdateMainLanguageDialogOpen}
        closeModal={closeUpdateMainLanguageDialog}
        handleUpdateMainLanguage={handleUpdateMainLanguage}
        currentMainLanguage={mainLanguage}
      />
      <ToastContainer />
    </div>
  );      
};

export default App;
