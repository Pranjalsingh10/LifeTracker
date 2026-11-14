export type HabitInput = {
  name: string;
  emoji: string;
  color: string;
  category: string;
  targetDays: number;
  notes: string;
};

export type HabitView = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: string;
  target: number;
  notes: string;
  createdAt: string;
  done: Set<string>;
};
