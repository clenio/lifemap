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

function convertNodeToMarkdown(node) {
    let markdown = '';
    const level = getNodeLevel(node);
    const text = node.querySelector(':scope > span').textContent.replace(/\s*\[[-+]\]\s*$/, '');

    if (level <= 2) {
        // Níveis 1 e 2 usam headers
        const prefix = '#'.repeat(level + 1);
        markdown += `${prefix} ${text}\n\n`;
    } else {
        // A partir do nível 3, usa listas com indentação
        const indentation = '\t'.repeat(Math.max(0, level - 2));
        markdown += `${indentation}- ${text}\n`;
    }

    const children = node.querySelectorAll(':scope > div > ul > li');
    children.forEach(child => {
        markdown += convertNodeToMarkdown(child);
    });

    // Adiciona uma linha extra após grupos de listas do mesmo nível
    if (level <= 2 && children.length > 0) {
        markdown += '\n';
    }

    return markdown;
}

function convertMindmapToMarkdown(mindmap) {
    let markdown = '';
    const rootNodes = mindmap.querySelectorAll(':scope > ul > li');
    rootNodes.forEach(node => {
        markdown += convertNodeToMarkdown(node);
    });
    return markdown;
}

module.exports = {
    convertMindmapToMarkdown
}; 