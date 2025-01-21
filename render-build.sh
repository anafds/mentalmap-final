#!/usr/bin/env bash

echo "Atualizando pacotes..."
apt-get update

echo "Instalando dependências para o Chrome..."
apt-get install -y wget gnupg
apt-get install -y libx11-xcb1 libxcomposite1 libxrandr2 libxi6 libatk1.0-0 libgtk-3-0 libnss3 libxdamage1 libxext6 libxshmfence1
apt-get install -y libgbm-dev