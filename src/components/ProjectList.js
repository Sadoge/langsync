import React from 'react';

const ProjectList = ({ projects, handleProjectSelect, openNewProjectDialog }) => (
  <div className="project-list">
    <button onClick={openNewProjectDialog} className="btn btn-primary">New Project</button>
    <ul>
      {projects.map(project => (
        <li key={project.id} onClick={() => handleProjectSelect(project)}>
          {project.name}
        </li>
      ))}
    </ul>
  </div>
);

export default ProjectList;
