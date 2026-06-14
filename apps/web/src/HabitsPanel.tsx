import { Habit } from './api';
import { CATEGORY_META } from './meta';

interface HabitsPanelProps {
  habits: Habit[];
  onTrack: (habit: Habit) => void;
}

// Pokazuje czynności wykonywane regularnie i proponuje zamianę ich
// w powtarzalne zadanie z przypomnieniem.
export function HabitsPanel({ habits, onTrack }: HabitsPanelProps) {
  const suggestions = habits.filter((h) => !h.alreadyTracked);
  if (suggestions.length === 0) return null;

  return (
    <div className="habits">
      <h2 className="habits-title">✨ Wykryte nawyki</h2>
      <p className="habits-sub">Często to robisz — chcesz dostawać przypomnienia?</p>
      <ul className="habits-list">
        {suggestions.map((h) => (
          <li key={h.titleKey}>
            <div className="habit-info">
              <span className="habit-name">
                {CATEGORY_META[h.category]?.icon ?? '📌'} {h.title}
              </span>
              <span className="habit-count">{h.count}× ukończone</span>
            </div>
            <button className="habit-track" onClick={() => onTrack(h)}>
              + Codzienne przypomnienie
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
