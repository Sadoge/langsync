import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const useProjects = (userId) => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId);
      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data);
      }
    };

    fetchProjects();
  }, [userId]);

  return projects;
};

export default useProjects;
