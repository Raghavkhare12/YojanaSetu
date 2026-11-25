<div align="center">

# 📱 YojanaSetu • Android Application
### Native Jetpack Compose Citizen Authentication Portal

[![Kotlin](https://img.shields.io/badge/Kotlin-2.2.10-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)](gradle/libs.versions.toml)
[![AGP](https://img.shields.io/badge/AGP-9.1.1-3DDC84?style=for-the-badge&logo=android&logoColor=white)](gradle/libs.versions.toml)
[![CompileSDK](https://img.shields.io/badge/Compile_SDK-36.1-0F9D58?style=for-the-badge&logo=android&logoColor=white)](app/build.gradle.kts)
[![MinSDK](https://img.shields.io/badge/Min_SDK-24_%28Android_7.0%29-133B6B?style=for-the-badge)](app/build.gradle.kts)
[![Jetpack Compose](https://img.shields.io/badge/UI-Jetpack_Compose_BOM_2024.09.00-4285F4?style=for-the-badge&logo=jetpackcompose&logoColor=white)](app/build.gradle.kts)

**Lightweight Material 3 Android module focused strictly on the Citizen Login and New Citizen Registration experience (`AuthScreen`), preserving the full YojanaSetu civic theme, validation, and pre-filled demo flow.**

[← Back to Root Repo](../README.md) · [View CI Workflow →](../.github/workflows/build-android.yml)

</div>

---

## 📋 Overview & Current Scope

This module is intentionally streamlined to a lean, dependency-light **Jetpack Compose + Material 3** authentication frontend with **zero database, network, or scheme-browsing screens**:

- **Entry Point (`MainActivity`)**: Enables edge-to-edge rendering and mounts `YojanaTheme(themeMode = ThemeMode.SYSTEM)` wrapping `AuthScreen` inside a Material 3 `Scaffold`.
- **Two Auth Flows (`AuthScreen`)**:
  1. **Citizen Login (`selectedTab = 0`)**: Pre-filled demo credentials (`ramesh.farmer@yojanasetu.gov.in`), password visibility toggle, blank-field validation, **Secure Citizen Login** button, and **Quick 1-Tap Login** card.
  2. **New Citizen Registration (`selectedTab = 1`)**: Full Name (as on Aadhaar), Email Address, Mobile Number, Create Password (min 6 chars), and Confirm Password with real-time validation.
- **Non-Navigating Progress Feedback**: Submitting valid credentials or tapping Quick 1-Tap Login remains on `AuthScreen` and renders an animated `"In progress..."` banner (`in_progress_banner`) and inline button spinner instead of navigating to any scheme page.

---

## 🏛️ Application & UI Architecture

```mermaid
flowchart TB
    AppLaunch["Android OS Launches .MainActivity"] --> EdgeToEdge["enableEdgeToEdge()"]
    EdgeToEdge --> Theme["YojanaTheme(themeMode = ThemeMode.SYSTEM, dynamicColor = false)"]
    Theme --> Scaffold["Material 3 Scaffold (fillMaxSize)"]
    Scaffold --> AuthScreen["AuthScreen(modifier = Modifier.padding(innerPadding))"]

    subgraph AuthComposable["AuthScreen State & Layout (LazyColumn)"]
        direction TB
        Header["Portal Header: Gold-bordered Emblem + YojanaSetu Title + 7-Day Session Pill"]
        Card["Elevated Card (RoundedCornerShape 20.dp)"]
        Tabs["TabRow: Citizen Login (0) | New Citizen Registration (1)"]
        Banners["AnimatedVisibility Banners: errorContainer / primaryContainer (in_progress_banner)"]

        subgraph LoginTab["Tab 0: Citizen Login"]
            LInputs["login_email_input + login_password_input (with visibility toggle)"]
            LSubmit["login_submit_button ('Secure Citizen Login')"]
            LDemo["quick_demo_login_button ('Ramesh Kumar - Farmer, UP')"]
        end

        subgraph SignupTab["Tab 1: New Citizen Registration"]
            SInputs["Name, Email, Mobile, Password, Confirm Password"]
            SSubmit["signup_submit_button ('Register & Open Portal')"]
        end

        Footer["Government of India Digital Citizen Guidelines Footer"]
    end

    AuthScreen --> Header
    AuthScreen --> Card
    Card --> Tabs
    Tabs --> Banners
    Banners --> LoginTab
    Banners --> SignupTab
    AuthScreen --> Footer
```

---

## 🔄 Authentication Validation & State Flow

```mermaid
stateDiagram-v2
    [*] --> Idle : Tab 0 (Citizen Login) or Tab 1 (Registration)

    Idle --> ValidatingLogin : Tap Secure Citizen Login
    Idle --> InProgress : Tap Quick 1-Tap Demo Login
    Idle --> ValidatingSignup : Tap Register & Open Portal

    state ValidatingLogin {
        [*] --> CheckLoginFields
        CheckLoginFields --> LoginError : Email or Password blank
        CheckLoginFields --> LoginValid : Both non-blank
    }

    state ValidatingSignup {
        [*] --> CheckSignupFields
        CheckSignupFields --> SignupError : Name blank OR invalid email OR pass < 6 OR mismatch
        CheckSignupFields --> SignupValid : All rules pass
    }

    LoginError --> ErrorBanner : Show errorMessage, isLoading = false
    SignupError --> ErrorBanner : Show errorMessage, isLoading = false
    LoginValid --> InProgress
    SignupValid --> InProgress

    InProgress --> InProgress : Show "In progress..." banner + spinner (stays on AuthScreen)
    ErrorBanner --> Idle : User edits any input or switches tab
    InProgress --> Idle : User edits any input or switches tab
```

---

## 🎨 Theme & Design System

Configured in [`Theme.kt`](app/src/main/java/com/example/ui/theme/Theme.kt), [`Color.kt`](app/src/main/java/com/example/ui/theme/Color.kt), and [`Type.kt`](app/src/main/java/com/example/ui/theme/Type.kt) with `dynamicColor = false` by default to preserve the official government portal identity across all Android versions.

| Color Role | Light Token & Hex | Dark Token & Hex |
| :--- | :--- | :--- |
| **Primary** | `NavyPrimary` `#133B6B` | `DarkNavyPrimary` `#A6C8FF` |
| **Primary Container** | `NavyPrimaryContainer` `#D6E3FF` | `DarkNavyPrimaryContainer` `#004688` |
| **Secondary** | `AmberSecondary` `#C05621` | `DarkAmberSecondary` `#FFB68E` |
| **Tertiary** | `EmeraldTertiary` `#1B6A4C` | `DarkEmeraldTertiary` `#8AD5B2` |
| **Background** | `LightBackground` `#F8FAFC` | `DarkBackground` `#0B1320` |
| **Surface** | `LightSurface` `#FFFFFF` | `DarkSurface` `#111D30` |
| **Emblem Gold Accent** | `#FFC107` (border & shield icon) | `#FFC107` |

---

## 📂 Directory Structure

```text
Android_Application/
├── app/
│   ├── build.gradle.kts                           # Module configuration & minimal Compose dependencies
│   ├── proguard-rules.pro                         # ProGuard configuration
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml                # App manifest (.MainActivity launcher)
│       │   ├── java/com/example/
│       │   │   ├── MainActivity.kt                # Single-activity Compose entry point
│       │   │   └── ui/
│       │   │       ├── screens/AuthScreen.kt      # Citizen Login & Registration UI
│       │   │       └── theme/
│       │   │           ├── Color.kt               # Light & Dark palette tokens
│       │   │           ├── Theme.kt               # YojanaTheme & ThemeMode enum
│       │   │           └── Type.kt                # Material 3 Typography
│       │   └── res/                               # Launcher mipmaps, drawables, strings, XML rules
│       ├── test/java/com/example/
│       │   ├── ExampleRobolectricTest.kt          # Compose UI tests for Login & Registration flows
│       │   └── ExampleUnitTest.kt                 # Basic JVM unit test
│       └── androidTest/java/com/example/
│           └── ExampleInstrumentedTest.kt         # Android instrumentation context test
├── gradle/
│   ├── libs.versions.toml                         # Centralized dependency & plugin catalog
│   └── wrapper/gradle-wrapper.properties          # Gradle 9.3.1 distribution config
├── build.gradle.kts                               # Root Gradle plugins (android.application, kotlin.compose)
├── gradle.properties                              # JVM args (-Xmx4g), parallel, caching, nonTransitiveRClass
├── metadata.json                                  # Project metadata descriptor
└── settings.gradle.kts                            # Root project name ("YojanaSetu") & repos
```

---

## ⚙️ Build & Test Configuration

| Setting | Value |
| :--- | :--- |
| **Application ID** | `com.aistudio.yojanasetu.wvkmqx` |
| **Namespace** | `com.example` |
| **Compile SDK** | `36` (`minorApiLevel = 1`) |
| **Target SDK / Min SDK** | `36` / `24` |
| **Java Compatibility** | Java `11` |
| **Gradle / AGP / Kotlin** | Gradle `9.3.1` · AGP `9.1.1` · Kotlin `2.2.10` |
| **Test Stack** | JUnit 4 + Robolectric `4.16.1` (`@Config(sdk = [36])`) + Compose UI Test |

### Test Coverage ([`ExampleRobolectricTest.kt`](app/src/test/java/com/example/ExampleRobolectricTest.kt))
- `read string from context`: Verifies `R.string.app_name` equals `"YojanaSetu"`.
- `clicking login shows in progress and stays on auth screen`: Clicks `login_submit_button` with pre-filled demo credentials and asserts both `in_progress_banner` and `auth_screen` are displayed.
- `switching to signup tab and submitting valid form shows in progress`: Switches to `tab_signup`, enters valid registration details, submits `signup_submit_button`, and asserts `in_progress_banner` and `auth_screen` are displayed.

---

## 🚀 Building & Testing

### Option A: Automated Cloud Build (GitHub Actions)
Push to `main` or `master` (or run **Build Android Debug APK** manually in the **Actions** tab). The workflow in [`.github/workflows/build-android.yml`](../.github/workflows/build-android.yml) installs JDK 21, Android SDK `36.1`, and Gradle `9.3.1`, executes `:app:testDebugUnitTest assembleDebug`, and publishes **`yojanasetu-debug-apk`** (`app-debug.apk`).

### Option B: Local Build (Requires Android SDK `36.1` & JDK 17/21)
From `Android_Application/`:

```powershell
# Run unit & Robolectric Compose UI tests
gradle :app:testDebugUnitTest

# Build debug APK
gradle assembleDebug

# Install onto a connected Android device/emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
*(Ensure `ANDROID_HOME` is set or `local.properties` defines `sdk.dir=...`.)*
