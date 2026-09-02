#!/usr/bin/env bash
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)
# Copyright (c) 2021-2026 community-scripts.org
# Author: RainingDaemons
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/RainingDaemons/gamevault

APP="Game Vault"
var_tags="${var_tags:-selfhosted;game;password}"
var_cpu="${var_cpu:-1}"
var_ram="${var_ram:-1024}"
var_disk="${var_disk:-4}"
var_os="${var_os:-debian}"
var_version="${var_version:-12}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

# Fetch the installer from this repository instead of the community-scripts repo
eval "$(declare -f build_container | sed 's#https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/install#https://raw.githubusercontent.com/RainingDaemons/gamevault/main/install#g')"

function update_script() {
  header_info
  check_container_storage
  check_container_resources
  if [[ ! -d /opt/gamevault/.git ]]; then
    msg_error "No ${APP} Installation Found!"
    exit
  fi

  msg_info "Updating ${APP}"
  cd /opt/gamevault
  git pull
  pnpm install --frozen-lockfile
  pnpm build
  systemctl restart gamevault
  msg_ok "Updated ${APP}"
  exit
}

function prompt_vault_password() {
  local pw=""
  local owner=""

  if command -v whiptail &>/dev/null && [ -t 0 ] && [[ "$TERM" != "dumb" ]]; then
    while [[ -z "$pw" ]]; do
      pw=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "Game Vault Password" \
        --passwordbox "Set the master password used to unlock the server list.\n\nMinimum 8 characters." \
        12 60 3>&1 1>&2 2>&3)
      [[ $? -ne 0 ]] && exit_script
      if [[ ${#pw} -lt 8 ]]; then
        whiptail --backtitle "Proxmox VE Helper Scripts" --title "Game Vault Password" \
          --msgbox "Password must be at least 8 characters." 8 50 3>&1 1>&2 2>&3
        pw=""
      fi
    done
    owner=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "Game Vault Owner" \
      --inputbox "Display name of the vault owner (shown in the header):" 10 60 "admin" 3>&1 1>&2 2>&3)
    [[ $? -ne 0 ]] && exit_script
  else
    while [[ -z "$pw" ]]; do
      read -rsp "Game Vault master password (min 8 chars): " pw </dev/tty
      echo
      [[ ${#pw} -ge 8 ]] || pw=""
    done
    read -rp "Vault owner name [admin]: " owner </dev/tty
  fi

  export GAMEVAULT_PASSWORD="$pw"
  export GAMEVAULT_OWNER="${owner:-admin}"
}

start
prompt_vault_password
build_container
description

msg_ok "Completed successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW}Game Vault: ${BGN}http://${IP}:3000${CL}"
echo -e "${INFO}${YW}Content file: ${BGN}/etc/gamevault/servers.md${CL}"
echo -e "${INFO}${YW}Secrets file: ${BGN}/etc/gamevault/gamevault.env${CL}"
