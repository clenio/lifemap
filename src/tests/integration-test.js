const { JSDOM } = require('jsdom');
const assert = require('assert');
const { safeExtractNodeText } = require('../utils');

// Simulating the entire tag handling process
describe('Tag Integration Tests', () => {
    let document;
    let window;
    
    // Set up a more complex DOM for integration testing
    beforeEach(() => {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div class="mindmap">
                    <ul>
                        <li>
                            <span data-tags='["work","important"]'>
                                <span class="node-text">Project A</span>
                                <span class="tags">
                                    <span class="tag">work</span>
                                    <span class="tag">important</span>
                                </span>
                            </span>
                            <div>
                                <ul>
                                    <li>
                                        <span data-tags='["task"]'>
                                            <span class="node-text">Task 1</span>
                                            <span class="tags">
                                                <span class="tag">task</span>
                                            </span>
                                        </span>
                                    </li>
                                    <li>
                                        <span data-tags='["task","soon"]'>
                                            <span class="node-text">Task 2</span>
                                            <span class="tags">
                                                <span class="tag">task</span>
                                                <span class="tag">soon</span>
                                            </span>
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </li>
                        <li>
                            <span data-tags='["personal"]'>
                                <span class="node-text">Personal Goals</span>
                                <span class="tags">
                                    <span class="tag">personal</span>
                                </span>
                            </span>
                        </li>
                    </ul>
                </div>
            </body>
            </html>
        `);

        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;
    });
    
    // Simulate the collectNodesByTag function with our fix
    function collectNodesByTagTest() {
        const nodesByTag = new Map();
        const spans = document.querySelectorAll('.mindmap li > span');
        
        spans.forEach(span => {
            const tags = JSON.parse(span.dataset.tags || '[]');
            // Use our safe extraction function
            const text = safeExtractNodeText(span);
            
            if (tags.length > 0) {
                // Get node hierarchy (simplified for test)
                const hierarchy = [text];
                
                tags.forEach(tag => {
                    if (!nodesByTag.has(tag)) {
                        nodesByTag.set(tag, []);
                    }
                    nodesByTag.get(tag).push({
                        text: text,
                        hierarchy: hierarchy
                    });
                });
            }
        });
        
        return nodesByTag;
    }
    
    it('should correctly organize nodes by tag', () => {
        const nodesByTag = collectNodesByTagTest();
        
        // Verify all expected tags exist
        assert.ok(nodesByTag.has('work'), 'work tag should be present');
        assert.ok(nodesByTag.has('important'), 'important tag should be present');
        assert.ok(nodesByTag.has('task'), 'task tag should be present');
        assert.ok(nodesByTag.has('soon'), 'soon tag should be present');
        assert.ok(nodesByTag.has('personal'), 'personal tag should be present');
        
        // Verify correct number of nodes per tag
        assert.equal(nodesByTag.get('work').length, 1, 'work tag should have 1 node');
        assert.equal(nodesByTag.get('important').length, 1, 'important tag should have 1 node');
        assert.equal(nodesByTag.get('task').length, 2, 'task tag should have 2 nodes');
        assert.equal(nodesByTag.get('soon').length, 1, 'soon tag should have 1 node');
        assert.equal(nodesByTag.get('personal').length, 1, 'personal tag should have 1 node');
        
        // Verify the text content of specific tags
        assert.equal(nodesByTag.get('work')[0].text, 'Project A', 'work tag should be on Project A node');
        assert.equal(nodesByTag.get('task')[0].text, 'Task 1', 'First task node should have task tag');
        assert.equal(nodesByTag.get('task')[1].text, 'Task 2', 'Second task node should have task tag');
        assert.equal(nodesByTag.get('personal')[0].text, 'Personal Goals', 'Personal node should have personal tag');
    });
    
    it('should handle nodes without tags correctly', () => {
        // Add a node without tags
        const newLi = document.createElement('li');
        newLi.innerHTML = `<span><span class="node-text">No Tags Node</span></span>`;
        document.querySelector('.mindmap ul').appendChild(newLi);
        
        const nodesByTag = collectNodesByTagTest();
        
        // Getting all nodes regardless of tags
        const allNodes = Array.from(document.querySelectorAll('.mindmap li > span'));
        
        // Getting unique nodes with tags (avoiding duplicates)
        const uniqueNodesWithTags = new Set();
        nodesByTag.forEach((nodes) => {
            nodes.forEach(node => uniqueNodesWithTags.add(node.text));
        });
        
        // Should be 5 total nodes, but only 4 with tags
        assert.equal(allNodes.length, 5, 'Should have 5 total nodes');
        assert.equal(uniqueNodesWithTags.size, 4, 'Should have 4 unique nodes with tags');
        
        // Check that we can extract text properly from nodes without tags
        const noTagNode = document.querySelector('.mindmap li > span:not([data-tags])');
        const extractedText = safeExtractNodeText(noTagNode);
        assert.equal(extractedText, 'No Tags Node', 'Should extract text correctly from nodes without tags');
    });
}); 