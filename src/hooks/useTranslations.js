import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const useTranslations = (projectId) => {
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    const fetchTranslations = async () => {
      const { data, error } = await supabase.from('translations').select('*').eq('project_id', projectId);
      if (error) {
        console.error('Error fetching translations:', error);
      } else {
        setTranslations(data.reduce((acc, { key, main_value, translations }) => {
          acc[key] = { main_value, translations };
          return acc;
        }, {}));
      }
    };

    fetchTranslations();
  }, [projectId]);

  return translations;
};

export default useTranslations;
