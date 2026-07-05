import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { Camera, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

const compressImage = (file: File): Promise<Blob | File> => {
  return new Promise((resolve) => {
    if (file.type === 'image/gif') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        const MAX_SIZE = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

interface EventData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  theme: string;
  maxUploadLimit: number;
}

export const GuestUpload: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch event details
  const { data: event, isLoading, error } = useQuery<EventData>({
    queryKey: ['publicEvent', slug],
    queryFn: async () => {
      const res = await api.get(`/events/slug/${slug}`);
      return res.data;
    },
    enabled: !!slug,
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast('error', 'File size exceeds the 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.heic', '.heif'],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile || !slug) return;

    try {
      setUploadProgress(0);
      const compressedBlob = await compressImage(selectedFile);
      const uploadFileName = selectedFile.name.replace(/\.(heic|heif)$/i, '.jpg');

      const formData = new FormData();
      formData.append('image', compressedBlob, uploadFileName);
      formData.append('eventSlug', slug);

      await axios.post('/api/v1/photos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(percent);
        },
      });

      // Reset
      setIsSuccess(true);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(null);

      // Trigger beautiful confetti trigger
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
      });

      toast('success', 'Photo uploaded successfully! Pending moderation.');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to upload photo';
      toast('error', errMsg);
      setUploadProgress(null);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent text-indigo-500"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold">Event Not Found</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-xs leading-relaxed">
          The event link you followed does not exist, or the event has been archived.
        </p>
      </div>
    );
  }

  if (event.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold">{event.name}</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-xs leading-relaxed">
          This event wall is currently in draft mode or has been archived, and is not accepting guest uploads.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative px-6 py-10 font-sans overflow-x-hidden select-none">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] -z-10" />

      {/* Main card */}
      <div className="w-full max-w-md mx-auto my-auto flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 font-mono">
            Live Event Photo Stream
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-indigo-100 bg-clip-text text-transparent">
            {event.name}
          </h1>
          {event.description && <p className="text-slate-400 text-sm leading-relaxed px-4">{event.description}</p>}
        </div>

        {/* View Switch */}
        {isSuccess ? (
          /* Thank You Screen */
          <div className="glass-premium p-8 rounded-2xl flex flex-col items-center text-center gap-6 shadow-2xl animate-fade-in">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-pulse" />
            <div>
              <h2 className="text-xl font-bold">Photo Uploaded!</h2>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Thank you! Once approved by our team, your photo will appear live on the main display screen.
              </p>
            </div>
            <button
              onClick={() => setIsSuccess(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-all"
            >
              Upload Another Photo
            </button>
          </div>
        ) : selectedFile ? (
          /* Image Preview and Upload screen */
          <div className="glass p-6 rounded-2xl flex flex-col gap-5 border border-slate-900 shadow-xl animate-fade-in">
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              {previewUrl && <img src={previewUrl} alt="Upload preview" className="w-full h-full object-contain" />}
            </div>

            {uploadProgress !== null ? (
              /* Progress bar overlay */
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400 font-mono">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              /* Actions buttons */
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-855 text-slate-400 hover:text-slate-200 py-2.5 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
                >
                  Publish Photo
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Standard Upload triggers */
          <div className="flex flex-col gap-4">
            {/* Native Mobile Camera Trigger (Takes precedence on mobile viewports) */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="camera-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onDrop([e.target.files[0]]);
                  }
                }}
              />
              <label
                htmlFor="camera-input"
                className="flex items-center justify-center gap-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-5 px-6 font-bold shadow-xl shadow-indigo-600/10 cursor-pointer active:scale-[0.98] transition-all"
              >
                <Camera className="w-6 h-6" />
                <span>Take Photo / Open Camera</span>
              </label>
            </div>

            {/* Desktop Drag and Drop area */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all ${
                isDragActive
                  ? 'border-indigo-500 bg-indigo-600/5'
                  : 'border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/30 hover:border-slate-700/60'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-slate-500" />
              <div>
                <p className="text-sm font-semibold">Or upload from library</p>
                <p className="text-[10px] text-slate-500 mt-1">Supports JPEG, PNG, WEBP, GIF (Max 10MB)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestUpload;
