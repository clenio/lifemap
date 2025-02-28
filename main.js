const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { updateMarkdownMetadata } = require('./src/markdown-parser')

let mainWindow = null

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    mainWindow.loadFile('src/index.html')
    
    // Descomente a linha abaixo para abrir as ferramentas de desenvolvimento
    // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// Função para salvar o mindmap em markdown
function saveMindmapToMarkdown(mindmapData) {
    const filePath = path.join(os.homedir(), 'lifemap.md')
    fs.writeFileSync(filePath, mindmapData, 'utf-8')
}

// IPC handlers
ipcMain.on('save-mindmap', (event, mindmapData) => {
    try {
        saveMindmapToMarkdown(mindmapData)
        event.reply('save-success')
    } catch (error) {
        console.error('Erro ao salvar mindmap:', error)
        event.reply('save-error', error.message)
    }
})

// Handler para abrir links externos
ipcMain.on('open-external-link', (event, url) => {
    shell.openExternal(url).catch(error => {
        console.error('Erro ao abrir link:', error)
    })
})

ipcMain.handle('update-markdown-metadata', async (event, newTags) => {
    const filePath = path.join(os.homedir(), 'lifemap.md')
    return updateMarkdownMetadata(filePath, newTags)
}) 