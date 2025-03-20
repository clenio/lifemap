const fs = require('fs');
const path = require('path');
const os = require('os');
const electron = require('electron');

// Configuração padrão
const defaultConfig = {
    savePath: path.join(os.homedir(), 'lifemap.md'),
    autoSave: true,
    theme: 'dark'
};

// Diretório padrão para os arquivos de configuração
const configDir = path.join(os.homedir(), '.config', 'lifemap');

// Nome do arquivo de configuração
const CONFIG_FILENAME = 'settings.json';

// Caminho completo para o arquivo de configuração
const configPath = path.join(configDir, CONFIG_FILENAME);

// Carrega a configuração
function loadConfig() {
    try {
        console.log('Carregando configuração de:', configPath);
        
        // Certifica-se de que o diretório existe
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        if (fs.existsSync(configPath)) {
            console.log('Arquivo de configuração encontrado');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('Configuração carregada:', config);
            return { ...defaultConfig, ...config };
        }
        
        console.log('Arquivo de configuração não encontrado, usando padrões:', defaultConfig);
        // Cria o arquivo de configuração com os valores padrão
        saveConfig(defaultConfig);
        return defaultConfig;
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        return defaultConfig;
    }
}

// Salva a configuração
function saveConfig(config) {
    try {
        // Certifica-se de que o diretório existe
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        return false;
    }
}

// Obtém o caminho de salvamento do arquivo
function getSavePath() {
    const config = loadConfig();
    console.log('Caminho de salvamento obtido:', config.savePath);
    return config.savePath;
}

// Define o novo caminho de salvamento
function setSavePath(newPath) {
    const config = loadConfig();
    config.savePath = newPath;
    return saveConfig(config);
}

module.exports = {
    loadConfig,
    saveConfig,
    getSavePath,
    setSavePath
}; 