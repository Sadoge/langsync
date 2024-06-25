import React from 'react';
import { PlusCircleIcon } from '@heroicons/react/outline';

const Sidebar = ({ projects, handleProjectSelect, openNewProjectDialog }) => {
  return (
    <div className="h-full w-64 p-4 bg-gray-800 text-white flex flex-col">
      <h1 className="text-3xl font-bold mb-6">LangSync</h1>
      <h2 className="text-xl font-semibold mb-4">Projects</h2>
      <ul className="space-y-2 flex-1 overflow-y-auto">
        {projects.map(project => (
          <li
            key={project.id}
            onClick={() => handleProjectSelect(project)}
            className="p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
          >
            {project.name}
          </li>
        ))}
      </ul>
      <button
        onClick={openNewProjectDialog}
        className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
      >
        <PlusCircleIcon className="h-5 w-5 mr-2" />
        New Project
      </button>
    </div>
  );
};

export default Sidebar;
