import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Moon, Sun, ChevronLeft, ChevronRight, Trash2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const StorageKey = "MinimalHabitCalendar_v1";

const PresetColors = [
  { name: "Rose", value: "#D8A7B1" },
  { name: "Sage", value: "#A7C4A0" },
  { name: "Sky", value: "#A8C6E8" },
  { name: "Sand", value: "#E6D3B3" },
  { name: "Lavender", value: "#C7B8E5" },
  { name: "Moss", value: "#B7C8A6" },
  { name: "Peach", value: "#E7B7A3" },
  { name: "Mist", value: "#BFC7D5" },
];

const MonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const Weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function isoDate(year, monthIndex, day) {
  const Month = String(monthIndex + 1).padStart(2, "0");
  const Day = String(day).padStart(2, "0");
  return `${year}-${Month}-${Day}`;
}

function fromIso(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(year, monthIndex) {
  return new Date(year, monthIndex, 1);
}

function buildMonthCells(year, monthIndex) {
  const firstDay = startOfMonth(year, monthIndex);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: isoDate(year, monthIndex, day),
      day,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function loadState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(StorageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(StorageKey, JSON.stringify(state));
}

function themeSurface(isDark) {
  return isDark ? "#171717" : "#F5F3EF";
}

function themeSurfaceSoft(isDark) {
  return isDark ? "#202020" : "#FFFFFF";
}

function themeBorder(isDark) {
  return isDark ? "#313131" : "#E4DDD5";
}

function themeText(isDark) {
  return isDark ? "#EAEAEA" : "#242424";
}

function themeMuted(isDark) {
  return isDark ? "#B8B8B8" : "#6A6A6A";
}

export default function HabitCalendarSite() {
  const saved = loadState();
  const now = new Date();
  const [isDark, setIsDark] = useState(saved?.isDark ?? false);
  const [selectedYear, setSelectedYear] = useState(saved?.selectedYear ?? now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(saved?.selectedMonth ?? now.getMonth());
  const [habits, setHabits] = useState(Array.isArray(saved?.habits) ? saved.habits : []);
  const [days, setDays] = useState(typeof saved?.days === "object" && saved?.days !== null ? saved.days : {});
  const [selectedHabitId, setSelectedHabitId] = useState(saved?.selectedHabitId ?? null);
  const [isHabitDialogOpen, setIsHabitDialogOpen] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [habitColor, setHabitColor] = useState(PresetColors[0].value);
  const [customRed, setCustomRed] = useState("216");
  const [customGreen, setCustomGreen] = useState("167");
  const [customBlue, setCustomBlue] = useState("177");

  const monthCells = useMemo(() => buildMonthCells(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  useEffect(() => {
    saveState({
      isDark,
      selectedYear,
      selectedMonth,
      habits,
      days,
      selectedHabitId,
    });
  }, [isDark, selectedYear, selectedMonth, habits, days, selectedHabitId]);

  const monthLabel = `${MonthNames[selectedMonth]} ${selectedYear}`;

  const habitMap = useMemo(() => {
    const habitMapLocal = new Map();

    habits.forEach((habit) => {
      habitMapLocal.set(habit.id, habit);
    });

    return habitMapLocal;
  }, [habits]);

  function addHabit() {
    const cleanName = habitName.trim();
    if (!cleanName) return;

    const red = clamp(Number(customRed || 0), 0, 255);
    const green = clamp(Number(customGreen || 0), 0, 255);
    const blue = clamp(Number(customBlue || 0), 0, 255);
    const color = habitColor.startsWith("#") ? habitColor : `rgb(${red}, ${green}, ${blue})`;

    const newHabit = {
      id: crypto.randomUUID(),
      name: cleanName,
      color,
    };

    const nextHabits = [...habits, newHabit];
    setHabits(nextHabits);
    setSelectedHabitId(newHabit.id);
    setHabitName("");
    setHabitColor(PresetColors[0].value);
    setCustomRed("216");
    setCustomGreen("167");
    setCustomBlue("177");
    setIsHabitDialogOpen(false);
  }

  function deleteHabit(habitId) {
    const nextHabits = habits.filter((habit) => habit.id !== habitId);
    const nextDays = Object.fromEntries(
      Object.entries(days).map(([date, habitIds]) => [
        date,
        habitIds.filter((id) => id !== habitId),
      ])
    );

    setHabits(nextHabits);
    setDays(nextDays);
    if (selectedHabitId === habitId) {
      setSelectedHabitId(nextHabits[0]?.id ?? null);
    }
  }

  function goPreviousMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((year) => year - 1);
      return;
    }
    setSelectedMonth((month) => month - 1);
  }

  function goNextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((year) => year + 1);
      return;
    }
    setSelectedMonth((month) => month + 1);
  }

  function setDayHabit(date, habitId) {
    if (!habitId) return;
    const current = days[date] ?? [];
    const habit = habitMap.get(habitId);
    if (!habit) return;

    let next = [...current];
    const exists = next.includes(habitId);

    if (exists) {
      next = next.filter((id) => id !== habitId);
    } else {
      if (next.length >= 2) {
        next = [next[1], habitId].filter(Boolean);
      } else {
        next = [...next, habitId];
      }
    }

    const nextDays = { ...days };
    if (next.length === 0) {
      delete nextDays[date];
    } else {
      nextDays[date] = next;
    }
    setDays(nextDays);
  }

  function clearDay(date) {
    const nextDays = { ...days };
    delete nextDays[date];
    setDays(nextDays);
  }

  function renderCellBackground(date) {
    const habitIds = days[date] ?? [];
    const surface = themeSurface(isDark);
    const border = themeBorder(isDark);

    if (habitIds.length === 0) {
      return {
        background: surface,
        borderColor: border,
      };
    }

    const colorA = habitMap.get(habitIds[0])?.color ?? surface;
    const colorB = habitMap.get(habitIds[1])?.color ?? colorA;

    if (habitIds.length === 1) {
      return {
        background: colorA,
        borderColor: border,
      };
    }

    return {
      background: `linear-gradient(to bottom, ${colorA} 0 50%, ${colorB} 50% 100%)`,
      borderColor: border,
      transform: "scale(1.08)",
      zIndex: 2,
      boxShadow: isDark ? "0 10px 24px rgba(0,0,0,0.35)" : "0 10px 24px rgba(0,0,0,0.08)",
    };
  }

  const appBackground = isDark ? "#111111" : "#EEE8E1";
  const panelBackground = themeSurfaceSoft(isDark);
  const textColor = themeText(isDark);
  const mutedColor = themeMuted(isDark);
  const borderColor = themeBorder(isDark);

  return (
    <div
      style={{ background: appBackground, color: textColor }}
      className="min-h-screen w-full p-4 md:p-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Card
          style={{ background: panelBackground, borderColor }}
          className="rounded-3xl border shadow-sm"
        >
          <CardContent className="flex flex-col gap-4 p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor }}>
                  <Palette size={18} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold md:text-2xl">Minimal habit calendar</h1>
                  <p className="text-sm" style={{ color: mutedColor }}>
                    Calendar-first layout, persistent habits, quiet visual language.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={goPreviousMonth} className="rounded-2xl">
                  <ChevronLeft size={16} />
                </Button>
                <div className="min-w-[160px] rounded-2xl border px-4 py-2 text-center text-sm font-medium" style={{ borderColor }}>
                  {monthLabel}
                </div>
                <Button variant="outline" onClick={goNextMonth} className="rounded-2xl">
                  <ChevronRight size={16} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDark((value) => !value)}
                  className="rounded-2xl"
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </Button>
                <Dialog open={isHabitDialogOpen} onOpenChange={setIsHabitDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-2xl">
                      <Plus size={16} />
                      Add habit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl">
                    <DialogHeader>
                      <DialogTitle>New habit</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div className="grid gap-2">
                        <Label htmlFor="habitName">Habit name</Label>
                        <Input
                          id="habitName"
                          value={habitName}
                          onChange={(event) => setHabitName(event.target.value)}
                          placeholder="German"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Preset colors</Label>
                        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
                          {PresetColors.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setHabitColor(preset.value)}
                              className="h-10 rounded-2xl border"
                              style={{
                                background: preset.value,
                                borderColor: habitColor === preset.value ? textColor : borderColor,
                                outline: habitColor === preset.value ? `2px solid ${textColor}` : "none",
                              }}
                              title={preset.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Custom RGB</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Input type="number" min="0" max="255" value={customRed} onChange={(event) => setCustomRed(event.target.value)} placeholder="R" />
                          <Input type="number" min="0" max="255" value={customGreen} onChange={(event) => setCustomGreen(event.target.value)} placeholder="G" />
                          <Input type="number" min="0" max="255" value={customBlue} onChange={(event) => setCustomBlue(event.target.value)} placeholder="B" />
                        </div>
                      </div>

                      <div className="rounded-2xl border p-3" style={{ borderColor }}>
                        <div className="mb-2 text-xs uppercase tracking-wide" style={{ color: mutedColor }}>
                          Preview
                        </div>
                        <div
                          className="h-10 rounded-2xl border"
                          style={{
                            background: habitColor.startsWith("#")
                              ? habitColor
                              : `rgb(${clamp(Number(customRed || 0), 0, 255)}, ${clamp(Number(customGreen || 0), 0, 255)}, ${clamp(Number(customBlue || 0), 0, 255)})`,
                            borderColor,
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsHabitDialogOpen(false)} className="rounded-2xl">
                        Cancel
                      </Button>
                      <Button onClick={addHabit} className="rounded-2xl">
                        Create habit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {habits.length === 0 ? (
                <div className="rounded-2xl border px-3 py-2 text-sm" style={{ borderColor, color: mutedColor }}>
                  Add a habit first, then assign it to calendar days.
                </div>
              ) : (
                habits.map((habit) => {
                  const active = selectedHabitId === habit.id;
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      onClick={() => setSelectedHabitId(habit.id)}
                      className="group flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition"
                      style={{
                        borderColor: active ? textColor : borderColor,
                        background: active ? habit.color : panelBackground,
                        color: active ? "#111111" : textColor,
                      }}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ background: habit.color }} />
                      <span>{habit.name}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteHabit(habit.id);
                        }}
                        className="ml-1 opacity-60 transition hover:opacity-100"
                        aria-label={`Delete ${habit.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: mutedColor }}>
              <span>Click a habit to select it.</span>
              <span>Then click a day to assign it.</span>
              <span>Second habit on the same day creates a horizontal split.</span>
            </div>
          </CardContent>
        </Card>

        <Card
          style={{ background: panelBackground, borderColor }}
          className="rounded-3xl border shadow-sm"
        >
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-7 gap-2">
              {Weekdays.map((weekday) => (
                <div
                  key={weekday}
                  className="pb-1 text-center text-xs font-medium uppercase tracking-[0.16em]"
                  style={{ color: mutedColor }}
                >
                  {weekday}
                </div>
              ))}

              {monthCells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const habitIds = days[cell.date] ?? [];
                const backgroundStyle = renderCellBackground(cell.date);
                const daySelected = habitIds.length > 0;

                return (
                  <motion.button
                    key={cell.date}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setDayHabit(cell.date, selectedHabitId)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      clearDay(cell.date);
                    }}
                    className="relative aspect-square overflow-hidden rounded-2xl border text-left transition hover:brightness-[0.99]"
                    title={daySelected ? habitIds.map((id) => habitMap.get(id)?.name).filter(Boolean).join(", ") : "Empty day"}
                    style={{
                      ...backgroundStyle,
                      borderColor,
                      color: daySelected ? "#111111" : textColor,
                      transform: backgroundStyle.transform ?? "none",
                    }}
                  >
                    <div className="absolute left-2 top-2 z-10 rounded-full px-1.5 py-0.5 text-[11px] font-medium" style={{ background: daySelected ? "rgba(255,255,255,0.40)" : "transparent" }}>
                      {cell.day}
                    </div>
                    {habitIds.length > 0 && (
                      <div className="absolute inset-x-2 bottom-2 z-10 flex flex-col gap-1">
                        {habitIds.map((habitId) => {
                          const habit = habitMap.get(habitId);
                          if (!habit) return null;
                          return (
                            <div
                              key={habitId}
                              className="h-2 rounded-full"
                              style={{ background: habit.color, opacity: 0.9 }}
                            />
                          );
                        })}
                      </div>
                    )}
                    {habitIds.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: mutedColor }}>
                        
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}