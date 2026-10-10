import { SUPPORTED_LANGUAGES } from '../types';

interface LanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
  disabled?: boolean;
}

export default function LanguageSelector({ value, onChange, disabled = false }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-400 whitespace-nowrap">Language</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-gray-800 text-gray-100 border border-gray-600 rounded-md px-3 py-1.5 text-sm
                   focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   hover:border-gray-500 transition-colors"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
