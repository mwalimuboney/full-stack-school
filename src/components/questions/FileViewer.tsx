"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  FileText, 
  FileImage, 
  FileVideo, 
  FileCode, 
  ExternalLink, 
  X, 
  Eye, 
  Download,
  FileBox
} from "lucide-react";

interface Props {
  url: string;
  type: string;
  name: string;
}

export default function FileViewer({ url, type, name }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Robust checks for file types
  const isImage = type === "image" || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isPdf = type === "pdf" || url.endsWith(".pdf");
  const isOffice = ["docx", "pptx", "xlsx", "doc"].some((ext) => url.toLowerCase().endsWith(`.${ext}`));

  if (!expanded) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-purple-300 transition-all group">
        <div className="p-2 bg-gray-50 rounded-md group-hover:bg-purple-50 transition-colors">
          <FileIcon type={type} url={url} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{type || "File"}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(true)}
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            title="Preview"
          >
            <Eye size={16} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-lg animate-in zoom-in-95 duration-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <FileIcon type={type} url={url} className="text-gray-400" />
          <span className="text-sm font-medium truncate">{name}</span>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors"
          >
            <Download size={14} />
            Download
          </a>
          <button
            onClick={() => setExpanded(false)}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Viewer Area */}
      <div className="bg-gray-100 flex justify-center items-center min-h-[300px]">
        {isImage && (
          <div className="p-6">
            <div className="relative group">
              <Image
                src={url}
                alt={name}
                width={1200}
                height={800}
                className="max-w-full max-h-[70vh] w-auto h-auto object-contain rounded-lg shadow-md bg-white"
              />
            </div>
          </div>
        )}

        {isPdf && (
          <iframe
            src={`${url}#toolbar=1`}
            className="w-full h-[70vh]"
            title={name}
          />
        )}

        {isOffice && (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
            className="w-full h-[70vh] bg-white"
            title={name}
          />
        )}

        {!isImage && !isPdf && !isOffice && (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 bg-white rounded-2xl shadow-sm mb-4">
              <FileBox size={48} className="text-gray-300" />
            </div>
            <p className="text-gray-600 font-medium">Preview not supported for this file type</p>
            <p className="text-sm text-gray-400 mt-1">Please download the file to view its content locally.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Download size={16} />
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function FileIcon({ type, url, className }: { type: string; url: string; className?: string }) {
  const name = url.toLowerCase();
  
  if (name.endsWith('.pdf') || type === 'pdf') return <FileText className={className || "text-red-500"} size={18} />;
  if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].some(ext => name.endsWith(ext)) || type === 'image') {
    return <FileImage className={className || "text-blue-500"} size={18} />;
  }
  if (['mp4', 'webm', 'mov'].some(ext => name.endsWith(ext)) || type === 'video') {
    return <FileVideo className={className || "text-orange-500"} size={18} />;
  }
  if (['docx', 'doc', 'txt', 'rtf'].some(ext => name.endsWith(ext))) {
    return <FileText className={className || "text-blue-600"} size={18} />;
  }
  if (['xlsx', 'csv'].some(ext => name.endsWith(ext))) {
    return <FileCode className={className || "text-green-600"} size={18} />;
  }
  
  return <FileBox className={className || "text-gray-400"} size={18} />;
}