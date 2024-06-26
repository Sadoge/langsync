import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faUser, faPlusCircle } from '@fortawesome/free-solid-svg-icons';

const Sidebar = ({ projects, handleProjectSelect, openNewProjectDialog, user, onSignOut }) => {
  return (
    <div className="w-64 h-full bg-gray-800 text-white fixed flex flex-col justify-between">
      <div className="p-4 flex-grow">
        <h2 className="text-xl font-semibold mb-4">LangSync</h2>
        <h3 className="text-lg font-semibold mb-2">Projects</h3>
        <button
          onClick={openNewProjectDialog}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors mb-4"
        >
          <FontAwesomeIcon icon={faPlusCircle} className="mr-2" />
          New Project
        </button>
        <ul>
          {projects.map((project) => (
            <li key={project.id} className="mb-2">
              <button
                onClick={() => handleProjectSelect(project)}
                className="w-full text-left px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
              >
                {project.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center mb-2">
          <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400" />
          <div>
            <div className="text-sm font-semibold">{user.email}</div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
        >
          <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
