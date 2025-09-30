import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';
import { Upload, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  preview?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  accept = { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
  maxSize = 10 * 1024 * 1024, // 10MB
  preview,
  isUploading = false,
  uploadProgress = 0,
  className,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
      setDragActive(false);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  if (preview && !isUploading) {
    return (
      <div className={cn("relative group", className)}>
        <img
          src={preview}
          alt="Preview"
          className="w-full h-48 object-cover rounded-lg border-2 border-border"
        />
        <button
          onClick={onFileRemove}
          className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid="button-remove-image"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          "hover:bg-secondary/30",
          isDragActive || dragActive
            ? "border-primary bg-primary/5"
            : "border-border bg-secondary/20"
        )}
        data-testid="upload-area"
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="space-y-3" data-testid="upload-progress">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Image className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-foreground font-medium">Uploading image...</p>
              <Progress value={uploadProgress} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {uploadProgress}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-foreground font-medium">
                Drop your image here, or{' '}
                <span className="text-primary">browse</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Supports JPG, PNG up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
