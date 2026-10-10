import { LEARNING_MODES, type LearningMode } from '../types';

interface ModeSelectorProps {
  selected: LearningMode;
  onChange: (mode: LearningMode) => void;
  disabled?: boolean;
}

export default function ModeSelector({ selected, onChange, disabled = false }: ModeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
        Learning Mode
      </label>
      <div className="grid grid-cols-2 gap-2">
        {LEARNING_MODES.map((mode) => {
          const isActive = selected === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => !disabled && onChange(mode.id)}
              disabled={disabled}
              title={mode.description}
              className={`
                flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left
                transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                ${isActive
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                }
              `}
            >
              <span className="text-base leading-none">{mode.icon}</span>
              <span className="text-xs font-semibold tracking-wide">{mode.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 italic">
        {LEARNING_MODES.find(m => m.id === selected)?.description}
      </p>
    </div>
  );
}
