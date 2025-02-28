const { loadMindmapFromMarkdown } = require('./markdown-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getNodeLevel(node) {
    let level = 0;
    let current = node;
    
    while (current) {
        if (current.tagName === 'LI') {
            level++;
        }
        current = current.parentElement;
    }
    
    // Subtrai 1 porque o nó raiz não deve contar para o nível
    return Math.max(0, level - 1);
}

function convertNodeToMarkdown(node, level = 1) {
    let markdown = '';
    const span = node.querySelector(':scope > span');
    const text = span.childNodes[0].textContent.trim();
    const link = span.dataset.link;
    const tags = span.dataset.tags ? JSON.parse(span.dataset.tags) : [];
    
    // Adiciona os marcadores de nível
    if (level <= 3) {
        markdown += '#'.repeat(level) + ' ';
    } else {
        markdown += '\t'.repeat(Math.max(0, level - 4)) + '- ';
    }
    
    // Adiciona o texto com link se houver
    if (link) {
        markdown += `[${text}](${link})`;
    } else {
        markdown += text;
    }
    
    // Adiciona as tags se houver
    if (tags.length > 0) {
        markdown += ` {${tags.join(', ')}}`;
    }
    
    markdown += '\n\n';
    
    // Processa os filhos
    const childrenContainer = node.querySelector(':scope > div');
    if (childrenContainer) {
        const children = childrenContainer.querySelectorAll(':scope > ul > li');
        children.forEach(child => {
            markdown += convertNodeToMarkdown(child, level + 1);
        });
    }
    
    return markdown;
}

function convertMindmapToMarkdown(mindmap) {
    // Carrega o arquivo atual para preservar os metadados
    const filePath = path.join(os.homedir(), 'lifemap.md');
    const currentContent = fs.readFileSync(filePath, 'utf-8');
    const metadataMatch = currentContent.match(/^---\n([\s\S]*?)\n---\n/);
    const metadata = metadataMatch ? metadataMatch[0] : '---\ntags: []\n---\n\n';
    
    // Converte o mindmap para markdown
    const markdown = convertNodeToMarkdown(mindmap.querySelector('ul'));
    
    // Retorna o markdown com os metadados preservados
    return metadata + markdown;
}

module.exports = {
    convertMindmapToMarkdown
}; 