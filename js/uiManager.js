/**
 * Module quản lý hiển thị giao diện người dùng
 */
const UIManager = (function () {
    // Tham chiếu đến các phần tử DOM
    const screenList = document.getElementById('screenList');
    const screenDetails = document.getElementById('screenDetails');

    // Dữ liệu màn hình hiện tại
    let currentScreenData = null;
    let currentProjectData = null;
    let selectedScreenId = null;

    /**
     *
     * @param {Object} screenData
     * @param {Object} projectData
     */
    function displayScreenList(screenData, projectData) {
        currentScreenData = screenData;
        currentProjectData = projectData;
        screenList.innerHTML = '';

        // Sắp xếp màn hình theo tên
        const sortedScreens = [...screenData.screens].sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        // Tạo phần tử cho từng màn hình
        sortedScreens.forEach(screen => {
            const screenItem = document.createElement('div');
            screenItem.className = 'screen-item';
            screenItem.dataset.screenId = screen.id;
            screenItem.innerHTML = `
                <div class="screen-name">${screen.name}</div>
                <div class="screen-popup-count">
                    <small>${screen.childScreens.length} popup calls</small>
                </div>
            `;

            // Xử lý sự kiện khi click vào màn hình
            screenItem.addEventListener('click', function () {
                selectScreen(screen.id);
            });

            screenList.appendChild(screenItem);
        });

        // Nếu có màn hình, chọn màn hình đầu tiên
        if (sortedScreens.length > 0) {
            selectScreen(sortedScreens[0].id);
        }
    }

    /**
     * Lọc danh sách màn hình theo từ khóa tìm kiếm
     * @param {string} query - Từ khóa tìm kiếm
     */
    function filterScreenList(query) {
        const screenItems = screenList.querySelectorAll('.screen-item');

        screenItems.forEach(item => {
            const screenName = item.querySelector('.screen-name').textContent.toLowerCase();

            if (screenName.includes(query)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Chọn và hiển thị chi tiết một màn hình
     * @param {string} screenId - ID màn hình cần chọn
     */
    function selectScreen(screenId) {
        // Bỏ chọn màn hình trước đó
        const previousSelected = screenList.querySelector('.screen-item.active');
        if (previousSelected) {
            previousSelected.classList.remove('active');
        }

        // Đánh dấu màn hình đã chọn
        const selectedItem = screenList.querySelector(`.screen-item[data-screen-id="${screenId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
            // Cuộn đến phần tử đã chọn
            selectedItem.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }

        selectedScreenId = screenId;

        // Hiển thị chi tiết màn hình
        displayScreenDetails(screenId);

        // Cập nhật đồ thị
        GraphRenderer.updateGraph(screenId);
    }

    function showServiceCallModal(serviceCall) {
        // Get service mappings, query definitions, and bean methods from project data
        const serviceMappings = currentProjectData?.serviceMappings || {};
        const queryDefinitions = currentProjectData?.queryDefinitions || {};
        const beanMethods = currentProjectData?.beanMethods || {};

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'service-call-modal';

        // Create modal content
        modal.innerHTML = `
        <div class="service-call-modal-content">
            <div class="service-call-modal-header">
                <h3>Service Call: ${ServiceAnalyzer.escapeHtml(serviceCall.tranId)}</h3>
                <button class="modal-close-button">&times;</button>
            </div>
            <div class="service-call-properties">
                <p><strong>Transaction ID:</strong> ${ServiceAnalyzer.escapeHtml(serviceCall.tranId)}</p>
                <p><strong>Service ID:</strong> ${ServiceAnalyzer.escapeHtml(serviceCall.svcId || '-')}</p>
                <p><strong>Input Datasets:</strong> ${renderDatasets(serviceCall.inDss)}</p>
                <p><strong>Output Datasets:</strong> ${renderDatasets(serviceCall.outDs)}</p>
                <p><strong>Arguments:</strong> ${serviceCall.argvs ? `<span class="service-param">${ServiceAnalyzer.escapeHtml(serviceCall.argvs)}</span>` : '-'}</p>
                <p><strong>Callback:</strong> ${serviceCall.callback ? `<span class="service-param">${ServiceAnalyzer.escapeHtml(serviceCall.callback)}</span>` : '-'}</p>
                <p><strong>Async:</strong> ${serviceCall.async !== undefined ? (serviceCall.async ? 'Yes' : 'No') : '-'}</p>
            </div>
            ${ServiceAnalyzer.generateServiceDetails(serviceCall, serviceMappings, queryDefinitions, beanMethods)}
        </div>
    `;

        // Add to document
        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.modal-close-button').addEventListener('click', function () {
            document.body.removeChild(modal);
        });

        // Close modal when clicking outside content
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Hiển thị chi tiết màn hình
     * @param {string} screenId - ID màn hình cần hiển thị
     */
    function displayScreenDetails(screenId) {
        if (!currentScreenData || !currentScreenData.screenMap[screenId]) {
            screenDetails.innerHTML = '<h2>No screen information found</h2>';
            return;
        }

        const screen = currentScreenData.screenMap[screenId];
        const relatedScreens = ScreenAnalyzer.findRelatedScreens(screenId, currentScreenData);

        // Update tab content
        document.querySelector('.screen-info-content').innerHTML = renderScreenInfo(screen, relatedScreens);
        document.querySelector('.popup-calls-content').innerHTML = renderPopupCalls(screen.popupCalls);
        document.querySelector('.service-calls-content').innerHTML = renderServiceCalls(screen.serviceCalls);

        // Update screen title
        document.querySelector('#screen-info-tab h2').innerText = screen.name;

        // Add tab switching functionality
        setupTabs();

        // Add click events for related screens
        addRelatedScreensEvents();

        addServiceDetailsEvents();
    }

    /**
     * Render detailed service call information
     */
    function renderServiceCallDetails(serviceCall, serviceMappings, queryDefinitions, beanMethods) {
        if (!serviceCall || !serviceCall.svcId) {
            return '<p>No detailed information available for this service call.</p>';
        }

        const svcId = serviceCall.svcId;
        const mapping = serviceMappings[svcId];

        if (!mapping) {
            return `
            <div class="service-detail-section">
                <h4>Service ID: ${escapeHtml(svcId)}</h4>
                <p>No backend mapping found for this service ID.</p>
            </div>
        `;
        }

        let implementationDetails = '';

        if (mapping.type === 'query' && mapping.queryIds.length > 0) {
            // SQL Implementation
            implementationDetails = `
            <div class="service-detail-section">
                <h4>SQL Implementation</h4>
                <p><strong>Query IDs:</strong> ${mapping.queryIds.join(', ')}</p>
                ${mapping.queryIds.map(queryId => {
                const query = queryDefinitions[queryId];
                if (query) {
                    return `
                            <div class="query-detail">
                                <p><strong>Query ID:</strong> ${queryId}</p>
                                <p><strong>Type:</strong> ${query.type}</p>
                                <p><strong>File:</strong> ${query.file}</p>
                                <div class="code-block">
                                    <pre><code>${escapeHtml(query.sql)}</code></pre>
                                </div>
                            </div>
                        `;
                } else {
                    return `<p>Query definition for ID "${queryId}" not found.</p>`;
                }
            }).join('')}
            </div>
        `;
        } else if (mapping.beanName && mapping.methodName) {
            // Java Bean Implementation
            const methodKey = `${mapping.beanName}.${mapping.methodName}`;
            const method = beanMethods[methodKey];

            implementationDetails = `
            <div class="service-detail-section">
                <h4>Java Bean Implementation</h4>
                <p><strong>Bean:</strong> ${mapping.beanName}</p>
                <p><strong>Method:</strong> ${mapping.methodName}</p>
                ${method ? `
                    <div class="bean-detail">
                        <p><strong>Bean Type:</strong> ${method.beanType}</p>
                        <p><strong>Return Type:</strong> ${method.returnType}</p>
                        <p><strong>Parameters:</strong> ${method.parameters.length > 0 ? method.parameters.join(', ') : 'None'}</p>
                        <p><strong>File:</strong> ${method.file}</p>
                    </div>
                ` : '<p>Method details not found.</p>'}
            </div>
        `;
        }

        return `
        <div class="service-details">
            <h3>Service Implementation Details</h3>
            
            <div class="service-detail-section">
                <h4>Service Mapping</h4>
                <p><strong>Project:</strong> ${mapping.projectId}</p>
                <p><strong>Module:</strong> ${mapping.moduleId}</p>
                <p><strong>Program:</strong> ${mapping.programId}</p>
                <p><strong>Page:</strong> ${mapping.pageId}</p>
                <p><strong>Implementation Type:</strong> ${mapping.type === 'query' ? 'SQL Query' : 'Java Bean Method'}</p>
            </div>
            
            ${implementationDetails}
        </div>
    `;
    }

    function renderScreenInfo(screen, relatedScreens) {
        return `
        <div class="screen-info">
            <h3>Screen Information</h3>
            <p><strong>ID:</strong> ${screen.id}</p>
            <p><strong>Path:</strong> ${screen.path}</p>
            <p><strong>Size:</strong> ${formatFileSize(screen.size)}</p>
            <p><strong>Last Modified:</strong> ${screen.lastModified}</p>
            <p><strong>Popup Calls:</strong> ${screen.popupCalls.length}</p>
            <p><strong>Service Calls:</strong> ${screen.serviceCalls.length}</p>
        </div>
        
        <div class="related-screens">
            <h3>Parent Screens (${relatedScreens.parents.length})</h3>
            <div class="related-screens-list" id="parentScreens">
                ${renderRelatedScreens(relatedScreens.parents)}
            </div>
            
            <h3>Child Screens (${relatedScreens.children.length})</h3>
            <div class="related-screens-list" id="childScreens">
                ${renderRelatedScreens(relatedScreens.children)}
            </div>
        </div>
    `;
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.detail-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', function () {
                const tabId = this.dataset.tab;

                // Deactivate all tabs
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Activate selected tab
                this.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }


    /**
     * Tạo HTML cho danh sách màn hình liên quan
     * @param {Array} screens - Danh sách màn hình liên quan
     * @returns {string} - HTML danh sách màn hình
     */
    function renderRelatedScreens(screens) {
        if (!screens || screens.length === 0) {
            return '<p>Không có màn hình liên quan</p>';
        }

        return screens.map(screen => `
            <div class="related-screen" data-screen-id="${screen.id}">
                <div class="related-screen-name">${screen.id}</div>
                ${screen.popupId ? `<div class="related-screen-popup-id">Popup ID: ${screen.popupId}</div>` : ''}
            </div>
        `).join('');
    }

    /**
     * Tạo HTML cho danh sách cuộc gọi popup
     * @param {Array} popupCalls - Danh sách cuộc gọi popup
     * @returns {string} - HTML danh sách cuộc gọi
     */
    function renderPopupCalls(popupCalls) {
        if (!popupCalls || popupCalls.length === 0) {
            return '<p>Không có cuộc gọi popup</p>';
        }

        return `
            <div class="popup-calls-table">
                <table>
                    <thead>
                        <tr>
                            <th>Popup ID</th>
                            <th>Popup URL</th>
                            <th>Arguments</th>
                            <th>Callback</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${popupCalls.map(call => `
                            <tr>
                                <td>${escapeHtml(call.popupId)}</td>
                                <td>${escapeHtml(call.popupUrl)}</td>
                                <td><code>${escapeHtml(call.args)}</code></td>
                                <td><code>${escapeHtml(call.callback)}</code></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderServiceCalls(serviceCalls) {
        if (!serviceCalls || serviceCalls.length === 0) {
            return '<p>No service calls found in this screen</p>';
        }

        return `
        <div class="service-calls-table-container">
            <table class="service-calls-table">
                <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>Service ID</th>
                        <th>Input Datasets</th>
                        <th>Output Datasets</th>
                        <th>Arguments</th>
                        <th>Callback</th>
                        <th>Async</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${serviceCalls.map((call, index) => `
                        <tr>
                            <td>${escapeHtml(call.tranId)}</td>
                            <td>${call.type === 'direct' ? '-' : escapeHtml(call.svcId || '-')}</td>
                            <td>${renderDatasets(call.inDss)}</td>
                            <td>${renderDatasets(call.outDs)}</td>
                            <td>${call.type === 'direct' ? '-' :
            call.argvs ? `<span class="service-param">${escapeHtml(call.argvs)}</span>` : '-'}</td>
                            <td>${call.type === 'direct' ? '-' :
            call.callback ? `<span class="service-param">${escapeHtml(call.callback)}</span>` : '-'}</td>
                            <td>${call.type === 'direct' ? '-' :
            call.async !== undefined ? (call.async ? 'Yes' : 'No') : '-'}</td>
                            <td><button class="view-details-btn" data-service-index="${index}">Details</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    }

    function addServiceDetailsEvents() {
        const detailButtons = document.querySelectorAll('.view-details-btn');

        detailButtons.forEach(button => {
            button.addEventListener('click', function () {
                const serviceIndex = parseInt(this.dataset.serviceIndex);
                const screen = currentScreenData.screenMap[selectedScreenId];
                if (screen && screen.serviceCalls && screen.serviceCalls[serviceIndex]) {
                    showServiceCallModal(screen.serviceCalls[serviceIndex]);
                }
            });
        });
    }

    function renderDatasets(datasetsStr) {
        if (!datasetsStr || datasetsStr === '-') return '-';

        // Parse dataset string like "ds1=dsInput ds2=dsOutput"
        const datasetPairs = datasetsStr.split(/\s+/);

        return datasetPairs.map(pair => {
            return `<span class="ds-badge">${escapeHtml(pair)}</span>`;
        }).join(' ');
    }

    /**
     * Thêm sự kiện click cho các màn hình liên quan
     */
    function addRelatedScreensEvents() {
        const relatedScreenElements = screenDetails.querySelectorAll('.related-screen');

        relatedScreenElements.forEach(element => {
            element.addEventListener('click', function () {
                const screenId = this.dataset.screenId;
                selectScreen(screenId);
            });
        });
    }

    /**
     * Định dạng kích thước file
     * @param {number} bytes - Kích thước file tính bằng byte
     * @returns {string} - Kích thước file đã định dạng
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Escape HTML characters
     * @param {string} text - Văn bản cần escape
     * @returns {string} - Văn bản đã escape
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

    return {
        displayScreenList,
        filterScreenList,
        selectScreen
    };
})();