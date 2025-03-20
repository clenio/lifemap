const { JSDOM } = require('jsdom');
const assert = require('assert');

// Mocking the DOM environment for testing
// This creates a minimal DOM environment to run our tests
function setupDOM() {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <body>
            <div class="mindmap">
                <ul>
                    <li>
                        <span data-tags='["tag1","tag2"]'>
                            <span class="node-text">Test Node</span>
                            <span class="tags">
                                <span class="tag">tag1</span>
                                <span class="tag">tag2</span>
                            </span>
                        </span>
                    </li>
                </ul>
            </div>
        </body>
        </html>
    `);

    global.document = dom.window.document;
    global.window = dom.window;
    return dom.window.document;
}

// Test suite
describe('Tag Processing Tests', () => {
    let document;
    
    beforeEach(() => {
        document = setupDOM();
    });
    
    it('should correctly extract node text without including tags text', () => {
        const span = document.querySelector('li > span');
        const nodeTextElement = span.querySelector('.node-text');
        
        // Direct access to node-text element
        const nodeTextContent = nodeTextElement.textContent.trim();
        assert.equal(nodeTextContent, 'Test Node', 'Node text should only contain the node content');
        
        // The current problematic approach (includes tags)
        const fullTextContent = span.textContent.trim();
        assert.notEqual(fullTextContent, 'Test Node', 'Full span text incorrectly includes tag text');
        assert.ok(
            fullTextContent.includes('tag1') && fullTextContent.includes('tag2'),
            'Full span text contains the tag text'
        );
    });
    
    it('should correctly access tags from data attribute', () => {
        const span = document.querySelector('li > span');
        
        // Get tags from data attribute
        const tags = JSON.parse(span.dataset.tags || '[]');
        assert.deepEqual(tags, ['tag1', 'tag2'], 'Tags should be correctly parsed from data-tags attribute');
    });
    
    // Additional test to simulate the collectNodesByTag function's behavior
    it('should correctly extract node text in collectNodesByTag function', () => {
        const span = document.querySelector('li > span');
        
        // Simulate the existing function's behavior
        const nodeTextElement = span.querySelector('.node-text');
        const text = nodeTextElement ? nodeTextElement.textContent.trim() : span.textContent.trim();
        
        // Assert
        assert.equal(text, 'Test Node', 'collectNodesByTag should extract only the node text');
    });
    
    // Test for the fix implementation
    it('should extract node text correctly even without node-text element', () => {
        // Create a new test node without .node-text class
        const newNode = document.createElement('span');
        newNode.setAttribute('data-tags', JSON.stringify(['tag3', 'tag4']));
        newNode.textContent = 'Plain Node';
        
        // Add tag spans
        const tagsSpan = document.createElement('span');
        tagsSpan.className = 'tags';
        
        const tag3Span = document.createElement('span');
        tag3Span.className = 'tag';
        tag3Span.textContent = 'tag3';
        
        const tag4Span = document.createElement('span');
        tag4Span.className = 'tag';
        tag4Span.textContent = 'tag4';
        
        tagsSpan.appendChild(tag3Span);
        tagsSpan.appendChild(tag4Span);
        
        // Clear the original content and add structured content
        newNode.textContent = '';
        const textNode = document.createElement('span');
        textNode.textContent = 'Plain Node';
        newNode.appendChild(textNode);
        newNode.appendChild(tagsSpan);
        
        // Test the safe extraction approach
        function safeExtractNodeText(span) {
            // First try to get text from .node-text element
            const nodeTextElement = span.querySelector('.node-text');
            if (nodeTextElement) {
                return nodeTextElement.textContent.trim();
            }
            
            // If no .node-text element, get the first text node or first child's text
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
        
        const extractedText = safeExtractNodeText(newNode);
        assert.equal(extractedText, 'Plain Node', 'Safe extraction should get only node text');
    });
}); 