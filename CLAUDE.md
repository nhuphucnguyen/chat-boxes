# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- **Start development:** `npm start` - Launches the Electron app in development mode
- **Build for all platforms:** `npm run build` - Uses electron-builder to create distribution packages
- **Build for Linux:** `npm run build:linux` - Creates AppImage and deb packages
- **Build for macOS:** `npm run build:mac` - Creates macOS app bundle
- **Build for Windows:** `npm run build:win` - Creates NSIS installer

## Architecture Overview

Chat Boxes is an Electron desktop application that provides a tabbed interface for multiple messaging/web applications.

### Core Architecture

**Electron Process Structure:**
- **Main Process (`main.js`)**: Creates app window, handles IPC communication, manages persistent tab storage in `~/.chat-boxes/tabs.json`
- **Renderer Process (`renderer.js`)**: Contains the `TabManager` class that orchestrates the entire UI and tab lifecycle
- **Preload Script (`preload.js`)**: Secure bridge exposing limited APIs to renderer via `contextBridge`

**Key Components:**
- **TabManager Class**: Central controller managing all tab operations, PIN protection, context menus, and persistence
- **WebView Containers**: Each tab uses Electron's webview tag with isolated partitions (`persist:tab_${id}`) for session separation
- **PIN Protection System**: Hash-based tab locking with modal dialogs for setup/entry/removal
- **Apps Registry (`apps.js`)**: Static configuration of supported messaging platforms with icons and URLs

### Data Flow

1. **Tab Creation**: User selects app from modal → IPC to main → back to renderer → TabManager creates webview with unique partition
2. **Tab Persistence**: TabManager saves tab state (URL, ID, icon, PIN hash) → IPC to main → JSON file write
3. **Tab Activation**: Click handler → PIN verification if protected → DOM manipulation to show/hide containers
4. **Context Menu**: Right-click on tab → position context menu → handle reload/PIN/delete operations

### Storage & Security

- **Session Isolation**: Each tab uses separate Electron partition for cookies/storage isolation
- **PIN Protection**: Simple hash-based system (production apps should use stronger hashing)
- **Data Directory**: `~/.chat-boxes/` in user home directory for tab persistence
- **User Agent Spoofing**: Chrome user agent set to bypass Electron detection on some sites

### UI Structure

- **Sidebar**: Fixed 50px width container for tab icons and "+" button
- **Content Area**: Flexible container holding webview containers
- **Modals**: App selection, PIN setup, and PIN entry overlays
- **Context Menu**: Right-click menu with tab management options