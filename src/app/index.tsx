import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { G, Path } from "react-native-svg";

// Platform-Safe Lazy Importers for Native vs Web
let FileSystem: any = null;
let Sharing: any = null;
if (Platform.OS !== "web") {
  try {
    FileSystem = require("expo-file-system");
    Sharing = require("expo-sharing");
  } catch (e) {
    console.warn("Native file systems unavailable");
  }
}

type Entry = {
  id: string;
  amount: number;
  category: string;
  timeOfDay: string;
  date: string;
  description: string;
};

type ScreenType = "home" | "add" | "manage" | "calendar" | "history";

const STORAGE_KEY_ENTRIES = "@kite_ledger_entries";
const STORAGE_KEY_CATEGORIES = "@kite_ledger_categories";
const STORAGE_KEY_USER_NAME = "@kite_user_name";

const DEFAULT_CATEGORIES = ["House Rent", "Food", "Travel", "Petrol", "Miscellaneous"];
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];
const TIMES_OF_DAY = ["None / Any Time", "Morning", "Afternoon", "Evening", "Night"];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CATEGORY_COLORS: Record<string, string> = {
  "House Rent": "#f87171",
  Food: "#fb923c",
  Travel: "#38bdf8",
  Petrol: "#facc15",
  Miscellaneous: "#a78bfa",
};

// Dynamic Greeting Calculation (Sentence Case)
function getDynamicGreeting(): string {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  if (totalMinutes >= 180 && totalMinutes <= 660) {
    return "good morning";
  }
  if (totalMinutes > 660 && totalMinutes <= 960) {
    return "good afternoon";
  }
  if (totalMinutes > 960 && totalMinutes <= 1140) {
    return "good evening";
  }
  return "good night";
}

export default function Index() {
  const [screen, setScreen] = useState<ScreenType>("home");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // User Profile & Greeting State
  const [userName, setUserName] = useState<string>("");
  const [nameInput, setNameInput] = useState("");
  const [greetingText, setGreetingText] = useState(getDynamicGreeting());

  // Intro Stages: "branding" -> "name_prompt" (if needed) -> "done"
  const [introStage, setIntroStage] = useState<"branding" | "name_prompt" | "done">("branding");

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("None / Any Time");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const [showCategories, setShowCategories] = useState(false);
  const [showTimes, setShowTimes] = useState(false);

  // Category Manager Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Manage Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState("All Categories");
  const [selectedFilterTiming, setSelectedFilterTiming] = useState("All Timings");
  const [showManageCatFilter, setShowManageCatFilter] = useState(false);
  const [showManageTimingFilter, setShowManageTimingFilter] = useState(false);

  // Grid Calendar State
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setGreetingText(getDynamicGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [savedEntries, savedCategories, savedName] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_ENTRIES),
        AsyncStorage.getItem(STORAGE_KEY_CATEGORIES),
        AsyncStorage.getItem(STORAGE_KEY_USER_NAME),
      ]);

      if (savedEntries) setEntries(JSON.parse(savedEntries));
      if (savedCategories) setCategories(JSON.parse(savedCategories));

      // Show Kite Ledger Expense & Finance splash for 2 seconds
      setTimeout(() => {
        if (savedName) {
          setUserName(savedName);
          setIntroStage("done");
        } else {
          setIntroStage("name_prompt");
        }
      }, 2000);
    } catch (error) {
      console.log("Error loading data:", error);
      setIntroStage("done");
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert("Name Required", "Please enter your name to proceed.");
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER_NAME, trimmed);
      setUserName(trimmed);
      setIntroStage("done");
    } catch (e) {
      console.log("Error saving name:", e);
      setIntroStage("done");
    }
  };

  const saveEntries = async (newEntries: Entry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(newEntries));
      setEntries(newEntries);
    } catch (error) {
      console.log("Error saving entries:", error);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      Alert.alert("Invalid Name", "Category name cannot be empty.");
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert("Duplicate", "This category already exists.");
      return;
    }

    const updated = [...categories, trimmed];
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(updated));
      setCategories(updated);
      setCategory(trimmed);
      setNewCategoryInput("");
    } catch (error) {
      console.log("Error adding category:", error);
    }
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    if (categories.length <= 1) {
      Alert.alert("Action not allowed", "You must retain at least one category.");
      return;
    }
    const updated = categories.filter((c) => c !== catToDelete);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(updated));
      setCategories(updated);
      if (category === catToDelete) {
        setCategory(updated[0] || "");
      }
    } catch (error) {
      console.log("Error deleting category:", error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setAmount("");
    setCategory("");
    setTimeOfDay("None / Any Time");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setShowCategories(false);
    setShowTimes(false);
  };

  const handleOpenAdd = (defaultDate?: string) => {
    resetForm();
    if (defaultDate) setDate(defaultDate);
    setScreen("add");
  };

  const handleOpenEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setAmount(entry.amount.toString());
    setCategory(entry.category);
    setTimeOfDay(entry.timeOfDay);
    setDate(entry.date);
    setDescription(entry.description === "-" ? "" : entry.description);
    setShowCategories(false);
    setShowTimes(false);
    setScreen("add");
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this expense record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updated = entries.filter((e) => e.id !== id);
            await saveEntries(updated);
          },
        },
      ]
    );
  };

  const handleSaveEntry = async () => {
    if (!amount.trim()) {
      Alert.alert("Amount Required", "Please enter an amount.");
      return;
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    if (!category.trim()) {
      Alert.alert("Category Required", "Please choose an expense category.");
      return;
    }

    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Invalid Date", "Please enter date in YYYY-MM-DD format.");
      return;
    }

    let updatedEntries: Entry[];

    if (editingId) {
      updatedEntries = entries.map((item) =>
        item.id === editingId
          ? {
              ...item,
              amount: numericAmount,
              category,
              timeOfDay,
              date,
              description: description.trim() || "-",
            }
          : item
      );
    } else {
      const newEntry: Entry = {
        id: Date.now().toString(),
        amount: numericAmount,
        category,
        timeOfDay,
        date,
        description: description.trim() || "-",
      };
      updatedEntries = [newEntry, ...entries];
    }

    await saveEntries(updatedEntries);
    const wasEditing = Boolean(editingId);
    resetForm();

    Alert.alert(
      wasEditing ? "Entry Updated" : "Entry Saved",
      wasEditing ? "Expense updated successfully." : "Expense recorded successfully.",
      [
        {
          text: "OK",
          onPress: () => setScreen(wasEditing ? "manage" : "calendar"),
        },
      ]
    );
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const currentMonthName = MONTH_NAMES[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  const currentMonthEntries = useMemo(() => {
    const monthKey = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    return entries.filter((e) => e.date.startsWith(monthKey));
  }, [entries, currentYear]);

  const currentMonthSpend = useMemo(() => {
    return currentMonthEntries.reduce((tot, e) => tot + e.amount, 0);
  }, [currentMonthEntries]);

  const categoryStats = useMemo(() => {
    return categories.map((cat, idx) => {
      const catSpent = currentMonthEntries
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
      const percentage = currentMonthSpend > 0 ? (catSpent / currentMonthSpend) * 100 : 0;
      const color = CATEGORY_COLORS[cat] || `hsl(${(idx * 65) % 360}, 75%, 60%)`;
      return { category: cat, spent: catSpent, percentage, color };
    });
  }, [categories, currentMonthEntries, currentMonthSpend]);

  const pieSlices = useMemo(() => {
    const active = categoryStats.filter((c) => c.spent > 0);
    if (active.length === 0) return [];

    let accumulatedAngle = 0;
    const radius = 90;
    const cx = 100;
    const cy = 100;

    return active.map((slice) => {
      const sliceAngle = (slice.spent / currentMonthSpend) * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + sliceAngle;
      accumulatedAngle += sliceAngle;

      const isFullCircle = sliceAngle >= 359.99;
      if (isFullCircle) {
        return {
          d: `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`,
          color: slice.color,
        };
      }

      const x1 = cx + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
      const y1 = cy + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
      const x2 = cx + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
      const y2 = cy + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);
      const largeArcFlag = sliceAngle > 180 ? 1 : 0;

      return {
        d: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
        color: slice.color,
      };
    });
  }, [categoryStats, currentMonthSpend]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const searchMatch =
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.date.includes(searchQuery) ||
        entry.timeOfDay.toLowerCase().includes(searchQuery.toLowerCase());

      const timingMatch =
        selectedFilterTiming === "All Timings" ||
        entry.timeOfDay === selectedFilterTiming;

      const categoryMatch =
        selectedFilterCategory === "All Categories" ||
        entry.category === selectedFilterCategory;

      return searchMatch && timingMatch && categoryMatch;
    });
  }, [entries, searchQuery, selectedFilterTiming, selectedFilterCategory]);

  const calendarGridData = useMemo(() => {
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const monthKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}`;

    const monthEntries = entries.filter((e) => e.date.startsWith(monthKey));
    const totalMonthSpend = monthEntries.reduce((sum, e) => sum + e.amount, 0);

    const matrix: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      matrix.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      matrix.push(d);
    }
    while (matrix.length % 7 !== 0) {
      matrix.push(null);
    }

    return {
      matrix,
      monthKey,
      totalMonthSpend,
    };
  }, [calendarYear, calendarMonth, entries]);

  const calendarDayEntries = useMemo(() => {
    return entries.filter((e) => e.date === selectedCalendarDate);
  }, [entries, selectedCalendarDate]);

  const calendarDayTotal = useMemo(() => {
    return calendarDayEntries.reduce((tot, e) => tot + e.amount, 0);
  }, [calendarDayEntries]);

  const lastMonthData = useMemo(() => {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthName = MONTH_NAMES[prevDate.getMonth()];
    const prevYear = prevDate.getFullYear();
    const prevMonthKey = `${prevYear}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const prevEntries = entries.filter((e) => e.date.startsWith(prevMonthKey));
    const totalOutflow = prevEntries.reduce((sum, e) => sum + e.amount, 0);

    return {
      monthTitle: `${prevMonthName} ${prevYear}`,
      monthKey: prevMonthKey,
      entries: prevEntries,
      totalOutflow,
    };
  }, [entries]);

  const handleExportCSV = async () => {
    if (lastMonthData.entries.length === 0) {
      Alert.alert(
        "No Records",
        `There are no recorded expenses for ${lastMonthData.monthTitle} to export.`
      );
      return;
    }

    const headers = "Date,Category,Time of Day,Note,Amount (INR)\n";
    const rows = lastMonthData.entries
      .map((item) => {
        const cleanDesc = `"${(item.description || "-").replace(/"/g, '""')}"`;
        const cleanCat = `"${item.category.replace(/"/g, '""')}"`;
        return `${item.date},${cleanCat},${item.timeOfDay},${cleanDesc},${item.amount}`;
      })
      .join("\n");

    const csvContent = headers + rows;
    const fileName = `KiteLedger_${lastMonthData.monthTitle.replace(/\s+/g, "_")}_Records.csv`;

    if (Platform.OS === "web") {
      try {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        Alert.alert("Export Error", "Failed to download CSV on browser.");
      }
    } else {
      try {
        if (!FileSystem || !Sharing) {
          Alert.alert("Export Error", "File system is not available on this device.");
          return;
        }
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: `Export ${lastMonthData.monthTitle} Records`,
            UTI: "public.comma-separated-values-text",
          });
        }
      } catch (error) {
        Alert.alert("Export Failed", "Could not export CSV file.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 1. STAGE ONE: Branding Splash Screen */}
      {introStage === "branding" && (
        <View style={styles.splashBrandContainer}>
          <View style={styles.splashBrandContent}>
            <Text style={styles.splashBrandIcon}>➤</Text>
            <Text style={styles.splashBrandTitle}>Kite Ledger</Text>
            <Text style={styles.splashBrandSubtitle}>
              Expense, Cash Flows & Finance
            </Text>
            <View style={styles.splashLoadingBar} />
          </View>
        </View>
      )}

      {/* 2. STAGE TWO: First-Time User Name Prompt with Keyboard Awareness */}
      {introStage === "name_prompt" && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.splashScreenContainer}
        >
          <View style={styles.splashContentCard}>
            <Text style={styles.splashAppBadge}>➤ KITE LEDGER</Text>
            <Text style={styles.nameModalTitle}>Welcome to Kite Ledger</Text>
            <Text style={styles.nameModalSubtitle}>
              Please enter your name to personalize your experience.
            </Text>
            <TextInput
              style={styles.nameInputExpanded}
              placeholder="Your Name (e.g., Tharun)"
              placeholderTextColor="#6e8a7e"
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
            />
            <Pressable style={styles.submitFormButton} onPress={handleSaveName}>
              <Text style={styles.submitFormButtonText}>Continue</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Category Manager Modal */}
      <Modal visible={isCategoryModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Manage Categories</Text>
              <Pressable onPress={() => setIsCategoryModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalAddInputRow}>
              <TextInput
                style={styles.modalInput}
                placeholder="New category name..."
                placeholderTextColor="#6e8a7e"
                value={newCategoryInput}
                onChangeText={setNewCategoryInput}
              />
              <Pressable style={styles.modalAddBtn} onPress={handleAddCategory}>
                <Text style={styles.modalAddBtnText}>Add</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalCategoriesList}>
              {categories.map((cat) => (
                <View key={cat} style={styles.modalCategoryItem}>
                  <Text style={styles.modalCategoryName}>{cat}</Text>
                  <Pressable
                    style={styles.modalDeleteCategoryBtn}
                    onPress={() => handleDeleteCategory(cat)}
                  >
                    <Text style={styles.modalDeleteCategoryBtnText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TOP APP HEADER WITH DYNAMIC GREETING & NAME */}
      <View style={styles.topAppHeader}>
        <View style={styles.topHeaderBrand}>
          <Text style={styles.brandIcon}>➤</Text>
          <Text style={styles.brandTitle}>Kite Ledger</Text>
        </View>

        {/* Dynamic Top-Right Greeting Box (Sentence Case) */}
        <Pressable
          style={styles.greetingHeaderBox}
          onPress={() => {
            setNameInput(userName);
            setIntroStage("name_prompt");
          }}
        >
          <Text style={styles.greetingSubText}>
            Hi, {greetingText}
          </Text>
          <Text style={styles.greetingNameText} numberOfLines={1}>
            {userName ? `${userName} 👋` : "Guest 👋"}
          </Text>
        </Pressable>
      </View>

      {/* SCREEN: HOME (Pie Chart Layout) */}
      {screen === "home" && (
        <ScrollView
          contentContainerStyle={styles.dashboard}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              Let some <Text style={styles.italic}>elegance</Text> into your finance
            </Text>
            <Text style={styles.heroDescription}>
              Track your monthly cash flows, habits, and financial milestones with Kite Ledger.
            </Text>
          </View>

          {/* 3 KPI Top Cards */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>TOTAL SPEND</Text>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValueRed}>₹{currentMonthSpend}</Text>
                <Text style={styles.kpiArrowRed}>↗</Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>TOTAL SAVINGS</Text>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValueGreen}>₹0</Text>
                <Text style={styles.kpiArrowGreen}>↘</Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>TOTAL ENTRIES</Text>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValueCyan}>{currentMonthEntries.length}</Text>
                <Text style={styles.kpiIconCyan}>🧾</Text>
              </View>
            </View>
          </View>

          {/* Allocation Breakdown Card with Pie Chart */}
          <View style={styles.pieAllocationCard}>
            <Text style={styles.pieCardHeading}>
              {currentMonthName} {currentYear} Allocation
            </Text>
            <Text style={styles.pieCardSubtitle}>
              Visual category distribution breakdown
            </Text>

            <View style={styles.pieAndCategoriesContainer}>
              <View style={styles.pieSvgWrapper}>
                {pieSlices.length === 0 ? (
                  <View style={styles.emptyPiePlaceholder}>
                    <Text style={styles.emptyPieText}>No data</Text>
                  </View>
                ) : (
                  <Svg width={200} height={200} viewBox="0 0 200 200">
                    <G>
                      {pieSlices.map((slice, index) => (
                        <Path key={index} d={slice.d} fill={slice.color} />
                      ))}
                    </G>
                  </Svg>
                )}
              </View>

              <View style={styles.pieCategoriesList}>
                {categoryStats.map((item) => (
                  <View key={item.category} style={styles.pieCategoryRow}>
                    <View style={styles.categoryNameContainer}>
                      <View
                        style={[
                          styles.categoryColorDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text style={styles.pieCategoryNameText}>
                        {item.category}
                      </Text>
                    </View>
                    <Text style={styles.pieCategoryAmountText}>
                      ₹{item.spent.toFixed(0)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              Designed and developed by{" "}
              <Text style={styles.pageFooterAuthor}>Tharun</Text>
            </Text>
          </View>
        </ScrollView>
      )}

      {/* SCREEN: MANAGE ENTRIES */}
      {screen === "manage" && (
        <ScrollView
          contentContainerStyle={styles.manageScrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.manageCardContainer}>
            <Text style={styles.manageTitle}>All Expense Records</Text>
            <Text style={styles.manageSubtitle}>
              Search, filter, edit, or delete existing transaction entries
            </Text>

            <View style={styles.manageControlsRow}>
              <TextInput
                style={styles.manageSearchInput}
                placeholder="Search note, date, or timing..."
                placeholderTextColor="#5a7a6d"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <View style={styles.dropdownRelativeWrapper}>
                <Pressable
                  style={styles.manageFilterDropdown}
                  onPress={() => {
                    setShowManageTimingFilter(!showManageTimingFilter);
                    setShowManageCatFilter(false);
                  }}
                >
                  <Text style={styles.manageFilterDropdownText}>
                    {selectedFilterTiming}
                  </Text>
                  <Text style={styles.dropdownChevron}>⌄</Text>
                </Pressable>

                {showManageTimingFilter && (
                  <View style={styles.manageDropdownList}>
                    {["All Timings", ...TIMES_OF_DAY.filter((t) => t !== "None / Any Time")].map(
                      (timing) => (
                        <Pressable
                          key={timing}
                          style={styles.manageDropdownItem}
                          onPress={() => {
                            setSelectedFilterTiming(timing);
                            setShowManageTimingFilter(false);
                          }}
                        >
                          <Text style={styles.manageDropdownItemText}>
                            {timing}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                )}
              </View>

              <View style={styles.dropdownRelativeWrapper}>
                <Pressable
                  style={styles.manageFilterDropdown}
                  onPress={() => {
                    setShowManageCatFilter(!showManageCatFilter);
                    setShowManageTimingFilter(false);
                  }}
                >
                  <Text style={styles.manageFilterDropdownText}>
                    {selectedFilterCategory}
                  </Text>
                  <Text style={styles.dropdownChevron}>⌄</Text>
                </Pressable>

                {showManageCatFilter && (
                  <View style={styles.manageDropdownList}>
                    {["All Categories", ...categories].map((cat) => (
                      <Pressable
                        key={cat}
                        style={styles.manageDropdownItem}
                        onPress={() => {
                          setSelectedFilterCategory(cat);
                          setShowManageCatFilter(false);
                        }}
                      >
                        <Text style={styles.manageDropdownItemText}>{cat}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.manageTableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.manageTableHeaderRow}>
                    <Text style={[styles.manageTableHeaderCell, { width: 100 }]}>
                      DATE
                    </Text>
                    <Text style={[styles.manageTableHeaderCell, { width: 120 }]}>
                      CATEGORY
                    </Text>
                    <Text style={[styles.manageTableHeaderCell, { width: 110 }]}>
                      TIME OF DAY
                    </Text>
                    <Text style={[styles.manageTableHeaderCell, { width: 140 }]}>
                      DESCRIPTION
                    </Text>
                    <Text
                      style={[
                        styles.manageTableHeaderCell,
                        { width: 90, textAlign: "right" },
                      ]}
                    >
                      AMOUNT
                    </Text>
                    <Text
                      style={[
                        styles.manageTableHeaderCell,
                        { width: 120, textAlign: "center" },
                      ]}
                    >
                      ACTIONS
                    </Text>
                  </View>

                  {filteredEntries.length === 0 ? (
                    <View style={styles.tableEmptyState}>
                      <Text style={styles.tableEmptyText}>
                        No records match the selected filters.
                      </Text>
                    </View>
                  ) : (
                    filteredEntries.map((item) => (
                      <View key={item.id} style={styles.manageTableRow}>
                        <Text style={[styles.manageTableCell, { width: 100 }]}>
                          {item.date}
                        </Text>

                        <View
                          style={[
                            styles.categoryNameContainer,
                            { width: 120 },
                          ]}
                        >
                          <View
                            style={[
                              styles.categoryColorDot,
                              {
                                backgroundColor:
                                  CATEGORY_COLORS[item.category] || "#38bdf8",
                              },
                            ]}
                          />
                          <Text style={styles.manageTableCellBold}>
                            {item.category}
                          </Text>
                        </View>

                        <View style={{ width: 110 }}>
                          <View style={styles.timeBadgePill}>
                            <Text style={styles.timeBadgePillText}>
                              {item.timeOfDay}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.manageTableCell,
                            { width: 140, color: "#8da79c" },
                          ]}
                          numberOfLines={1}
                        >
                          {item.description}
                        </Text>

                        <Text
                          style={[
                            styles.manageTableCell,
                            {
                              width: 90,
                              textAlign: "right",
                              color: "#f0fdf4",
                              fontWeight: "700",
                            },
                          ]}
                        >
                          ₹{item.amount.toFixed(0)}
                        </Text>

                        <View style={[styles.manageActionsCell, { width: 120 }]}>
                          <Pressable
                            style={styles.manageEditBtn}
                            onPress={() => handleOpenEdit(item)}
                          >
                            <Text style={styles.manageEditBtnText}>Edit</Text>
                          </Pressable>
                          <Pressable
                            style={styles.manageDeleteBtn}
                            onPress={() => handleDeleteEntry(item.id)}
                          >
                            <Text style={styles.manageDeleteBtnText}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              Designed and developed by{" "}
              <Text style={styles.pageFooterAuthor}>Tharun</Text>
            </Text>
          </View>
        </ScrollView>
      )}

      {/* SCREEN: CALENDAR */}
      {screen === "calendar" && (
        <ScrollView
          contentContainerStyle={styles.calendarScrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.monthHeaderContainer}>
            <Pressable style={styles.monthPillBtn} onPress={handlePrevMonth}>
              <Text style={styles.monthPillBtnText}>‹ Prev Month</Text>
            </Pressable>

            <View style={styles.monthTitleWrapper}>
              <Text style={styles.monthNameHeading}>
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </Text>
              <Text style={styles.monthTotalSpentText}>
                Total Spent in {MONTH_NAMES[calendarMonth]} {calendarYear}: ₹
                {calendarGridData.totalMonthSpend.toFixed(0)}
              </Text>
            </View>

            <Pressable style={styles.monthPillBtn} onPress={handleNextMonth}>
              <Text style={styles.monthPillBtnText}>Next Month ›</Text>
            </Pressable>
          </View>

          <View style={styles.weekdaysHeaderRow}>
            {WEEKDAYS.map((day) => (
              <View key={day} style={styles.weekdayCol}>
                <Text style={styles.weekdayLabelText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.monthGridContainer}>
            {calendarGridData.matrix.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.gridEmptyCell} />;
              }

              const dayDateStr = `${calendarGridData.monthKey}-${String(day).padStart(2, "0")}`;
              const isSelected = selectedCalendarDate === dayDateStr;
              const isToday = dayDateStr === new Date().toISOString().split("T")[0];

              const dayEntries = entries.filter((e) => e.date === dayDateStr);
              const daySpendSum = dayEntries.reduce((acc, curr) => acc + curr.amount, 0);

              return (
                <Pressable
                  key={dayDateStr}
                  style={[
                    styles.dayCard,
                    isToday && styles.dayCardToday,
                    isSelected && styles.dayCardSelected,
                  ]}
                  onPress={() => setSelectedCalendarDate(dayDateStr)}
                >
                  <View style={styles.dayCardHeader}>
                    <Text
                      style={[
                        styles.dayCardNumber,
                        isSelected && styles.dayCardNumberActive,
                      ]}
                    >
                      {day}
                    </Text>

                    {daySpendSum > 0 && (
                      <View style={styles.spendBadge}>
                        <Text style={styles.spendBadgeText}>₹{daySpendSum}</Text>
                      </View>
                    )}
                  </View>

                  {dayEntries.length > 0 && (
                    <View style={styles.dayCardPill}>
                      <View style={styles.pillCyanBar} />
                      <Text style={styles.pillCategoryText} numberOfLines={1}>
                        {dayEntries[0].category} [{dayEntries[0].timeOfDay[0]}]
                      </Text>
                      <Text style={styles.pillAmountText}>
                        ₹{dayEntries[0].amount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.dayDetailsSheet}>
            <View style={styles.dayDetailsSheetHeader}>
              <View>
                <Text style={styles.dayDetailsTitle}>
                  {selectedCalendarDate === new Date().toISOString().split("T")[0]
                    ? `Today (${selectedCalendarDate})`
                    : selectedCalendarDate}
                </Text>
                <Text style={styles.dayDetailsSubtitle}>
                  {calendarDayEntries.length} transaction
                  {calendarDayEntries.length === 1 ? "" : "s"} • ₹
                  {calendarDayTotal.toFixed(2)} total
                </Text>
              </View>

              <Pressable
                style={styles.sheetAddButton}
                onPress={() => handleOpenAdd(selectedCalendarDate)}
              >
                <Text style={styles.sheetAddButtonText}>+ Add Expense</Text>
              </Pressable>
            </View>

            {calendarDayEntries.length === 0 ? (
              <Text style={styles.emptyDayText}>
                No expenses recorded for this date.
              </Text>
            ) : (
              calendarDayEntries.map((item) => (
                <View key={item.id} style={styles.detailEntryCard}>
                  <View style={styles.detailEntryTop}>
                    <View style={styles.categoryNameContainer}>
                      <View style={styles.categoryDot} />
                      <Text style={styles.detailEntryCategory}>
                        {item.category}
                      </Text>
                    </View>
                    <Text style={styles.detailEntryAmount}>
                      ₹{item.amount.toFixed(2)}
                    </Text>
                  </View>

                  {item.description !== "-" && (
                    <Text style={styles.detailEntryDesc}>{item.description}</Text>
                  )}

                  <View style={styles.detailEntryBottom}>
                    <Text style={styles.detailEntryTime}>{item.timeOfDay}</Text>
                    <View style={styles.detailActionButtons}>
                      <Pressable
                        style={styles.editBtn}
                        onPress={() => handleOpenEdit(item)}
                      >
                        <Text style={styles.editBtnText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteEntry(item.id)}
                      >
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* SCREEN: ADD / EDIT */}
      {screen === "add" && (
        <ScrollView
          contentContainerStyle={styles.addFormContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.inputSectionLabel}>QUICK AMOUNTS</Text>
          <View style={styles.quickAmountsRow}>
            {QUICK_AMOUNTS.map((val) => (
              <Pressable
                key={val}
                style={[
                  styles.quickAmountPill,
                  amount === val.toString() && styles.quickAmountPillActive,
                ]}
                onPress={() => setAmount(val.toString())}
              >
                <Text
                  style={[
                    styles.quickAmountPillText,
                    amount === val.toString() && styles.quickAmountPillTextActive,
                  ]}
                >
                  ₹{val}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.labelWithActionRow}>
            <Text style={styles.inputSectionLabel}>CATEGORY</Text>
            <Pressable
              style={styles.editCategoriesButton}
              onPress={() => setIsCategoryModalOpen(true)}
            >
              <Text style={styles.editCategoriesText}>⚙ Edit Categories</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.formDropdownInput}
            onPress={() => {
              setShowCategories(!showCategories);
              setShowTimes(false);
            }}
          >
            <Text
              style={
                category
                  ? styles.formDropdownSelectedText
                  : styles.formDropdownPlaceholder
              }
            >
              {category || "None — Select a category"}
            </Text>
            <Text style={styles.dropdownChevron}>⌄</Text>
          </Pressable>

          {showCategories && (
            <View style={styles.dropdownOptionsContainer}>
              {categories.map((item) => (
                <Pressable
                  key={item}
                  style={styles.dropdownOptionRow}
                  onPress={() => {
                    setCategory(item);
                    setShowCategories(false);
                  }}
                >
                  <Text style={styles.dropdownOptionRowText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.inputSectionLabel}>TIME OF DAY</Text>
          <Pressable
            style={styles.formDropdownInput}
            onPress={() => {
              setShowTimes(!showTimes);
              setShowCategories(false);
            }}
          >
            <Text style={styles.formDropdownSelectedText}>{timeOfDay}</Text>
            <Text style={styles.dropdownChevron}>⌄</Text>
          </Pressable>

          {showTimes && (
            <View style={styles.dropdownOptionsContainer}>
              {TIMES_OF_DAY.map((item) => (
                <Pressable
                  key={item}
                  style={styles.dropdownOptionRow}
                  onPress={() => {
                    setTimeOfDay(item);
                    setShowTimes(false);
                  }}
                >
                  <Text style={styles.dropdownOptionRowText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.inputSectionLabel}>AMOUNT (₹)</Text>
          <View style={styles.formInputWrapper}>
            <TextInput
              style={styles.formTextInput}
              placeholder="0.00"
              placeholderTextColor="#6e8a7e"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={styles.inputSectionLabel}>DATE</Text>
          <View style={[styles.formInputWrapper, styles.dateInputWrapper]}>
            <TextInput
              style={styles.formTextInput}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6e8a7e"
            />
            <Text style={styles.calendarInputIcon}>📅</Text>
          </View>

          <Text style={styles.inputSectionLabel}>DESCRIPTION / NOTE (OPTIONAL)</Text>
          <View style={[styles.formInputWrapper, styles.descriptionInputWrapper]}>
            <TextInput
              style={[styles.formTextInput, styles.descriptionTextInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Breakfast, Fuel refill, Groceries"
              placeholderTextColor="#5a776c"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Pressable style={styles.submitFormButton} onPress={handleSaveEntry}>
            <Text style={styles.submitFormButtonText}>
              {editingId ? "Update Entry" : "Save Entry"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelFormButton}
            onPress={() => setScreen(editingId ? "manage" : "calendar")}
          >
            <Text style={styles.cancelFormButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* SCREEN: LAST MONTH & HISTORY */}
      {screen === "history" && (
        <ScrollView
          contentContainerStyle={styles.historyScrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.historyCardContainer}>
            <View style={styles.historyTopRow}>
              <View>
                <Text style={styles.historyMonthTitle}>
                  {lastMonthData.monthTitle} Records
                </Text>
                <Text style={styles.historyOutflowText}>
                  Total Outflow: ₹{lastMonthData.totalOutflow.toFixed(0)}
                </Text>
              </View>

              <Pressable style={styles.exportCsvBtn} onPress={handleExportCSV}>
                <Text style={styles.exportCsvIcon}>⤓</Text>
                <Text style={styles.exportCsvText}>Export to CSV (Excel)</Text>
              </Pressable>
            </View>

            <View style={styles.historyTableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, { width: 95 }]}>DATE</Text>
                    <Text style={[styles.tableHeaderCell, { width: 110 }]}>CATEGORY</Text>
                    <Text style={[styles.tableHeaderCell, { width: 110 }]}>TIME OF DAY</Text>
                    <Text style={[styles.tableHeaderCell, { width: 140 }]}>NOTE</Text>
                    <Text style={[styles.tableHeaderCell, { width: 90, textAlign: "right" }]}>
                      AMOUNT
                    </Text>
                    <Text style={[styles.tableHeaderCell, { width: 80, textAlign: "center" }]}>
                      ACTION
                    </Text>
                  </View>

                  {lastMonthData.entries.length === 0 ? (
                    <View style={styles.tableEmptyState}>
                      <Text style={styles.tableEmptyText}>
                        No entries logged for {lastMonthData.monthTitle}.
                      </Text>
                    </View>
                  ) : (
                    lastMonthData.entries.map((item) => (
                      <View key={item.id} style={styles.tableDataRow}>
                        <Text style={[styles.tableDataCell, { width: 95 }]}>
                          {item.date}
                        </Text>
                        <Text style={[styles.tableDataCell, { width: 110, fontWeight: "600" }]}>
                          {item.category}
                        </Text>
                        <Text style={[styles.tableDataCell, { width: 110, color: "#8da79c" }]}>
                          {item.timeOfDay}
                        </Text>
                        <Text
                          style={[styles.tableDataCell, { width: 140, color: "#8da79c" }]}
                          numberOfLines={1}
                        >
                          {item.description}
                        </Text>
                        <Text
                          style={[
                            styles.tableDataCell,
                            { width: 90, textAlign: "right", color: "#a7f3d0", fontWeight: "700" },
                          ]}
                        >
                          ₹{item.amount.toFixed(0)}
                        </Text>
                        <View style={[styles.tableActionCell, { width: 80 }]}>
                          <Pressable
                            style={styles.tableDeleteBtn}
                            onPress={() => handleDeleteEntry(item.id)}
                          >
                            <Text style={styles.tableDeleteBtnText}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              Designed and developed by{" "}
              <Text style={styles.pageFooterAuthor}>Tharun</Text>
            </Text>
          </View>
        </ScrollView>
      )}

      {/* BOTTOM NAVIGATION */}
      <BottomNavigation
        screen={screen}
        setScreen={setScreen}
        onAdd={() => handleOpenAdd()}
      />
    </SafeAreaView>
  );
}

function BottomNavigation({
  screen,
  setScreen,
  onAdd,
}: {
  screen: ScreenType;
  setScreen: (s: ScreenType) => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.bottomNav}>
      <Pressable style={styles.navItem} onPress={() => setScreen("home")}>
        <Text style={screen === "home" ? styles.activeNavIcon : styles.navIcon}>
          ⌂
        </Text>
        <Text style={screen === "home" ? styles.activeNav : styles.nav}>
          Home
        </Text>
      </Pressable>

      <Pressable style={styles.navItem} onPress={onAdd}>
        <Text style={screen === "add" ? styles.activeNavIcon : styles.navIcon}>
          +
        </Text>
        <Text style={screen === "add" ? styles.activeNav : styles.nav}>
          Add
        </Text>
      </Pressable>

      <Pressable style={styles.navItem} onPress={() => setScreen("manage")}>
        <Text
          style={screen === "manage" ? styles.activeNavIcon : styles.navIcon}
        >
          ≡
        </Text>
        <Text style={screen === "manage" ? styles.activeNav : styles.nav}>
          Manage Entries
        </Text>
      </Pressable>

      <Pressable style={styles.navItem} onPress={() => setScreen("calendar")}>
        <Text
          style={screen === "calendar" ? styles.activeNavIcon : styles.navIcon}
        >
          ◫
        </Text>
        <Text style={screen === "calendar" ? styles.activeNav : styles.nav}>
          Calendar
        </Text>
      </Pressable>

      <Pressable style={styles.navItem} onPress={() => setScreen("history")}>
        <Text
          style={screen === "history" ? styles.activeNavIcon : styles.navIcon}
        >
          ◷
        </Text>
        <Text style={screen === "history" ? styles.activeNav : styles.nav}>
          Last Month
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06130e",
  },
  topAppHeader: {
    backgroundColor: "#091c15",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#143024",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topHeaderBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIcon: {
    color: "#a7f3d0",
    fontSize: 20,
    fontWeight: "700",
  },
  brandTitle: {
    color: "#f0fdf4",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  greetingHeaderBox: {
    backgroundColor: "#0d281d",
    borderWidth: 1,
    borderColor: "#1a4d38",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "flex-end",
    maxWidth: "50%",
  },
  greetingSubText: {
    color: "#6ee7b7",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  greetingNameText: {
    color: "#f0fdf4",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },

  /* 1. Splash Branding Screen Styles */
  splashBrandContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#06130e",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  splashBrandContent: {
    alignItems: "center",
  },
  splashBrandIcon: {
    color: "#34d399",
    fontSize: 52,
    fontWeight: "800",
    marginBottom: 10,
  },
  splashBrandTitle: {
    color: "#f0fdf4",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  splashBrandSubtitle: {
    color: "#6ee7b7",
    fontSize: 14,
    marginTop: 8,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  splashLoadingBar: {
    width: 60,
    height: 3,
    backgroundColor: "#34d399",
    borderRadius: 2,
    marginTop: 24,
  },

  /* 2. Full-Screen Name Prompt Overlay (Keyboard-Safe) */
  splashScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#06130e",
    zIndex: 9998,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  splashContentCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#0a2219",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#184030",
    alignItems: "center",
  },
  splashAppBadge: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  nameModalTitle: {
    color: "#f0fdf4",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  nameModalSubtitle: {
    color: "#8da79c",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  nameInputExpanded: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#06130e",
    borderWidth: 1.5,
    borderColor: "#1a4d38",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#f0fdf4",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 20,
  },

  /* Dashboard Styles */
  dashboard: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 20,
  },
  heroTitle: {
    color: "#f0fdf4",
    fontSize: 27,
    fontWeight: "700",
    lineHeight: 35,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  italic: {
    color: "#a7f3d0",
    fontStyle: "italic",
  },
  heroDescription: {
    color: "#8da79c",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#081d16",
    borderWidth: 1,
    borderColor: "#163a2b",
    borderRadius: 14,
    padding: 14,
  },
  kpiLabel: {
    color: "#7e9c90",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  kpiValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiValueRed: {
    color: "#f87171",
    fontSize: 18,
    fontWeight: "700",
  },
  kpiArrowRed: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
  },
  kpiValueGreen: {
    color: "#34d399",
    fontSize: 18,
    fontWeight: "700",
  },
  kpiArrowGreen: {
    color: "#34d399",
    fontSize: 14,
    fontWeight: "700",
  },
  kpiValueCyan: {
    color: "#38bdf8",
    fontSize: 18,
    fontWeight: "700",
  },
  kpiIconCyan: {
    fontSize: 14,
  },
  pieAllocationCard: {
    backgroundColor: "#081d16",
    borderWidth: 1,
    borderColor: "#163a2b",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  pieCardHeading: {
    color: "#f0fdf4",
    fontSize: 19,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  pieCardSubtitle: {
    color: "#8da79c",
    fontSize: 12,
    marginTop: 3,
    marginBottom: 16,
  },
  pieAndCategoriesContainer: {
    gap: 16,
  },
  pieSvgWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  emptyPiePlaceholder: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: "#163a2b",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPieText: {
    color: "#6e8a7e",
    fontSize: 13,
  },
  pieCategoriesList: {
    gap: 8,
  },
  pieCategoryRow: {
    backgroundColor: "#061711",
    borderWidth: 1,
    borderColor: "#123023",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  pieCategoryNameText: {
    color: "#d7e9e1",
    fontSize: 13,
    fontWeight: "600",
  },
  pieCategoryAmountText: {
    color: "#f0fdf4",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Manage Screen Styles */
  manageScrollView: {
    padding: 16,
    paddingBottom: 40,
  },
  manageCardContainer: {
    backgroundColor: "#081d16",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#163a2b",
    padding: 16,
  },
  manageTitle: {
    color: "#f0fdf4",
    fontSize: 22,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  manageSubtitle: {
    color: "#8da79c",
    fontSize: 12,
    marginTop: 3,
    marginBottom: 16,
  },
  manageControlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  manageSearchInput: {
    flex: 1.4,
    minWidth: 160,
    backgroundColor: "#061711",
    borderWidth: 1,
    borderColor: "#143326",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#f0fdf4",
    fontSize: 12,
  },
  dropdownRelativeWrapper: {
    position: "relative",
    zIndex: 10,
  },
  manageFilterDropdown: {
    backgroundColor: "#061711",
    borderWidth: 1,
    borderColor: "#143326",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  manageFilterDropdownText: {
    color: "#d7e9e1",
    fontSize: 12,
  },
  manageDropdownList: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    minWidth: 140,
    backgroundColor: "#082218",
    borderWidth: 1,
    borderColor: "#184030",
    borderRadius: 8,
    zIndex: 99,
    elevation: 6,
    overflow: "hidden",
  },
  manageDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#102d20",
  },
  manageDropdownItemText: {
    color: "#d7e9e1",
    fontSize: 12,
  },
  manageTableContainer: {
    backgroundColor: "#061711",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#123023",
    overflow: "hidden",
  },
  manageTableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#092219",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#163a2b",
  },
  manageTableHeaderCell: {
    color: "#7e9c90",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  manageTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0d261c",
  },
  manageTableCell: {
    color: "#d7e9e1",
    fontSize: 12,
  },
  manageTableCellBold: {
    color: "#d7e9e1",
    fontSize: 12,
    fontWeight: "600",
  },
  timeBadgePill: {
    backgroundColor: "rgba(251, 146, 60, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  timeBadgePillText: {
    color: "#fb923c",
    fontSize: 11,
    fontWeight: "600",
  },
  manageActionsCell: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  manageEditBtn: {
    backgroundColor: "#164e63",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manageEditBtnText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
  },
  manageDeleteBtn: {
    backgroundColor: "#451a1a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manageDeleteBtnText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Add Form Styles */
  addFormContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 50,
  },
  inputSectionLabel: {
    color: "#8da79c",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 14,
  },
  quickAmountsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  quickAmountPill: {
    backgroundColor: "#0a2219",
    borderWidth: 1,
    borderColor: "#184030",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  quickAmountPillActive: {
    backgroundColor: "#194f3a",
    borderColor: "#34d399",
  },
  quickAmountPillText: {
    color: "#a7f3d0",
    fontSize: 12,
    fontWeight: "600",
  },
  quickAmountPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  labelWithActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 8,
  },
  editCategoriesButton: {
    paddingVertical: 2,
  },
  editCategoriesText: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "600",
  },
  formDropdownInput: {
    backgroundColor: "#071912",
    borderWidth: 1,
    borderColor: "#143628",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formDropdownPlaceholder: {
    color: "#6e8a7e",
    fontSize: 13,
  },
  formDropdownSelectedText: {
    color: "#f0fdf4",
    fontSize: 13,
  },
  dropdownChevron: {
    color: "#8da79c",
    fontSize: 14,
  },
  dropdownOptionsContainer: {
    backgroundColor: "#0a241a",
    borderWidth: 1,
    borderColor: "#184030",
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownOptionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#113023",
  },
  dropdownOptionRowText: {
    color: "#d7e9e1",
    fontSize: 13,
  },
  formInputWrapper: {
    backgroundColor: "#071912",
    borderWidth: 1,
    borderColor: "#143628",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  formTextInput: {
    color: "#f0fdf4",
    fontSize: 14,
    paddingVertical: 10,
  },
  dateInputWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calendarInputIcon: {
    fontSize: 15,
  },
  descriptionInputWrapper: {
    paddingVertical: 8,
  },
  descriptionTextInput: {
    minHeight: 65,
  },
  submitFormButton: {
    backgroundColor: "#34d399",
    borderRadius: 12,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  submitFormButtonText: {
    color: "#06130e",
    fontSize: 16,
    fontWeight: "800",
  },
  cancelFormButton: {
    borderWidth: 1,
    borderColor: "#184030",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  cancelFormButtonText: {
    color: "#8da79c",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Calendar Styles */
  calendarScrollView: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 40,
  },
  monthHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  monthPillBtn: {
    backgroundColor: "#0d231b",
    borderWidth: 1,
    borderColor: "#1a4233",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  monthPillBtnText: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "600",
  },
  monthTitleWrapper: {
    alignItems: "center",
  },
  monthNameHeading: {
    color: "#f0fdf4",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    letterSpacing: 0.5,
  },
  monthTotalSpentText: {
    color: "#8da79c",
    fontSize: 11,
    marginTop: 3,
  },
  weekdaysHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  weekdayCol: {
    width: "14.28%",
    alignItems: "center",
  },
  weekdayLabelText: {
    color: "#6e8a7e",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  monthGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 6,
  },
  gridEmptyCell: {
    width: "13.6%",
    aspectRatio: 0.95,
  },
  dayCard: {
    width: "13.6%",
    aspectRatio: 0.95,
    backgroundColor: "#0c2018",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#153327",
    padding: 4,
    justifyContent: "space-between",
  },
  dayCardToday: {
    borderColor: "#2bd48f",
    borderWidth: 1.5,
  },
  dayCardSelected: {
    backgroundColor: "#112e23",
    borderColor: "#34d399",
    borderWidth: 1.5,
  },
  dayCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dayCardNumber: {
    color: "#7e9b8f",
    fontSize: 10,
    fontWeight: "600",
  },
  dayCardNumberActive: {
    color: "#f0fdf4",
    fontWeight: "700",
  },
  spendBadge: {
    backgroundColor: "#421a1a",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
  },
  spendBadgeText: {
    color: "#f87171",
    fontSize: 8,
    fontWeight: "700",
  },
  dayCardPill: {
    backgroundColor: "#071610",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pillCyanBar: {
    width: 2,
    height: 8,
    backgroundColor: "#38bdf8",
    borderRadius: 1,
    marginRight: 2,
  },
  pillCategoryText: {
    color: "#a7f3d0",
    fontSize: 7,
    flex: 1,
    fontWeight: "600",
  },
  pillAmountText: {
    color: "#f0fdf4",
    fontSize: 7,
    fontWeight: "700",
  },
  dayDetailsSheet: {
    marginTop: 18,
    backgroundColor: "#0a2219",
    borderWidth: 1,
    borderColor: "#184030",
    borderRadius: 12,
    padding: 14,
  },
  dayDetailsSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dayDetailsTitle: {
    color: "#f0fdf4",
    fontSize: 15,
    fontWeight: "700",
  },
  dayDetailsSubtitle: {
    color: "#8da79c",
    fontSize: 11,
    marginTop: 2,
  },
  sheetAddButton: {
    backgroundColor: "#133829",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#255c45",
  },
  sheetAddButtonText: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyDayText: {
    color: "#6e8a7e",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  detailEntryCard: {
    backgroundColor: "#061510",
    borderWidth: 1,
    borderColor: "#143326",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  detailEntryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailEntryCategory: {
    color: "#d7e9e1",
    fontSize: 13,
    fontWeight: "700",
  },
  detailEntryAmount: {
    color: "#a7f3d0",
    fontSize: 14,
    fontWeight: "700",
  },
  detailEntryDesc: {
    color: "#8da79c",
    fontSize: 12,
    marginVertical: 4,
  },
  detailEntryBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "#112e22",
  },
  detailEntryTime: {
    color: "#6e8a7e",
    fontSize: 10,
  },
  detailActionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#123b2c",
  },
  editBtnText: {
    color: "#a7f3d0",
    fontSize: 11,
    fontWeight: "600",
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#3a1717",
  },
  deleteBtnText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "600",
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34d399",
    marginRight: 8,
  },

  /* History Styles */
  historyScrollView: {
    padding: 16,
    paddingBottom: 40,
  },
  historyCardContainer: {
    backgroundColor: "#081d16",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#163a2b",
    padding: 18,
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  historyMonthTitle: {
    color: "#f0fdf4",
    fontSize: 22,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  historyOutflowText: {
    color: "#8da79c",
    fontSize: 13,
    marginTop: 4,
  },
  exportCsvBtn: {
    backgroundColor: "#34d399",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exportCsvIcon: {
    color: "#051610",
    fontSize: 15,
    fontWeight: "800",
  },
  exportCsvText: {
    color: "#051610",
    fontSize: 13,
    fontWeight: "800",
  },
  historyTableContainer: {
    backgroundColor: "#061711",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#123023",
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#092219",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#163a2b",
  },
  tableHeaderCell: {
    color: "#7e9c90",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  tableEmptyState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tableEmptyText: {
    color: "#6e8a7e",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
  },
  tableDataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0d261c",
  },
  tableDataCell: {
    color: "#d7e9e1",
    fontSize: 12,
  },
  tableActionCell: {
    alignItems: "center",
  },
  tableDeleteBtn: {
    backgroundColor: "#3a1717",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tableDeleteBtnText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "600",
  },

  /* Bottom Navigation */
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#091c15",
    borderTopWidth: 1,
    borderTopColor: "#143024",
    paddingVertical: 10,
    paddingHorizontal: 6,
    minHeight: 64,
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  navIcon: {
    color: "#71877e",
    fontSize: 22,
    marginBottom: 4,
  },
  activeNavIcon: {
    color: "#a7f3d0",
    fontSize: 22,
    marginBottom: 4,
    transform: [{ scale: 1.15 }],
  },
  nav: {
    color: "#71877e",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  activeNav: {
    color: "#a7f3d0",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#0a2219",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#184030",
    maxHeight: "75%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#f0fdf4",
    fontSize: 16,
    fontWeight: "700",
  },
  modalCloseText: {
    color: "#8da79c",
    fontSize: 18,
    fontWeight: "700",
  },
  modalAddInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  modalInput: {
    flex: 1,
    backgroundColor: "#06130e",
    borderWidth: 1,
    borderColor: "#184030",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#f0fdf4",
    fontSize: 13,
  },
  modalAddBtn: {
    backgroundColor: "#34d399",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },
  modalAddBtnText: {
    color: "#06130e",
    fontSize: 12,
    fontWeight: "700",
  },
  modalCategoriesList: {
    marginTop: 4,
  },
  modalCategoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#113023",
  },
  modalCategoryName: {
    color: "#d7e9e1",
    fontSize: 13,
  },
  modalDeleteCategoryBtn: {
    backgroundColor: "#3a1717",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalDeleteCategoryBtnText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "600",
  },

  pageFooter: {
    marginTop: 26,
    alignItems: "center",
    paddingBottom: 10,
  },
  pageFooterText: {
    color: "#6e8a7e",
    fontSize: 12,
  },
  pageFooterAuthor: {
    color: "#34d399",
    fontWeight: "700",
  },
});