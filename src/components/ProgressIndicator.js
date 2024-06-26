import React from 'react';

const ProgressIndicator = ({ progress }) => {
  return (
    <div className="fixed top-0 left-0 w-full h-2 bg-gray-200">
      <div
        className="h-full bg-blue-600"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export default ProgressIndicator;
