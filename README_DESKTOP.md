# Desafio das Emoções + IA - Versão Desktop

## Novidades
Esta versão desktop permite que a aplicação funcione como um programa nativo no seu computador, com as seguintes vantagens:

### ✅ Benefícios
- **Funcionamento Offline**: A aplicação funciona sem necessidade de servidor web
- **Exportação Direta**: Os resultados são guardados diretamente no seu computador
- **Atualizações Automáticas**: A aplicação verifica e instala atualizações automaticamente
- **Experiência Nativa**: Melhor integração com o sistema operativo

### 🚀 Instalação

#### Windows
1. Descarregue o ficheiro `.exe` ou `.zip` da secção de releases
2. Execute o instalador e siga as instruções
3. A aplicação ficará disponível no menu Iniciar

#### macOS
1. Descarregue o ficheiro `.dmg`
2. Arraste a aplicação para a pasta Applications
3. Execute a aplicação a partir da Launchpad ou Applications

#### Linux
1. Descarregue o ficheiro `.AppImage`
2. Dê permissão de execução: `chmod +x Desafio-das-Emocoes.AppImage`
3. Execute o ficheiro

### 🔄 Atualizações Automáticas

A aplicação verifica automaticamente por atualizações sempre que é iniciada. Se uma nova versão estiver disponível, ser-lhe-á notificado e poderá instalar a atualização com um clique.

### 📥 Exportação de Resultados

Os resultados do desafio podem ser exportados de duas formas:
- **Versão Desktop**: Menu Arquivo → Exportar Resultados (Ctrl+E)
- **Versão Web**: Botão "Guardar Resultados" (requer servidor)

### 🎮 Modo Kiosk

Para usar a aplicação em modo quiosque (ex: feiras, eventos):
- Windows/Linux: Inicie com parâmetro `--kiosk`
- macOS: Configure nas Preferências do Sistema

### 🛠️ Desenvolvimento

Para compilar a aplicação:
```bash
npm install
npm run build
```

Para testar em modo desenvolvimento:
```bash
npm run electron-dev
```

### 📝 Notas de Versão

#### v1.0.0
- Versão desktop inicial com funcionalidade completa
- Sistema de atualizações automáticas via GitHub
- Exportação direta de resultados para CSV
- Suporte para Windows, macOS e Linux