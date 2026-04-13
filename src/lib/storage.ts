
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import prisma from "./prisma";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export type UploadResult = {
  url: string;
  sourceId: number;
  fileSize: number;
  provider: string;
};

// Simple in-memory cache for storage sources (TTL: 5 minutes)
let sourcesCache: any[] | null = null;
let sourcesCacheTime = 0;
const SOURCES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getActiveSourcesWithCache() {
  const now = Date.now();
  if (sourcesCache && now - sourcesCacheTime < SOURCES_CACHE_TTL) {
    return sourcesCache;
  }

  const sources = await prisma.noteSource.findMany({
    where: { isActive: true, type: { in: ["CLOUDINARY", "SUPABASE_STORAGE"] } },
    orderBy: { priority: "asc" },
  });

  sourcesCache = sources;
  sourcesCacheTime = now;
  return sources;
}

// Upload with automatic fallback
export async function uploadWithFallback(
  file: Buffer,
  fileName: string,
  mimeType: string,
  fileSizeBytes: number
): Promise<UploadResult> {
  // Get active sources from cache (ordered by priority)
  const sources = await getActiveSourcesWithCache();

  for (const source of sources) {
    // Check if source has capacity
    if (source.maxBytes) {
      const remaining = source.maxBytes - source.usedBytes;
      if (remaining < fileSizeBytes) {
        console.warn(`Source ${source.name} is full, trying next...`);
        continue;
      }
    }

    try {
      let url: string;

      if (source.type === "CLOUDINARY") {
        url = await uploadToCloudinary(file, fileName, mimeType);
      } else if (source.type === "SUPABASE_STORAGE") {
        url = await uploadToSupabase(file, fileName, mimeType);
      } else {
        continue;
      }

      // Update used bytes in background (don't wait for it)
      prisma.noteSource.update({
        where: { id: source.id },
        data: { usedBytes: { increment: fileSizeBytes } },
      }).catch(err => console.error(`Failed to update source usage:`, err));

      // Invalidate cache on successful upload to ensure fresh capacity data
      sourcesCache = null;

      return { url, sourceId: source.id, fileSize: fileSizeBytes, provider: source.type };
    } catch (err) {
      console.error(`Upload to ${source.name} failed:`, err);
      // Continue to next source
    }
  }

  throw new Error("All storage sources failed or are full");
}

async function uploadToCloudinary(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const resourceType = mimeType.startsWith("video")
      ? "video"
      : mimeType.startsWith("image")
      ? "image"
      : "raw";

    cloudinary.uploader
      .upload_stream(
        {
          resource_type: resourceType,
          folder: "schoolnotes",
          public_id: `${Date.now()}_${fileName.replace(/\s/g, "_")}`,
          use_filename: true,
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result.secure_url);
        }
      )
      .end(file);
  });
}

async function uploadToSupabase(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const path = `notes/${Date.now()}_${fileName.replace(/\s/g, "_")}`;
  const { error } = await supabase.storage
    .from("school_notes")
    .upload(path, file, { contentType: mimeType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("school_notes").getPublicUrl(path);
  return data.publicUrl;
}

// Detect file type from MIME
export function detectFileType(mimeType: string): string {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) return "docx";
  if (mimeType.includes("presentationml") || mimeType.includes("powerpoint")) return "ppt";
  if (mimeType.includes("spreadsheetml") || mimeType.includes("excel")) return "xlsx";
  return "file";
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

// Call this when storage sources are updated
export function invalidateSourcesCache(): void {
  sourcesCache = null;
}