import React, { useState } from 'react';
import { toast } from 'react-toastify';

const TranslationEditorDialog = ({ isOpen, closeModal, handleTranslationSubmit, translations, selectedLanguage, mainLanguage }) => {
  const [newTranslations, setNewTranslations] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewTranslations({ ...newTranslations, [name]: value });
  };

  const handleSubmit = async () => {
    if (!Object.keys(newTranslations).length) {
      toast.error('Please enter some translations');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    toast.info('Adding new translations...');

    try {
      await handleTranslationSubmit(newTranslations);
      setNewTranslations({});
      toast.success('Translations added successfully');
      closeModal();
    } catch (error) {
      toast.error('Unexpected error adding translations');
      console.error('Unexpected error adding translations:', error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  return (
    <div className={`modal ${isOpen ? 'block' : 'hidden'}`}>
      <div className="modal-overlay" onClick={closeModal}></div>
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Add New Translations</h2>
          <button className="modal-close" onClick={closeModal}>&times;</button>
        </div>
        <div className="modal-body">
          <form>
            {Object.keys(translations).map((key) => (
              <div key={key} className="mb-4">
                <label className="block text-sm font-medium text-gray-700">{key}</label>
                <input
                  type="text"
                  name={key}
                  value={newTranslations[key] || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            ))}
          </form>
          {isProcessing && (
            <div className="mb-4">
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200">
                  <div
                    style={{ width: `${progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  ></div>
                </div>
                <p className="text-center text-sm mt-2">{progress}%</p>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={handleSubmit} className="btn btn-primary">Save</button>
          <button onClick={closeModal} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TranslationEditorDialog;