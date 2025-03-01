/**
 * Module quản lý hiển thị thông tin folder đã chọn
 */
const FolderManager = (function () {
    // Các phần tử DOM
    let selectedFolderElement;
    let folderNameElement;
    let fileCountElement;

    /**
     * Khởi tạo quản lý folder
     * @param {HTMLElement} selectedFolder - Phần tử hiển thị thông tin folder
     * @param {HTMLElement} folderName - Phần tử hiển thị tên folder
     * @param {HTMLElement} fileCount - Phần tử hiển thị số lượng file
     */
    function initialize(selectedFolder, folderName, fileCount) {
        selectedFolderElement = selectedFolder;
        folderNameElement = folderName;
        fileCountElement = fileCount;
    }

    /**
     * Cập nhật thông tin folder
     * @param {FileList} files - Danh sách các file đã chọn
     */
    function updateFolderInfo(files) {
        if (!selectedFolderElement || !folderNameElement || !fileCountElement) {
            console.error('FolderManager chưa được khởi tạo đúng cách');
            return;
        }

        if (files && files.length > 0) {
            // Lấy tên folder từ đường dẫn của file đầu tiên
            const firstFilePath = files[0].webkitRelativePath || files[0].name;
            let rootFolder;

            // Xử lý trường hợp webkitRelativePath có thể không tồn tại
            if (firstFilePath.includes('/')) {
                rootFolder = firstFilePath.split('/')[0];
            } else {
                rootFolder = "Nhiều file đã chọn";
            }

            // Hiển thị thông tin folder
            folderNameElement.textContent = rootFolder;
            fileCountElement.textContent = `(${files.length} files)`;
            selectedFolderElement.classList.remove('hidden');
        } else {
            selectedFolderElement.classList.add('hidden');
        }
    }

    /**
     * Ẩn thông tin folder
     */
    function clearFolderInfo() {
        if (selectedFolderElement) {
            selectedFolderElement.classList.add('hidden');
        }
    }

    return {
        initialize,
        updateFolderInfo,
        clearFolderInfo
    };
})();