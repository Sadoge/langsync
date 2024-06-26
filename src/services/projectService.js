import supabase from '../supabaseClient';

export const createProject = async (projectName, userId, mainLanguageCode) => {
  const { data: insertData, error: insertError } = await supabase
    .from('projects')
    .insert([{ name: projectName, user_id: userId }])
    .select();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const projectData = insertData[0];

  const { error: langError } = await supabase
    .from('project_languages')
    .insert([{ project_id: projectData.id, language_code: mainLanguageCode, is_main: true }]);

  if (langError) {
    throw new Error(langError.message);
  }

  return projectData;
};
