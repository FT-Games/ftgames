# Preview created by TyCo Studios, code has been revised for FT Games.
# This code is licensed under the MIT License. (c) 2026 TyCo Studios. All rights reserved.

#!/bin/bash

# Colors
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
WHITE="\033[0;37m"
BLUE="\033[0;34m"
RESET="\033[0m"

clear

# Set terminal title
echo -ne "\033]0;Preview\007"

# GREEN ASCII ART
echo -e "${GREEN}██████╗ ██████╗ ███████╗██╗   ██╗██╗███████╗██╗    ██╗${RESET}"
echo -e "${GREEN}██╔══██╗██╔══██╗██╔════╝██║   ██║██║██╔════╝██║    ██║${RESET}"
echo -e "${GREEN}██████╔╝██████╔╝█████╗  ██║   ██║██║█████╗  ██║ █╗ ██║${RESET}"
echo -e "${GREEN}██╔═══╝ ██╔══██╗██╔══╝  ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║${RESET}"
echo -e "${GREEN}██║     ██║  ██║███████╗ ╚████╔╝ ██║███████╗╚███╔███╔╝${RESET}"
echo -e "${GREEN}╚═╝     ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝${RESET}"
echo -e "${BLUE}Version 1.0.0${RESET}"
echo ""

# WHITE text
echo -e "${WHITE}Welcome to Preview!${RESET}"
echo ""

# YELLOW port prompt
echo -e "${YELLOW}Enter port for preview to be hosted on (e.g. 8080):${RESET}"
read port

echo ""
echo -e "${WHITE}Starting server on port $port...${RESET}"
echo -e "${WHITE}You should see a notification in your code editor. Press Ctrl+C to stop.${RESET}"
echo ""

# Start server
npx http-server -p "$port"
