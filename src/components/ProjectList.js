import React from 'react';

const ProjectList = ({ projects, handleProjectSelect }) => {
  return (
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
  );
};

export default ProjectList;
