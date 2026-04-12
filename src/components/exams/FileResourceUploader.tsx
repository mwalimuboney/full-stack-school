// src/components/exam/FileResourceUploader.tsx
"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import FileViewer from "../questions/FileViewer";

interface Resource {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Props {
  resources: Resource[];
  onAdd: (resource: Resource) => void;
  onRemove: (index: number) => void;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export default function FileResourceUploader({ resources, onAdd, onRemove }: Props) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        // In production: upload to Cloudinary/S3/Supabase Storage here
        // For now create a local object URL for preview
        const url = URL.createObjectURL(file);
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const type = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
          ? "image"
          : ext;

        onAdd({ name: file.name, url, type, size: file.size });
      });
    },
    [onAdd]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    },
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-3xl mb-2">📎</div>
        <p className="text-gray-600 font-medium">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, DOCX, PPTX, XLSX, Images — max 20MB each
        </p>
      </div>

      {resources.length > 0 && (
        <div className="space-y-3">
          {resources.map((r, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <FileViewer url={r.url} type={r.type} name={r.name} />
                <span className="text-xs text-gray-400">{formatSize(r.size)}</span>
                <button
                  onClick={() => onRemove(index)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none ml-auto"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}