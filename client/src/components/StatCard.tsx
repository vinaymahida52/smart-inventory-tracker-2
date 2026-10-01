interface Props {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'danger';
}

const toneClasses: Record<string, string> = {
  default: 'text-white',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

export default function StatCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <div className="card p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
