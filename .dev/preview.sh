#!/bin/bash

set -euo pipefail

CONFIG_FILE="$HOME/.previewrc"

usage() {
  cat <<EOF
Usage: $(basename "$0") [port] [options] [-- extra http-server args]

  port                  Port to serve on (1-65535). If omitted, you'll be prompted.
  -d, --dir DIR         Directory to serve (default: current directory, or last used).
  -o, --open            Open the preview in a browser automatically.
  -q, --quiet           Skip the banner.
  --no-auto-port        Fail instead of trying the next port when busy.
  --https               Serve over HTTPS. Requires --cert and --key.
  --cert PATH           Path to a TLS certificate (used with --https).
  --key PATH            Path to a TLS private key (used with --https).
  -h, --help            Show this help and exit.

  Port and directory choices are remembered in $CONFIG_FILE
  and offered as defaults next time.

Examples:
  $(basename "$0")                          # interactive prompt
  $(basename "$0") 3000                     # serve on port 3000, no prompt
  $(basename "$0") 3000 -d ./dist -o        # serve ./dist on 3000 and open a browser
  $(basename "$0") --https --cert c.pem --key k.pem
EOF
}

port_arg=""
dir_arg=""
extra_args=()
open_browser=false
quiet=false
auto_port=true
use_https=false
cert_path=""
key_path=""

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    -d|--dir)
      dir_arg="${2:-}"
      [ -n "$dir_arg" ] || { echo "Error: $1 requires a directory argument" >&2; exit 1; }
      shift 2
      ;;
    -o|--open)
      open_browser=true
      shift
      ;;
    -q|--quiet)
      quiet=true
      shift
      ;;
    --no-auto-port)
      auto_port=false
      shift
      ;;
    --https)
      use_https=true
      shift
      ;;
    --cert)
      cert_path="${2:-}"
      [ -n "$cert_path" ] || { echo "Error: --cert requires a path argument" >&2; exit 1; }
      shift 2
      ;;
    --key)
      key_path="${2:-}"
      [ -n "$key_path" ] || { echo "Error: --key requires a path argument" >&2; exit 1; }
      shift 2
      ;;
    --)
      shift
      extra_args=("$@")
      break
      ;;
    [0-9]*)
      port_arg="$1"
      shift
      ;;
    *)
      echo "Error: unrecognized argument \"$1\"" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ "$use_https" = true ] && { [ -z "$cert_path" ] || [ -z "$key_path" ]; }; then
  echo "Error: --https requires both --cert and --key" >&2
  exit 1
fi

# Colors (only when output is a real terminal)
if [ -t 1 ]; then
  GREEN="\033[1;32m"
  YELLOW="\033[1;33m"
  WHITE="\033[0;37m"
  BLUE="\033[0;34m"
  RESET="\033[0m"
else
  GREEN=""
  YELLOW=""
  WHITE=""
  BLUE=""
  RESET=""
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx not found. Install Node.js (which includes npx) and try again." >&2
  exit 1
fi

is_valid_port() {
  [[ "$1" =~ ^[0-9]+$ ]] && [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

is_port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && exec 3<&- 3>&-
}

get_lan_ip() {
  hostname -I 2>/dev/null | awk '{print $1}' \
    || ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}'
}

load_config() {
  saved_port=""
  saved_dir=""
  if [ -f "$CONFIG_FILE" ]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
    saved_port="${PORT:-}"
    saved_dir="${DIR:-}"
  fi
}

save_config() {
  cat > "$CONFIG_FILE" <<EOF
PORT=$1
DIR=$2
EOF
}

load_config

clear

if [ "$quiet" = false ]; then
  # GREEN ASCII ART
  echo -e "${GREEN}██████╗ ██████╗ ███████╗██╗   ██╗██╗███████╗██╗    ██╗${RESET}"
  echo -e "${GREEN}██╔══██╗██╔══██╗██╔════╝██║   ██║██║██╔════╝██║    ██║${RESET}"
  echo -e "${GREEN}██████╔╝██████╔╝█████╗  ██║   ██║██║█████╗  ██║ █╗ ██║${RESET}"
  echo -e "${GREEN}██╔═══╝ ██╔══██╗██╔══╝  ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║${RESET}"
  echo -e "${GREEN}██║     ██║  ██║███████╗ ╚████╔╝ ██║███████╗╚███╔███╔╝${RESET}"
  echo -e "${GREEN}╚═╝     ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝${RESET}"
  echo -e "${BLUE}Version 2.0.0${RESET}"
  echo ""

  # WHITE text
  echo -e "${WHITE}Welcome to Preview by TyCo Studios!${RESET}"
  echo ""
fi

# Directory: --dir flag > remembered value > current directory
dir="${dir_arg:-${saved_dir:-$PWD}}"
if [ ! -d "$dir" ]; then
  echo -e "${WHITE}Error: directory \"$dir\" does not exist.${RESET}" >&2
  exit 1
fi

# Port: CLI arg > PREVIEW_PORT env var > remembered value > interactive prompt
port="$port_arg"
if [ -z "$port" ] && [ -n "${PREVIEW_PORT:-}" ]; then
  port="$PREVIEW_PORT"
fi
if [ -n "$port" ] && ! is_valid_port "$port"; then
  echo -e "${WHITE}Invalid port \"$port\" — enter a number between 1 and 65535.${RESET}"
  echo ""
  port=""
fi

default_port="${saved_port:-8080}"
if ! is_valid_port "$default_port"; then
  default_port=8080
fi

while [ -z "$port" ]; do
  echo -e "${YELLOW}Enter port for preview to be hosted on [default: $default_port]:${RESET}"
  read -r port
  port="${port:-$default_port}"

  if ! is_valid_port "$port"; then
    echo -e "${WHITE}Invalid port \"$port\" — enter a number between 1 and 65535.${RESET}"
    echo ""
    port=""
  fi
done

if is_port_in_use "$port"; then
  if [ "$auto_port" = true ]; then
    original_port="$port"
    tries=0
    while is_port_in_use "$port" && [ "$tries" -lt 20 ]; do
      port=$((port + 1))
      tries=$((tries + 1))
    done
    if is_port_in_use "$port"; then
      echo -e "${WHITE}Port $original_port and the next 20 ports are all in use.${RESET}" >&2
      exit 1
    fi
    echo -e "${WHITE}Port $original_port is in use — using $port instead.${RESET}"
  else
    echo -e "${WHITE}Port $port is already in use. Choose a different port.${RESET}" >&2
    exit 1
  fi
fi

save_config "$port" "$dir"

if [ "$open_browser" = true ]; then
  extra_args+=("-o")
fi

if [ "$use_https" = true ]; then
  extra_args+=("-S" "-C" "$cert_path" "-K" "$key_path")
fi

trap 'echo -e "\n${WHITE}Server stopped.${RESET}"; exit 0' INT TERM

echo ""
echo -e "${WHITE}Starting server on port $port, serving $dir...${RESET}"
lan_ip="$(get_lan_ip || true)"
if [ -n "$lan_ip" ]; then
  echo -e "${WHITE}Local:   http://127.0.0.1:$port${RESET}"
  echo -e "${WHITE}Network: http://$lan_ip:$port${RESET}"
fi
echo -e "${WHITE}You should see a notification in your code editor. Press Ctrl+C to stop.${RESET}"
echo ""

# Start server
npx http-server "$dir" -p "$port" "${extra_args[@]}"
