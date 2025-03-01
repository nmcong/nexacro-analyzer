/**
 * Điểm khởi đầu cho ứng dụng. Quản lý tất cả các thành phần và tương tác.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Tham chiếu đến các phần tử DOM
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const loadButton = document.getElementById('loadButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const mainContent = document.getElementById('mainContent');
    const projectLoader = document.querySelector('.project-loader');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const cacheStatus = document.getElementById('cacheStatus');
    const searchInput = document.getElementById('searchInput');
    const selectedFolder = document.getElementById('selectedFolder');
    const folderName = document.getElementById('folderName');
    const fileCount = document.getElementById('fileCount');

    // Dữ liệu dự án hiện tại
    let currentProjectData = null;

    // Khởi tạo các module
    CacheManager.initialize();
    FolderManager.initialize(selectedFolder, folderName, fileCount);
    updateCacheStatus();

    // Nếu có dữ liệu trong bộ nhớ đệm, hiển thị nút để tải dữ liệu từ cache
    if (CacheManager.hasCache()) {
        const loadCacheButton = document.createElement('button');
        loadCacheButton.textContent = 'Tải dữ liệu từ bộ nhớ đệm';
        loadCacheButton.className = 'secondary-button';
        loadCacheButton.style.marginLeft = '10px';

        loadCacheButton.addEventListener('click', function () {
            const cachedData = CacheManager.loadFromCache();
            if (cachedData) {
                processProjectData(cachedData);
            }
        });

        loadButton.parentNode.insertBefore(loadCacheButton, loadButton.nextSibling);
    }

    // Xử lý sự kiện kéo và thả
    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function () {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        fileInput.files = e.dataTransfer.files;

        // Cập nhật thông tin folder
        FolderManager.updateFolderInfo(fileInput.files);
    });

    // Khi chọn file, cập nhật thông tin folder
    fileInput.addEventListener('change', function() {
        FolderManager.updateFolderInfo(this.files);
    });

    // Khi click vào khu vực tải lên, mở cửa sổ chọn thư mục
    uploadArea.addEventListener('click', function () {
        fileInput.click();
    });

    // Khi click vào nút tải
    loadButton.addEventListener('click', async function () {
        if (fileInput.files.length === 0) {
            alert('Vui lòng chọn thư mục dự án Nexacro');
            return;
        }

        loadingIndicator.classList.remove('hidden');
        loadButton.disabled = true;

        try {
            // Đọc và phân tích dự án
            const projectData = await NexacroFileReader.readProjectFiles(fileInput.files);
            processProjectData(projectData);

            // Lưu vào bộ nhớ đệm
            CacheManager.saveToCache(projectData);
            updateCacheStatus();
        } catch (error) {
            console.error('Lỗi khi đọc dự án:', error);
            alert('Có lỗi xảy ra khi đọc dự án: ' + error.message);
        } finally {
            loadingIndicator.classList.add('hidden');
            loadButton.disabled = false;
        }
    });

    // Xử lý xóa bộ nhớ đệm
    clearCacheBtn.addEventListener('click', function () {
        CacheManager.clearCache();
        updateCacheStatus();
    });

    // Xử lý xuất dữ liệu
    exportDataBtn.addEventListener('click', function () {
        if (!currentProjectData) {
            alert('Không có dữ liệu dự án để xuất');
            return;
        }

        ExportManager.exportProjectData(currentProjectData);
    });

    // Xử lý tìm kiếm
    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase();
        UIManager.filterScreenList(query);
    });

    // Trong phần document.addEventListener('DOMContentLoaded', function () {
    // Thêm tham chiếu đến nút import
    const importDataBtn = document.getElementById('importDataBtn');

    // Xử lý sự kiện import dữ liệu
    importDataBtn.addEventListener('click', function () {
        ImportManager.importProjectData(function(importedData) {
            if (importedData) {
                // Hiển thị thông báo thành công
                alert(`Đã import thành công dữ liệu dự án "${importedData.projectName}" với ${importedData.screens.length} màn hình.`);

                // Xử lý dữ liệu đã import
                processProjectData(importedData);

                // Tùy chọn: Lưu vào bộ nhớ đệm
                if (confirm('Bạn có muốn lưu dữ liệu đã import vào bộ nhớ đệm không?')) {
                    CacheManager.saveToCache(importedData);
                    updateCacheStatus();
                }
            }
        });
    });

    // Cập nhật trạng thái bộ nhớ đệm
    function updateCacheStatus() {
        if (CacheManager.hasCache()) {
            const cacheInfo = CacheManager.getCacheInfo();
            cacheStatus.textContent = `Bộ nhớ đệm: ${cacheInfo.screens} màn hình | Cập nhật lúc: ${cacheInfo.lastUpdated}`;
        } else {
            cacheStatus.textContent = 'Bộ nhớ đệm: Không có dữ liệu';
        }
    }

    // Xử lý dữ liệu dự án
    function processProjectData(projectData) {
        try {
            // Lưu dữ liệu dự án hiện tại
            currentProjectData = projectData;

            // Phân tích màn hình
            const screenData = ScreenAnalyzer.analyzeScreens(projectData);

            // Hiển thị danh sách màn hình
            UIManager.displayScreenList(screenData, projectData);

            // Ghi log thông tin debug
            console.log("Screens:", screenData.screens.length);
            console.log("Found relationships:", screenData.screens.reduce((sum, screen) =>
                sum + screen.childScreens.length, 0));
            console.log("Service calls:", screenData.screens.reduce((sum, screen) =>
                sum + (screen.serviceCalls ? screen.serviceCalls.length : 0), 0));

            // Ẩn loader và hiển thị nội dung chính
            projectLoader.classList.add('hidden');
            mainContent.classList.remove('hidden');

            // Khởi tạo đồ thị sau khi cập nhật DOM
            setTimeout(() => {
                GraphRenderer.initializeGraph(screenData);

                // Force resize sau một khoảng thời gian ngắn để đảm bảo hiển thị đúng
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 100);
            }, 50);
        } catch (error) {
            console.error("Error processing project data:", error);
            alert("An error occurred while analyzing the project: " + error.message);
        }
    }
});