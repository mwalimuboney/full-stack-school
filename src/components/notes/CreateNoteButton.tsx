// src/components/notes/CreateNoteButton.tsx
"use client";

import { useState, useTransition, useRef } from "react";
import { createNoteAction } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface Props {
  subjects: { id: number; name: string }[];
  role: string;
}

export default function CreateNoteButton({ subjects, role }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    subjectId: "",
    classId: "",
    isPublic: false,
    tags: "",
    externalUrl: "",
  });

  const handleFileSelect = (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      setError("File must be under 100MB");
      return;
    }
    setSelectedFile(file);
    setError("");
    if (!form.title) setForm((p) => ({ ...p, title: file.name.replace(/\.[^.]+$/, "") }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.subjectId) {
      setError("Title and subject are required");
      return;
    }
    if (uploadMode === "file" && !selectedFile) {
      setError("Please select a file");
      return;
    }
    if (uploadMode === "url" && !form.externalUrl) {
      setError("Please enter a URL");
      return;
    }

    setError("");

    startTransition(async () => {
      let fileBase64: string | undefined;
      let fileName: string | undefined;
      let fileMimeType: string | undefined;
      let fileSize: number | undefined;

      if (uploadMode === "file" && selectedFile) {
        const buffer = await selectedFile.arrayBuffer();
        fileBase64 = Buffer.from(buffer).toString("base64");
        fileName = selectedFile.name;
        fileMimeType = selectedFile.type;
        fileSize = selectedFile.size;
      }

      const result = await createNoteAction({
        title: form.title,
        description: form.description || undefined,
        subjectId: parseInt(form.subjectId),
        classId: form.classId ? parseInt(form.classId) : undefined,
        isPublic: form.isPublic,
        tags: form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        externalUrl: uploadMode === "url" ? form.externalUrl : undefined,
        fileBase64,
        fileName,
        fileMimeType,
        fileSize,
      });

      if (result.success) {
        setOpen(false);
        setSelectedFile(null);
        setForm({ title: "", description: "", subjectId: "", classId: "", isPublic: false, tags: "", externalUrl: "" });
        router.refresh();
      } else {
        setError(result.error ?? "Failed to create note");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
      >
        + Add Resource
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Add Learning Resource</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Upload mode toggle */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(["file", "url"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setUploadMode(mode)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                      uploadMode === mode
                        ? "bg-white text-purple-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {mode === "file" ? "📁 Upload File" : "🔗 External URL"}
                  </button>
                ))}
              </div>

              {/* File upload */}
              {uploadMode === "file" && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                    dragOver
                      ? "border-purple-400 bg-purple-50"
                      : selectedFile
                      ? "border-green-400 bg-green-50"
                      : "border-gray-300 hover:border-purple-300"
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.ppt,.pptx,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mp3,.wav,.mov"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                  {selectedFile ? (
                    <div>
                      <p className="text-2xl mb-1">✅</p>
                      <p className="font-medium text-green-700">{selectedFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl mb-2">📂</p>
                      <p className="text-gray-600 font-medium">Drop file or click to browse</p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, DOCX, PPT, Images, Video, Audio — max 100MB
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* External URL */}
              {uploadMode === "url" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">URL</label>
                  <input
                    type="url"
                    value={form.externalUrl}
                    onChange={(e) => setForm((p) => ({ ...p, externalUrl: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=... or Google Drive link"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    YouTube, Google Drive, or any public URL
                  </p>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Resource title"
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Optional description..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subject *</label>
                <select
                  value={form.subjectId}
                  onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  required
                >
                  <option value="">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Tags <span className="text-gray-400">(comma separated)</span>
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="algebra, chapter 3, revision"
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Visibility */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm((p) => ({ ...p, isPublic: !p.isPublic }))}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    form.isPublic ? "bg-purple-600" : "bg-gray-300"
                  } relative`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form.isPublic ? "translate-x-5" : "translate-x-1"
                  }`} />
                </div>
                <span className="text-sm text-gray-600">
                  {form.isPublic ? "🌐 Public — all students can see" : "🔒 Private — class only"}
                </span>
              </label>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:bg-purple-300 transition"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    "Upload Resource"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}