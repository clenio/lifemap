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
    try {
        let markdown = '';
        
        // Verifica se o nó existe
        if (!node) {
            console.error('Nó inválido recebido em convertNodeToMarkdown');
            return '';
        }

        const span = node.querySelector(':scope > span');
        if (!span) {
            console.error('Span não encontrado no nó:', node);
            return '';
        }

        // Verifica se há conteúdo de texto no span
        const textContent = span.textContent || span.innerText || '';
        const text = textContent.trim();
        
        const link = span.dataset.link;
        const tags = span.dataset.tags ? JSON.parse(span.dataset.tags) : [];
        
        // Adiciona os marcadores de nível
        const indentation = level <= 3 ? '' : '\t'.repeat(Math.max(0, level - 4));
        
        // Adiciona o texto com link se houver
        if (level <= 3) {
            markdown += '#'.repeat(level) + ' ';
            if (link) {
                markdown += `[${text}](${link})`;
            } else {
                markdown += text;
            }
            markdown += '\n';
        } else {
            markdown += indentation + '- ';
            if (link) {
                markdown += `[${text}](${link})`;
            } else {
                markdown += text;
            }
            markdown += '\n';
        }
        
        // Adiciona as tags em uma linha separada se houver
        if (tags.length > 0) {
            if (level <= 3) {
                markdown += `tags: ${tags.join(', ')}\n`;
            } else {
                markdown += indentation + `tags: ${tags.join(', ')}\n`;
            }
        }
        
        // Adiciona uma linha em branco após cada nó
        markdown += '\n';
        
        // Processa os filhos
        const childrenContainer = node.querySelector(':scope > div');
        if (childrenContainer) {
            const children = childrenContainer.querySelectorAll(':scope > ul > li');
            children.forEach(child => {
                markdown += convertNodeToMarkdown(child, level + 1);
            });
        }
        
        return markdown;
    } catch (error) {
        console.error('Erro ao converter nó para markdown:', error);
        console.error('Nó problemático:', node);
        return '';
    }
}

function convertMindmapToMarkdown(mindmap) {
    try {
        // Verifica se o mindmap é válido
        if (!mindmap) {
            throw new Error('Mindmap inválido');
        }

        // Carrega o arquivo atual para preservar os metadados
        const filePath = path.join(os.homedir(), 'lifemap.md');
        console.log('Convertendo mindmap para markdown...');
        
        let metadata = '---\ntags: []\n---\n\n';
        try {
            const currentContent = fs.readFileSync(filePath, 'utf-8');
            const metadataMatch = currentContent.match(/^---\n([\s\S]*?)\n---\n/);
            if (metadataMatch) {
                metadata = metadataMatch[0];
                console.log('Metadados existentes encontrados:', metadata);
            }
        } catch (error) {
            console.log('Arquivo não existe ou erro ao ler:', error);
        }
        
        // Encontra o elemento ul raiz
        const rootUl = mindmap.querySelector('ul');
        if (!rootUl) {
            throw new Error('Elemento ul raiz não encontrado no mindmap');
        }

        // Converte o mindmap para markdown
        console.log('Iniciando conversão do mindmap...');
        const markdown = convertNodeToMarkdown(rootUl.querySelector('li'));
        console.log('Markdown gerado com sucesso');
        
        // Retorna o markdown com os metadados preservados
        return metadata + markdown;
    } catch (error) {
        console.error('Erro ao converter mindmap para markdown:', error);
        console.error('Estado do mindmap:', mindmap?.innerHTML);
        throw error;
    }
}

module.exports = {
    convertMindmapToMarkdown
}; 