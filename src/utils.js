/**
 * Utility functions for the application
 */

/**
 * Extracts text from a node, excluding any tag content
 * Handles cases with or without the .node-text element
 * 
 * @param {HTMLElement} span - The span element containing both node text and tags
 * @returns {string} - The clean node text without tag content
 */
function safeExtractNodeText(span) {
    // First try to get text from .node-text element
    const nodeTextElement = span.querySelector('.node-text');
    if (nodeTextElement) {
        return nodeTextElement.textContent.trim();
    }
    
    // If no .node-text element, get text content excluding .tags content
    const tagsSpan = span.querySelector('.tags');
    if (tagsSpan) {
        // Remove the tags span temporarily to get only the node text
        const tagsSpanClone = tagsSpan.cloneNode(true);
        span.removeChild(tagsSpan);
        const text = span.textContent.trim();
        // Put the tags back
        span.appendChild(tagsSpanClone);
        return text;
    }
    
    // Fallback to full text content if no .tags element
    return span.textContent.trim();
}

module.exports = {
    safeExtractNodeText
}; 