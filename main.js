const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { updateMarkdownMetadata } = require("./src/markdown-parser");
const config = require("./src/config");

// Configura o ícone da aplicação
if (process.platform === 'darwin') {  // macOS
  const iconPath = path.join(__dirname, 'src', 'assets', 'icon-green.png');
  app.dock.setIcon(iconPath);
}

let mainWindow = null;
let settingsWindow = null;

function createWindow() {
  console.log("Iniciando criação da janela principal");
  try {
    // Caminho para o ícone
    const iconPath = path.join(__dirname, 'src', 'assets', 'icon-green.png');
    console.log("Usando ícone:", iconPath);
    
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      icon: iconPath,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    console.log("Carregando index.html");
    mainWindow.loadFile("src/index.html");

    console.log("Abrindo DevTools");
    // Abre as ferramentas de desenvolvimento
    // mainWindow.webContents.openDevTools();

    // Quando a janela for fechada
    mainWindow.on("closed", () => {
      console.log("Janela principal fechada");
      mainWindow = null;
    });

    console.log("Janela principal criada com sucesso");
  } catch (error) {
    console.error("Erro ao criar janela principal:", error);
    mainWindow = null;
  }
}

function createSettingsWindow() {
  console.log("Iniciando criação da janela de configurações");
  try {
    // Verifica se já existe uma janela de configurações
    if (settingsWindow) {
      console.log("Janela de configurações já existe, apenas focando");
      settingsWindow.focus();
      return;
    }

    // Caminho para o ícone
    const iconPath = path.join(__dirname, 'src', 'assets', 'icon-green.png');
    console.log("Usando ícone para janela de configurações:", iconPath);

    console.log("Criando nova janela de configurações");
    settingsWindow = new BrowserWindow({
      width: 600,
      height: 400,
      parent: mainWindow,
      modal: true,
      icon: iconPath,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    console.log("Carregando arquivo settings.html");
    settingsWindow.loadFile("src/settings.html");

    // Para depuração
    // settingsWindow.webContents.openDevTools();

    // Adiciona manipulador para tecla ESC
    settingsWindow.webContents.on("before-input-event", (event, input) => {
      if (input.key === "Escape") {
        console.log(
          "Tecla ESC pressionada na janela de configurações, fechando...",
        );
        settingsWindow.close();
      }
    });

    // Quando a janela for fechada, elimina a referência
    settingsWindow.on("closed", () => {
      console.log("Janela de configurações fechada");
      settingsWindow = null;
    });

    console.log("Janela de configurações criada com sucesso");
  } catch (error) {
    console.error("Erro ao criar janela de configurações:", error);
    settingsWindow = null;
  }
}

app.whenReady().then(() => {
  console.log("Aplicativo pronto - iniciando janela principal");
  createWindow();

  app.on("activate", () => {
    console.log("Evento activate recebido");
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log("Nenhuma janela aberta, criando uma nova");
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  console.log("Todas as janelas foram fechadas");
  if (process.platform !== "darwin") {
    console.log("Não estamos no macOS, finalizando aplicativo");
    app.quit();
  }
});

// Função para salvar o mindmap em markdown
function saveMindmapToMarkdown(mindmapData) {
  const filePath = config.getSavePath();

  // Certifica-se de que o diretório existe
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  fs.writeFileSync(filePath, mindmapData, "utf-8");
}

// IPC handlers
ipcMain.on("save-mindmap", (event, mindmapData) => {
  try {
    console.log("Recebido pedido para salvar mindmap");
    if (!mindmapData) {
      throw new Error("Dados do mindmap vazios");
    }
    saveMindmapToMarkdown(mindmapData);
    console.log("Mindmap salvo com sucesso");
    event.reply("save-success");
  } catch (error) {
    console.error("Erro ao salvar mindmap:", error);
    event.reply("save-error", error.message);
  }
});

// Handler para abrir links externos
ipcMain.on("open-external-link", (event, url) => {
  shell.openExternal(url).catch((error) => {
    console.error("Erro ao abrir link:", error);
  });
});

// Handler para atualizar metadados
ipcMain.handle("update-markdown-metadata", async (event, newTags) => {
  const filePath = config.getSavePath();
  return updateMarkdownMetadata(filePath, newTags);
});

// Handler para abrir a janela de configurações
ipcMain.on("open-settings", (event) => {
  console.log("====================================");
  console.log("Recebido pedido para abrir configurações (usando modal)");
  console.log("====================================");
  // Não faz mais nada, pois a configuração agora é um modal na mesma janela
});

// Handler para obter a configuração atual (para o modal de configurações)
ipcMain.handle("get-settings", async (event) => {
  console.log("Recebido pedido para obter configurações para o modal");
  try {
    const configData = config.loadConfig();
    console.log("Configurações carregadas com sucesso:", configData);
    return configData;
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    throw error;
  }
});

// Handler para salvar a configuração (do modal de configurações)
ipcMain.handle("save-settings", async (event, newSettings) => {
  console.log(
    "Recebido pedido para salvar configurações do modal:",
    newSettings,
  );
  try {
    const success = config.saveConfig(newSettings);
    console.log("Configurações salvas com sucesso:", success);
    return success;
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    throw error;
  }
});

// Handler para obter a configuração atual
ipcMain.handle("get-config", (event) => {
  console.log("Recebido pedido para obter configuração");
  const configData = config.loadConfig();
  console.log("Retornando configuração:", configData);
  return configData;
});

// Handler para obter o caminho do userData do app
ipcMain.handle("get-user-data-path", () => {
  console.log("Recebido pedido para obter caminho userData");
  return app.getPath("userData");
});

// Handler para selecionar caminho
ipcMain.handle("select-save-path", async (event) => {
  console.log("Recebido pedido para selecionar caminho");
  const currentPath = config.getSavePath();
  console.log("Caminho atual:", currentPath);

  const currentDir = path.dirname(currentPath);
  const currentFile = path.basename(currentPath);

  const result = await dialog.showSaveDialog({
    defaultPath: currentPath,
    filters: [{ name: "Markdown", extensions: ["md"] }],
    properties: ["showOverwriteConfirmation"],
  });

  if (!result.canceled && result.filePath) {
    // Assegura que a extensão é .md
    let filePath = result.filePath;
    if (!filePath.toLowerCase().endsWith(".md")) {
      filePath += ".md";
    }
    return filePath;
  }

  return currentPath;
});

// Handler para verificar se o IPC está funcionando
ipcMain.on("check-ipc", (event, message) => {
  console.log("Recebido teste de IPC do renderer:", message);
  event.reply("check-ipc-response", "IPC funcionando!");
});
