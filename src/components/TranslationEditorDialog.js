import React, { useState } from 'react';
import { toast } from 'react-toastify';

const TranslationEditorDialog = ({ isOpen, closeModal, handleTranslationSubmit }) => {
  const [jsonInput, setJsonInput] = useState('{}');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleJsonChange = (e) => {
    setJsonInput(e.target.value);
  };

  const handleSubmit = async () => {
    let newTranslations;

    try {
      newTranslations = JSON.parse(jsonInput);
    } catch (error) {
      toast.error('Invalid JSON format');
      return;
    }

    if (!Object.keys(newTranslations).length) {
      toast.error('Please enter some translations');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    toast.info('Adding new translations...');

    try {
      await handleTranslationSubmit(newTranslations, setProgress);
      setJsonInput('{}');
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
    <div className={`modal ${isOpen ? 'fixed' : 'hidden'} inset-0 z-50 flex items-center justify-center`}>
      <div className="modal-overlay fixed inset-0 bg-gray-900 opacity-50" onClick={closeModal}></div>
      <div className="modal-container bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">
        <div className="modal-header p-4 border-b">
          <h2 className="modal-title text-lg font-semibold">Add New Translations</h2>
          <button className="modal-close text-gray-700 hover:text-gray-900" onClick={closeModal}>&times;</button>
        </div>
        <div className="modal-body p-4">
          <textarea
            value={jsonInput}
            onChange={handleJsonChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            rows="10"
          ></textarea>
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
        <div className="modal-footer p-4 border-t">
          <button onClick={handleSubmit} className="btn btn-primary bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-400">Save</button>
          <button onClick={closeModal} className="btn btn-secondary bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 ml-2">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TranslationEditorDialog;
