#!/bin/bash

# Build script for VSCode extension

# Set to exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print with colors
print_message() {
  echo -e "${GREEN}[BUILD]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Determine which package manager to use (npm or bun)
if command_exists bun; then
  PKG_MANAGER="bun"
elif command_exists npm; then
  PKG_MANAGER="npm"
else
  print_error "Neither bun nor npm is installed. Please install one of them."
  exit 1
fi

print_message "Using $PKG_MANAGER as package manager"

# Function to run commands with the detected package manager
run_cmd() {
  local cmd=$1
  if [ "$PKG_MANAGER" = "bun" ]; then
    bun run $cmd
  else
    npm run $cmd
  fi
}

# Show help if requested
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  echo "Usage: ./build.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  -c, --compile     Compile the extension only"
  echo "  -w, --watch       Watch for changes and recompile"
  echo "  -p, --package     Compile and package the extension"
  echo "  -r, --react       Compile only React components"
  echo "  -h, --help        Show this help message"
  exit 0
fi

# Default action if no argument provided
if [ -z "$1" ]; then
  print_message "Running default compile action..."
  run_cmd compile
  print_message "Compilation completed successfully!"
  exit 0
fi

# Process command line arguments
case "$1" in
  -c|--compile)
    print_message "Compiling extension..."
    run_cmd compile
    print_message "Compilation completed successfully!"
    ;;
  -w|--watch)
    print_message "Starting watch mode..."
    run_cmd watch & run_cmd watch-react
    ;;
  -p|--package)
    print_message "Packaging extension..."
    run_cmd compile-prod
    
    # Check if vsce is installed globally first
    if command_exists vsce; then
      vsce package
    else
      # If not available globally, use npx
      if command_exists npx; then
        npx vsce package
      else
        # Last resort, try with package manager exec
        ${PKG_MANAGER} exec vsce package
      fi
    fi
    
    print_message "Packaging completed successfully!"
    ;;
  -r|--react)
    print_message "Compiling React components only..."
    run_cmd compile-react
    print_message "React compilation completed successfully!"
    ;;
  *)
    print_error "Unknown option: $1"
    echo "Use ./build.sh --help to see available options"
    exit 1
    ;;
esac

exit 0
