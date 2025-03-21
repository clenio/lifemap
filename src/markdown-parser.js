const { marked } = require('marked');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('./config');

// Regex para identificar a seção de metadados
const METADATA_REGEX = /^---\n([\s\S]*?)\n---\n/;

function parseMetadata(content) {
    const match = content.match(METADATA_REGEX);
    if (match) {
        try {
            const metadataStr = match[1];
            const metadata = {};
            
            metadataStr.split('\n').forEach(line => {
                const [key, value] = line.split(': ');
                if (key === 'tags') {
                    metadata.tags = JSON.parse(value);
                }
            });
            
            return {
                metadata,
                content: content.replace(METADATA_REGEX, '')
            };
        } catch (error) {
            console.error('Erro ao parsear metadados:', error);
        }
    }
    
    return {
        metadata: { tags: [] },
        content
    };
}

function generateMetadata(metadata) {
    let content = '---\n';
    if (metadata.tags && metadata.tags.length > 0) {
        content += `tags: ${JSON.stringify(metadata.tags)}\n`;
    }
    content += '---\n\n';
    return content;
}

function updateMarkdownMetadata(filePath, newTags) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { metadata, content: markdownContent } = parseMetadata(content);
        
        // Atualiza a lista de tags (remove duplicatas)
        metadata.tags = Array.from(new Set([...(metadata.tags || []), ...newTags]));
        
        // Gera o novo conteúdo com metadados atualizados
        const newContent = generateMetadata(metadata) + markdownContent;
        
        fs.writeFileSync(filePath, newContent, 'utf-8');
        return metadata.tags;
    } catch (error) {
        console.error('Erro ao atualizar metadados:', error);
        return [];
    }
}

function parseMarkdownToMindmap(markdown) {
    const { metadata, content } = parseMetadata(markdown);
    const tokens = marked.lexer(content);
    const mindmapData = convertTokensToMindmap(tokens);
    
    // Se não houver dados, retorna um nó root vazio
    if (!mindmapData || mindmapData.length === 0) {
        return [{
            text: 'Root',
            children: []
        }];
    }
    
    return mindmapData;
}

function findParentNode(nodes, level) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].level < level) {
            return nodes[i];
        }
    }
    return null;
}

function extractLinkFromText(text) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
    const match = text.match(linkRegex);
    if (match) {
        return {
            text: match[1],
            link: match[2]
        };
    }
    return { text };
}

function convertTokensToMindmap(tokens) {
    const root = { text: '', children: [] };
    const stack = [{ node: root, level: 0 }];
    let currentList = null;
    let lastNode = null;
    
    tokens.forEach(token => {
        if (token.type === 'heading') {
            const level = token.depth;
            const text = token.text;
            
            // Extrai apenas o link do texto, já que as tags agora estão em uma linha separada
            const { text: cleanText, link } = extractLinkFromText(text);
            
            const newNode = { 
                text: cleanText, 
                children: [],
                link,
                tags: []
            };
            
            // Remove nós do stack que têm nível maior ou igual
            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }
            
            const parent = stack[stack.length - 1].node;
            parent.children.push(newNode);
            stack.push({ node: newNode, level });
            currentList = null;
            lastNode = newNode;
            
        } else if (token.type === 'paragraph' && token.text.startsWith('tags:') && lastNode) {
            // Processa linha de tags
            const tagsText = token.text.replace('tags:', '').trim();
            // Divide a string de tags, considerando que podem estar separadas por vírgulas ou espaços
            const tagsList = tagsText.split(/,\s*|\s+/);
            // Filtra para remover entradas vazias e faz trim em cada tag
            lastNode.tags = tagsList.filter(tag => tag.trim()).map(tag => tag.trim());
            
        } else if (token.type === 'list') {
            // Nota: Com a mudança para usar cabeçalhos em todos os níveis, esta parte do código
            // será menos utilizada, mas mantida para compatibilidade com markdown existente
            currentList = token;
            const level = (stack[stack.length - 1].level || 0) + 1;
            
            token.items.forEach(item => {
                // Processa o texto principal do item
                const { text: cleanText, link } = extractLinkFromText(item.text);
                
                const newNode = {
                    text: cleanText,
                    children: [],
                    link,
                    tags: []
                };
                
                const parent = stack[stack.length - 1].node;
                parent.children.push(newNode);
                lastNode = newNode;
                
                // Processa os tokens do item para encontrar as tags
                if (item.tokens) {
                    item.tokens.forEach(subToken => {
                        if (subToken.type === 'text' && subToken.text.startsWith('tags:')) {
                            const tagsText = subToken.text.replace('tags:', '').trim();
                            // Divide a string de tags, considerando que podem estar separadas por vírgulas ou espaços
                            const tagsList = tagsText.split(/,\s*|\s+/);
                            // Filtra para remover entradas vazias e faz trim em cada tag
                            newNode.tags = tagsList.filter(tag => tag.trim()).map(tag => tag.trim());
                        }
                    });
                }
                
                // Se o item tem subitens, processa recursivamente
                if (item.tokens && item.tokens.length > 0) {
                    const subTokens = item.tokens.filter(t => t.type === 'list');
                    if (subTokens.length > 0) {
                        stack.push({ node: newNode, level: level + 1 });
                        subTokens.forEach(subList => {
                            const subItems = convertTokensToMindmap([subList]);
                            if (subItems && subItems.length > 0) {
                                newNode.children.push(...subItems[0].children);
                            }
                        });
                        stack.pop();
                    }
                }
            });
        }
    });
    
    return root.children;
}

function generateHTML(nodes) {
    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }
    
    let html = '<ul>';
    nodes.forEach(node => {
        html += '<li>';
        const spanAttrs = [];
        const spanClasses = [];
        
        if (node.link) {
            spanAttrs.push(`data-link="${node.link}"`);
            spanClasses.push('has-link');
        }
        
        if (node.tags && node.tags.length > 0) {
            spanAttrs.push(`data-tags='${JSON.stringify(node.tags)}'`);
        }
        
        if (node.children && node.children.length > 0) {
            spanClasses.push('has-children');
        }

        if (spanClasses.length > 0) {
            spanAttrs.push(`class="${spanClasses.join(' ')}"`);
        }
        
        // Cria um span principal que contém tanto o texto quanto as tags
        html += `<span ${spanAttrs.join(' ')}>`;
        
        // Adiciona um span específico para o texto do nó
        html += `<span class="node-text">${node.text}</span>`;
        
        // Adiciona as tags em um span separado
        if (node.tags && node.tags.length > 0) {
            html += `<span class="tags">${node.tags.map(tag => 
                `<span class="tag">${tag}</span>`).join('')}</span>`;
        }
        
        html += '</span>';
        
        if (node.children && node.children.length > 0) {
            html += '<div>';
            html += generateHTML(node.children);
            html += '</div>';
        }
        
        html += '</li>';
    });
    html += '</ul>';
    return html;
}

function initializeMarkdownFile(filePath) {
    try {
        // Verifica se o arquivo existe
        if (!fs.existsSync(filePath)) {
            // Certifica-se de que o diretório existe
            const directory = path.dirname(filePath);
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            
            // Se não existe, cria com a estrutura inicial
            const initialContent = '---\ntags: []\n---\n\n# Root\n';
            fs.writeFileSync(filePath, initialContent, 'utf-8');
            return true;
        }

        // Se existe, verifica se tem a seção de metadados
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!content.match(METADATA_REGEX)) {
            // Se não tem metadados, adiciona no início do arquivo
            const newContent = '---\ntags: []\n---\n\n' + content;
            fs.writeFileSync(filePath, newContent, 'utf-8');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Erro ao inicializar arquivo markdown:', error);
        return false;
    }
}

function loadMindmapFromMarkdown() {
    try {
        // Usa o caminho da configuração
        const filePath = config.getSavePath();
        
        // Inicializa o arquivo se ele não existir ou não tiver metadados
        initializeMarkdownFile(filePath);
        
        // Lê o conteúdo do arquivo
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Extrai os metadados
        const { metadata, content: markdownContent } = parseMetadata(content);
        
        // Usa o Marked para converter o markdown para tokens
        const tokens = marked.lexer(markdownContent);
        
        // Converte os tokens para o formato do mindmap
        const nodes = convertTokensToMindmap(tokens);
        
        // Gera o HTML a partir dos nós
        const html = generateHTML(nodes);
        
        return {
            html,
            availableTags: metadata.tags || []
        };
    } catch (error) {
        console.error('Erro ao carregar mindmap:', error);
        // Retorna um mindmap padrão em caso de erro
        return {
            html: '<ul><li><span><span class="node-text">Root</span></span></li></ul>',
            availableTags: []
        };
    }
}

module.exports = {
    loadMindmapFromMarkdown,
    updateMarkdownMetadata
}; 