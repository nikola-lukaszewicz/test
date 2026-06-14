import { useCallback, useEffect, useRef, useState } from 'react';
import { Todo } from './api';
import { isOverdue, isToday } from './dateUtils';

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

// Powiadomienia w przeglądarce o zaległych / dzisiejszych zadaniach,
// gdy karta jest otwarta. Każde zadanie przypominane najwyżej raz na sesję.
export function useBrowserNotifications(todos: Todo[]) {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState<Permission>(
    supported ? (Notification.permission as Permission) : 'unsupported',
  );
  const notified = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result as Permission);
  }, [supported]);

  useEffect(() => {
    if (permission !== 'granted') return;

    const check = () => {
      const pending = todos.filter(
        (t) => !t.completed && (isOverdue(t.dueDate, t.completed) || isToday(t.dueDate)),
      );
      for (const t of pending) {
        if (notified.current.has(t.id)) continue;
        notified.current.add(t.id);
        const overdue = isOverdue(t.dueDate, t.completed);
        new Notification(overdue ? '⏰ Zaległe zadanie' : '📅 Zadanie na dziś', {
          body: t.title,
          tag: t.id,
        });
      }
    };

    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
  }, [todos, permission]);

  return { permission, requestPermission, supported };
}
