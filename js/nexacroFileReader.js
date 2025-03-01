/**
 * Module đọc và phân tích cấu trúc file dự án Nexacro
 */
const NexacroFileReader = (function () {

    /**
     * Read and analyze all files in a Nexacro project
     * @param {FileList} files - List of files selected from the file input
     * @returns {Promise<Object>} - Structured project data
     */
    async function readProjectFiles(files) {
        // Initialize project data structure with all necessary properties
        const projectData = {
            screens: [],           // Nexacro screen information
            formFiles: [],         // List of form file names
            rawFiles: {},          // Raw file contents by filename
            serviceMappings: {},   // Service ID to backend implementation mappings
            queryDefinitions: {},  // SQL query definitions by ID
            beanMethods: {}        // Java bean method definitions
        };

        // Convert FileList to Array for easier processing
        const fileArray = Array.from(files);
        console.log(`Total files found: ${fileArray.length}`);

        // Categorize files by their extensions for targeted processing
        const formFiles = fileArray.filter(file =>
            file.name.endsWith('.xfdl') || file.name.endsWith('.xfdl.js'));
        const jsonFiles = fileArray.filter(file =>
            file.name.endsWith('.json'));
        const xmlFiles = fileArray.filter(file =>
            file.name.endsWith('.xml'));
        const javaFiles = fileArray.filter(file =>
            file.name.endsWith('.java'));

        console.log(`Found ${formFiles.length} form files, ${jsonFiles.length} JSON files, ${xmlFiles.length} XML files, and ${javaFiles.length} Java files`);

        // Process Nexacro form files (screens)
        for (const file of formFiles) {
            try {
                // Read the file content as text
                const content = await readFileContent(file);

                // Parse the screen information from the file
                const screenInfo = parseScreenFile(file, content);

                if (screenInfo) {
                    projectData.screens.push(screenInfo);
                    projectData.formFiles.push(file.name);
                    projectData.rawFiles[file.name] = content;
                }
            } catch (error) {
                console.error(`Error reading form file ${file.name}:`, error);
            }
        }

        // Process JSON mapping files
        const jsonContents = [];
        for (const file of jsonFiles) {
            try {
                const content = await readFileContent(file);

                // Store raw content
                projectData.rawFiles[file.name] = content;

                // Prepare content for service mapping analysis
                jsonContents.push({
                    name: file.name,
                    content: content
                });
            } catch (error) {
                console.error(`Error reading JSON file ${file.name}:`, error);
            }
        }

        // Parse service mappings from JSON files
        if (jsonContents.length > 0) {
            try {
                projectData.serviceMappings = ServiceAnalyzer.parseServiceMappings(jsonContents);
                console.log(`Parsed ${Object.keys(projectData.serviceMappings).length} service mappings`);
            } catch (error) {
                console.error("Error parsing service mappings:", error);
            }
        }

        // Process XML files (typically containing SQL queries)
        const xmlContents = [];
        for (const file of xmlFiles) {
            try {
                const content = await readFileContent(file);

                // Store raw content
                projectData.rawFiles[file.name] = content;

                // Prepare content for query definition analysis
                xmlContents.push({
                    name: file.name,
                    content: content
                });
            } catch (error) {
                console.error(`Error reading XML file ${file.name}:`, error);
            }
        }

        // Parse query definitions from XML files
        if (xmlContents.length > 0) {
            try {
                projectData.queryDefinitions = ServiceAnalyzer.parseQueryDefinitions(xmlContents);
                console.log(`Parsed ${Object.keys(projectData.queryDefinitions).length} query definitions`);
            } catch (error) {
                console.error("Error parsing query definitions:", error);
            }
        }

        // Process Java files (containing Spring beans)
        const javaContents = [];
        for (const file of javaFiles) {
            try {
                const content = await readFileContent(file);

                // Store raw content
                projectData.rawFiles[file.name] = content;

                // Prepare content for Java bean analysis
                javaContents.push({
                    name: file.name,
                    content: content
                });
            } catch (error) {
                console.error(`Error reading Java file ${file.name}:`, error);
            }
        }

        // Parse Java bean methods
        if (javaContents.length > 0) {
            try {
                projectData.beanMethods = ServiceAnalyzer.parseJavaBeans(javaContents);
                console.log(`Parsed ${Object.keys(projectData.beanMethods).length} bean methods`);
            } catch (error) {
                console.error("Error parsing Java beans:", error);
            }
        }

        // Log summary of processed data
        console.log("Project analysis complete:");
        console.log(`- ${projectData.screens.length} screens`);
        console.log(`- ${Object.keys(projectData.serviceMappings).length} service mappings`);
        console.log(`- ${Object.keys(projectData.queryDefinitions).length} query definitions`);
        console.log(`- ${Object.keys(projectData.beanMethods).length} bean methods`);

        return projectData;
    }

    /**
     * Read the content of a file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} - File content as text
     */
    function readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new window.FileReader();

            reader.onload = function (event) {
                resolve(event.target.result);
            };

            reader.onerror = function () {
                reject(new Error(`Cannot read file ${file.name}`));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Phân tích file màn hình để lấy thông tin
     * @param {File} file - File màn hình
     * @param {string} content - Nội dung file
     * @returns {Object|null} - Thông tin màn hình
     */
    // Add to fileReader.js
    function parseScreenFile(file, content) {
        const fileName = file.name;
        const filePath = file.webkitRelativePath || fileName;

        // Check if this is a screen file
        if (!fileName.endsWith('.xfdl') && !fileName.endsWith('.xfdl.js')) {
            return null;
        }

        // Get screen ID from filename
        const screenId = fileName.replace('.xfdl.js', '').replace('.xfdl', '');

        // Find gfnOpenPopup calls
        const popupCalls = findPopupCalls(content);

        // Find gfnCallService calls
        const serviceCalls = findServiceCalls(content);

        return {
            id: screenId,
            name: screenId,
            path: filePath,
            content: content,
            size: file.size,
            lastModified: new Date(file.lastModified).toLocaleString(),
            popupCalls: popupCalls,
            serviceCalls: serviceCalls
        };
    }

    /**
     * Find service calls in file content
     * @param {string} content - File content
     * @returns {Array} - List of service calls
     */
    function findServiceCalls(content) {
        const serviceCalls = [];

        // Find direct gfnCallService calls
        const directCallRegex = /this\.gfnCallService\s*\(\s*["']([^"']+)["']\s*\)/g;
        let directMatch;
        while ((directMatch = directCallRegex.exec(content)) !== null) {
            serviceCalls.push({
                tranId: directMatch[1],
                type: 'direct',
                location: directMatch.index
            });
        }

        // Find service definitions - dataset with service info
        // Look for patterns like: this.dsService.addRow(); this.dsService.setColumn(0, "tranId", "serviceId");
        const serviceDefRegex = /this\.(ds[A-Za-z0-9_]+)\.setColumn\s*\([^,]+,\s*["']tranId["'],\s*["']([^"']+)["']\s*\)/g;

        let serviceDatasets = new Map();
        let defMatch;

        while ((defMatch = serviceDefRegex.exec(content)) !== null) {
            const dsName = defMatch[1];
            const tranId = defMatch[2];

            if (!serviceDatasets.has(dsName)) {
                serviceDatasets.set(dsName, []);
            }

            // Look for other columns in this service definition
            const svcIdRegex = new RegExp(`this\\.${dsName}\\.setColumn\\s*\\([^,]+,\\s*["']svcId["'],\\s*["']([^"']+)["']\\s*\\)`, 'g');
            const inDsRegex = new RegExp(`this\\.${dsName}\\.setColumn\\s*\\([^,]+,\\s*["']inDss["'],\\s*["']([^"']+)["']\\s*\\)`, 'g');
            const outDsRegex = new RegExp(`this\\.${dsName}\\.setColumn\\s*\\([^,]+,\\s*["']outDs["'],\\s*["']([^"']+)["']\\s*\\)`, 'g');
            const argvRegex = new RegExp(`this\\.${dsName}\\.setColumn\\s*\\([^,]+,\\s*["']argvs["'],\\s*["']([^"']+)["']\\s*\\)`, 'g');
            const callbackRegex = new RegExp(`this\\.${dsName}\\.setColumn\\s*\\([^,]+,\\s*["']cback["'],\\s*["']([^"']+)["']\\s*\\)`, 'g');
            const asyncRegex = new RegExp(`this\\.${dsName}\\.setColumn\\s*\\([^,]+,\\s*["']async["'],\\s*["']([^"']+)["']\\s*\\)`, 'g');

            // Reset lastIndex for each regex
            svcIdRegex.lastIndex = 0;
            inDsRegex.lastIndex = 0;
            outDsRegex.lastIndex = 0;
            argvRegex.lastIndex = 0;
            callbackRegex.lastIndex = 0;
            asyncRegex.lastIndex = 0;

            // Get service details
            const svcIdMatch = svcIdRegex.exec(content);
            const inDsMatch = inDsRegex.exec(content);
            const outDsMatch = outDsRegex.exec(content);
            const argvMatch = argvRegex.exec(content);
            const callbackMatch = callbackRegex.exec(content);
            const asyncMatch = asyncRegex.exec(content);

            serviceDatasets.get(dsName).push({
                tranId: tranId,
                svcId: svcIdMatch ? svcIdMatch[1] : '',
                inDss: inDsMatch ? inDsMatch[1] : '',
                outDs: outDsMatch ? outDsMatch[1] : '',
                argvs: argvMatch ? argvMatch[1] : '',
                callback: callbackMatch ? callbackMatch[1] : '',
                async: asyncMatch ? asyncMatch[1] === 'true' : true,
                location: defMatch.index,
                type: 'defined'
            });
        }

        // Add defined services to service calls
        for (const [dsName, services] of serviceDatasets.entries()) {
            serviceCalls.push(...services);
        }

        return serviceCalls;
    }

    /**
     * Tìm các cuộc gọi hàm gfnOpenPopup trong nội dung file
     * @param {string} content - Nội dung file
     * @returns {Array} - Danh sách các cuộc gọi popup
     */
    function findPopupCalls(content) {
        const popupCalls = [];
        const regex = /this\.gfnOpenPopup\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*([^,)]+)\s*,\s*([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/g;

        let match;
        while ((match = regex.exec(content)) !== null) {
            popupCalls.push({
                popupId: match[1],
                popupUrl: match[2],
                args: match[3],
                callback: match[4],
                option: match[5] || ''
            });
        }

        return popupCalls;
    }

    return {
        readProjectFiles
    };
})();