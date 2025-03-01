/**
 * Module vẽ biểu đồ mối quan hệ giữa các màn hình
 */
const GraphRenderer = (function () {
    // Dữ liệu màn hình và đối tượng đồ thị
    let screenData = null;
    let graph = null;
    let graphContainer = null;

    /**
     * Khởi tạo đồ thị
     * @param {Object} data - Dữ liệu màn hình
     */
    function initializeGraph(data) {
        console.log(data);
        screenData = data;
        graphContainer = document.getElementById('graphContainer');

        if (!graphContainer) {
            console.error("Graph container element not found");
            return;
        }

        // Clear existing canvas
        graphContainer.innerHTML = '';

        // Create new canvas with full container dimensions
        const canvas = document.createElement('canvas');
        canvas.id = 'graphCanvas';

        // Get container dimensions, ensuring we have some minimum size
        const containerRect = graphContainer.getBoundingClientRect();
        canvas.width = Math.max(containerRect.width, 600);
        canvas.height = Math.max(containerRect.height, 220);

        console.log("Canvas dimensions:", canvas.width, "x", canvas.height);

        graphContainer.appendChild(canvas);

        // Create initial graph
        createGraph(null);

        // Set up resize handler
        window.addEventListener('resize', debounce(function () {
            resizeCanvas();
        }, 250));
    }

    /**
     * Cập nhật đồ thị khi chọn màn hình
     * @param {string} screenId - ID màn hình đã chọn
     */
    function updateGraph(screenId) {
        if (!screenData || !screenId) return;

        createGraph(screenId);
    }

    /**
     * Tạo đồ thị mối quan hệ
     * @param {string} centralScreenId - ID màn hình trung tâm (nếu null, hiển thị toàn bộ)
     */
    function createGraph(centralScreenId) {
        const canvas = document.getElementById('graphCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Nếu không có màn hình trung tâm, hiển thị tổng quan
        if (!centralScreenId) {
            drawOverviewGraph(ctx, canvas);
            return;
        }

        // Lấy màn hình trung tâm và các màn hình liên quan
        const centralScreen = screenData.screenMap[centralScreenId];
        if (!centralScreen) return;

        const relatedScreens = ScreenAnalyzer.findRelatedScreens(centralScreenId, screenData);

        // Vẽ các nút và cạnh
        drawRelationshipGraph(ctx, canvas, centralScreen, relatedScreens);
    }

    /**
     * Vẽ đồ thị tổng quan
     * @param {CanvasRenderingContext2D} ctx - Context canvas
     * @param {HTMLCanvasElement} canvas - Phần tử canvas
     */
    function drawOverviewGraph(ctx, canvas) {
        const width = canvas.width;
        const height = canvas.height;

        // Lấy các màn hình có nhiều kết nối nhất
        const topScreens = [...screenData.screens]
            .sort((a, b) => (b.childScreens.length + b.parentScreens.length) -
                (a.childScreens.length + a.parentScreens.length))
            .slice(0, 10);

        // Vẽ tiêu đề
        ctx.font = '14px Arial';
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'center';
        ctx.fillText('10 màn hình có nhiều kết nối nhất', width / 2, 20);

        // Vẽ các nút
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - 60;

        for (let i = 0; i < topScreens.length; i++) {
            const screen = topScreens[i];
            const angle = (i / topScreens.length) * Math.PI * 2;

            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            // Vẽ nút
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fillStyle = '#4a6baf';
            ctx.fill();

            // Vẽ tên màn hình
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Cắt tên ngắn xuống
            const shortName = screen.name.length > 10 ?
                screen.name.substring(0, 8) + '...' :
                screen.name;

            ctx.fillText(shortName, x, y);

            // Vẽ đường nối đến tâm
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(74, 107, 175, 0.3)';
            ctx.stroke();
        }

        // Vẽ nút trung tâm
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#2c3e50';
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tổng quan', centerX, centerY);

        // Hướng dẫn
        ctx.fillStyle = '#95a5a6';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Chọn một màn hình để xem chi tiết mối quan hệ', width / 2, height - 15);
    }

    /**
     * Vẽ đồ thị mối quan hệ chi tiết
     * @param {CanvasRenderingContext2D} ctx - Context canvas
     * @param {HTMLCanvasElement} canvas - Phần tử canvas
     * @param {Object} centralScreen - Màn hình trung tâm
     * @param {Object} relatedScreens - Các màn hình liên quan
     */
    function drawRelationshipGraph(ctx, canvas, centralScreen, relatedScreens) {
        const width = canvas.width;
        const height = canvas.height;

        // Tọa độ trung tâm
        const centerX = width / 2;
        const centerY = height / 2;

        // Vẽ nút trung tâm
        ctx.beginPath();
        ctx.arc(centerX, centerY, 35, 0, Math.PI * 2);
        ctx.fillStyle = '#4a6baf';
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Cắt tên ngắn xuống
        const shortName = centralScreen.name.length > 15 ?
            centralScreen.name.substring(0, 12) + '...' :
            centralScreen.name;

        ctx.fillText(shortName, centerX, centerY);

        // Vẽ các màn hình cha (bên trái)
        const parents = relatedScreens.parents;
        const leftRadius = Math.min(centerX - 60, (height / 2) - 40);

        for (let i = 0; i < parents.length; i++) {
            const parent = parents[i];
            const angle = ((i + 0.5) / (parents.length + 1)) * Math.PI - Math.PI / 2;

            const x = centerX - leftRadius * Math.cos(angle);
            const y = centerY + leftRadius * Math.sin(angle);

            // Vẽ đường nối
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(230, 126, 34, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Vẽ mũi tên
            drawArrow(ctx, x, y, centerX, centerY, 'rgba(230, 126, 34, 0.6)');

            // Vẽ nút
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI * 2);
            ctx.fillStyle = '#e67e22';
            ctx.fill();

            // Vẽ tên màn hình
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const parentName = parent.id.length > 10 ?
                parent.id.substring(0, 8) + '...' :
                parent.id;

            ctx.fillText(parentName, x, y);
        }

        // Vẽ các màn hình con (bên phải)
        const children = relatedScreens.children;
        const rightRadius = Math.min(width - centerX - 60, (height / 2) - 40);

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const angle = ((i + 0.5) / (children.length + 1)) * Math.PI - Math.PI / 2;

            const x = centerX + rightRadius * Math.cos(angle);
            const y = centerY + rightRadius * Math.sin(angle);

            // Vẽ đường nối
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Vẽ mũi tên
            drawArrow(ctx, centerX, centerY, x, y, 'rgba(46, 204, 113, 0.6)');

            // Vẽ nút
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI * 2);
            ctx.fillStyle = '#2ecc71';
            ctx.fill();

            // Vẽ tên màn hình
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const childName = child.id.length > 10 ?
                child.id.substring(0, 8) + '...' :
                child.id;

            ctx.fillText(childName, x, y);
        }

        // Chú thích
        const legendY = height - 30;

        // Chú thích màn hình cha
        ctx.beginPath();
        ctx.arc(70, legendY, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#e67e22';
        ctx.fill();

        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Màn hình cha (' + parents.length + ')', 90, legendY);

        // Chú thích màn hình con
        ctx.beginPath();
        ctx.arc(220, legendY, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#2ecc71';
        ctx.fill();

        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Màn hình con (' + children.length + ')', 240, legendY);

        // Chú thích màn hình hiện tại
        ctx.beginPath();
        ctx.arc(370, legendY, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#4a6baf';
        ctx.fill();

        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Màn hình hiện tại', 390, legendY);
    }

    /**
     * Vẽ mũi tên
     * @param {CanvasRenderingContext2D} ctx - Context canvas
     * @param {number} fromX - Tọa độ X điểm bắt đầu
     * @param {number} fromY - Tọa độ Y điểm bắt đầu
     * @param {number} toX - Tọa độ X điểm kết thúc
     * @param {number} toY - Tọa độ Y điểm kết thúc
     * @param {string} color - Màu mũi tên
     */
    function drawArrow(ctx, fromX, fromY, toX, toY, color) {
        const headLength = 15;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        // Điều chỉnh điểm kết thúc để tránh vẽ đè lên nút
        const length = Math.sqrt(dx * dx + dy * dy);
        const ratio = (length - 35) / length; // 35 là bán kính nút trung tâm

        const adjustedToX = fromX + dx * ratio;
        const adjustedToY = fromY + dy * ratio;

        // Vẽ mũi tên
        ctx.beginPath();
        ctx.moveTo(adjustedToX, adjustedToY);
        ctx.lineTo(
            adjustedToX - headLength * Math.cos(angle - Math.PI / 6),
            adjustedToY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            adjustedToX - headLength * Math.cos(angle + Math.PI / 6),
            adjustedToY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    /**
     * Resize canvas to match container
     */
    function resizeCanvas() {
        const canvas = document.getElementById('graphCanvas');
        const container = document.getElementById('graphContainer');

        if (!canvas || !container) return;

        const containerRect = container.getBoundingClientRect();
        canvas.width = Math.max(containerRect.width, 600);
        canvas.height = Math.max(containerRect.height, 220);

        console.log("Resized canvas to:", canvas.width, "x", canvas.height);

        // Redraw current graph
        const selectedScreenId = document.querySelector('.screen-item.active')?.dataset.screenId;
        createGraph(selectedScreenId || null);
    }

    /**
     * Debounce function to prevent too many resize events
     */
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    return {
        initializeGraph,
        updateGraph
    };
})();