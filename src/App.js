import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import './index.css'; // Ensure this import is present

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const App = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [translations, setTranslations] = useState({});
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [languages, setLanguages] = useState([]);
  const [mainLanguage, setMainLanguage] = useState('');
  const [jsonError, setJsonError] = useState(null);

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

  const handleNewProjectSubmit = async () => {
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
      setNewProjectName('');
      setMainLanguage('');
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

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">LangSync</h1>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Create New Project</h2>
        <input
          type="text"
          placeholder="Project Name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          className="p-2 border border-gray-300 rounded mb-2 w-full"
        />
        <input
          type="text"
          placeholder="Main Language"
          value={mainLanguage}
          onChange={(e) => setMainLanguage(e.target.value)}
          className="p-2 border border-gray-300 rounded mb-2 w-full"
        />
        <button onClick={handleNewProjectSubmit} className="px-4 py-2 bg-blue-500 text-white rounded">
          Create Project
        </button>
      </div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Projects</h2>
        <ul className="space-y-2">
          {projects.map(project => (
            <li key={project.id} onClick={() => handleProjectSelect(project)} className="p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-100">
              {project.name}
            </li>
          ))}
        </ul>
      </div>
      {selectedProject && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Translations for {selectedProject.name}</h2>
          <div className="mb-2">
            <label className="block mb-1">
              Select Language:
              <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="p-2 border border-gray-300 rounded w-full">
                <option value={mainLanguage}>{mainLanguage}</option>
                {languages.filter(lang => lang !== mainLanguage).map(language => (
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
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Add New Language</h3>
            <input
              type="text"
              placeholder="New Language"
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              className="p-2 border border-gray-300 rounded mb-2 w-full"
            />
            <button onClick={handleAddNewLanguage} className="px-4 py-2 bg-purple-500 text-white rounded">
              Add Language
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
