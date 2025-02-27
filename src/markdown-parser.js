const { marked } = require('marked');
const fs = require('fs');
const path = require('path');
const os = require('os');

function parseMarkdownToMindmap(markdown) {
    const tokens = marked.lexer(markdown);
    return convertTokensToMindmap(tokens);
}

function findParentNode(nodes, level) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].level < level) {
            return nodes[i];
        }
    }
    return null;
}

function convertTokensToMindmap(tokens) {
    const nodes = [];
    let currentNode = null;
    let lastNodeAtLevel = {};
    let listLevel = 0;

    for (const token of tokens) {
        if (token.type === 'heading') {
            const node = {
                text: token.text,
                level: token.depth,
                children: []
            };

            if (token.depth === 1) {
                nodes.push(node);
            } else {
                // Encontra o pai apropriado
                let parentLevel = token.depth - 1;
                while (parentLevel > 0 && !lastNodeAtLevel[parentLevel]) {
                    parentLevel--;
                }
                
                if (lastNodeAtLevel[parentLevel]) {
                    lastNodeAtLevel[parentLevel].children.push(node);
                } else {
                    nodes.push(node);
                }
            }

            lastNodeAtLevel[token.depth] = node;
            currentNode = node;
            listLevel = 0; // Reset list level when encountering a heading
        } else if (token.type === 'list') {
            const items = token.items.map(item => {
                const itemLevel = (currentNode ? currentNode.level : 0) + listLevel + 1;
                return {
                    text: item.text,
                    level: Math.max(3, itemLevel), // Ensure list items start at level 3
                    children: item.tokens ? convertTokensToMindmap(item.tokens) : []
                };
            });

            items.forEach(item => {
                if (currentNode && currentNode.level < item.level) {
                    currentNode.children.push(item);
                } else {
                    nodes.push(item);
                }
            });

            listLevel++; // Increment list level for nested lists
        }
    }

    return nodes;
}

function generateHTML(nodes) {
    if (!nodes || nodes.length === 0) return '';

    let html = '<ul>';
    for (const node of nodes) {
        html += '<li>';
        html += `<span${node.children.length > 0 ? ' class="has-children"' : ''}>${node.text}</span>`;
        if (node.children.length > 0) {
            html += '<div>';
            html += generateHTML(node.children);
            html += '</div>';
        }
        html += '</li>';
    }
    html += '</ul>';
    return html;
}

function loadMindmapFromMarkdown() {
    const filePath = path.join(os.homedir(), 'lifemap.md');
    try {
        const markdown = fs.readFileSync(filePath, 'utf-8');
        const mindmapData = parseMarkdownToMindmap(markdown);
        return generateHTML(mindmapData);
    } catch (error) {
        console.error('Erro ao ler arquivo markdown:', error);
        return null;
    }
}

module.exports = {
    loadMindmapFromMarkdown
}; 