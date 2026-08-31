# Kite Ledger

Kite Ledger is a React Native expense and personal finance tracking application. It helps users record daily expenses, organize transactions by category and time of day, review monthly spending, and export previous-month records as CSV.

> **Current implementation:** The provided application is a client-side React Native/Expo application. Expense records, categories, and the user's name are stored locally using AsyncStorage. No backend API or remote database is implemented in the provided source.

## Features

### 1. Personalized Welcome
- Displays a Kite Ledger branding splash screen when the application starts.
- Prompts first-time users to enter their name.
- Saves the user's name locally.
- Displays a dynamic greeting based on the current time.
- The saved name can be edited from the top-right greeting area.

### 2. Dashboard
The Home screen provides a monthly financial overview:
- Total spend for the current month.
- Total entries for the current month.
- Total savings display.
- Category-wise spending breakdown.
- SVG-based pie chart for visualizing expense allocation.

### 3. Add Expense
Users can create an expense with:
- Amount
- Category
- Time of day
- Date
- Optional description/note

Quick amount buttons are available for:
- ₹50
- ₹100
- ₹200
- ₹500
- ₹1,000
- ₹2,000

The application validates the amount, category, and date before saving an entry.

### 4. Manage Entries
Users can:
- View all expense records.
- Search by description, category, date, or time of day.
- Filter by category.
- Filter by time of day.
- Edit an existing expense.
- Delete an expense with confirmation.

### 5. Calendar
The Calendar screen provides:
- Monthly calendar navigation.
- Previous/next month controls.
- Total spending for the selected month.
- Daily expense totals.
- Selected-day transaction details.
- Add Expense directly for a selected date.
- Edit and delete actions for daily transactions.

### 6. Last Month / History
The History screen shows:
- Previous month's expense records.
- Previous month's total outflow.
- Date, category, time of day, note, and amount.
- Delete action for individual records.

### 7. CSV Export
The previous month's records can be exported as a CSV file.

- **Web:** Downloads the CSV through the browser.
- **Native:** Creates the CSV using the device file system and opens the native sharing flow when available.

The exported CSV contains:

```text
Date, Category, Time of Day, Note, Amount (INR)
```

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | React Native |
| Development Platform | Expo |
| Language | TypeScript |
| Local Storage | AsyncStorage |
| Safe Area | react-native-safe-area-context |
| Charts / Graphics | react-native-svg |
| Native File Handling | expo-file-system |
| File Sharing | expo-sharing |
| UI | React Native components and StyleSheet |

The source imports AsyncStorage, React Native UI primitives, SafeAreaView, and SVG components, and conditionally loads Expo file-system and sharing functionality for native platforms. 

## Application Screens

The application currently contains five main screens:

1. **Home**
2. **Add**
3. **Manage Entries**
4. **Calendar**
5. **Last Month**

These screens are connected through a bottom navigation bar.

## Data Model

Each expense entry uses the following structure:

```typescript
type Entry = {
  id: string;
  amount: number;
  category: string;
  timeOfDay: string;
  date: string;
  description: string;
};
```

### Default Categories

- House Rent
- Food
- Travel
- Petrol
- Miscellaneous

Users can add their own categories and remove existing categories, while retaining at least one category.

### Time-of-Day Options

- None / Any Time
- Morning
- Afternoon
- Evening
- Night

## Local Storage

The application uses AsyncStorage with the following keys:

```text
@kite_ledger_entries
@kite_ledger_categories
@kite_user_name
```

Expense records, categories, and the user's name are therefore persisted locally on the device/browser storage rather than being sent to a server.

## Project Structure

A typical Expo project can be organized as:

```text
kite-ledger/
├── app/
│   └── index.tsx
├── assets/
├── components/
├── package.json
├── app.json
├── tsconfig.json
└── README.md
```

> The exact project structure may differ depending on the Expo project configuration. The provided source is an `index.tsx` application entry screen.

## Getting Started

### Prerequisites

Install the following:

- Node.js
- npm
- Expo CLI / Expo project tooling
- VS Code or another code editor

### Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd kite-ledger
```

Install dependencies:

```bash
npm install
```

### Run the Application

Start the Expo development server:

```bash
npx expo start
```

You can then choose the appropriate development target from the Expo development server, such as:

```text
Android
iOS
Web
```

For web development:

```bash
npx expo start --web
```

## Required Packages

The provided source uses the following packages:

```bash
npm install @react-native-async-storage/async-storage
npm install react-native-safe-area-context
npm install react-native-svg
npm install expo-file-system
npm install expo-sharing
```

If the project was created using Expo, prefer Expo-compatible package installation where applicable:

```bash
npx expo install @react-native-async-storage/async-storage react-native-safe-area-context react-native-svg expo-file-system expo-sharing
```

## How Data Works

The application follows a local-first approach:

```text
User
  ↓
React Native UI
  ↓
Application State
  ↓
AsyncStorage
  ↓
Local Device Storage
```

When the application starts, it loads saved entries, categories, and the user's name from AsyncStorage.

When an expense is added or updated, the new entry list is serialized and saved back to AsyncStorage.

## Validation

The Add/Edit Expense form checks:

- Amount must not be empty.
- Amount must be a valid number greater than zero.
- Category must be selected.
- Date must follow `YYYY-MM-DD`.
- Category names cannot be empty.
- Duplicate category names are prevented.
- At least one category must remain.

## CSV Export Flow

```text
Last Month
    ↓
Collect previous-month entries
    ↓
Generate CSV content
    ↓
Web → Browser Download
    OR
Native → File System → Share
```

## Current Limitations

The current source is a local application and does **not** include:

- User authentication
- AWS Cognito
- Backend API
- Node.js/Express server
- Remote database
- Cloud synchronization
- Multi-device synchronization
- Server-side expense storage

If these capabilities are added later, the local AsyncStorage layer can be replaced or complemented with an API/backend architecture.

## Future Enhancements

Potential improvements include:

- AWS Cognito authentication
- Node.js + TypeScript backend
- REST API
- PostgreSQL or DynamoDB database
- Cloud synchronization
- User-specific expense records
- Budget management
- Income tracking
- Savings calculations
- Monthly and yearly reports
- Push notifications
- Receipt/photo attachment
- Cloud backup
- Admin portal
- Multi-device synchronization

## Author

**Tharun**

Kite Ledger is designed as an expense, cash-flow, and personal finance tracking application.
