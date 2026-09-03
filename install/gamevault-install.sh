#!/usr/bin/env bash

# Copyright (c) 2021-2026 community-scripts.org
# Author: RainingDaemons
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/RainingDaemons/gamevault

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

msg_info "Installing Dependencies"
$STD apt-get install -y curl git ca-certificates build-essential openssl
msg_ok "Installed Dependencies"

msg_info "Installing Node.js 22 LTS"
$STD bash -c "$(curl -fsSL https://deb.nodesource.com/setup_22.x)"
$STD apt-get install -y nodejs
msg_ok "Installed Node.js"

msg_info "Installing pnpm"
$STD npm install -g pnpm@10
msg_ok "Installed pnpm"

msg_info "Cloning Game Vault"
$STD git clone https://github.com/RainingDaemons/gamevault.git /opt/gamevault
msg_ok "Cloned Game Vault"

msg_info "Installing Dependencies"
$STD pnpm --dir /opt/gamevault install --frozen-lockfile
msg_ok "Installed Dependencies"

msg_info "Building Game Vault"
$STD pnpm --dir /opt/gamevault build
msg_ok "Built Game Vault"

msg_info "Creating Data Directory"
$STD mkdir -p /etc/gamevault
$STD chmod 750 /etc/gamevault
if [[ ! -f /etc/gamevault/servers.md ]]; then
  cat >/etc/gamevault/servers.md <<'EOF'
# Game Servers

Replace this file with your real server list.

This file lives at `/etc/gamevault/servers.md`, outside the repository. It is
read at request time and is never committed to git or served to unauthenticated
visitors.
EOF
fi
$STD chown root:www-data /etc/gamevault/servers.md
$STD chmod 640 /etc/gamevault/servers.md
msg_ok "Created Data Directory"

msg_info "Generating Secrets"
if [[ -z "${GAMEVAULT_PASSWORD:-}" ]]; then
  msg_error "No vault password provided (GAMEVAULT_PASSWORD is empty)"
  exit 1
fi
SESSION_SECRET="$(openssl rand -base64 32)"
HASH="$(node /opt/gamevault/scripts/hash-password.mjs "${GAMEVAULT_PASSWORD}")"
if [[ -z "$HASH" ]]; then
  msg_error "Failed to hash the vault password"
  exit 1
fi
# adapter-node assumes HTTPS when ORIGIN is unset, which makes SvelteKit's CSRF
# check reject same-origin form submissions over plain HTTP. Pin the origin to
# the container's primary IP so logins work on http://<ip>:3000.
CT_IP="${IP:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
printf 'NODE_ENV=production\nPORT=3000\nORIGIN=http://%s:3000\nowner_name=%s\nSERVERS_MD_PATH=/etc/gamevault/servers.md\nSESSION_SECRET=%s\nPASSWORD_HASH=%s\n' \
  "${CT_IP}" "${GAMEVAULT_OWNER:-admin}" "$SESSION_SECRET" "$HASH" >/etc/gamevault/gamevault.env
$STD chmod 600 /etc/gamevault/gamevault.env
unset GAMEVAULT_PASSWORD
msg_ok "Generated Secrets"

msg_info "Creating Service"
$STD install -m 644 /opt/gamevault/deploy/gamevault.service /etc/systemd/system/gamevault.service
$STD systemctl daemon-reload
$STD systemctl enable --now gamevault
msg_ok "Created Service"

motd_ssh

# Point the in-container "update" command at this repository
eval "$(declare -f customize | sed 's#https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct#https://raw.githubusercontent.com/RainingDaemons/gamevault/main#g')"
customize
cleanup_lxc
