
import React from 'react';
import { Delete, X } from 'lucide-react';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ onKeyPress, onDelete, onClear }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-md mx-auto">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onKeyPress(key)}
          className="h-20 flex items-center justify-center text-3xl font-black bg-white border-4 border-gray-100 rounded-[1.5rem] shadow-sm active:bg-red-50 active:scale-90 active:border-red-200 transition-all text-gray-800 hover:border-red-100"
        >
          {key}
        </button>
      ))}
      <button
        onClick={onClear}
        className="h-20 flex items-center justify-center text-xl font-black bg-red-50 text-red-600 rounded-[1.5rem] active:scale-90 transition-all border-4 border-transparent hover:bg-red-100"
      >
        <X size={32} />
      </button>
      <button
        onClick={onDelete}
        className="h-20 flex items-center justify-center text-xl font-black bg-gray-50 text-gray-400 rounded-[1.5rem] active:scale-90 transition-all border-4 border-transparent hover:bg-gray-100"
      >
        <Delete size={32} />
      </button>
    </div>
  );
};

export default VirtualKeyboard;
