function levenshteinDistance(s1, s2) {
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const matrix = Array(s1.length + 1).fill().map(() => Array(s2.length + 1).fill(0));

    for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[s1.length][s2.length];
}

function calculateSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 100;
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return Math.round((1 - distance / maxLength) * 100);
}

// Main application code
class StringExtractor {
    constructor() {
        this.stringsData = [];
        this.selectedFile = null;
        this.minSimilarity = 70;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.elements = {
            folderInput: document.getElementById('folderInput'),
            fileList: document.getElementById('fileList'),
            stringContent: document.getElementById('stringContent'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            searchInput: document.getElementById('searchInput'),
            similaritySlider: document.getElementById('similaritySlider'),
            similarityValue: document.getElementById('similarityValue'),
            wordsList: document.getElementById('wordsList'),
            filesList: document.getElementById('filesList'),
            filesSearchTerms: document.getElementById('filesSearchTerms'),
            processWords: document.getElementById('processWords'),
            processFiles: document.getElementById('processFiles'),
            tabs: document.querySelectorAll('.tab')
        };
    }

    setupEventListeners() {
        this.elements.folderInput.addEventListener('change', e => this.handleFolderSelect(e));
        this.elements.searchInput.addEventListener('input', () => this.updateStringContent());
        this.elements.similaritySlider.addEventListener('input', e => {
            this.minSimilarity = parseInt(e.target.value);
            this.elements.similarityValue.textContent = this.minSimilarity;
        });
        this.elements.processWords.addEventListener('click', () => this.processWordsList());
        this.elements.processFiles.addEventListener('click', () => this.processFilesList());
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });
    }

    async handleFolderSelect(event) {
        this.elements.loadingSpinner.style.display = 'block';
        this.stringsData = [];
        const files = Array.from(event.target.files);

        for (const file of files) {
            if (file.type.includes('text') || file.name.match(/\.(js|html|css|txt|json|xml|xfdl|xjs|xadl)$/i)) {
                try {
                    const content = await file.text();
                    this.extractStrings(content, file.name);
                } catch (error) {
                    console.error(`Error reading file ${file.name}:`, error);
                }
            }
        }

        this.updateFileList();
        this.elements.loadingSpinner.style.display = 'none';
    }

    extractStrings(content, fileName) {
        const lines = content.split('\n');
        
        const patterns = {
            // Basic strings
            normalString: /(['"])((?:\\\1|(?!\1).)*)\1/g,
            
            // UI Component Properties
            componentProps: {
                regex: /(?:text|value|tooltiptext|expr|caption|title)=(['"])((?:\\\1|(?!\1).)*)\1/gi,
                type: 'Component Property'
            },
            
            // Dataset Properties
            datasetProps: {
                regex: /(?:columnid|colid|keystring|constcolumn|filterstr)=(['"])((?:\\\1|(?!\1).)*)\1/gi,
                type: 'Dataset Property'
            },
            
            // Language Resources
            langResource: {
                regex: /\.set\(['"](\w+)['"]\s*,\s*['"]((?:\\\2|(?!\2).)*)\2\)/g,
                type: 'Language Resource'
            },
            
            // Messages and Alerts
            messages: {
                regex: /(?:gfn_getMessage|gfn_alert|gfn_confirm)\(['"](\w+)['"](?:\s*,\s*['"]((?:\\\2|(?!\2).)*)\2)?\)/g,
                type: 'Message'
            },
            
            // SQL Queries
            sqlQueries: {
                regex: /(?:SELECT|INSERT|UPDATE|DELETE)(?:[^;]|\\;)*?(?:;|$)/gi,
                type: 'SQL Query'
            },
            
            // Event Handlers
            eventHandlers: {
                regex: /(?:onclick|ondblclick|onkeydown|onkeyup|onsetfocus|onkillfocus|onchanged)=(['"])((?:\\\1|(?!\1).)*)\1/gi,
                type: 'Event Handler'
            },
            
            // Bind Items
            bindItems: {
                regex: /(?:bind|innerdataset|codecolumn|datacolumn)=(['"])((?:\\\1|(?!\1).)*)\1/gi,
                type: 'Bind Item'
            },
            
            // Object References
            objectRefs: {
                regex: /(?:targetview|targetcomp|fromobject|toobject)=(['"])((?:\\\1|(?!\1).)*)\1/gi,
                type: 'Object Reference'
            },
            
            // Function Calls
            functionCalls: {
                regex: /(?:this\.|\w+\.)?(?:lookup|findRow|getCaseCount|getRowType)\(['"]([^'"]+)['"]\)/g,
                type: 'Function Call'
            }
        };

        lines.forEach((line, lineIndex) => {
            Object.entries(patterns).forEach(([patternName, pattern]) => {
                const regex = pattern.regex || pattern;
                const type = pattern.type || patternName;
                
                let match;
                while ((match = (regex).exec(line)) !== null) {
                    let string;
                    let category = '';
                    
                    // Extract string based on pattern type
                    switch(type) {
                        case 'Component Property':
                            string = match[2];
                            category = match[0].split('=')[0].trim();
                            break;
                        case 'Dataset Property':
                            string = match[2];
                            category = 'Dataset: ' + match[0].split('=')[0].trim();
                            break;
                        case 'Language Resource':
                            string = match[2] || match[1];
                            category = 'Lang Resource';
                            break;
                        case 'Message':
                            string = match[1];
                            category = 'Message/Alert';
                            break;
                        case 'SQL Query':
                            string = match[0].trim();
                            category = 'SQL';
                            break;
                        case 'Event Handler':
                            string = match[2];
                            category = 'Event: ' + match[0].split('=')[0].trim();
                            break;
                        case 'Bind Item':
                            string = match[2];
                            category = 'Binding: ' + match[0].split('=')[0].trim();
                            break;
                        case 'Object Reference':
                            string = match[2];
                            category = 'Object Ref';
                            break;
                        case 'Function Call':
                            string = match[1];
                            category = 'Function';
                            break;
                        default:
                            string = match[2] || match[1] || match[0];
                            category = 'General';
                    }

                    if (string && string.trim()) {
                        this.stringsData.push({
                            value: string.trim(),
                            fileName: fileName,
                            lineNumber: lineIndex + 1,
                            columnStart: match.index + 1,
                            columnEnd: match.index + match[0].length,
                            type: type,
                            category: category,
                            originalMatch: match[0]
                        });
                        console.log(this.stringsData);
                    }
                }
            });
        });
    }

    switchTab(selectedTab) {
        this.elements.tabs.forEach(tab => tab.classList.remove('active'));
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => panel.classList.remove('active'));
        
        selectedTab.classList.add('active');
        const targetPanel = document.getElementById(selectedTab.dataset.panel);
        if (targetPanel) targetPanel.classList.add('active');
    }

    processWordsList() {
        const words = this.elements.wordsList.value.trim().split('\n').filter(w => w.trim());
        if (words.length === 0) return;

        const results = words.map(word => {
            const matches = this.stringsData
                .map(item => ({
                    ...item,
                    similarity: calculateSimilarity(word, item.value)
                }))
                .filter(match => match.similarity >= this.minSimilarity)
                .sort((a, b) => b.similarity - a.similarity);

            return { word, matches };
        }).filter(result => result.matches.length > 0);

        this.displayWordResults(results);
    }

    displayWordResults(results) {
        console.log(results);
        if (results.length === 0) {
            this.elements.stringContent.innerHTML = '<div class="no-matches">No matches found</div>';
            return;
        }

        this.elements.stringContent.innerHTML = results.map(result => `
            <div class="string-card">
                <div class="string-card-header">
                    <strong>${match.category}</strong>
                    <div class="string-meta">
                        <span>Type: ${match.type}</span>
                        <span class="similarity-badge ${this.getSimilarityClass(match.similarity)}">${match.similarity}% match</span>
                    </div>
                </div>
                <div class="string-value">${match.value}</div>
                <div class="string-meta">
                    <span>File: ${match.fileName}</span>
                    <span>Line: ${match.lineNumber}</span>
                    <span>Original: ${match.originalMatch}</span>
                </div>
            </div>
        `).join('');
    }

    processFilesList() {
        const files = this.elements.filesList.value.trim().split('\n').filter(f => f.trim());
        const searchTerms = this.elements.filesSearchTerms.value.trim().split('\n').filter(t => t.trim());
        const exactMatch = document.getElementById('exactMatch').checked;
        const caseSensitive = document.getElementById('caseSensitive').checked;

        if (files.length === 0 || searchTerms.length === 0) {
            this.elements.stringContent.innerHTML = '<div class="no-matches">Please enter both files and search terms</div>';
            return;
        }

        // Tổ chức kết quả theo search term - bao gồm cả terms không có matches
        const results = searchTerms.map(term => {
            // Chỉ lấy các files được liệt kê
            const listedFiles = this.stringsData.filter(item => 
                files.some(pattern => pattern === item.fileName)
            );

            // Tính similarity cho tất cả strings trong listed files và lọc theo minimum similarity
            const matchingStrings = listedFiles
                .map(item => ({
                    ...item,
                    similarity: exactMatch ? 
                        (caseSensitive ? 
                            (item.value.includes(term) ? 100 : 0) : 
                            (item.value.toLowerCase().includes(term.toLowerCase()) ? 100 : 0)
                        ) : 
                        calculateSimilarity(term, item.value)
                }))
                .filter(item => item.similarity >= this.minSimilarity);

            // Nhóm các strings theo filename
            const matchesByFile = {};
            matchingStrings.forEach(item => {
                if (!matchesByFile[item.fileName]) {
                    matchesByFile[item.fileName] = [];
                }
                matchesByFile[item.fileName].push(item);
            });

            return {
                searchTerm: term,
                matchesByFile: matchesByFile,
                hasMatches: Object.keys(matchesByFile).length > 0
            };
        });

        this.displayFileResults(results);
    }

    getSimilarityClass(similarity) {
        if (similarity >= 90) return 'similarity-very-high';
        if (similarity >= 70) return 'similarity-high';
        if (similarity >= 50) return 'similarity-medium';
        return 'similarity-low';
    }

    displayFileResults(results) {
        if (results.length === 0) {
            this.elements.stringContent.innerHTML = '<div class="no-matches">Please enter search terms</div>';
            return;
        }

        this.elements.stringContent.innerHTML = results.map(result => {
            const headerContent = `
                <div class="string-card-header">
                    <strong>"${result.searchTerm}"</strong>
                    <span class="string-count">${
                        result.hasMatches 
                        ? `${Object.values(result.matchesByFile).reduce((sum, matches) => sum + matches.length, 0)} matches in ${Object.keys(result.matchesByFile).length} files` 
                        : '0 matches'
                    }</span>
                </div>
            `;

            if (!result.hasMatches) {
                return `
                    <div class="string-card no-matches">
                        ${headerContent}
                        <div class="no-matches-message">
                            No strings found with similarity >= ${this.minSimilarity}% in the specified files
                        </div>
                    </div>
                `;
            }

            return `
                <div class="string-card">
                    ${headerContent}
                    ${Object.entries(result.matchesByFile).map(([fileName, matches]) => `
                        <div class="match-item">
                            <div class="file-header">
                                <strong>File: ${fileName}</strong>
                                <span class="string-count">${matches.length} matches</span>
                            </div>
                            ${matches
                                .sort((a, b) => b.similarity - a.similarity)
                                .map(match => `
                                    <div class="match-wrapper">
                                        <div class="match-content">
                                            <div class="string-value">${this.highlightTerms(match.value, [result.searchTerm])}</div>
                                            <span class="similarity-badge ${this.getSimilarityClass(match.similarity)}">${match.similarity}%</span>
                                        </div>
                                        <div class="match-metadata">
                                            Line: ${match.lineNumber} • Column: ${match.columnStart}-${match.columnEnd}
                                        </div>
                                    </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    }

    highlightTerms(text, terms) {
        let result = text;
        const exactMatch = document.getElementById('exactMatch').checked;
        const caseSensitive = document.getElementById('caseSensitive').checked;

        terms.forEach(term => {
            if (exactMatch) {
                const regex = caseSensitive 
                    ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
                    : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                result = result.replace(regex, `<span class="term-occurrence">$&</span>`);
            }
        });

        return result;
    }

    updateFileList() {
        const fileGroups = {};
        this.stringsData.forEach(item => {
            if (!fileGroups[item.fileName]) {
                fileGroups[item.fileName] = [];
            }
            fileGroups[item.fileName].push(item);
        });

        this.elements.fileList.innerHTML = Object.entries(fileGroups)
            .map(([fileName, strings]) => `
                <div class="file-list-item ${fileName === this.selectedFile ? 'active' : ''}"
                     onclick="app.selectFile('${fileName}')">
                    <span>${fileName}</span>
                    <span class="string-count">${strings.length}</span>
                </div>
            `).join('');

        if (!this.selectedFile && Object.keys(fileGroups).length > 0) {
            this.selectedFile = Object.keys(fileGroups)[0];
            this.updateStringContent();
        }
    }

    selectFile(fileName) {
        this.selectedFile = fileName;
        this.updateFileList();
        this.updateStringContent();
    }

    updateStringContent() {
        if (!this.selectedFile) return;

        const searchTerm = this.elements.searchInput.value.toLowerCase();
        const fileStrings = this.stringsData.filter(item => 
            item.fileName === this.selectedFile &&
            (!searchTerm || item.value.toLowerCase().includes(searchTerm))
        );

        if (fileStrings.length === 0) {
            this.elements.stringContent.innerHTML = '<div class="no-matches">No strings found</div>';
            return;
        }

        const content = fileStrings.map(item => `
            <div class="string-card">
                <div class="string-value">${this.highlightSearchTerm(item.value, searchTerm)}</div>
                <div class="string-meta">
                    <span>Line: ${item.lineNumber}</span>
                    ${item.category ? `<span class="string-tag">${item.category}</span>` : ''}
                    ${item.type ? `<span class="string-tag">${item.type}</span>` : ''}
                </div>
            </div>
        `).join('');

        this.elements.stringContent.innerHTML = content;
    }

// Hàm hỗ trợ highlight từ khóa tìm kiếm
highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}
}

// Initialize the application
const app = new StringExtractor();