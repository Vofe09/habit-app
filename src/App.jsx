import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Palette,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);
const DebugMode = true;

function debugLog(message, data) {
  if (!DebugMode) return;
  if (data !== undefined) {
    console.log(`[HabitCalendar] ${message}`, data);
  } else {
    console.log(`[HabitCalendar] ${message}`);
  }
}

let firebaseAuth = null;
let firestoreDb = null;
let googleProvider = null;

if (hasFirebaseConfig) {
  const app = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(app);
  firestoreDb = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function isoDate(year, monthIndex, day) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayString = String(day).padStart(2, "0");
  return `${year}-${month}-${dayString}`;
}

function startOfMonth(year, monthIndex) {
  return new Date(year, monthIndex, 1);
}

function buildMonthCells(year, monthIndex) {
  const firstDay = startOfMonth(year, monthIndex);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < firstWeekday; index += 1) {
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

function themeSurface(isDark) {
  return isDark ? "#171717" : "#F5F1EB";
}

function themeSurfaceSoft(isDark) {
  return isDark ? "#1E1E1E" : "#FFFFFF";
}

function themeBorder(isDark) {
  return isDark ? "#323232" : "#E4DCD2";
}

function themeText(isDark) {
  return isDark ? "#EDEDED" : "#222222";
}

function themeMuted(isDark) {
  return isDark ? "#B7B7B7" : "#707070";
}

function isHexColor(value) {
  return typeof value === "string" && value.startsWith("#");
}

function createEmptyWorkspace(name) {
  return {
    id: crypto.randomUUID(),
    name,
    habits: [],
    days: {},
    selectedHabitId: null,
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth(),
  };
}

function createDefaultAppState() {
  return {
    isDark: false,
    workspaces: [createEmptyWorkspace("Main workspace")],
    selectedWorkspaceIndex: 0,
  };
}

function normalizeWorkspace(workspace, fallbackName) {
  if (!workspace || typeof workspace !== "object") {
    return createEmptyWorkspace(fallbackName);
  }

  return {
    id: typeof workspace.id === "string" ? workspace.id : crypto.randomUUID(),
    name:
      typeof workspace.name === "string" && workspace.name.trim()
        ? workspace.name
        : fallbackName,
    habits: Array.isArray(workspace.habits) ? workspace.habits : [],
    days:
      typeof workspace.days === "object" && workspace.days !== null ? workspace.days : {},
    selectedHabitId: workspace.selectedHabitId ?? null,
    selectedYear: Number.isInteger(workspace.selectedYear)
      ? workspace.selectedYear
      : new Date().getFullYear(),
    selectedMonth: Number.isInteger(workspace.selectedMonth)
      ? workspace.selectedMonth
      : new Date().getMonth(),
  };
}

function normalizeAppState(data) {
  const fallback = createDefaultAppState();

  if (!data || typeof data !== "object") {
    return fallback;
  }

  const rawWorkspaces = Array.isArray(data.workspaces) && data.workspaces.length > 0 ? data.workspaces : fallback.workspaces;
  const workspaces = rawWorkspaces.map((workspace, index) =>
    normalizeWorkspace(workspace, `Workspace ${index + 1}`)
  );

  return {
    isDark: typeof data.isDark === "boolean" ? data.isDark : fallback.isDark,
    workspaces,
    selectedWorkspaceIndex: clamp(
      Number.isInteger(data.selectedWorkspaceIndex) ? data.selectedWorkspaceIndex : 0,
      0,
      workspaces.length - 1
    ),
  };
}

export default function HabitCalendarSite() {
  const defaultState = useMemo(() => createDefaultAppState(), []);
  const [isDark, setIsDark] = useState(defaultState.isDark);
  const [workspaces, setWorkspaces] = useState(defaultState.workspaces);
  const [selectedWorkspaceIndex, setSelectedWorkspaceIndex] = useState(
    defaultState.selectedWorkspaceIndex
  );
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isHabitDialogOpen, setIsHabitDialogOpen] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [habitColor, setHabitColor] = useState(PresetColors[0].value);
  const [customRed, setCustomRed] = useState("216");
  const [customGreen, setCustomGreen] = useState("167");
  const [customBlue, setCustomBlue] = useState("177");
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isRemoteReady, setIsRemoteReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [authError, setAuthError] = useState("");

  const activeWorkspace = workspaces[selectedWorkspaceIndex] ?? workspaces[0];

  const monthCells = useMemo(
    () => buildMonthCells(activeWorkspace.selectedYear, activeWorkspace.selectedMonth),
    [activeWorkspace.selectedYear, activeWorkspace.selectedMonth]
  );

 useEffect(() => {
  if (!firebaseAuth || !firestoreDb) {
    setIsAuthReady(true);
    setAuthError(
      "Firebase is not configured yet. Add the VITE_FIREBASE_* env variables first."
    );
    debugLog("Firebase config missing", firebaseConfig);
    return undefined;
  }

  debugLog("Auth listener initialized");

  const unsubscribe = onAuthStateChanged(firebaseAuth, async (nextUser) => {
    debugLog("Auth state changed", {
      hasUser: Boolean(nextUser),
      uid: nextUser?.uid ?? null,
      email: nextUser?.email ?? null,
    });

    setUser(nextUser);
    setIsAuthReady(true);
    setIsRemoteReady(false);
    setAuthError("");

    if (!nextUser) {
      debugLog("No user signed in");
      setIsRemoteReady(true);
      return;
    }

    try {
      const userDocRef = doc(firestoreDb, "users", nextUser.uid);
      debugLog("Loading Firestore document", { path: `users/${nextUser.uid}` });

      const snapshot = await getDoc(userDocRef);

      debugLog("Firestore snapshot received", {
        exists: snapshot.exists(),
        data: snapshot.exists() ? snapshot.data() : null,
      });

      if (snapshot.exists()) {
        const normalized = normalizeAppState(snapshot.data());
        setIsDark(normalized.isDark);
        setWorkspaces(normalized.workspaces);
        setSelectedWorkspaceIndex(normalized.selectedWorkspaceIndex);
      } else {
        const fallback = createDefaultAppState();
        debugLog("No document found, using fallback state", fallback);
        setIsDark(fallback.isDark);
        setWorkspaces(fallback.workspaces);
        setSelectedWorkspaceIndex(fallback.selectedWorkspaceIndex);
      }
    } catch (error) {
      console.error("[HabitCalendar] Failed to load Firebase data:", error);
      setAuthError(error?.message || "Failed to load your Firebase data.");
    } finally {
      setIsRemoteReady(true);
      debugLog("Remote state ready");
    }
  });

  return () => unsubscribe();
}, []);

useEffect(() => {
  debugLog("Save effect check", {
    hasUser: Boolean(user),
    isRemoteReady,
    userId: user?.uid ?? null,
    isDark,
    selectedWorkspaceIndex,
    workspaceCount: workspaces.length,
  });

  if (!user || !firestoreDb || !isRemoteReady) return undefined;

  const timeoutId = window.setTimeout(async () => {
    setIsSaving(true);

    const payload = {
      isDark,
      workspaces,
      selectedWorkspaceIndex,
      updatedAt: serverTimestamp(),
    };

    try {
      debugLog("Saving to Firestore", {
        path: `users/${user.uid}`,
        payload,
      });

      await setDoc(doc(firestoreDb, "users", user.uid), payload);

      debugLog("Save successful");
    } catch (error) {
      console.error("[HabitCalendar] Failed to save Firebase data:", error);
      setAuthError(error?.message || "Failed to save your data.");
    } finally {
      setIsSaving(false);
    }
  }, 500);

  return () => window.clearTimeout(timeoutId);
}, [user, firestoreDb, isRemoteReady, isDark, workspaces, selectedWorkspaceIndex]);
  const habitMap = useMemo(() => {
    const map = new Map();
    activeWorkspace.habits.forEach((habit) => map.set(habit.id, habit));
    return map;
  }, [activeWorkspace.habits]);

  const monthLabel = `${MonthNames[activeWorkspace.selectedMonth]} ${activeWorkspace.selectedYear}`;
  const workspaceLabel = activeWorkspace.name;
  const appBackground = isDark ? "#111111" : "#EEE7DF";
  const panelBackground = themeSurfaceSoft(isDark);
  const textColor = themeText(isDark);
  const mutedColor = themeMuted(isDark);
  const borderColor = themeBorder(isDark);
  const surfaceColor = themeSurface(isDark);

  function updateActiveWorkspace(updater) {
    setWorkspaces((currentWorkspaces) =>
      currentWorkspaces.map((workspace, index) => {
        if (index !== selectedWorkspaceIndex) return workspace;
        const updatedWorkspace = updater(workspace);
        return normalizeWorkspace(updatedWorkspace, workspace.name);
      })
    );
  }

  async function handleGoogleSignIn() {
    if (!firebaseAuth || !googleProvider) return;
    setAuthError("");
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (error) {
      setAuthError(error?.message || "Google sign-in failed.");
    }
  }

  async function handleSignOut() {
    if (!firebaseAuth) return;
    setAuthError("");
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      setAuthError(error?.message || "Sign out failed.");
    }
  }

  function addHabit() {
    const cleanName = habitName.trim();
    if (!cleanName) return;

    const red = clamp(Number(customRed || 0), 0, 255);
    const green = clamp(Number(customGreen || 0), 0, 255);
    const blue = clamp(Number(customBlue || 0), 0, 255);
    const color = isHexColor(habitColor) ? habitColor : `rgb(${red}, ${green}, ${blue})`;

    const newHabit = {
      id: crypto.randomUUID(),
      name: cleanName,
      color,
    };

    updateActiveWorkspace((workspace) => ({
      ...workspace,
      habits: [...workspace.habits, newHabit],
      selectedHabitId: newHabit.id,
    }));

    setHabitName("");
    setHabitColor(PresetColors[0].value);
    setCustomRed("216");
    setCustomGreen("167");
    setCustomBlue("177");
    setIsHabitDialogOpen(false);
  }

  function deleteHabit(habitId) {
    updateActiveWorkspace((workspace) => {
      const nextHabits = workspace.habits.filter((habit) => habit.id !== habitId);
      const nextDays = Object.fromEntries(
        Object.entries(workspace.days).map(([date, habitIds]) => [
          date,
          habitIds.filter((id) => id !== habitId),
        ])
      );

      Object.keys(nextDays).forEach((date) => {
        if (nextDays[date].length === 0) {
          delete nextDays[date];
        }
      });

      return {
        ...workspace,
        habits: nextHabits,
        days: nextDays,
        selectedHabitId:
          workspace.selectedHabitId === habitId ? null : workspace.selectedHabitId,
      };
    });
  }

  function goPreviousMonth() {
    updateActiveWorkspace((workspace) => {
      if (workspace.selectedMonth === 0) {
        return {
          ...workspace,
          selectedYear: workspace.selectedYear - 1,
          selectedMonth: 11,
        };
      }

      return {
        ...workspace,
        selectedMonth: workspace.selectedMonth - 1,
      };
    });
  }

  function goNextMonth() {
    updateActiveWorkspace((workspace) => {
      if (workspace.selectedMonth === 11) {
        return {
          ...workspace,
          selectedYear: workspace.selectedYear + 1,
          selectedMonth: 0,
        };
      }

      return {
        ...workspace,
        selectedMonth: workspace.selectedMonth + 1,
      };
    });
  }

  function setDayHabit(date, habitId) {
    if (!habitId) return;
    const habit = habitMap.get(habitId);
    if (!habit) return;

    updateActiveWorkspace((workspace) => {
      const current = workspace.days[date] ?? [];
      let next = [...current];
      const exists = next.includes(habitId);

      if (exists) {
        next = next.filter((id) => id !== habitId);
      } else if (next.length >= 2) {
        next = [next[1], habitId].filter(Boolean);
      } else {
        next = [...next, habitId];
      }

      const nextDays = { ...workspace.days };
      if (next.length === 0) {
        delete nextDays[date];
      } else {
        nextDays[date] = next;
      }

      return {
        ...workspace,
        days: nextDays,
      };
    });
  }

  function clearDay(date) {
    updateActiveWorkspace((workspace) => {
      const nextDays = { ...workspace.days };
      delete nextDays[date];
      return {
        ...workspace,
        days: nextDays,
      };
    });
  }

  function renderCellStyle(date) {
    const habitIds = activeWorkspace.days[date] ?? [];
    const border = themeBorder(isDark);

    if (habitIds.length === 0) {
      return {
        background: surfaceColor,
        borderColor: border,
      };
    }

    const colorA = habitMap.get(habitIds[0])?.color ?? surfaceColor;
    const colorB = habitMap.get(habitIds[1])?.color ?? colorA;

    if (habitIds.length === 1) {
      return {
        background: colorA,
        borderColor: border,
        boxShadow: isDark ? "0 6px 16px rgba(0,0,0,0.24)" : "0 6px 16px rgba(0,0,0,0.08)",
      };
    }

    const divider = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)";

    return {
      background: `linear-gradient(180deg, ${colorA} 0 49.45%, ${divider} 49.45% 50.55%, ${colorB} 50.55% 100%)`,
      borderColor: border,
      boxShadow: isDark ? "0 10px 24px rgba(0,0,0,0.34)" : "0 10px 24px rgba(0,0,0,0.10)",
      transform: "scale(1.06)",
      zIndex: 3,
    };
  }

  function createWorkspace() {
    const cleanName = newWorkspaceName.trim();
    const nextName = cleanName || `Workspace ${workspaces.length + 1}`;
    const nextWorkspace = createEmptyWorkspace(nextName);

    setWorkspaces((current) => [...current, nextWorkspace]);
    setSelectedWorkspaceIndex(workspaces.length);
    setNewWorkspaceName("");
    setIsWorkspaceDialogOpen(false);
  }

  function goPreviousWorkspace() {
    setSelectedWorkspaceIndex((current) =>
      current === 0 ? workspaces.length - 1 : current - 1
    );
  }

  function goNextWorkspace() {
    setSelectedWorkspaceIndex((current) =>
      current === workspaces.length - 1 ? 0 : current + 1
    );
  }

  const habitPreviewColor = isHexColor(habitColor)
    ? habitColor
    : `rgb(${clamp(Number(customRed || 0), 0, 255)}, ${clamp(Number(customGreen || 0), 0, 255)}, ${clamp(Number(customBlue || 0), 0, 255)})`;

  if (!isAuthReady) {
    return (
      <div className="min-h-screen w-full" style={{ background: appBackground, color: textColor }}>
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center p-4">
          <Card style={{ background: panelBackground, borderColor }} className="rounded-3xl border shadow-sm">
            <CardContent className="p-6 text-sm" style={{ color: mutedColor }}>
              Preparing Firebase session...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full" style={{ background: appBackground, color: textColor }}>
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center p-4">
          <Card style={{ background: panelBackground, borderColor }} className="w-full max-w-lg rounded-3xl border shadow-sm">
            <CardContent className="flex flex-col gap-4 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor, background: surfaceColor }}>
                  <Palette size={18} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Minimal habit calendar</h1>
                  <p className="text-sm" style={{ color: mutedColor }}>
                    Sign in with Google to sync your workspaces across devices.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border p-4 text-sm" style={{ borderColor, background: surfaceColor, color: mutedColor }}>
                Your calendar data will be stored in Firestore under your account. Another person only gets access if they sign in to the same Google account.
              </div>

              {authError ? (
                <div className="rounded-2xl border p-4 text-sm" style={{ borderColor, background: surfaceColor, color: textColor }}>
                  {authError}
                </div>
              ) : null}

              <Button onClick={handleGoogleSignIn} className="rounded-2xl shadow-sm">
                Continue with Google
              </Button>

              <p className="text-xs" style={{ color: mutedColor }}>
                Firebase Auth handles sign-in; Firestore stores the actual workspace data. Access is then controlled by security rules on the backend.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isRemoteReady) {
    return (
      <div className="min-h-screen w-full" style={{ background: appBackground, color: textColor }}>
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center p-4">
          <Card style={{ background: panelBackground, borderColor }} className="rounded-3xl border shadow-sm">
            <CardContent className="p-6 text-sm" style={{ color: mutedColor }}>
              Loading your cloud data...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: appBackground, color: textColor }} className="min-h-screen w-full p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Card style={{ background: panelBackground, borderColor }} className="rounded-3xl border shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor, background: surfaceColor }}>
                  <Palette size={18} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold md:text-2xl">Minimal habit calendar</h1>
                  <p className="text-sm" style={{ color: mutedColor }}>
                    Workspace-based calendars with persistent habits and low-noise visuals.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={goPreviousWorkspace}
                  className="rounded-2xl border"
                  style={{ borderColor, background: panelBackground, color: textColor }}
                  title="Previous workspace"
                >
                  <ChevronLeft size={16} />
                </Button>

                <div className="min-w-[180px] rounded-2xl border px-4 py-2 text-center text-sm font-medium" style={{ borderColor, background: surfaceColor }}>
                  <div className="flex items-center justify-center gap-2">
                    <LayoutGrid size={14} />
                    <span>{workspaceLabel}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={goNextWorkspace}
                  className="rounded-2xl border"
                  style={{ borderColor, background: panelBackground, color: textColor }}
                  title="Next workspace"
                >
                  <ChevronRight size={16} />
                </Button>

                <Dialog open={isWorkspaceDialogOpen} onOpenChange={setIsWorkspaceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-2xl border" style={{ borderColor, background: panelBackground, color: textColor }}>
                      <Plus size={16} />
                      New workspace
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl border shadow-2xl sm:max-w-md" style={{ background: panelBackground, color: textColor, borderColor }}>
                    <DialogHeader>
                      <DialogTitle style={{ color: textColor }}>Create new workspace</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div className="grid gap-2">
                        <Label htmlFor="workspaceName" style={{ color: mutedColor }}>
                          Workspace name
                        </Label>
                        <Input
                          id="workspaceName"
                          value={newWorkspaceName}
                          onChange={(event) => setNewWorkspaceName(event.target.value)}
                          placeholder="Mood tracker"
                          className="rounded-2xl border"
                          style={{ background: surfaceColor, color: textColor, borderColor }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsWorkspaceDialogOpen(false)}
                        className="rounded-2xl border"
                        style={{ borderColor, background: panelBackground, color: textColor }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={createWorkspace} className="rounded-2xl shadow-sm">
                        Create workspace
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={() => setIsDark((value) => !value)}
                  className="rounded-2xl border"
                  style={{ borderColor, background: panelBackground, color: textColor }}
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="rounded-2xl border"
                  style={{ borderColor, background: panelBackground, color: textColor }}
                >
                  Sign out
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: mutedColor }}>
              <span>Workspace {selectedWorkspaceIndex + 1} of {workspaces.length}.</span>
              <span>Use arrows to switch workspaces.</span>
              <span>{isSaving ? "Saving to Firebase..." : "Synced with Firebase."}</span>
              <span>User: {user?.uid ?? "none"}</span>
              <span>Auth: {isAuthReady ? "ready" : "loading"}</span>
              <span>Remote: {isRemoteReady ? "ready" : "loading"}</span>
            
            </div>
            {authError ? (
              <div className="rounded-2xl border px-3 py-2 text-xs" style={{ borderColor, color: textColor, background: surfaceColor }}>
                {authError}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card style={{ background: panelBackground, borderColor }} className="rounded-3xl border shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: textColor }}>
                <span>{monthLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={goPreviousMonth}
                  className="rounded-2xl border"
                  style={{ borderColor, background: panelBackground, color: textColor }}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  onClick={goNextMonth}
                  className="rounded-2xl border"
                  style={{ borderColor, background: panelBackground, color: textColor }}
                >
                  <ChevronRight size={16} />
                </Button>
                <Dialog open={isHabitDialogOpen} onOpenChange={setIsHabitDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-2xl shadow-sm">
                      <Plus size={16} />
                      Add habit
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="rounded-3xl border shadow-2xl sm:max-w-md" style={{ background: panelBackground, color: textColor, borderColor }}>
                    <DialogHeader>
                      <DialogTitle style={{ color: textColor }}>New habit</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                      <div className="grid gap-2">
                        <Label htmlFor="habitName" style={{ color: mutedColor }}>
                          Habit name
                        </Label>
                        <Input
                          id="habitName"
                          value={habitName}
                          onChange={(event) => setHabitName(event.target.value)}
                          placeholder="German"
                          className="rounded-2xl border"
                          style={{ background: surfaceColor, color: textColor, borderColor }}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label style={{ color: mutedColor }}>Preset colors</Label>
                        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
                          {PresetColors.map((preset) => {
                            const active = habitColor === preset.value;
                            return (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => setHabitColor(preset.value)}
                                className="h-10 rounded-2xl border transition-transform hover:scale-[1.03]"
                                style={{
                                  background: preset.value,
                                  borderColor: active ? textColor : borderColor,
                                  boxShadow: active ? `0 0 0 2px ${textColor} inset` : "none",
                                }}
                                title={preset.name}
                                aria-label={preset.name}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label style={{ color: mutedColor }}>Custom RGB</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="255"
                            value={customRed}
                            onChange={(event) => setCustomRed(event.target.value)}
                            placeholder="R"
                            className="rounded-2xl border"
                            style={{ background: surfaceColor, color: textColor, borderColor }}
                          />
                          <Input
                            type="number"
                            min="0"
                            max="255"
                            value={customGreen}
                            onChange={(event) => setCustomGreen(event.target.value)}
                            placeholder="G"
                            className="rounded-2xl border"
                            style={{ background: surfaceColor, color: textColor, borderColor }}
                          />
                          <Input
                            type="number"
                            min="0"
                            max="255"
                            value={customBlue}
                            onChange={(event) => setCustomBlue(event.target.value)}
                            placeholder="B"
                            className="rounded-2xl border"
                            style={{ background: surfaceColor, color: textColor, borderColor }}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border p-3" style={{ borderColor, background: surfaceColor }}>
                        <div className="mb-2 text-xs uppercase tracking-wide" style={{ color: mutedColor }}>
                          Preview
                        </div>
                        <div className="h-10 rounded-2xl border" style={{ background: habitPreviewColor, borderColor }} />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsHabitDialogOpen(false)}
                        className="rounded-2xl border"
                        style={{ borderColor, background: panelBackground, color: textColor }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={addHabit} className="rounded-2xl shadow-sm">
                        Create habit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeWorkspace.habits.length === 0 ? (
                <div className="rounded-2xl border px-3 py-2 text-sm" style={{ borderColor, color: mutedColor }}>
                  Add a habit first, then assign it to calendar days.
                </div>
              ) : (
                activeWorkspace.habits.map((habit) => {
                  const active = activeWorkspace.selectedHabitId === habit.id;
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      onClick={() =>
                        updateActiveWorkspace((workspace) => ({ ...workspace, selectedHabitId: habit.id }))
                      }
                      className="group flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-all hover:-translate-y-px"
                      style={{
                        borderColor: active ? textColor : borderColor,
                        background: active ? habit.color : panelBackground,
                        color: active ? "#111111" : textColor,
                        boxShadow: active
                          ? isDark
                            ? "0 10px 22px rgba(0,0,0,0.22)"
                            : "0 8px 20px rgba(0,0,0,0.10)"
                          : "none",
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

            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: mutedColor }}>
              <span>Select a habit, then click a day.</span>
              <span>Second habit on the same day creates a split cell.</span>
              <span>Right click a day to clear it.</span>
            </div>
          </CardContent>
        </Card>

        <Card style={{ background: panelBackground, borderColor }} className="rounded-3xl border shadow-sm">
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-7 gap-2">
              {Weekdays.map((weekday) => (
                <div key={weekday} className="pb-1 text-center text-xs font-medium uppercase tracking-[0.16em]" style={{ color: mutedColor }}>
                  {weekday}
                </div>
              ))}

              {monthCells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const habitIds = activeWorkspace.days[cell.date] ?? [];
                const cellStyle = renderCellStyle(cell.date);
                const isFilled = habitIds.length > 0;

                return (
                  <motion.button
                    key={cell.date}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setDayHabit(cell.date, activeWorkspace.selectedHabitId)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      clearDay(cell.date);
                    }}
                    className="relative aspect-square overflow-hidden rounded-2xl border text-left transition hover:brightness-[0.99]"
                    title={
                      isFilled
                        ? habitIds.map((id) => habitMap.get(id)?.name).filter(Boolean).join(", ")
                        : "Empty day"
                    }
                    style={{
                      ...cellStyle,
                      color: isFilled ? "#121212" : textColor,
                      transform: cellStyle.transform ?? "none",
                    }}
                  >
                    <div
                      className="absolute left-2 top-2 z-10 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                      style={{
                        background: isFilled ? "rgba(255,255,255,0.38)" : "transparent",
                        backdropFilter: isFilled ? "blur(6px)" : "none",
                      }}
                    >
                      {cell.day}
                    </div>
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
