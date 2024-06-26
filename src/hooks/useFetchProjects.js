import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const useFetchProjects = (userId) => {
  const [projects, setProjects] = useState([]);

  const fetchProjects = async (userId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects(data);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProjects(userId);
    }
  }, [userId]);

  return { projects, fetchProjects };
};

export default useFetchProjects;
