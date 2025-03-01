/**
 * Quản lý bộ nhớ đệm cho dữ liệu dự án
 */
const CacheManager = (function () {
    const CACHE_KEY = 'nexacro_project_data';
    const CACHE_INFO_KEY = 'nexacro_cache_info';
    let isInitialized = false;

    /**
     * Khởi tạo bộ nhớ đệm
     */
    function initialize() {
        if (isInitialized) return;

        // Kiểm tra hỗ trợ localStorage
        if (!storageAvailable('localStorage')) {
            console.warn('localStorage không khả dụng, bộ nhớ đệm sẽ không hoạt động');
            return;
        }

        isInitialized = true;
    }

    /**
     * Kiểm tra xem storage có khả dụng không
     * @param {string} type - Loại storage (localStorage, sessionStorage)
     * @returns {boolean} - true nếu khả dụng
     */
    function storageAvailable(type) {
        try {
            const storage = window[type];
            const x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Lưu dữ liệu vào bộ nhớ đệm
     * @param {Object} data - Dữ liệu cần lưu
     */
    function saveToCache(data) {
        if (!isInitialized) return;

        try {
            // Tạo bản sao của dữ liệu để loại bỏ các thuộc tính không cần thiết
            const cachedData = {
                screens: data.screens.map(screen => ({
                    id: screen.id,
                    name: screen.name,
                    path: screen.path,
                    size: screen.size,
                    lastModified: screen.lastModified,
                    popupCalls: screen.popupCalls,
                    serviceCalls: screen.serviceCalls,
                })),
                formFiles: data.formFiles,
                serviceMappings: data.serviceMappings,
                queryDefinitions: data.queryDefinitions,
                beanMethods: data.beanMethods
            };

            // Lưu dữ liệu dự án
            localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));

            // Lưu thông tin cache
            const now = new Date();
            const cacheInfo = {
                lastUpdated: now.toLocaleString(),
                timestamp: now.getTime(),
                screens: cachedData.screens.length
            };

            localStorage.setItem(CACHE_INFO_KEY, JSON.stringify(cacheInfo));

            console.log('Đã lưu dữ liệu vào bộ nhớ đệm');
        } catch (error) {
            console.error('Lỗi khi lưu vào bộ nhớ đệm:', error);

            // Nếu lỗi do quá kích thước, thử xóa dữ liệu chi tiết
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                try {
                    clearCache();
                    alert('Dữ liệu dự án quá lớn cho bộ nhớ đệm. Bộ nhớ đệm đã bị xóa.');
                } catch (e) {
                    console.error('Không thể xóa bộ nhớ đệm:', e);
                }
            }
        }
    }

    /**
     * Tải dữ liệu từ bộ nhớ đệm
     * @returns {Object|null} - Dữ liệu dự án hoặc null nếu không có
     */
    function loadFromCache() {
        if (!isInitialized) return null;

        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (!cachedData) return null;

            return JSON.parse(cachedData);
        } catch (error) {
            console.error('Lỗi khi đọc từ bộ nhớ đệm:', error);
            return null;
        }
    }

    /**
     * Xóa bộ nhớ đệm
     */
    function clearCache() {
        if (!isInitialized) return;

        try {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_INFO_KEY);
            console.log('Đã xóa bộ nhớ đệm');
        } catch (error) {
            console.error('Lỗi khi xóa bộ nhớ đệm:', error);
        }
    }

    /**
     * Kiểm tra xem có dữ liệu trong bộ nhớ đệm không
     * @returns {boolean} - true nếu có dữ liệu
     */
    function hasCache() {
        if (!isInitialized) return false;

        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            return cachedData !== null;
        } catch (error) {
            console.error('Lỗi khi kiểm tra bộ nhớ đệm:', error);
            return false;
        }
    }

    /**
     * Lấy thông tin về bộ nhớ đệm
     * @returns {Object} - Thông tin bộ nhớ đệm
     */
    function getCacheInfo() {
        if (!isInitialized) {
            return {
                lastUpdated: 'Không có dữ liệu',
                timestamp: 0,
                screens: 0
            };
        }

        try {
            const cacheInfo = localStorage.getItem(CACHE_INFO_KEY);
            if (!cacheInfo) {
                return {
                    lastUpdated: 'Không có dữ liệu',
                    timestamp: 0,
                    screens: 0
                };
            }

            return JSON.parse(cacheInfo);
        } catch (error) {
            console.error('Lỗi khi đọc thông tin bộ nhớ đệm:', error);
            return {
                lastUpdated: 'Lỗi',
                timestamp: 0,
                screens: 0
            };
        }
    }

    return {
        initialize,
        saveToCache,
        loadFromCache,
        clearCache,
        hasCache,
        getCacheInfo
    };
})();