/**
 * Module quản lý xuất dữ liệu dự án ra file
 */
const ExportManager = (function () {
    /**
     * Xuất dữ liệu dự án ra file JSON
     * @param {Object} projectData - Dữ liệu dự án cần xuất
     */
    function exportProjectData(projectData) {
        if (!projectData || !projectData.screens) {
            alert('Không có dữ liệu dự án hợp lệ để xuất');
            return;
        }

        // Chuẩn bị dữ liệu để xuất
        const exportData = {
            projectName: projectData.projectName || 'NexacroProject',
            exportDate: new Date().toLocaleString(),
            screens: projectData.screens.map(screen => ({
                id: screen.id,
                name: screen.name,
                path: screen.path,
                size: screen.size,
                lastModified: screen.lastModified,
                popupCalls: screen.popupCalls || [],
                serviceCalls: screen.serviceCalls || []
            })),
            statistics: {
                totalScreens: projectData.screens.length,
                totalServiceCalls: projectData.screens.reduce((sum, screen) =>
                    sum + (screen.serviceCalls ? screen.serviceCalls.length : 0), 0),
                totalPopupCalls: projectData.screens.reduce((sum, screen) =>
                    sum + (screen.popupCalls ? screen.popupCalls.length : 0), 0)
            }
        };

        // Chuyển đổi thành JSON
        const jsonData = JSON.stringify(exportData, null, 2);

        // Tạo blob để tải xuống
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Tạo thẻ a và kích hoạt sự kiện click để tải xuống
        const a = document.createElement('a');
        a.href = url;
        a.download = exportData.projectName + '_analysis_' +
            new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();

        // Dọn dẹp
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    return {
        exportProjectData
    };
})();