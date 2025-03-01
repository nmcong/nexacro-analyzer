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
    // Cập nhật cho parseJavaBeans trong serviceAnalyzer.js để sử dụng parseJavaMethods hiện có
    function parseJavaBeans(javaFiles) {
        const beanMethods = {};

        for (const file of javaFiles) {
            const content = file.content;

            // Trích xuất thông tin lớp để xác định Spring bean
            const classAnnotationMatch = content.match(/@(Controller|Service|Component|Repository|RestController)(?:\([^)]*\))?\s+(?:public\s+)?class\s+(\w+)/);

            if (classAnnotationMatch) {
                const beanType = classAnnotationMatch[1];
                const beanName = classAnnotationMatch[2];

                // Trích xuất package từ content
                const packageMatch = content.match(/package\s+([\w\.]+);/);
                const packageName = packageMatch ? packageMatch[1] : "";

                // Sử dụng hàm parseJavaMethods đã có
                const methods = parseJavaMethods(content);
                console.log(methods);

                // Tích hợp kết quả vào beanMethods
                methods.forEach(method => {
                    // Tạo khóa duy nhất cho bean method
                    const key = `${beanName}.${method.methodName}`;

                    // Chuyển đổi tham số từ chuỗi thành một mảng các đối tượng
                    const paramString = method.parameters || '';
                    const paramArray = paramString.split(',').filter(p => p.trim()).map(param => {
                        const parts = param.trim().split(/\s+/);
                        if (parts.length >= 2) {
                            return {
                                type: parts.slice(0, parts.length-1).join(' '),
                                name: parts[parts.length-1]
                            };
                        }
                        return { type: 'Unknown', name: param.trim() };
                    });

                    beanMethods[key] = {
                        beanName: beanName,
                        beanType: beanType,
                        methodName: method.methodName,
                        returnType: method.returnType,
                        packageName: packageName,
                        parameterString: method.parameters,
                        parameters: paramArray,
                        fullImplementation: method.fullMethod,
                        annotations: method.annotations,
                        file: file.name
                    };
                });
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
              <div class="method-info">
                  <h6>Method Information</h6>
                  <div class="bean-method-signature">
                      ${method.annotations ? `<div class="method-annotations">${escapeHtml(method.annotations)}</div>` : ''}
                      <div class="method-declaration">
                          <span class="return-type">${escapeHtml(method.returnType)}</span> 
                          <span class="method-name">${escapeHtml(method.methodName)}</span>(
                          <span class="parameters">${escapeHtml(method.parameterString || '')}</span>)
                      </div>
                  </div>
              </div>
              <div class="method-implementation">
                  <h6>Full Implementation</h6>
                  <div class="code-block java-code with-line-numbers">
                      <button class="copy-button" onclick="copyToClipboard(this)">Copy</button>
                      <pre><code>${method.fullMethod ? applyJavaSyntaxHighlighting(method.fullMethod) : '// Implementation not available'}</code></pre>
                  </div>
              </div>
              ${method.packageName ? `
              <div class="package-info">
                  <h6>Package</h6>
                  <div class="package-name">${escapeHtml(method.packageName)}</div>
              </div>
              ` : ''}
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
            ${mapping.beanName ? `<p><strong>Bean Name:</strong> ${mapping.beanName}</p>` : ''}
            ${mapping.methodName ? `<p><strong>Method Name:</strong> ${mapping.methodName}</p>` : ''}
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
        // Xóa comments để tránh ảnh hưởng regex
        javaCode = javaCode.replace(/\/\*[\s\S]*?\*\//g, '');
        javaCode = javaCode.replace(/\/\/.*/g, '');

        // Regex cải tiến: Bắt mọi annotation (không chỉ @Transactional)
        const methodRegex = /((?:@\w+(?:\([^)]*\))?\s*)*)\s*public\s+([\w<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)\s*{/g;
        const methods = [];
        let match;

        while ((match = methodRegex.exec(javaCode)) !== null) {
            const startIdx = match.index; // Bắt đầu từ annotation đầu tiên (nếu có)
            let braceCount = 1;
            let endIdx = startIdx + match[0].length;

            // Đếm số dấu {} để xác định body
            while (braceCount > 0 && endIdx < javaCode.length) {
                const char = javaCode[endIdx];
                if (char === '{') braceCount++;
                else if (char === '}') braceCount--;
                endIdx++;
            }

            // Lấy toàn bộ method (từ annotation đến })
            const fullMethod = javaCode.substring(startIdx, endIdx).trim();

            methods.push({
                fullMethod: fullMethod,
                annotations: match[1].trim(), // Tất cả annotation (nếu có)
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