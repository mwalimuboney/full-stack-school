"use client";

import { 
  Clock, 
  Calendar, 
  Lock, 
  Eye, 
  Shuffle, 
  ShieldCheck, 
  Globe, 
  UserCheck 
} from "lucide-react";

interface ExamSettings {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  showResultsImmediately: boolean;
  passingScore: number;
  maxAttempts: number;
  isPublic: boolean;
  requiresProctoring: boolean;
}

interface Props {
  settings: ExamSettings;
  onUpdate: (updates: Partial<ExamSettings>) => void;
}

export default function ExamSettingsForm({ settings, onUpdate }: Props) {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* 1. Timing & Availability */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-purple-600" size={20} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Timing & Availability</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500">Start Window</label>
            <input 
              type="datetime-local" 
              value={settings.startTime}
              onChange={(e) => onUpdate({ startTime: e.target.value })}
              className="p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500">End Window</label>
            <input 
              type="datetime-local" 
              value={settings.endTime}
              onChange={(e) => onUpdate({ endTime: e.target.value })}
              className="p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <Clock size={12} /> Duration (Mins)
            </label>
            <input 
              type="number" 
              value={settings.durationMinutes}
              onChange={(e) => onUpdate({ durationMinutes: parseInt(e.target.value) })}
              placeholder="e.g. 60"
              className="p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>
      </section>

      {/* 2. Integrity & Randomization */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shuffle className="text-blue-600" size={20} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Integrity & Anti-Cheat</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingToggle 
            title="Shuffle Questions"
            description="Display questions in a random order for every student."
            icon={<Shuffle size={18} />}
            isActive={settings.shuffleQuestions}
            onToggle={() => onUpdate({ shuffleQuestions: !settings.shuffleQuestions })}
          />
          <SettingToggle 
            title="Shuffle Choices"
            description="Randomize MCQ options (A, B, C, D) for every student."
            icon={<Layers size={18} />} // Placeholder for choice layers
            isActive={settings.shuffleChoices}
            onToggle={() => onUpdate({ shuffleChoices: !settings.shuffleChoices })}
          />
          <SettingToggle 
            title="AI Proctoring"
            description="Monitor browser tab switching and webcam activity."
            icon={<ShieldCheck size={18} />}
            isActive={settings.requiresProctoring}
            onToggle={() => onUpdate({ requiresProctoring: !settings.requiresProctoring })}
          />
          <SettingToggle 
            title="Public Access"
            description="Allow anyone with the link to take the exam."
            icon={<Globe size={18} />}
            isActive={settings.isPublic}
            onToggle={() => onUpdate({ isPublic: !settings.isPublic })}
          />
        </div>
      </section>

      {/* 3. Grading & Results */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="text-green-600" size={20} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Grading & Post-Exam</h2>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Show Results Immediately</p>
                <p className="text-xs text-gray-400">Students see their score right after submission.</p>
              </div>
              <button 
                onClick={() => onUpdate({ showResultsImmediately: !settings.showResultsImmediately })}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.showResultsImmediately ? 'bg-purple-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showResultsImmediately ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="w-full md:w-1/3 space-y-4">
             <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500">Passing Score (%)</label>
                <input 
                  type="number" 
                  value={settings.passingScore}
                  onChange={(e) => onUpdate({ passingScore: parseInt(e.target.value) })}
                  className="p-2 text-sm border border-gray-200 rounded-lg"
                />
             </div>
             <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500">Max Attempts</label>
                <input 
                  type="number" 
                  value={settings.maxAttempts}
                  onChange={(e) => onUpdate({ maxAttempts: parseInt(e.target.value) })}
                  className="p-2 text-sm border border-gray-200 rounded-lg"
                />
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Reusable Toggle Component for cleaner code
function SettingToggle({ title, description, icon, isActive, onToggle }: any) {
  return (
    <div 
      onClick={onToggle}
      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
        isActive ? "bg-purple-50 border-purple-200" : "bg-white border-gray-100 hover:border-gray-200"
      }`}
    >
      <div className={`p-2 rounded-lg ${isActive ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-400"}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{description}</p>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${isActive ? "border-purple-600 bg-purple-600" : "border-gray-200"}`}>
        {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
      </div>
    </div>
  );
}

function Layers({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    );
}