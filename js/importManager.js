/**
 * Module quản lý import dữ liệu dự án từ file
 */
const ImportManager = (function () {
    /**
     * Import dữ liệu dự án từ file JSON
     * @param {Function} callback - Hàm callback được gọi khi import hoàn tất, nhận dữ liệu đã import làm tham số
     */
    function importProjectData(callback) {
        // Tạo input file tạm thời để chọn file
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        // Xử lý khi chọn file
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const reader = new FileReader();

                reader.onload = function(e) {
                    try {
                        // Parse nội dung file thành đối tượng JSON
                        const importedData = JSON.parse(e.target.result);

                        // Kiểm tra dữ liệu hợp lệ
                        if (!validateImportedData(importedData)) {
                            throw new Error('Dữ liệu không đúng định dạng');
                        }

                        // Chuyển đổi dữ liệu về định dạng phù hợp với ứng dụng
                        const processedData = processImportedData(importedData);

                        // Gọi callback với dữ liệu đã xử lý
                        if (callback && typeof callback === 'function') {
                            callback(processedData);
                        }
                    } catch (error) {
                        console.error('Lỗi khi đọc file:', error);
                        alert('Không thể import dữ liệu: ' + error.message);
                    }

                    // Dọn dẹp
                    document.body.removeChild(fileInput);
                };

                reader.onerror = function() {
                    alert('Không thể đọc file');
                    document.body.removeChild(fileInput);
                };

                // Đọc file dưới dạng text
                reader.readAsText(file);
            } else {
                document.body.removeChild(fileInput);
            }
        });

        // Kích hoạt hộp thoại chọn file
        fileInput.click();
    }

    /**
     * Kiểm tra dữ liệu đã import có hợp lệ không
     * @param {Object} data - Dữ liệu đã import
     * @returns {boolean} - true nếu dữ liệu hợp lệ
     */
    function validateImportedData(data) {
        // Kiểm tra cấu trúc dữ liệu cơ bản
        if (!data || !data.screens || !Array.isArray(data.screens)) {
            return false;
        }

        // Kiểm tra các màn hình có cấu trúc đúng không
        for (const screen of data.screens) {
            if (!screen.id || !screen.name) {
                return false;
            }
        }

        return true;
    }

    /**
     * Xử lý dữ liệu đã import để phù hợp với cấu trúc ứng dụng
     * @param {Object} importedData - Dữ liệu đã import
     * @returns {Object} - Dữ liệu đã xử lý
     */
    function processImportedData(importedData) {
        // Tạo đối tượng projectData phù hợp với cấu trúc ứng dụng
        const projectData = {
            projectName: importedData.projectName || 'Imported Project',
            screens: importedData.screens.map(screen => ({
                id: screen.id,
                name: screen.name,
                path: screen.path || screen.id,
                size: screen.size || 0,
                lastModified: screen.lastModified || new Date().toLocaleString(),
                popupCalls: screen.popupCalls || [],
                serviceCalls: screen.serviceCalls || []
            })),
            formFiles: importedData.screens.map(screen => `${screen.id}.xfdl`),
            isImported: true // Đánh dấu dữ liệu là đã import
        };

        return projectData;
    }

    return {
        importProjectData
    };
})();