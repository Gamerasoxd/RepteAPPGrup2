
import React from 'react';
import { GraduationCap } from 'lucide-react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center justify-center bg-red-600 text-white rounded-xl shadow-lg ${className}`}>
    <GraduationCap size="60%" />
  </div>
);
