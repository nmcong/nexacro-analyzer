/**
 * Module for analyzing service calls and their backend implementations
 */
const ServiceAnalyzer = (function () {
    /**
     * Parse service mapping configuration from JSON files
     * @param {Array} jsonFiles - Array of JSON files with name and content properties
     * @returns {Object} - Mapping of service IDs to backend implementations
     */
    function parseServiceMappings(jsonFiles) {
        const serviceMappings = {};

        // Process each JSON mapping file
        for (const file of jsonFiles) {
            try {
                const content = JSON.parse(file.content);

                // Process each service mapping entry
                for (const mapping of content) {
                    const serviceId = mapping.serviceId;

                    if (serviceId) {
                        serviceMappings[serviceId] = {
                            projectId: mapping.projectId,
                            moduleId: mapping.moduleId,
                            programId: mapping.programId,
                            pageId: mapping.pageId,
                            queryIds: mapping.queryIds ? mapping.queryIds.split(',') : [],
                            beanName: mapping.beanName,
                            methodName: mapping.methodName,
                            type: mapping.queryIds ? 'query' : 'bean'
                        };
                    }
                }
            } catch (error) {
                console.error(`Error parsing service mapping file: ${file.name}`, error);
            }
        }

        return serviceMappings;
    }

    /**
     * Parse MyBatis XML query definitions
     * @param {Array} xmlFiles - Array of XML files with name and content properties
     * @returns {Object} - Mapping of query IDs to query definitions
     */
    function parseQueryDefinitions(xmlFiles) {
        const queryDefinitions = {};

        // Simple XML parsing for demonstration purposes
        for (const file of xmlFiles) {
            const content = file.content;

            // Match query definitions in MyBatis XML
            const queryRegex = /<(select|insert|update|delete)\s+id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/g;

            let match;
            while ((match = queryRegex.exec(content)) !== null) {
                const queryType = match[1]; // select, insert, update, or delete
                const queryId = match[2];
                const querySql = match[3].trim();

                queryDefinitions[queryId] = {
                    type: queryType,
                    sql: querySql,
                    file: file.name
                };
            }
        }

        return queryDefinitions;
    }

    /**
     * Parse Java bean files to extract method information
     * @param {Array} javaFiles - Array of Java files with name and content properties
     * @returns {Object} - Mapping of bean method names to method definitions
     */
    function parseJavaBeans(javaFiles) {
        const beanMethods = {};

        for (const file of javaFiles) {
            const content = file.content;
            console.log(content);
            console.log("====>");
            let methods = parseJavaMethods(content);
            console.log(methods);

            // Extract class annotation to identify Spring beans
            const classAnnotationMatch = content.match(/@(Controller|Service|Component|Repository)(?:\([^)]*\))?\s+(?:public\s+)?class\s+(\w+)/);

            if (classAnnotationMatch) {
                const beanType = classAnnotationMatch[1];
                const beanName = classAnnotationMatch[2];

                // First, find method starting positions
                const methodPattern = /@(?:RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|Transactional)(?:\([^)]*\))?\s+(?:public|protected|private)\s+(?:<[^>]+>\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/g;

                let methodMatch;
                const methodStarts = [];

                while ((methodMatch = methodPattern.exec(content)) !== null) {
                    methodStarts.push({
                        returnType: methodMatch[1],
                        methodName: methodMatch[2],
                        startPos: methodMatch.index
                    });
                }

                // Now for each method start, find the complete method body
                for (const method of methodStarts) {
                    // Search for the opening parenthesis of parameters
                    const paramStartPos = content.indexOf('(', method.startPos);
                    if (paramStartPos === -1) continue;

                    // Find the matching closing parenthesis
                    let paramEndPos = paramStartPos + 1;
                    let parenCount = 1;

                    while (parenCount > 0 && paramEndPos < content.length) {
                        if (content[paramEndPos] === '(') parenCount++;
                        if (content[paramEndPos] === ')') parenCount--;
                        paramEndPos++;
                    }

                    if (parenCount !== 0) continue; // Malformed method

                    // Extract parameters
                    const paramsText = content.substring(paramStartPos + 1, paramEndPos - 1).trim();
                    const parameters = paramsText.split(',').map(p => p.trim()).filter(p => p);

                    // Now find the opening brace of the method body
                    const bodyStartPos = content.indexOf('{', paramEndPos);
                    if (bodyStartPos === -1) continue;

                    // Find the matching closing brace
                    let bodyEndPos = bodyStartPos + 1;
                    let braceCount = 1;

                    while (braceCount > 0 && bodyEndPos < content.length) {
                        if (content[bodyEndPos] === '{') braceCount++;
                        if (content[bodyEndPos] === '}') braceCount--;
                        bodyEndPos++;
                    }

                    if (braceCount !== 0) continue; // Malformed method

                    // Extract the complete method from beginning to end
                    const methodStart = content.lastIndexOf('@', method.startPos);
                    const fullMethod = content.substring(methodStart, bodyEndPos);

                    // Extract just the annotation part
                    const annotationEndPos = content.indexOf('\n', methodStart);
                    const annotation = content.substring(methodStart, annotationEndPos);

                    // Create unique key for bean method
                    const key = `${beanName}.${method.methodName}`;

                    beanMethods[key] = {
                        beanName: beanName,
                        beanType: beanType,
                        methodName: method.methodName,
                        returnType: method.returnType,
                        parameters: parameters,
                        fullImplementation: fullMethod,
                        annotation: annotation,
                        file: file.name
                    };
                }
            }
        }

        return beanMethods;
    }

    function generateServiceDetails(serviceCall, serviceMappings, queryDefinitions, beanMethods) {
        if (!serviceCall || !serviceCall.svcId) {
            return '<p>No detailed information available for this service call.</p>';
        }

        const svcId = serviceCall.svcId;
        const mapping = serviceMappings[svcId];

        if (!mapping) {
            return `
           <div class="service-detail-card">
               <div class="service-detail-header">
                   <h4>Backend Implementation</h4>
               </div>
               <div class="service-detail-content">
                   <p class="no-data-message">No backend mapping found for service ID: ${escapeHtml(svcId)}</p>
               </div>
           </div>
       `;
        }

        let implementationContent = '';

        if (mapping.type === 'query' && mapping.queryIds.length > 0) {
            // SQL Implementation
            implementationContent = `
           <div class="implementation-type">
               <span class="implementation-badge sql">SQL Query</span>
           </div>
           <div class="query-list">
               ${mapping.queryIds.map(queryId => {
                const query = queryDefinitions[queryId];
                if (query) {
                    // Apply syntax highlighting to SQL
                    const highlightedSql = applySqlSyntaxHighlighting(query.sql);

                    return `
                           <div class="query-detail-card">
                               <div class="query-header">
                                   <div class="query-title">
                                       <span class="query-type-badge ${query.type}">${query.type.toUpperCase()}</span>
                                       <h5>${queryId}</h5>
                                   </div>
                                   <div class="query-file">${query.file}</div>
                               </div>
                               <div class="code-block sql-code with-line-numbers">
                                   <button class="copy-button" onclick="copyToClipboard(this)">Copy</button>
                                   <pre><code>${highlightedSql}</code></pre>
                               </div>
                           </div>
                       `;
                } else {
                    return `<p class="query-not-found">Query definition for ID "${queryId}" not found.</p>`;
                }
            }).join('')}
           </div>
       `;
        } else if (mapping.beanName && mapping.methodName) {
            // Java Bean Implementation
            const methodKey = `${mapping.beanName}.${mapping.methodName}`;
            const method = beanMethods[methodKey];

            implementationContent = `
           <div class="implementation-type">
               <span class="implementation-badge java">Java Method</span>
           </div>
           <div class="bean-detail-card">
               <div class="bean-header">
                   <div class="bean-title">
                       <h5>${mapping.beanName}.${mapping.methodName}()</h5>
                       ${method ? `<span class="bean-type-badge">${method.beanType}</span>` : ''}
                   </div>
                   ${method ? `<div class="bean-file">${method.file}</div>` : ''}
               </div>
               ${method ? `
               <div class="bean-details">
                   <div class="method-implementation">
                       <div class="code-block java-code with-line-numbers">
                           <button class="copy-button" onclick="copyToClipboard(this)">Copy</button>
                           <pre><code>${method.fullImplementation ? applyJavaSyntaxHighlighting(method.fullImplementation) : '// Implementation not available'}</code></pre>
                       </div>
                   </div>
               </div>
               ` : '<p class="method-not-found">Method details not found.</p>'}
           </div>
           
           ${method && method.relatedMethods && method.relatedMethods.length > 0 ? `
           <div class="related-methods">
               <h6>Related Methods</h6>
               <div class="related-method-list">
                   ${method.relatedMethods.map(relatedMethod => `
                       <div class="related-method-item">
                           <div class="related-method-name">${relatedMethod.name}</div>
                           <div class="related-method-signature">${relatedMethod.signature}</div>
                       </div>
                   `).join('')}
               </div>
           </div>
           ` : ''}
       `;
        }

        // Project metadata as a collapsed section
        const metadataSection = `
       <details class="metadata-details">
           <summary>Project Structure Metadata</summary>
           <div class="metadata-content">
               <p><strong>Project:</strong> ${mapping.projectId}</p>
               <p><strong>Module:</strong> ${mapping.moduleId}</p>
               <p><strong>Program:</strong> ${mapping.programId}</p>
               <p><strong>Page:</strong> ${mapping.pageId}</p>
           </div>
       </details>
   `;

        return `
       <div class="service-details">
           <h3>Backend Implementation</h3>
           <div class="service-implementation">
               ${implementationContent}
           </div>
           ${metadataSection}
       </div>
   `;
    }

    // Simple SQL syntax highlighting function
    function applySqlSyntaxHighlighting(sql) {
        if (!sql) return '';

        // Escape HTML first
        let highlighted = escapeHtml(sql);

        // SQL keywords
        const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
            'ON', 'GROUP', 'ORDER', 'BY', 'HAVING', 'INSERT', 'UPDATE', 'DELETE',
            'INTO', 'VALUES', 'SET', 'NULL', 'NOT', 'AND', 'OR', 'AS', 'UNION',
            'ALL', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IS', 'IN'];

        // Functions
        const functions = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'COALESCE', 'SUBSTRING', 'TO_CHAR', 'TO_DATE', 'NVL'];

        // Apply keyword highlighting
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlighted = highlighted.replace(regex, match => `<span class="keyword">${match}</span>`);
        });

        // Apply function highlighting
        functions.forEach(func => {
            const regex = new RegExp(`\\b${func}\\b\\s*\\(`, 'gi');
            highlighted = highlighted.replace(regex, match => {
                return match.replace(new RegExp(`\\b${func}\\b`, 'i'),
                    `<span class="function">${match.match(new RegExp(`\\b${func}\\b`, 'i'))[0]}</span>`);
            });
        });

        // Highlight strings
        highlighted = highlighted.replace(/'([^']*)'/g, `'<span class="string">$1</span>'`);

        // Highlight numbers
        highlighted = highlighted.replace(/\b(\d+)\b/g, `<span class="number">$1</span>`);

        // Highlight comments
        highlighted = highlighted.replace(/--(.*)$/gm, `<span class="comment">--$1</span>`);

        return highlighted;
    }

    function applyJavaSyntaxHighlighting(java) {
        if (!java) return '';

        // Escape HTML first
        let highlighted = escapeHtml(java);

        // Java keywords
        const keywords = [
            'public', 'private', 'protected', 'class', 'interface', 'enum', 'extends',
            'implements', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
            'break', 'continue', 'new', 'try', 'catch', 'finally', 'throw', 'throws', 'this',
            'super', 'static', 'final', 'void', 'null', 'true', 'false', 'import', 'package'
        ];

        // Types
        const types = [
            'String', 'int', 'long', 'double', 'float', 'boolean', 'byte', 'char', 'short',
            'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Byte', 'Character', 'Short',
            'List', 'Map', 'Set', 'Collection', 'ArrayList', 'HashMap', 'Object'
        ];

        // Highlight annotations first (they may contain parentheses which could interfere with other patterns)
        highlighted = highlighted.replace(/@\w+(\([^)]*\))?/g, match => `<span class="annotation">${match}</span>`);

        // Apply keyword highlighting
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
        });

        // Apply type highlighting
        types.forEach(type => {
            const regex = new RegExp(`\\b${type}\\b`, 'g');
            highlighted = highlighted.replace(regex, `<span class="type">${type}</span>`);
        });

        // Highlight method names (after return type and before parentheses)
        highlighted = highlighted.replace(/(\s+)(\w+)(\s*\()/g, (match, space, name, paren) => {
            return `${space}<span class="function">${name}</span>${paren}`;
        });

        // Highlight strings
        highlighted = highlighted.replace(/"([^"]*)"/g, `"<span class="string">$1</span>"`);

        // Highlight numbers
        highlighted = highlighted.replace(/\b(\d+)\b/g, `<span class="number">$1</span>`);

        // Highlight comments
        highlighted = highlighted.replace(/\/\/(.*)$/gm, `<span class="comment">//$1</span>`);
        highlighted = highlighted.replace(/\/\*([\s\S]*?)\*\//g, `<span class="comment">/*$1*/</span>`);

        return highlighted;
    }

    // Copy to clipboard function (add to your script)
    function copyToClipboard(button) {
        const pre = button.nextElementSibling;
        const code = pre.textContent;

        navigator.clipboard.writeText(code).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.backgroundColor = '#d1fae5';
            button.style.borderColor = '#059669';
            button.style.color = '#059669';

            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
                button.style.borderColor = '';
                button.style.color = '';
            }, 2000);
        });
    }

    /**
     * Helper function to escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    function escapeHtml(text) {
        if (!text) return '';

        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return text.toString().replace(/[&<>"']/g, function (m) {
            return map[m];
        });
    }

    function parseJavaMethods(javaCode) {
        // Xóa comments để tránh ảnh hưởng đến regex
        javaCode = javaCode.replace(/\/\*[\s\S]*?\*\//g, '');
        javaCode = javaCode.replace(/\/\/.*/g, '');

        const methodRegex = /(@Transactional\([^)]*\)|@Transactional)?\s*public\s+([\w<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
        const methods = [];
        let match;

        while ((match = methodRegex.exec(javaCode)) !== null) {
            const startIdx = match.index; // Bắt đầu từ đầu phương thức
            let braceCount = 1;
            let endIdx = startIdx + match[0].length; // Bỏ qua phần đã match trước đó

            // Tìm điểm kết thúc của method
            while (braceCount > 0 && endIdx < javaCode.length) {
                const char = javaCode[endIdx];
                if (char === '{') braceCount++;
                else if (char === '}') braceCount--;
                endIdx++;
            }

            // Lấy toàn bộ nội dung method
            const fullMethod = javaCode.substring(startIdx, endIdx).trim();

            methods.push({
                fullMethod: fullMethod, // Trả về toàn bộ method
                annotation: match[1]?.trim() || '',
                returnType: match[2].trim(),
                methodName: match[3].trim(),
                parameters: match[4].trim()
            });
        }

        return methods;
    }

    function extractMethodsFromJavaFile(fileContent) {
        // Biểu thức chính quy để tìm các method
        const methodRegex = /(?:@\w+\s*)*(?:public|private|protected)\s+[\w<>]+\s+\w+\s*\([^)]*\)\s*{([\s\S]*?)}/g;

        let match;
        const methods = [];

        // Tìm và trích xuất các method
        while ((match = methodRegex.exec(fileContent)) !== null) {
            console.log("######### " + match[1]);
            // Trích xuất toàn bộ method (bao gồm signature và body)
            const fullMethod = match[0];

            // Trích xuất signature
            const signatureMatch = fullMethod.match(/(?:@\w+\s*)*(?:public|private|protected)\s+[\w<>]+\s+\w+\s*\([^)]*\)/);
            const signature = signatureMatch ? signatureMatch[0] : '';

            // Trích xuất body method
            const bodyMatch = fullMethod.match(/{([\s\S]*?)}/);
            const body = bodyMatch ? bodyMatch[1].trim() : '';

            methods.push({
                fullMethod: fullMethod,
                signature: signature,
                body: body
            });
        }

        return methods;
    }

    // Public API
    return {
        parseServiceMappings,
        parseQueryDefinitions,
        parseJavaBeans,
        generateServiceDetails,
        escapeHtml
    };
})();