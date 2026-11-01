'use client';

import React, { useState, useRef } from 'react';
import { UploadCloudIcon, FileTextIcon, XIcon } from 'lucide-react';
import { Button } from './Button';

export function UploadZone() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f => 
        f.type === 'application/pdf' || f.type.startsWith('image/')
      );
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(f => 
        f.type === 'application/pdf' || f.type.startsWith('image/')
      );
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    const token = localStorage.getItem('token');
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setFiles([]);
        alert(`Uploaded ${data.count} file(s) successfully!`);
      } else {
        setError(data.detail || 'Upload failed');
      }
    } catch (err) {
      setError('Network error - backend may be down');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 ${
          dragActive 
            ? 'border-brand-500 bg-brand-50' 
            : 'border-line bg-white hover:border-ink-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept="application/pdf,image/*"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <UploadCloudIcon className="h-6 w-6 text-brand-700" />
          </div>
          <div>
            <p className="text-base font-medium text-ink-900">
              Drop invoices here or{' '}
              <button
                type="button"
                onClick={onButtonClick}
                className="text-brand-700 hover:text-brand-600 underline-offset-2 hover:underline"
              >
                browse files
              </button>
            </p>
            <p className="mt-1 text-sm text-ink-500">
              Supports PDF, PNG, JPG, JPEG up to 10MB
            </p>
          </div>
          <Button type="button" onClick={onButtonClick} variant="secondary">
            Select files
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-ink-900">Uploaded files ({files.length})</h3>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-line bg-white p-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                <FileTextIcon className="h-5 w-5 text-brand-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">{file.name}</p>
                <p className="text-xs text-ink-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 hover:bg-canvas hover:text-ink-900"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          {error && <div className="p-3 bg-error-50 text-error-700 rounded-md text-sm">{error}</div>}
          <div className="pt-2">
            <Button type="button" onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full sm:w-auto">
              {uploading ? 'Uploading...' : 'Upload and process'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}