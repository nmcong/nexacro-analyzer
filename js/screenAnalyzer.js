/**
 * Module phân tích các màn hình và mối quan hệ
 */
const ScreenAnalyzer = (function () {
    /**
     * Phân tích dữ liệu màn hình và tìm mối quan hệ giữa chúng
     * @param {Object} projectData - Dữ liệu dự án
     * @returns {Object} - Dữ liệu màn hình đã phân tích
     */
    /**
     * Phân tích dữ liệu màn hình và tìm mối quan hệ giữa chúng
     * @param {Object} projectData - Dữ liệu dự án
     * @returns {Object} - Dữ liệu màn hình đã phân tích
     */
    function analyzeScreens(projectData) {
        const screens = projectData.screens;
        const screenMap = {};

        // Tạo map để tra cứu nhanh các màn hình theo ID
        screens.forEach(screen => {
            screenMap[screen.id] = {
                ...screen,
                childScreens: [],
                parentScreens: []
            };
        });

        // Phân tích mối quan hệ giữa các màn hình
        screens.forEach(screen => {
            if (screen.popupCalls && screen.popupCalls.length > 0) {
                screen.popupCalls.forEach(popup => {
                    // Chuyển đổi popupUrl thành screenId
                    const targetScreenId = getScreenIdFromUrl(popup.popupUrl);
                    if (targetScreenId) {
                        // Thêm vào danh sách con
                        screenMap[screen.id] && screenMap[screen.id].childScreens && screenMap[screen.id].childScreens.push({
                            id: targetScreenId,
                            popupId: popup.popupId,
                            popupUrl: popup.popupUrl
                        });

                        // Thêm vào danh sách màn hình cha
                        screenMap[targetScreenId] && screenMap[targetScreenId].parentScreens && screenMap[targetScreenId].parentScreens.push({
                            id: screen.id,
                            popupId: popup.popupId
                        });
                    }
                });
            }
        });

        // Xử lý thêm nếu dữ liệu đã import
        if (projectData.isImported) {
            // Với dữ liệu đã import, thêm vào các trường bổ sung nếu cần
            Object.values(screenMap).forEach(screen => {
                // Đảm bảo có các trường cần thiết
                screen.isImported = true;
            });
        }

        return {
            screens: Object.values(screenMap),
            screenMap: screenMap
        };
    }

    /**
     * Chuyển đổi đường dẫn URL thành ID màn hình
     * @param {string} url - Đường dẫn URL của màn hình
     * @returns {string} - ID của màn hình
     */
    function getScreenIdFromUrl(url) {
        if (!url) return null;

        // Loại bỏ đường dẫn và extension
        const parts = url.split('/');
        const fileName = parts[parts.length - 1];

        return fileName.replace('.xfdl', '');
    }

    /**
     * Tìm tất cả các màn hình liên quan đến một màn hình nhất định
     * @param {string} screenId - ID màn hình cần tìm
     * @param {Object} screenData - Dữ liệu tất cả màn hình
     * @returns {Object} - Các màn hình liên quan
     */
    function findRelatedScreens(screenId, screenData) {
        if (!screenData.screenMap[screenId]) {
            return {
                parents: [],
                children: [],
                siblings: []
            };
        }

        const screen = screenData.screenMap[screenId];

        // Các màn hình cha (gọi màn hình hiện tại)
        const parents = screen.parentScreens;

        // Các màn hình con (được gọi từ màn hình hiện tại)
        const children = screen.childScreens;

        // Anh em (được gọi bởi cùng một màn hình cha)
        let siblings = [];

        parents.forEach(parent => {
            const parentScreen = screenData.screenMap[parent.id];
            if (parentScreen) {
                const siblingCalls = parentScreen.childScreens.filter(child =>
                    child.id !== screenId
                );
                siblings = [...siblings, ...siblingCalls];
            }
        });

        return {
            parents,
            children,
            siblings
        };
    }

    return {
        analyzeScreens,
        findRelatedScreens
    };
})();