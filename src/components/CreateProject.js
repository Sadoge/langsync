import React from 'react';

const CreateProject = ({ newProjectName, setNewProjectName, mainLanguage, setMainLanguage, handleNewProjectSubmit }) => {
  return (
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
  );
};

export default CreateProject;
