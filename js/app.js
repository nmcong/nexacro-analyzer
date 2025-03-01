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
    const cacheStatus = document.getElementById('cacheStatus');
    const searchInput = document.getElementById('searchInput');

    // Khởi tạo bộ nhớ đệm và kiểm tra dữ liệu
    CacheManager.initialize();
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

    // Xử lý tìm kiếm
    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase();
        UIManager.filterScreenList(query);
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

    // Update in app.js
    function processProjectData(projectData) {
        try {
            // Analyze screens
            const screenData = ScreenAnalyzer.analyzeScreens(projectData);

            // Display screen list
            UIManager.displayScreenList(screenData, projectData);

            // Debug relationship counts
            console.log("Screens:", screenData.screens.length);
            console.log("Found relationships:", screenData.screens.reduce((sum, screen) =>
                sum + screen.childScreens.length, 0));
            console.log("Service calls:", screenData.screens.reduce((sum, screen) =>
                sum + (screen.serviceCalls ? screen.serviceCalls.length : 0), 0));

            // Hide loader and show main content
            document.querySelector('.project-loader').classList.add('hidden');
            document.getElementById('mainContent').classList.remove('hidden');

            // Initialize graph after DOM update
            setTimeout(() => {
                GraphRenderer.initializeGraph(screenData);

                // Force a resize after a short delay to ensure proper rendering
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