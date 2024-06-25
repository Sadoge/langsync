import React from 'react';

const AddLanguage = ({ newLanguage, setNewLanguage, handleAddNewLanguage }) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Add New Language</h3>
      <input
        type="text"
        placeholder="New Language"
        value={newLanguage}
        onChange={(e) => setNewLanguage(e.target.value)}
        className="p-2 border border-gray-300 rounded mb-2 w-full"
      />
      <button onClick={handleAddNewLanguage} className="px-4 py-2 bg-purple-500 text-white rounded">
        Add Language
      </button>
    </div>
  );
};

export default AddLanguage;
