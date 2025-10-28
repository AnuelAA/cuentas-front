import React from 'react';
import { addMonths, subMonths, format } from 'date-fns';

type Props = {
  month: Date;
  onChange: (m: Date) => void;
};

export const MonthNavigator: React.FC<Props> = ({ month, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        className="btn"
        onClick={() => onChange(subMonths(month, 1))}
        aria-label="Mes anterior"
        title="Mes anterior"
      >
        ‹
      </button>
      <div className="px-3 py-1 rounded bg-slate-50 border">
        {format(month, 'MMMM yyyy')}
      </div>
      <button
        className="btn"
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Mes siguiente"
        title="Mes siguiente"
      >
        ›
      </button>
    </div>
  );
};