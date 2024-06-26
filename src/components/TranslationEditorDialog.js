import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const TranslationEditorDialog = ({ isOpen, closeModal, handleTranslationSubmit, translations = {}, selectedLanguage = '', mainLanguage = '' }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState(null);

  const handleJsonChange = (e) => {
    setJsonInput(e.target.value);
  };

  const handleSubmit = () => {
    try {
      if (jsonInput.trim() === '') {
        throw new Error('JSON input cannot be empty');
      }

      const parsedJson = JSON.parse(jsonInput);
      handleTranslationSubmit(parsedJson);
      setJsonInput('');
      setJsonError(null);
      closeModal();
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Add Translations
                </Dialog.Title>
                <div className="mt-2">
                  <textarea
                    value={jsonInput}
                    onChange={handleJsonChange}
                    className="p-2 border border-gray-300 rounded w-full h-64 mb-2"
                    placeholder='{"key": "value", "key2": "value2"}'
                  />
                  {jsonError && <p className="text-red-500">{jsonError}</p>}
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                    onClick={handleSubmit}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="ml-2 inline-flex justify-center rounded-md border border-transparent bg-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default TranslationEditorDialog;

