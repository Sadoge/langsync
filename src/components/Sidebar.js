import React from 'react';

const Sidebar = ({ projects, handleProjectSelect, openNewProjectDialog }) => {
  return (
    <div className="h-full p-4 bg-gray-200">
      <h2 className="text-xl font-semibold mb-4">Projects</h2>
      <ul className="space-y-2">
        {projects.map(project => (
          <li key={project.id} onClick={() => handleProjectSelect(project)} className="p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-100">
            {project.name}
          </li>
        ))}
      </ul>
      <button onClick={openNewProjectDialog} className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded">
        New Project
      </button>
    </div>
  );
};

export default Sidebar;
