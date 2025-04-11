'use client';

import { useRef, useState } from 'react';

interface FileUploadProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

// Helper function to verify content of text file as PITCH data with more flexibility
const verifyPitchData = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target?.result) {
        resolve(false);
        return;
      }
      
      // Always consider file valid
      resolve(true);
    };
    
    reader.onerror = () => resolve(false);
    
    // Read as text
    reader.readAsText(file);
  });
};

export default function FileUpload({ onUpload, isLoading }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateAndSetFile = async (file: File) => {
    setValidationError(null);
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setValidationError('File too large. Maximum size is 10MB.');
      return;
    }
    
    // Accept all file types
    // No validation for file type
    
    // Set the file without validation
    setSelectedFile(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-start w-full">
      <div 
        className={`w-full border-2 border-dashed rounded-md p-6 mb-4 transition-colors ${
          dragActive ? 'border-[var(--accent-color)] bg-[rgba(84,207,99,0.1)]' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <p className="mb-2">Drag and drop your data file here, or</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            disabled={isLoading}
          >
            Browse Files
          </button>
          <input
            type="file"
            // Accept all files
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />
        </div>
      </div>
      
      {validationError && (
        <div className="w-full mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {validationError}
        </div>
      )}
      
      {selectedFile && !validationError && (
        <div className="w-full mb-4 p-3 bg-[rgba(84,207,99,0.1)] rounded-md">
          <p className="font-medium">Selected file:</p>
          <p className="text-sm text-gray-600">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!selectedFile || isLoading || !!validationError}
        className={`px-4 py-2 rounded-md ${
          !selectedFile || isLoading || validationError
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white transition-colors'
        }`}
      >
        {isLoading ? 'Processing...' : 'Upload and Process'}
      </button>
    </div>
  );
} 