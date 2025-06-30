// AUTOSAR ARXML Merger Application
class ARXMLMerger {
    constructor() {
        this.files = [];
        this.mergedData = null;
        this.processingStats = {
            filesProcessed: 0,
            elementsMerged: 0,
            conflictsResolved: 0
        };
        this.config = {
            encoding: 'auto',
            conflictStrategy: 'merge', // Intelligent merging by default
            parallelProcessing: true,
            memoryOptimization: 'high', // High performance for large files
            validationLevel: 'full',
            outputFileName: 'merged_arxml.arxml',
            includeMergeReport: true,
            includeValidationReport: true,
            autoBackup: true,
            generateReport: true,
            autoDownload: true,
            autoMerge: true // Auto-start when files are added
        };
        this.reports = {
            merge: null,
            validation: null,
            conflicts: null
        };
        this.isProcessing = false;
        this.initializeEventListeners();
        this.initializeCoolFeatures();
    }

    initializeEventListeners() {
        // File input events
        const fileDropzone = document.getElementById('fileDropzone');
        const fileInput = document.getElementById('fileInput');
        const fileSelectBtn = document.getElementById('fileSelectBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');

        // Drag and drop events
        fileDropzone.addEventListener('dragover', this.handleDragOver.bind(this));
        fileDropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        fileDropzone.addEventListener('drop', this.handleDrop.bind(this));
        fileDropzone.addEventListener('click', () => fileInput.click());

        // File selection
        fileSelectBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        clearAllBtn.addEventListener('click', this.clearAllFiles.bind(this));

        // Processing controls
        const startMergingBtn = document.getElementById('startMergingBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        startMergingBtn.addEventListener('click', this.startMerging.bind(this));
        cancelBtn.addEventListener('click', this.cancelProcessing.bind(this));

        // Configuration changes
        this.setupConfigurationListeners();

        // Advanced options toggle
        const toggleAdvanced = document.getElementById('toggleAdvanced');
        toggleAdvanced.addEventListener('click', this.toggleAdvancedOptions.bind(this));

        // Download buttons
        this.setupDownloadListeners();
    }

    setupConfigurationListeners() {
        const configElements = [
            'autoBackup', 'generateReport', 'autoDownload'
        ];

        configElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', this.updateConfiguration.bind(this));
            }
        });
    }

    setupDownloadListeners() {
        const downloadBtns = [
            { id: 'downloadMergedBtn', type: 'merged' },
            { id: 'downloadMergeReportBtn', type: 'mergeReport' },
            { id: 'downloadValidationReportBtn', type: 'validationReport' },
            { id: 'downloadConflictLogBtn', type: 'conflictLog' }
        ];

        downloadBtns.forEach(({ id, type }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.downloadFile(type));
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        e.target.value = ''; // Reset input
    }

    async processFiles(files) {
        const arxmlFiles = files.filter(file => 
            file.name.toLowerCase().endsWith('.arxml') || 
            file.name.toLowerCase().endsWith('.xml')
        );

        if (arxmlFiles.length === 0) {
            this.showMessage('Keine gültigen ARXML/XML-Dateien gefunden.', 'error');
            return;
        }

        this.showMessage(`Verarbeite ${arxmlFiles.length} Datei(en)...`, 'info');

        for (const file of arxmlFiles) {
            await this.addFile(file);
        }

        this.updateUI();
        this.updateLiveStats();

        // Auto-merge if enabled and we have enough files
        if (this.config.autoMerge && this.getValidFiles().length >= 2) {
            setTimeout(() => {
                this.startMerging();
            }, 1000); // Small delay to show the files first
        }
    }

    async addFile(file) {
        const fileInfo = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            encoding: 'detecting',
            status: 'checking',
            content: null,
            elements: null,
            errors: []
        };

        this.files.push(fileInfo);
        this.renderFileList();

        try {
            // Read file content
            const content = await this.readFileAsText(file);
            fileInfo.content = content;
            fileInfo.encoding = this.detectEncoding(content);

            // Validate XML structure
            const validation = this.validateXMLStructure(content);
            if (validation.valid) {
                fileInfo.status = 'valid';
                fileInfo.elements = this.extractARXMLElements(content);
            } else {
                fileInfo.status = 'invalid';
                fileInfo.errors = validation.errors;
            }
        } catch (error) {
            fileInfo.status = 'invalid';
            fileInfo.errors = [error.message];
        }

        this.renderFileList();
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Fehler beim Lesen der Datei'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    detectEncoding(content) {
        // Simple encoding detection based on XML declaration
        const xmlDeclaration = content.match(/<\?xml[^>]*encoding=["']([^"']+)["'][^>]*\?>/i);
        if (xmlDeclaration) {
            return xmlDeclaration[1].toUpperCase();
        }
        return 'UTF-8';
    }

    validateXMLStructure(content) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/xml');
            
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                return {
                    valid: false,
                    errors: ['XML-Parser-Fehler: ' + parseError.textContent]
                };
            }

            // Check for AUTOSAR root element
            const root = doc.documentElement;
            if (!root || !root.tagName.includes('AUTOSAR')) {
                return {
                    valid: false,
                    errors: ['Nicht-AUTOSAR-kompatible XML-Datei']
                };
            }

            return { valid: true, errors: [] };
        } catch (error) {
            return {
                valid: false,
                errors: ['XML-Validierungsfehler: ' + error.message]
            };
        }
    }

    extractARXMLElements(content) {
        const elements = {
            signals: [],
            components: [],
            interfaces: [],
            datatypes: [],
            ports: [],
            packages: [],
            clusters: [],
            ecus: [],
            systems: [],
            // Automotive-specific elements for CANape/CANoe compatibility
            canClusters: [],
            canfdClusters: [],
            ethernetClusters: [],
            flexrayClusters: [],
            linClusters: [],
            iSignals: [],
            iSignalGroups: [],
            iPdus: [],
            frames: [],
            vlans: [],
            fibexElements: [],
            networkEndpoints: [],
            communicationConnectors: []
        };

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                console.warn('XML parsing warning, using regex fallback:', parserError.textContent);
                return this.extractARXMLElementsRegex(content);
            }

            // Extract AR-PACKAGES
            const packages = xmlDoc.querySelectorAll('AR-PACKAGE');
            packages.forEach(pkg => {
                const shortName = pkg.querySelector('SHORT-NAME');
                if (shortName) {
                    elements.packages.push({
                        type: 'AR-PACKAGE',
                        shortName: shortName.textContent.trim(),
                        uuid: pkg.getAttribute('UUID') || '',
                        path: this.getElementPath(pkg),
                        element: pkg
                    });
                }
            });

            // Extract SYSTEM elements
            const systems = xmlDoc.querySelectorAll('SYSTEM');
            systems.forEach(sys => {
                const shortName = sys.querySelector('SHORT-NAME');
                if (shortName) {
                    elements.systems.push({
                        type: 'SYSTEM',
                        shortName: shortName.textContent.trim(),
                        uuid: sys.getAttribute('UUID') || '',
                        path: this.getElementPath(sys),
                        element: sys
                    });
                }
            });

            // Extract automotive clusters with detailed analysis
            this.extractAutomotiveClusters(xmlDoc, elements);

            // Extract signals and communication elements
            this.extractSignalsAndCommunication(xmlDoc, elements);

            // Extract FIBEX elements (critical for Vector tools)
            this.extractFibexElements(xmlDoc, elements);

            // Extract ECU-INSTANCE
            const ecus = xmlDoc.querySelectorAll('ECU-INSTANCE');
            ecus.forEach(ecu => {
                const shortName = ecu.querySelector('SHORT-NAME');
                if (shortName) {
                    elements.ecus.push({
                        type: 'ECU-INSTANCE',
                        shortName: shortName.textContent.trim(),
                        uuid: ecu.getAttribute('UUID') || '',
                        path: this.getElementPath(ecu),
                        element: ecu
                    });
                }
            });

            // Extract SW-COMPONENT-TYPE variants
            const componentTypes = [
                'APPLICATION-SW-COMPONENT-TYPE', 'COMPLEX-DEVICE-DRIVER-SW-COMPONENT-TYPE',
                'COMPOSITION-SW-COMPONENT-TYPE', 'ECU-ABSTRACTION-SW-COMPONENT-TYPE',
                'NV-BLOCK-SW-COMPONENT-TYPE', 'PARAMETER-SW-COMPONENT-TYPE',
                'SENSOR-ACTUATOR-SW-COMPONENT-TYPE', 'SERVICE-PROXY-SW-COMPONENT-TYPE',
                'SERVICE-SW-COMPONENT-TYPE'
            ];

            componentTypes.forEach(compType => {
                const components = xmlDoc.querySelectorAll(compType);
                components.forEach(comp => {
                    const shortName = comp.querySelector('SHORT-NAME');
                    if (shortName) {
                        elements.components.push({
                            type: compType,
                            shortName: shortName.textContent.trim(),
                            uuid: comp.getAttribute('UUID') || '',
                            path: this.getElementPath(comp),
                            element: comp
                        });
                    }
                });
            });

            // Extract interfaces
            const interfaceTypes = [
                'SENDER-RECEIVER-INTERFACE', 'CLIENT-SERVER-INTERFACE',
                'NV-DATA-INTERFACE', 'PARAMETER-INTERFACE', 'MODE-SWITCH-INTERFACE'
            ];

            interfaceTypes.forEach(ifaceType => {
                const interfaces = xmlDoc.querySelectorAll(ifaceType);
                interfaces.forEach(iface => {
                    const shortName = iface.querySelector('SHORT-NAME');
                    if (shortName) {
                        elements.interfaces.push({
                            type: ifaceType,
                            shortName: shortName.textContent.trim(),
                            uuid: iface.getAttribute('UUID') || '',
                            path: this.getElementPath(iface),
                            element: iface
                        });
                    }
                });
            });

            // Extract data types
            const datatypeTypes = [
                'IMPLEMENTATION-DATA-TYPE', 'APPLICATION-PRIMITIVE-DATA-TYPE',
                'APPLICATION-RECORD-DATA-TYPE', 'APPLICATION-ARRAY-DATA-TYPE'
            ];

            datatypeTypes.forEach(dtType => {
                const datatypes = xmlDoc.querySelectorAll(dtType);
                datatypes.forEach(dt => {
                    const shortName = dt.querySelector('SHORT-NAME');
                    if (shortName) {
                        elements.datatypes.push({
                            type: dtType,
                            shortName: shortName.textContent.trim(),
                            uuid: dt.getAttribute('UUID') || '',
                            path: this.getElementPath(dt),
                            element: dt
                        });
                    }
                });
            });

            // Extract ports
            const portTypes = ['P-PORT-PROTOTYPE', 'R-PORT-PROTOTYPE', 'PR-PORT-PROTOTYPE'];
            portTypes.forEach(portType => {
                const ports = xmlDoc.querySelectorAll(portType);
                ports.forEach(port => {
                    const shortName = port.querySelector('SHORT-NAME');
                    if (shortName) {
                        elements.ports.push({
                            type: portType,
                            shortName: shortName.textContent.trim(),
                            path: this.getElementPath(port),
                            element: port
                        });
                    }
                });
            });

        } catch (error) {
            console.warn('DOM parsing failed, falling back to regex:', error);
            return this.extractARXMLElementsRegex(content);
        }

        return elements;
    }

    extractAutomotiveClusters(xmlDoc, elements) {
        // CAN Clusters (including CAN-FD)
        const canClusters = xmlDoc.querySelectorAll('CAN-CLUSTER');
        canClusters.forEach(cluster => {
            const shortName = cluster.querySelector('SHORT-NAME');
            const canClusterConfig = cluster.querySelector('CAN-CLUSTER-CONFIG');
            const baudrate = canClusterConfig?.querySelector('BAUDRATE')?.textContent;
            const canFdConfig = canClusterConfig?.querySelector('CAN-FD-CONFIG');

            if (shortName) {
                const clusterData = {
                    type: 'CAN-CLUSTER',
                    shortName: shortName.textContent.trim(),
                    uuid: cluster.getAttribute('UUID') || '',
                    path: this.getElementPath(cluster),
                    element: cluster,
                    baudrate: baudrate,
                    isCanFd: !!canFdConfig,
                    fdBaudrate: canFdConfig?.querySelector('FD-BAUDRATE')?.textContent
                };

                elements.clusters.push(clusterData);
                if (clusterData.isCanFd) {
                    elements.canfdClusters.push(clusterData);
                } else {
                    elements.canClusters.push(clusterData);
                }
            }
        });

        // Ethernet Clusters with VLAN support
        const ethernetClusters = xmlDoc.querySelectorAll('ETHERNET-CLUSTER');
        ethernetClusters.forEach(cluster => {
            const shortName = cluster.querySelector('SHORT-NAME');
            if (shortName) {
                const clusterData = {
                    type: 'ETHERNET-CLUSTER',
                    shortName: shortName.textContent.trim(),
                    uuid: cluster.getAttribute('UUID') || '',
                    path: this.getElementPath(cluster),
                    element: cluster,
                    vlans: this.extractVlansFromCluster(cluster)
                };

                elements.clusters.push(clusterData);
                elements.ethernetClusters.push(clusterData);
            }
        });

        // FlexRay Clusters
        const flexrayClusters = xmlDoc.querySelectorAll('FLEXRAY-CLUSTER');
        flexrayClusters.forEach(cluster => {
            const shortName = cluster.querySelector('SHORT-NAME');
            if (shortName) {
                const clusterData = {
                    type: 'FLEXRAY-CLUSTER',
                    shortName: shortName.textContent.trim(),
                    uuid: cluster.getAttribute('UUID') || '',
                    path: this.getElementPath(cluster),
                    element: cluster
                };

                elements.clusters.push(clusterData);
                elements.flexrayClusters.push(clusterData);
            }
        });

        // LIN Clusters
        const linClusters = xmlDoc.querySelectorAll('LIN-CLUSTER');
        linClusters.forEach(cluster => {
            const shortName = cluster.querySelector('SHORT-NAME');
            if (shortName) {
                const clusterData = {
                    type: 'LIN-CLUSTER',
                    shortName: shortName.textContent.trim(),
                    uuid: cluster.getAttribute('UUID') || '',
                    path: this.getElementPath(cluster),
                    element: cluster
                };

                elements.clusters.push(clusterData);
                elements.linClusters.push(clusterData);
            }
        });
    }

    extractVlansFromCluster(ethernetCluster) {
        const vlans = [];
        const vlanElements = ethernetCluster.querySelectorAll('VLAN');

        vlanElements.forEach(vlan => {
            const vlanId = vlan.querySelector('VLAN-ID')?.textContent;
            const vlanName = vlan.querySelector('SHORT-NAME')?.textContent;

            if (vlanId && vlanName) {
                vlans.push({
                    id: vlanId,
                    name: vlanName.trim(),
                    element: vlan
                });
            }
        });

        return vlans;
    }

    extractSignalsAndCommunication(xmlDoc, elements) {
        // I-SIGNAL (Physical signals)
        const iSignals = xmlDoc.querySelectorAll('I-SIGNAL');
        iSignals.forEach(signal => {
            const shortName = signal.querySelector('SHORT-NAME');
            if (shortName) {
                elements.iSignals.push({
                    type: 'I-SIGNAL',
                    shortName: shortName.textContent.trim(),
                    uuid: signal.getAttribute('UUID') || '',
                    path: this.getElementPath(signal),
                    element: signal,
                    length: signal.querySelector('LENGTH')?.textContent,
                    initValue: signal.querySelector('INIT-VALUE')?.textContent
                });
            }
        });

        // I-SIGNAL-GROUP
        const iSignalGroups = xmlDoc.querySelectorAll('I-SIGNAL-GROUP');
        iSignalGroups.forEach(group => {
            const shortName = group.querySelector('SHORT-NAME');
            if (shortName) {
                elements.iSignalGroups.push({
                    type: 'I-SIGNAL-GROUP',
                    shortName: shortName.textContent.trim(),
                    uuid: group.getAttribute('UUID') || '',
                    path: this.getElementPath(group),
                    element: group
                });
            }
        });

        // I-PDU (Protocol Data Units)
        const iPdus = xmlDoc.querySelectorAll('I-PDU');
        iPdus.forEach(pdu => {
            const shortName = pdu.querySelector('SHORT-NAME');
            if (shortName) {
                elements.iPdus.push({
                    type: 'I-PDU',
                    shortName: shortName.textContent.trim(),
                    uuid: pdu.getAttribute('UUID') || '',
                    path: this.getElementPath(pdu),
                    element: pdu,
                    length: pdu.querySelector('LENGTH')?.textContent
                });
            }
        });

        // FRAME elements
        const frames = xmlDoc.querySelectorAll('CAN-FRAME, ETHERNET-FRAME, FLEXRAY-FRAME, LIN-FRAME');
        frames.forEach(frame => {
            const shortName = frame.querySelector('SHORT-NAME');
            if (shortName) {
                elements.frames.push({
                    type: frame.tagName,
                    shortName: shortName.textContent.trim(),
                    uuid: frame.getAttribute('UUID') || '',
                    path: this.getElementPath(frame),
                    element: frame,
                    frameLength: frame.querySelector('FRAME-LENGTH')?.textContent,
                    identifier: frame.querySelector('IDENTIFIER')?.textContent
                });
            }
        });
    }

    extractFibexElements(xmlDoc, elements) {
        // FIBEX-ELEMENT-REF-CONDITIONAL (critical for Vector tools)
        const fibexRefs = xmlDoc.querySelectorAll('FIBEX-ELEMENT-REF-CONDITIONAL');
        fibexRefs.forEach(ref => {
            const fibexElementRef = ref.querySelector('FIBEX-ELEMENT-REF');
            if (fibexElementRef) {
                elements.fibexElements.push({
                    type: 'FIBEX-ELEMENT-REF-CONDITIONAL',
                    dest: fibexElementRef.getAttribute('DEST'),
                    ref: fibexElementRef.textContent.trim(),
                    element: ref
                });
            }
        });

        // Network endpoints
        const networkEndpoints = xmlDoc.querySelectorAll('NETWORK-ENDPOINT');
        networkEndpoints.forEach(endpoint => {
            const shortName = endpoint.querySelector('SHORT-NAME');
            if (shortName) {
                elements.networkEndpoints.push({
                    type: 'NETWORK-ENDPOINT',
                    shortName: shortName.textContent.trim(),
                    uuid: endpoint.getAttribute('UUID') || '',
                    path: this.getElementPath(endpoint),
                    element: endpoint
                });
            }
        });

        // Communication connectors
        const commConnectors = xmlDoc.querySelectorAll('COMMUNICATION-CONNECTOR');
        commConnectors.forEach(connector => {
            const shortName = connector.querySelector('SHORT-NAME');
            if (shortName) {
                elements.communicationConnectors.push({
                    type: 'COMMUNICATION-CONNECTOR',
                    shortName: shortName.textContent.trim(),
                    uuid: connector.getAttribute('UUID') || '',
                    path: this.getElementPath(connector),
                    element: connector
                });
            }
        });
    }

    extractARXMLElementsRegex(content) {
        // Fallback regex-based extraction for large files or parsing errors
        const elements = {
            signals: [],
            components: [],
            interfaces: [],
            datatypes: [],
            ports: [],
            packages: [],
            clusters: [],
            ecus: [],
            systems: []
        };

        try {
            // Extract packages with UUID and SHORT-NAME
            const packageRegex = /<AR-PACKAGE[^>]*(?:UUID="([^"]*)")?[^>]*>[\s\S]*?<SHORT-NAME>([^<]+)<\/SHORT-NAME>/g;
            let match;
            while ((match = packageRegex.exec(content)) !== null) {
                elements.packages.push({
                    type: 'AR-PACKAGE',
                    shortName: match[2].trim(),
                    uuid: match[1] || '',
                    path: `/${match[2].trim()}`
                });
            }

            // Extract systems
            const systemRegex = /<SYSTEM[^>]*(?:UUID="([^"]*)")?[^>]*>[\s\S]*?<SHORT-NAME>([^<]+)<\/SHORT-NAME>/g;
            while ((match = systemRegex.exec(content)) !== null) {
                elements.systems.push({
                    type: 'SYSTEM',
                    shortName: match[2].trim(),
                    uuid: match[1] || '',
                    path: `/System/${match[2].trim()}`
                });
            }

            // Extract clusters
            const clusterRegex = /<(CAN-CLUSTER|ETHERNET-CLUSTER|LIN-CLUSTER)[^>]*(?:UUID="([^"]*)")?[^>]*>[\s\S]*?<SHORT-NAME>([^<]+)<\/SHORT-NAME>/g;
            while ((match = clusterRegex.exec(content)) !== null) {
                elements.clusters.push({
                    type: match[1],
                    shortName: match[3].trim(),
                    uuid: match[2] || '',
                    path: `/Cluster/${match[3].trim()}`
                });
            }

            // Extract ECUs
            const ecuRegex = /<ECU-INSTANCE[^>]*(?:UUID="([^"]*)")?[^>]*>[\s\S]*?<SHORT-NAME>([^<]+)<\/SHORT-NAME>/g;
            while ((match = ecuRegex.exec(content)) !== null) {
                elements.ecus.push({
                    type: 'ECU-INSTANCE',
                    shortName: match[2].trim(),
                    uuid: match[1] || '',
                    path: `/ECU/${match[2].trim()}`
                });
            }

        } catch (error) {
            console.error('Regex extraction failed:', error);
        }

        return elements;
    }

    getShortName(element) {
        const shortNameElement = element.querySelector('SHORT-NAME');
        return shortNameElement ? shortNameElement.textContent.trim() : 'Unnamed';
    }

    getElementPath(element) {
        const path = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            const shortName = current.querySelector(':scope > SHORT-NAME');
            if (shortName && shortName.textContent.trim()) {
                path.unshift(shortName.textContent.trim());
            }
            current = current.parentElement;

            // Stop at AUTOSAR root or after reasonable depth
            if (!current || current.tagName === 'AUTOSAR' || path.length > 10) {
                break;
            }
        }

        return '/' + path.join('/');
    }

    renderFileList() {
        const fileList = document.getElementById('fileList');
        const fileControls = document.getElementById('fileControls');
        
        if (this.files.length === 0) {
            fileList.innerHTML = '';
            fileControls.style.display = 'none';
            this.updateStartButton();
            return;
        }

        fileControls.style.display = 'flex';
        
        fileList.innerHTML = this.files.map((file, index) => `
            <div class="file-item" data-file-id="${file.id}" draggable="true">
                <div class="file-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                    </svg>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-details">
                        <span>Größe: ${this.formatFileSize(file.size)}</span>
                        <span>Encoding: ${file.encoding}</span>
                        ${file.elements ? `<span>Elemente: ${this.getTotalElements(file.elements)}</span>` : ''}
                    </div>
                </div>
                <div class="file-status">
                    <span class="status status--${this.getStatusClass(file.status)}">${this.getStatusText(file.status)}</span>
                </div>
                <div class="file-actions">
                    <button class="btn btn--secondary btn-icon" onclick="merger.removeFile('${file.id}')" title="Datei entfernen">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        this.setupFileDragAndDrop();
        this.updateStartButton();
    }

    setupFileDragAndDrop() {
        const fileItems = document.querySelectorAll('.file-item');
        
        fileItems.forEach(item => {
            item.addEventListener('dragstart', this.handleFileDragStart.bind(this));
            item.addEventListener('dragover', this.handleFileDragOver.bind(this));
            item.addEventListener('drop', this.handleFileDrop.bind(this));
            item.addEventListener('dragend', this.handleFileDragEnd.bind(this));
        });
    }

    handleFileDragStart(e) {
        e.dataTransfer.setData('text/plain', e.currentTarget.dataset.fileId);
        e.currentTarget.classList.add('dragging');
    }

    handleFileDragOver(e) {
        e.preventDefault();
    }

    handleFileDrop(e) {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetId = e.currentTarget.dataset.fileId;
        
        if (draggedId !== targetId) {
            this.reorderFiles(draggedId, targetId);
        }
    }

    handleFileDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
    }

    reorderFiles(draggedId, targetId) {
        const draggedIndex = this.files.findIndex(f => f.id.toString() === draggedId);
        const targetIndex = this.files.findIndex(f => f.id.toString() === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const draggedFile = this.files.splice(draggedIndex, 1)[0];
            this.files.splice(targetIndex, 0, draggedFile);
            this.renderFileList();
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getTotalElements(elements) {
        return Object.values(elements).reduce((total, arr) => total + arr.length, 0);
    }

    getStatusClass(status) {
        const statusMap = {
            'checking': 'warning',
            'valid': 'success',
            'invalid': 'error',
            'processing': 'info'
        };
        return statusMap[status] || 'info';
    }

    getStatusText(status) {
        const statusMap = {
            'checking': 'Prüfung läuft...',
            'valid': 'Gültig',
            'invalid': 'Ungültig',
            'processing': 'Verarbeitung...'
        };
        return statusMap[status] || status;
    }

    removeFile(fileId) {
        this.files = this.files.filter(f => f.id.toString() !== fileId.toString());
        this.renderFileList();
    }

    clearAllFiles() {
        this.files = [];
        this.renderFileList();
        this.hideResults();
    }

    updateConfiguration(e) {
        const element = e.target;
        const value = element.type === 'checkbox' ? element.checked : element.value;
        const key = element.id;

        if (key in this.config) {
            this.config[key] = value;
        }

        console.log('Configuration updated:', this.config);

        // Show auto-merge indicator if enabled
        if (key === 'autoMerge' && value) {
            this.showAutoMergeIndicator();
        }
    }

    showAutoMergeIndicator() {
        // Remove existing indicator
        const existing = document.querySelector('.auto-merge-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.className = 'auto-merge-indicator';
        indicator.innerHTML = '🚀 Auto-Merge aktiviert';
        document.body.appendChild(indicator);

        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 3000);
    }

    updateStartButton() {
        const startBtn = document.getElementById('startMergingBtn');
        const validFiles = this.files.filter(f => f.status === 'valid');
        
        startBtn.disabled = validFiles.length < 2 || this.isProcessing;
        
        if (validFiles.length < 2) {
            startBtn.title = 'Mindestens 2 gültige ARXML-Dateien erforderlich';
        } else {
            startBtn.title = 'Zusammenführung starten';
        }
    }

    async startMerging() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.processingStartTime = Date.now();
        this.showProcessingUI();
        this.resetProcessingStats();

        // Show processing speed indicator
        this.showSpeedIndicator();

        try {
            // Create backup if enabled
            if (this.config.autoBackup) {
                await this.createBackup();
            }

            await this.performMerging();

            // Auto-download if enabled
            if (this.config.autoDownload) {
                setTimeout(() => {
                    this.downloadFile('merged');
                    if (this.config.generateReport) {
                        this.downloadFile('mergeReport');
                    }
                }, 1000);
            }

            this.showResults(true);
        } catch (error) {
            this.showResults(false, error.message);
        } finally {
            this.isProcessing = false;
            this.hideProcessingUI();
            this.hideSpeedIndicator();
        }
    }

    showSpeedIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'speed-indicator';
        indicator.id = 'speedIndicator';
        indicator.innerHTML = 'Verarbeitung läuft...';

        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(indicator);
        }
    }

    hideSpeedIndicator() {
        const indicator = document.getElementById('speedIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    async createBackup() {
        // Simple backup by storing file info
        const backup = {
            timestamp: new Date().toISOString(),
            files: this.files.map(f => ({
                name: f.name,
                size: f.size,
                status: f.status
            })),
            config: { ...this.config }
        };

        localStorage.setItem('arxml_merger_backup', JSON.stringify(backup));
        console.log('Backup created:', backup);
    }

    async performMerging() {
        const validFiles = this.getValidFiles();
        const totalSteps = validFiles.length + 3; // Files + merge + validate + reports
        let currentStep = 0;

        this.updateProgress(0, 'Zusammenführung wird vorbereitet...');

        // Step 1: Process each file with parallel processing if enabled
        if (this.config.parallelProcessing && validFiles.length > 2) {
            this.updateProgress(10, 'Parallele Verarbeitung gestartet...');
            await this.processFilesInParallel(validFiles);
            currentStep = validFiles.length;
        } else {
            // Sequential processing for smaller sets or if parallel is disabled
            for (const file of validFiles) {
                this.updateProgress((currentStep / totalSteps) * 100, `Verarbeite ${file.name}...`);
                await this.processFileForMerging(file);
                this.processingStats.filesProcessed++;
                this.updateProcessingStats();
                this.updateLiveStats(); // Update live stats during processing
                currentStep++;
            }
        }

        // Step 2: Merge files with streaming for large files
        this.updateProgress((currentStep / totalSteps) * 100, 'Führe Dateien zusammen...');
        await this.mergeParsedFilesOptimized(validFiles);
        currentStep++;

        // Step 3: Validate merged result
        this.updateProgress((currentStep / totalSteps) * 100, 'Validiere zusammengeführte Datei...');
        await this.validateMergedResult();
        currentStep++;

        // Step 4: Generate reports
        this.updateProgress((currentStep / totalSteps) * 100, 'Erstelle Berichte...');
        await this.generateReports();
        currentStep++;

        this.updateProgress(100, 'Zusammenführung abgeschlossen!');
    }

    async processFilesInParallel(files) {
        const batchSize = Math.min(4, files.length); // Process max 4 files at once
        const batches = [];

        for (let i = 0; i < files.length; i += batchSize) {
            batches.push(files.slice(i, i + batchSize));
        }

        for (const batch of batches) {
            const promises = batch.map(file => this.processFileForMerging(file));
            await Promise.all(promises);

            this.processingStats.filesProcessed += batch.length;
            this.updateProcessingStats();
            this.updateLiveStats();
        }
    }

    async mergeParsedFilesOptimized(files) {
        // Use the existing merge logic but with memory optimization
        if (this.config.memoryOptimization === 'high') {
            // Process in chunks to avoid memory issues
            return await this.mergeParsedFilesChunked(files);
        } else {
            return await this.mergeParsedFiles(files);
        }
    }

    async mergeParsedFilesChunked(files) {
        const chunkSize = 2; // Process 2 files at a time for memory efficiency
        let mergedResult = null;

        for (let i = 0; i < files.length; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);

            if (mergedResult === null) {
                // First chunk
                await this.mergeParsedFiles(chunk);
                mergedResult = this.mergedData;
            } else {
                // Merge with previous result
                const tempFiles = [
                    { elements: mergedResult.elements, name: 'previous_merge' },
                    ...chunk
                ];
                await this.mergeParsedFiles(tempFiles);
            }

            // Force garbage collection hint
            if (window.gc) {
                window.gc();
            }
        }
    }

    async processFileForMerging(file) {
        // Simulate processing time for demonstration
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // File is already processed during upload
        // This is where additional processing could be done
    }

    async mergeParsedFiles(files) {
        // Create a new AUTOSAR document
        const mergedDoc = this.createMergedDocument();
        const mergedElements = {
            signals: [],
            components: [],
            interfaces: [],
            datatypes: [],
            ports: [],
            packages: [],
            clusters: [],
            ecus: [],
            systems: [],
            // Automotive-specific merged elements
            canClusters: [],
            canfdClusters: [],
            ethernetClusters: [],
            flexrayClusters: [],
            linClusters: [],
            iSignals: [],
            iSignalGroups: [],
            iPdus: [],
            frames: [],
            vlans: [],
            fibexElements: [],
            networkEndpoints: [],
            communicationConnectors: []
        };

        const conflicts = [];
        const elementRegistry = new Map(); // Track elements by unique identifier

        // Merge elements from each file based on priority
        for (const file of files) {
            if (!file.elements) continue;

            Object.keys(file.elements).forEach(category => {
                if (!mergedElements[category]) {
                    mergedElements[category] = [];
                }

                file.elements[category].forEach(element => {
                    const uniqueId = this.getAutomotiveElementUniqueId(element, category);
                    const existingElement = elementRegistry.get(uniqueId);

                    if (existingElement) {
                        // Handle conflict with automotive-specific logic
                        const conflict = {
                            type: 'element_conflict',
                            element: element.shortName,
                            category: category,
                            uniqueId: uniqueId,
                            existing: existingElement,
                            new: element,
                            files: [existingElement.sourceFile, file.name]
                        };

                        const resolution = this.resolveAutomotiveConflict(conflict, element, file, category);
                        conflict.resolution = resolution;
                        conflicts.push(conflict);

                        if (resolution === 'replace' || resolution === 'merge') {
                            // Replace or merge existing element
                            const index = mergedElements[category].findIndex(e =>
                                this.getAutomotiveElementUniqueId(e, category) === uniqueId
                            );

                            if (resolution === 'merge') {
                                mergedElements[category][index] = this.mergeAutomotiveElements(existingElement, element, file.name, category);
                            } else {
                                mergedElements[category][index] = { ...element, sourceFile: file.name };
                            }

                            elementRegistry.set(uniqueId, mergedElements[category][index]);
                        }

                        this.processingStats.conflictsResolved++;
                    } else {
                        // No conflict, add element with automotive validation
                        const elementWithSource = this.validateAutomotiveElement({ ...element, sourceFile: file.name }, category);
                        mergedElements[category].push(elementWithSource);
                        elementRegistry.set(uniqueId, elementWithSource);
                    }

                    this.processingStats.elementsMerged++;
                });
            });
        }

        // Build the actual merged XML document
        const mergedXmlDoc = await this.buildMergedXMLDocument(mergedElements, files);

        this.mergedData = {
            document: mergedXmlDoc,
            elements: mergedElements,
            conflicts: conflicts,
            sourceFiles: files.map(f => f.name),
            elementCount: Object.values(mergedElements).reduce((sum, arr) => sum + arr.length, 0)
        };

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    getElementUniqueId(element) {
        // Create unique identifier based on type, shortName, and path
        if (element.uuid) {
            return element.uuid;
        }

        const pathKey = element.path || '';
        const typeKey = element.type || '';
        const nameKey = element.shortName || '';

        return `${typeKey}:${pathKey}:${nameKey}`;
    }

    getAutomotiveElementUniqueId(element, category) {
        // Enhanced unique ID for automotive elements
        if (element.uuid) {
            return element.uuid;
        }

        const pathKey = element.path || '';
        const typeKey = element.type || '';
        const nameKey = element.shortName || '';

        // Add automotive-specific identifiers
        let automotiveKey = '';

        switch (category) {
            case 'iSignals':
                automotiveKey = `${element.length || ''}:${element.initValue || ''}`;
                break;
            case 'canClusters':
            case 'canfdClusters':
                automotiveKey = `${element.baudrate || ''}:${element.fdBaudrate || ''}`;
                break;
            case 'ethernetClusters':
                automotiveKey = element.vlans ? element.vlans.map(v => v.id).join(',') : '';
                break;
            case 'frames':
                automotiveKey = `${element.frameLength || ''}:${element.identifier || ''}`;
                break;
            case 'iPdus':
                automotiveKey = element.length || '';
                break;
            case 'fibexElements':
                automotiveKey = `${element.dest || ''}:${element.ref || ''}`;
                break;
        }

        return `${typeKey}:${pathKey}:${nameKey}:${automotiveKey}`;
    }

    resolveAutomotiveConflict(conflict, newElement, newFile, category) {
        // Automotive-specific conflict resolution

        // For signals: Never lose signals - always merge or keep both
        if (category === 'iSignals' || category === 'iSignalGroups') {
            return 'merge';
        }

        // For clusters: Merge configurations
        if (category.includes('Clusters') || category === 'clusters') {
            return 'merge';
        }

        // For FIBEX elements: Critical for Vector tools - always merge
        if (category === 'fibexElements') {
            return 'merge';
        }

        // For frames and PDUs: Merge to preserve all communication
        if (category === 'frames' || category === 'iPdus') {
            return 'merge';
        }

        // Default to intelligent merge
        return this.resolveConflict(conflict, newElement, newFile);
    }

    mergeAutomotiveElements(existing, newElement, sourceFile, category) {
        // Automotive-specific element merging
        const merged = { ...existing };

        // Update source file info
        merged.sourceFile = `${existing.sourceFile}, ${sourceFile}`;

        switch (category) {
            case 'iSignals':
                // Preserve all signal properties
                if (newElement.length && !existing.length) merged.length = newElement.length;
                if (newElement.initValue && !existing.initValue) merged.initValue = newElement.initValue;
                break;

            case 'canClusters':
            case 'canfdClusters':
                // Merge CAN configurations
                if (newElement.baudrate && !existing.baudrate) merged.baudrate = newElement.baudrate;
                if (newElement.fdBaudrate && !existing.fdBaudrate) merged.fdBaudrate = newElement.fdBaudrate;
                if (newElement.isCanFd) merged.isCanFd = true;
                break;

            case 'ethernetClusters':
                // Merge VLAN configurations
                if (newElement.vlans && newElement.vlans.length > 0) {
                    merged.vlans = merged.vlans || [];
                    newElement.vlans.forEach(newVlan => {
                        const existingVlan = merged.vlans.find(v => v.id === newVlan.id);
                        if (!existingVlan) {
                            merged.vlans.push(newVlan);
                        }
                    });
                }
                break;

            case 'frames':
                // Preserve frame properties
                if (newElement.frameLength && !existing.frameLength) merged.frameLength = newElement.frameLength;
                if (newElement.identifier && !existing.identifier) merged.identifier = newElement.identifier;
                break;

            case 'iPdus':
                // Preserve PDU properties
                if (newElement.length && !existing.length) merged.length = newElement.length;
                break;
        }

        // Always prefer newer element's DOM element if available
        if (newElement.element) {
            merged.element = newElement.element;
        }

        return merged;
    }

    validateAutomotiveElement(element, category) {
        // Validate automotive elements for CANape/CANoe compatibility

        // Ensure critical properties are present
        switch (category) {
            case 'iSignals':
                if (!element.length) {
                    console.warn(`Signal ${element.shortName} missing length - may cause CANape issues`);
                }
                break;

            case 'canClusters':
            case 'canfdClusters':
                if (!element.baudrate) {
                    console.warn(`CAN cluster ${element.shortName} missing baudrate - may cause CANoe issues`);
                }
                break;

            case 'frames':
                if (!element.identifier) {
                    console.warn(`Frame ${element.shortName} missing identifier - may cause Vector tool issues`);
                }
                break;
        }

        return element;
    }

    mergeElements(existing, newElement, sourceFile) {
        // Intelligent element merging - preserve important attributes
        const merged = { ...existing };

        // Update source file info
        merged.sourceFile = `${existing.sourceFile}, ${sourceFile}`;

        // If new element has UUID and existing doesn't, use new UUID
        if (newElement.uuid && !existing.uuid) {
            merged.uuid = newElement.uuid;
        }

        // Merge element content if available
        if (newElement.element && existing.element) {
            // For now, prefer the newer element's content
            merged.element = newElement.element;
        }

        return merged;
    }

    async buildMergedXMLDocument(mergedElements, sourceFiles) {
        // Create base AUTOSAR document structure with proper schema
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://autosar.org/schema/r4.0 autosar_4-0-3.xsd">
    <AR-PACKAGES>
        <!-- Merged content will be inserted here -->
    </AR-PACKAGES>
</AUTOSAR>`;

        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, 'text/xml');
        const packagesContainer = doc.querySelector('AR-PACKAGES');

        // Build automotive-compliant package hierarchy
        await this.buildAutomotivePackageHierarchy(doc, packagesContainer, mergedElements);

        return doc;
    }

    async buildAutomotivePackageHierarchy(doc, packagesContainer, mergedElements) {
        // Create structured packages for Vector tools compatibility

        // 1. Create Cluster package first (required by CANoe/CANape)
        if (this.hasAutomotiveClusters(mergedElements)) {
            const clusterPackage = this.createClusterPackage(doc, mergedElements);
            packagesContainer.appendChild(clusterPackage);
        }

        // 2. Create Signal package (critical for signal recognition)
        if (this.hasSignals(mergedElements)) {
            const signalPackage = this.createSignalPackage(doc, mergedElements);
            packagesContainer.appendChild(signalPackage);
        }

        // 3. Create Communication package (for PDUs and frames)
        if (this.hasCommunicationElements(mergedElements)) {
            const commPackage = this.createCommunicationPackage(doc, mergedElements);
            packagesContainer.appendChild(commPackage);
        }

        // 4. Add original packages (preserving structure)
        const packageHierarchy = this.buildPackageHierarchy(mergedElements);
        packageHierarchy.forEach(pkg => {
            if (pkg.element) {
                const importedNode = doc.importNode(pkg.element, true);
                packagesContainer.appendChild(importedNode);
            }
        });
    }

    hasAutomotiveClusters(mergedElements) {
        return (mergedElements.canClusters && mergedElements.canClusters.length > 0) ||
               (mergedElements.canfdClusters && mergedElements.canfdClusters.length > 0) ||
               (mergedElements.ethernetClusters && mergedElements.ethernetClusters.length > 0) ||
               (mergedElements.flexrayClusters && mergedElements.flexrayClusters.length > 0) ||
               (mergedElements.linClusters && mergedElements.linClusters.length > 0);
    }

    hasSignals(mergedElements) {
        return (mergedElements.iSignals && mergedElements.iSignals.length > 0) ||
               (mergedElements.iSignalGroups && mergedElements.iSignalGroups.length > 0);
    }

    hasCommunicationElements(mergedElements) {
        return (mergedElements.iPdus && mergedElements.iPdus.length > 0) ||
               (mergedElements.frames && mergedElements.frames.length > 0);
    }

    createClusterPackage(doc, mergedElements) {
        const clusterPkg = doc.createElement('AR-PACKAGE');
        clusterPkg.setAttribute('UUID', this.generateUUID());

        const shortName = doc.createElement('SHORT-NAME');
        shortName.textContent = 'Cluster';
        clusterPkg.appendChild(shortName);

        const elements = doc.createElement('ELEMENTS');
        clusterPkg.appendChild(elements);

        // Add all cluster types
        const clusterTypes = ['canClusters', 'canfdClusters', 'ethernetClusters', 'flexrayClusters', 'linClusters'];
        clusterTypes.forEach(type => {
            if (mergedElements[type]) {
                mergedElements[type].forEach(cluster => {
                    if (cluster.element) {
                        const importedCluster = doc.importNode(cluster.element, true);
                        elements.appendChild(importedCluster);
                    }
                });
            }
        });

        return clusterPkg;
    }

    createSignalPackage(doc, mergedElements) {
        const signalPkg = doc.createElement('AR-PACKAGE');
        signalPkg.setAttribute('UUID', this.generateUUID());

        const shortName = doc.createElement('SHORT-NAME');
        shortName.textContent = 'Signals';
        clusterPkg.appendChild(shortName);

        const elements = doc.createElement('ELEMENTS');
        signalPkg.appendChild(elements);

        // Add I-SIGNAL elements
        if (mergedElements.iSignals) {
            mergedElements.iSignals.forEach(signal => {
                if (signal.element) {
                    const importedSignal = doc.importNode(signal.element, true);
                    elements.appendChild(importedSignal);
                }
            });
        }

        // Add I-SIGNAL-GROUP elements
        if (mergedElements.iSignalGroups) {
            mergedElements.iSignalGroups.forEach(group => {
                if (group.element) {
                    const importedGroup = doc.importNode(group.element, true);
                    elements.appendChild(importedGroup);
                }
            });
        }

        return signalPkg;
    }

    createCommunicationPackage(doc, mergedElements) {
        const commPkg = doc.createElement('AR-PACKAGE');
        commPkg.setAttribute('UUID', this.generateUUID());

        const shortName = doc.createElement('SHORT-NAME');
        shortName.textContent = 'Communication';
        commPkg.appendChild(shortName);

        const elements = doc.createElement('ELEMENTS');
        commPkg.appendChild(elements);

        // Add I-PDU elements
        if (mergedElements.iPdus) {
            mergedElements.iPdus.forEach(pdu => {
                if (pdu.element) {
                    const importedPdu = doc.importNode(pdu.element, true);
                    elements.appendChild(importedPdu);
                }
            });
        }

        // Add FRAME elements
        if (mergedElements.frames) {
            mergedElements.frames.forEach(frame => {
                if (frame.element) {
                    const importedFrame = doc.importNode(frame.element, true);
                    elements.appendChild(importedFrame);
                }
            });
        }

        return commPkg;
    }

    generateUUID() {
        // Generate a simple UUID for new elements
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    buildPackageHierarchy(mergedElements) {
        // Organize packages in proper hierarchy
        const packages = mergedElements.packages || [];
        const hierarchy = [];

        // Sort packages by path depth (root packages first)
        packages.sort((a, b) => {
            const depthA = (a.path || '').split('/').length;
            const depthB = (b.path || '').split('/').length;
            return depthA - depthB;
        });

        return packages;
    }

    createMergedDocument() {
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://autosar.org/schema/r4.0 autosar_4-0-3.xsd">
    <AR-PACKAGES>
        <!-- Merged content will be inserted here -->
    </AR-PACKAGES>
</AUTOSAR>`;

        const parser = new DOMParser();
        return parser.parseFromString(xmlContent, 'text/xml');
    }

    checkForConflicts(element, existingElements) {
        const existing = existingElements.find(e => e.shortName === element.shortName && e.type === element.type);
        return existing ? { existing, existingFile: existing.sourceFile } : null;
    }

    resolveConflict(conflict, newElement, newFile) {
        switch (this.config.conflictStrategy) {
            case 'first-wins':
                return 'keep';
            case 'last-wins':
                return 'replace';
            case 'priority-order':
                // Based on file order in the list
                const existingFileIndex = this.files.findIndex(f => f.name === conflict.existing.sourceFile);
                const newFileIndex = this.files.findIndex(f => f.name === newFile.name);
                return newFileIndex < existingFileIndex ? 'replace' : 'keep';
            case 'merge':
                // Intelligent merge when possible
                if (this.canMergeElements(conflict.existing, newElement)) {
                    return 'merge';
                }
                return 'replace';
            case 'uuid-priority':
                // Prefer element with UUID
                if (newElement.uuid && !conflict.existing.uuid) {
                    return 'replace';
                } else if (!newElement.uuid && conflict.existing.uuid) {
                    return 'keep';
                }
                return 'replace'; // Default to newer if both have or don't have UUID
            default:
                return 'keep';
        }
    }

    canMergeElements(existing, newElement) {
        // Check if elements can be safely merged
        if (existing.type !== newElement.type) {
            return false;
        }

        // For packages, interfaces, and data types, merging is often possible
        const mergeableTypes = [
            'AR-PACKAGE', 'SENDER-RECEIVER-INTERFACE', 'CLIENT-SERVER-INTERFACE',
            'IMPLEMENTATION-DATA-TYPE', 'APPLICATION-PRIMITIVE-DATA-TYPE'
        ];

        return mergeableTypes.includes(existing.type);
    }

    async validateMergedResult() {
        if (!this.mergedData) return;

        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            elementCount: 0,
            automotiveValidation: {
                signalsValid: true,
                clustersValid: true,
                communicationValid: true,
                vectorToolsCompatible: true
            }
        };

        // Count total elements
        Object.values(this.mergedData.elements).forEach(category => {
            validation.elementCount += category.length;
        });

        // Basic validation checks
        if (validation.elementCount === 0) {
            validation.valid = false;
            validation.errors.push('Keine Elemente in der zusammengeführten Datei gefunden');
        }

        // Automotive-specific validation for CANape/CANoe
        await this.validateAutomotiveCompatibility(validation);

        // Simulate validation time
        await new Promise(resolve => setTimeout(resolve, 800));

        this.mergedData.validation = validation;
    }

    async validateAutomotiveCompatibility(validation) {
        const elements = this.mergedData.elements;

        // Validate signals for CANape compatibility
        this.validateSignalsForCANape(elements, validation);

        // Validate clusters for CANoe compatibility
        this.validateClustersForCANoe(elements, validation);

        // Validate communication elements
        this.validateCommunicationElements(elements, validation);

        // Validate FIBEX structure for Vector tools
        this.validateFibexStructure(elements, validation);
    }

    validateSignalsForCANape(elements, validation) {
        // Check I-SIGNAL elements
        if (elements.iSignals) {
            elements.iSignals.forEach(signal => {
                if (!signal.length) {
                    validation.warnings.push(`Signal ${signal.shortName} fehlt LENGTH - kann CANape-Probleme verursachen`);
                    validation.automotiveValidation.signalsValid = false;
                }

                if (!signal.element) {
                    validation.errors.push(`Signal ${signal.shortName} fehlt DOM-Element - kritisch für CANape`);
                    validation.valid = false;
                    validation.automotiveValidation.signalsValid = false;
                }
            });
        }

        // Check signal groups
        if (elements.iSignalGroups) {
            elements.iSignalGroups.forEach(group => {
                if (!group.element) {
                    validation.errors.push(`Signal-Gruppe ${group.shortName} fehlt DOM-Element`);
                    validation.valid = false;
                    validation.automotiveValidation.signalsValid = false;
                }
            });
        }
    }

    validateClustersForCANoe(elements, validation) {
        // Validate CAN clusters
        if (elements.canClusters) {
            elements.canClusters.forEach(cluster => {
                if (!cluster.baudrate) {
                    validation.warnings.push(`CAN-Cluster ${cluster.shortName} fehlt BAUDRATE - kann CANoe-Probleme verursachen`);
                    validation.automotiveValidation.clustersValid = false;
                }
            });
        }

        // Validate CAN-FD clusters
        if (elements.canfdClusters) {
            elements.canfdClusters.forEach(cluster => {
                if (!cluster.baudrate) {
                    validation.warnings.push(`CAN-FD-Cluster ${cluster.shortName} fehlt BAUDRATE`);
                    validation.automotiveValidation.clustersValid = false;
                }
                if (!cluster.fdBaudrate) {
                    validation.warnings.push(`CAN-FD-Cluster ${cluster.shortName} fehlt FD-BAUDRATE`);
                    validation.automotiveValidation.clustersValid = false;
                }
            });
        }

        // Validate Ethernet clusters and VLANs
        if (elements.ethernetClusters) {
            elements.ethernetClusters.forEach(cluster => {
                if (!cluster.vlans || cluster.vlans.length === 0) {
                    validation.warnings.push(`Ethernet-Cluster ${cluster.shortName} hat keine VLANs definiert`);
                }
            });
        }
    }

    validateCommunicationElements(elements, validation) {
        // Validate frames
        if (elements.frames) {
            elements.frames.forEach(frame => {
                if (!frame.identifier) {
                    validation.errors.push(`Frame ${frame.shortName} fehlt IDENTIFIER - kritisch für Vector Tools`);
                    validation.valid = false;
                    validation.automotiveValidation.communicationValid = false;
                }

                if (!frame.frameLength) {
                    validation.warnings.push(`Frame ${frame.shortName} fehlt FRAME-LENGTH`);
                    validation.automotiveValidation.communicationValid = false;
                }
            });
        }

        // Validate PDUs
        if (elements.iPdus) {
            elements.iPdus.forEach(pdu => {
                if (!pdu.length) {
                    validation.warnings.push(`I-PDU ${pdu.shortName} fehlt LENGTH`);
                    validation.automotiveValidation.communicationValid = false;
                }
            });
        }
    }

    validateFibexStructure(elements, validation) {
        // FIBEX elements are critical for Vector tools
        if (!elements.fibexElements || elements.fibexElements.length === 0) {
            validation.warnings.push('Keine FIBEX-Elemente gefunden - kann Vector Tools Kompatibilität beeinträchtigen');
            validation.automotiveValidation.vectorToolsCompatible = false;
        }

        // Check for network endpoints
        if (!elements.networkEndpoints || elements.networkEndpoints.length === 0) {
            validation.warnings.push('Keine Network-Endpoints gefunden');
        }

        // Check for communication connectors
        if (!elements.communicationConnectors || elements.communicationConnectors.length === 0) {
            validation.warnings.push('Keine Communication-Connectors gefunden');
        }
    }

    async generateReports() {
        // Generate merge report
        this.reports.merge = this.generateMergeReport();
        
        // Generate validation report
        this.reports.validation = this.generateValidationReport();
        
        // Generate conflict log
        this.reports.conflicts = this.generateConflictLog();

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    generateMergeReport() {
        if (!this.mergedData) return null;

        const report = {
            timestamp: new Date().toISOString(),
            sourceFiles: this.mergedData.sourceFiles,
            totalElements: 0,
            elementsByCategory: {},
            automotiveElements: {
                signals: 0,
                clusters: 0,
                communication: 0,
                networks: []
            },
            vectorToolsCompatibility: {
                canapeReady: true,
                canoeReady: true,
                issues: []
            },
            processingTime: Date.now(),
            summary: ''
        };

        // Count all elements
        Object.keys(this.mergedData.elements).forEach(category => {
            const count = this.mergedData.elements[category].length;
            report.elementsByCategory[category] = count;
            report.totalElements += count;
        });

        // Count automotive-specific elements
        this.generateAutomotiveReport(report);

        // Check Vector tools compatibility
        this.checkVectorToolsCompatibility(report);

        report.summary = this.generateAutomotiveSummary(report);

        return report;
    }

    generateAutomotiveReport(report) {
        const elements = this.mergedData.elements;

        // Count signals
        report.automotiveElements.signals =
            (elements.iSignals?.length || 0) +
            (elements.iSignalGroups?.length || 0);

        // Count clusters and identify networks
        const clusterTypes = ['canClusters', 'canfdClusters', 'ethernetClusters', 'flexrayClusters', 'linClusters'];
        clusterTypes.forEach(type => {
            if (elements[type] && elements[type].length > 0) {
                report.automotiveElements.clusters += elements[type].length;

                elements[type].forEach(cluster => {
                    const networkInfo = {
                        name: cluster.shortName,
                        type: type.replace('Clusters', '').toUpperCase(),
                        baudrate: cluster.baudrate,
                        fdBaudrate: cluster.fdBaudrate,
                        vlans: cluster.vlans?.length || 0
                    };
                    report.automotiveElements.networks.push(networkInfo);
                });
            }
        });

        // Count communication elements
        report.automotiveElements.communication =
            (elements.iPdus?.length || 0) +
            (elements.frames?.length || 0);
    }

    checkVectorToolsCompatibility(report) {
        const validation = this.mergedData.validation;

        if (validation && validation.automotiveValidation) {
            const autoVal = validation.automotiveValidation;

            report.vectorToolsCompatibility.canapeReady = autoVal.signalsValid;
            report.vectorToolsCompatibility.canoeReady = autoVal.clustersValid && autoVal.communicationValid;

            if (!autoVal.signalsValid) {
                report.vectorToolsCompatibility.issues.push('Signal-Probleme erkannt - CANape könnte Schwierigkeiten haben');
            }

            if (!autoVal.clustersValid) {
                report.vectorToolsCompatibility.issues.push('Cluster-Konfigurationsprobleme - CANoe könnte Schwierigkeiten haben');
            }

            if (!autoVal.communicationValid) {
                report.vectorToolsCompatibility.issues.push('Kommunikationselemente unvollständig');
            }

            if (!autoVal.vectorToolsCompatible) {
                report.vectorToolsCompatibility.issues.push('FIBEX-Struktur möglicherweise unvollständig');
            }
        }
    }

    generateAutomotiveSummary(report) {
        let summary = `Erfolgreich ${report.totalElements} Elemente aus ${report.sourceFiles.length} Dateien zusammengeführt.\n\n`;

        summary += `🚗 AUTOMOTIVE ÜBERSICHT:\n`;
        summary += `• ${report.automotiveElements.signals} Signale\n`;
        summary += `• ${report.automotiveElements.clusters} Netzwerk-Cluster\n`;
        summary += `• ${report.automotiveElements.communication} Kommunikationselemente\n\n`;

        if (report.automotiveElements.networks.length > 0) {
            summary += `🌐 ERKANNTE NETZWERKE:\n`;
            report.automotiveElements.networks.forEach((network, index) => {
                const anonymizedName = `Network_${String(index + 1).padStart(2, '0')}`;
                summary += `• ${anonymizedName} (${network.type})`;
                if (network.baudrate) summary += ` - ${network.baudrate} bps`;
                if (network.fdBaudrate) summary += ` / FD: ${network.fdBaudrate} bps`;
                if (network.vlans > 0) summary += ` - ${network.vlans} VLANs`;
                summary += `\n`;
            });
            summary += `\n`;
        }

        summary += `🔧 VECTOR TOOLS KOMPATIBILITÄT:\n`;
        summary += `• CANape: ${report.vectorToolsCompatibility.canapeReady ? '✅ Bereit' : '⚠️ Probleme'}\n`;
        summary += `• CANoe: ${report.vectorToolsCompatibility.canoeReady ? '✅ Bereit' : '⚠️ Probleme'}\n`;

        if (report.vectorToolsCompatibility.issues.length > 0) {
            summary += `\n⚠️ HINWEISE:\n`;
            report.vectorToolsCompatibility.issues.forEach(issue => {
                summary += `• ${issue}\n`;
            });
        }

        return summary;
    }

    generateValidationReport() {
        if (!this.mergedData || !this.mergedData.validation) return null;

        return {
            timestamp: new Date().toISOString(),
            valid: this.mergedData.validation.valid,
            errors: this.mergedData.validation.errors,
            warnings: this.mergedData.validation.warnings,
            elementCount: this.mergedData.validation.elementCount
        };
    }

    generateConflictLog() {
        if (!this.mergedData) return null;

        return {
            timestamp: new Date().toISOString(),
            totalConflicts: this.mergedData.conflicts.length,
            conflicts: this.mergedData.conflicts,
            strategy: this.config.conflictStrategy
        };
    }

    showProcessingUI() {
        document.getElementById('processingStatus').style.display = 'block';
        document.getElementById('startMergingBtn').style.display = 'none';
        document.getElementById('cancelBtn').style.display = 'inline-flex';
        document.getElementById('mergingBtnText').textContent = 'Verarbeitung läuft...';
    }

    hideProcessingUI() {
        document.getElementById('processingStatus').style.display = 'none';
        document.getElementById('startMergingBtn').style.display = 'inline-flex';
        document.getElementById('cancelBtn').style.display = 'none';
        document.getElementById('mergingBtnText').textContent = 'Zusammenführung starten';
        this.updateStartButton();
    }

    updateProgress(percentage, message) {
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = `${Math.round(percentage)}%`;
        this.addStatusMessage(message);
    }

    addStatusMessage(message, type = 'info') {
        const statusMessages = document.getElementById('statusMessages');
        const messageElement = document.createElement('div');
        messageElement.className = `status-message ${type}`;
        messageElement.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        
        statusMessages.appendChild(messageElement);
        statusMessages.scrollTop = statusMessages.scrollHeight;
        
        // Limit number of messages
        while (statusMessages.children.length > 10) {
            statusMessages.removeChild(statusMessages.firstChild);
        }
    }

    resetProcessingStats() {
        this.processingStats = {
            filesProcessed: 0,
            elementsMerged: 0,
            conflictsResolved: 0
        };
        this.updateProcessingStats();
    }

    updateProcessingStats() {
        document.getElementById('filesProcessed').textContent = this.processingStats.filesProcessed;
        document.getElementById('elementsMerged').textContent = this.processingStats.elementsMerged;
        document.getElementById('conflictsResolved').textContent = this.processingStats.conflictsResolved;
    }

    showResults(success, errorMessage = null) {
        const resultsSection = document.getElementById('resultsSection');
        const resultStatus = document.getElementById('resultStatus');
        
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        if (success) {
            resultStatus.innerHTML = `
                <div class="result-success">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22,4 12,14.01 9,11.01"></polyline>
                    </svg>
                    <div>
                        <strong>Zusammenführung erfolgreich abgeschlossen!</strong>
                        <p>Die ARXML-Dateien wurden erfolgreich zusammengeführt und validiert.</p>
                    </div>
                </div>
            `;
            this.updateSummaryStats();
        } else {
            resultStatus.innerHTML = `
                <div class="result-error">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <div>
                        <strong>Fehler bei der Zusammenführung</strong>
                        <p>${errorMessage || 'Ein unbekannter Fehler ist aufgetreten.'}</p>
                    </div>
                </div>
            `;
        }
    }

    updateSummaryStats() {
        const summaryStats = document.getElementById('summaryStats');
        if (!this.mergedData) return;

        const stats = [
            { label: 'Signale erhalten', value: this.mergedData.elements.signals.length },
            { label: 'Elemente zusammengeführt', value: this.processingStats.elementsMerged },
            { label: 'Konflikte aufgelöst', value: this.processingStats.conflictsResolved },
            { label: 'Dateien verarbeitet', value: this.processingStats.filesProcessed }
        ];

        summaryStats.innerHTML = stats.map(stat => `
            <div class="summary-stat">
                <div class="summary-stat-value">${stat.value}</div>
                <div class="summary-stat-label">${stat.label}</div>
            </div>
        `).join('');
    }

    hideResults() {
        document.getElementById('resultsSection').style.display = 'none';
    }

    cancelProcessing() {
        if (this.isProcessing) {
            this.isProcessing = false;
            this.hideProcessingUI();
            this.addStatusMessage('Verarbeitung abgebrochen', 'warning');
        }
    }

    toggleAdvancedOptions() {
        const content = document.getElementById('advancedContent');
        const toggleText = document.getElementById('advancedToggleText');
        const toggleIcon = document.getElementById('advancedToggleIcon');
        
        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            content.classList.add('slide-down');
            toggleText.textContent = 'Verbergen';
            toggleIcon.classList.add('rotated');
        } else {
            content.style.display = 'none';
            toggleText.textContent = 'Anzeigen';
            toggleIcon.classList.remove('rotated');
        }
    }

    downloadFile(type) {
        let content, filename, mimeType;

        switch (type) {
            case 'merged':
                if (!this.mergedData) return;
                content = this.generateMergedXMLContent();
                filename = this.generateIntelligentFilename();
                mimeType = 'application/xml';
                break;
            case 'mergeReport':
                if (!this.reports.merge) return;
                content = JSON.stringify(this.reports.merge, null, 2);
                filename = this.generateReportFilename('merge_report');
                mimeType = 'application/json';
                break;
            case 'validationReport':
                if (!this.reports.validation) return;
                content = JSON.stringify(this.reports.validation, null, 2);
                filename = this.generateReportFilename('validation_report');
                mimeType = 'application/json';
                break;
            case 'conflictLog':
                if (!this.reports.conflicts) return;
                content = JSON.stringify(this.reports.conflicts, null, 2);
                filename = this.generateReportFilename('conflict_log');
                mimeType = 'application/json';
                break;
            default:
                return;
        }

        this.downloadBlob(content, filename, mimeType);
    }

    generateIntelligentFilename() {
        if (!this.mergedData || !this.mergedData.sourceFiles) {
            return this.config.outputFileName;
        }

        const sourceFiles = this.mergedData.sourceFiles;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

        // Extract common prefixes or patterns from source files
        const commonPrefix = this.findCommonPrefix(sourceFiles);
        const fileCount = sourceFiles.length;

        let baseName = '';

        if (commonPrefix && commonPrefix.length > 3) {
            // Use common prefix if meaningful
            baseName = commonPrefix.replace(/[_-]+$/, '');
        } else {
            // Use first file's base name
            const firstFile = sourceFiles[0];
            baseName = firstFile.replace(/\.(arxml|xml)$/i, '');
        }

        // Clean up the base name
        baseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');

        return `${baseName}_merged_${fileCount}files_${timestamp}.arxml`;
    }

    generateReportFilename(reportType) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const fileCount = this.mergedData ? this.mergedData.sourceFiles.length : 0;

        return `${reportType}_${fileCount}files_${timestamp}.json`;
    }

    findCommonPrefix(strings) {
        if (!strings || strings.length === 0) return '';
        if (strings.length === 1) return strings[0].replace(/\.(arxml|xml)$/i, '');

        let prefix = strings[0];
        for (let i = 1; i < strings.length; i++) {
            while (strings[i].indexOf(prefix) !== 0) {
                prefix = prefix.substring(0, prefix.length - 1);
                if (prefix === '') return '';
            }
        }

        return prefix;
    }

    generateMergedXMLContent() {
        if (!this.mergedData) return '';

        try {
            // Use the actual merged document if available
            if (this.mergedData.document) {
                const serializer = new XMLSerializer();
                let xmlString = serializer.serializeToString(this.mergedData.document);

                // Clean up the XML formatting
                xmlString = this.formatXML(xmlString);
                return xmlString;
            }

            // Fallback: Create XML structure from elements
            return this.generateXMLFromElements();

        } catch (error) {
            console.error('Error generating merged XML:', error);
            return this.generateXMLFromElements();
        }
    }

    generateXMLFromElements() {
        let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://autosar.org/schema/r4.0 autosar_4-0-3.xsd">
    <AR-PACKAGES>`;

        // Add merge metadata as comment
        xmlContent += `\n        <!-- MERGED ARXML FILE -->`;
        xmlContent += `\n        <!-- Generated: ${new Date().toISOString()} -->`;
        xmlContent += `\n        <!-- Source files: ${this.mergedData.sourceFiles.join(', ')} -->`;
        xmlContent += `\n        <!-- Total elements: ${this.mergedData.elementCount || 0} -->`;

        if (this.mergedData.conflicts && this.mergedData.conflicts.length > 0) {
            xmlContent += `\n        <!-- Conflicts resolved: ${this.mergedData.conflicts.length} -->`;
        }

        // Add packages first (they contain other elements)
        if (this.mergedData.elements.packages && this.mergedData.elements.packages.length > 0) {
            this.mergedData.elements.packages.forEach(pkg => {
                if (pkg.element) {
                    try {
                        const serializer = new XMLSerializer();
                        const pkgXML = serializer.serializeToString(pkg.element);
                        // Remove XML declaration if present
                        const cleanXML = pkgXML.replace(/<\?xml[^>]*\?>\s*/, '');
                        xmlContent += `\n        ${cleanXML}`;
                    } catch (error) {
                        // Fallback to simple representation
                        xmlContent += `\n        <AR-PACKAGE${pkg.uuid ? ` UUID="${pkg.uuid}"` : ''}>`;
                        xmlContent += `\n            <SHORT-NAME>${pkg.shortName}</SHORT-NAME>`;
                        xmlContent += `\n            <!-- Content from ${pkg.sourceFile} -->`;
                        xmlContent += `\n        </AR-PACKAGE>`;
                    }
                } else {
                    // Simple package representation
                    xmlContent += `\n        <AR-PACKAGE${pkg.uuid ? ` UUID="${pkg.uuid}"` : ''}>`;
                    xmlContent += `\n            <SHORT-NAME>${pkg.shortName}</SHORT-NAME>`;
                    xmlContent += `\n            <!-- Content from ${pkg.sourceFile} -->`;
                    xmlContent += `\n        </AR-PACKAGE>`;
                }
            });
        }

        xmlContent += `\n    </AR-PACKAGES>
</AUTOSAR>`;

        return xmlContent;
    }

    formatXML(xmlString) {
        // Basic XML formatting
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlString, 'text/xml');
            const serializer = new XMLSerializer();
            return serializer.serializeToString(doc);
        } catch (error) {
            return xmlString;
        }
    }

    downloadBlob(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showMessage(message, type = 'info') {
        // Create a modern toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('toast--show'), 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('toast--show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);

        console.log(`${type.toUpperCase()}: ${message}`);
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    updateUI() {
        this.renderFileList();
        this.updateStartButton();
        this.updateLiveStats();
        this.updatePreview();
    }

    getValidFiles() {
        return this.files.filter(f => f.status === 'valid');
    }

    updateLiveStats() {
        const statsSection = document.getElementById('statsSection');
        const quickSettings = document.getElementById('quickSettings');

        if (this.files.length > 0) {
            statsSection.style.display = 'block';
            quickSettings.style.display = 'block';

            const validFiles = this.getValidFiles();
            const totalSize = this.files.reduce((sum, file) => sum + file.size, 0);
            const totalElements = validFiles.reduce((sum, file) => {
                if (file.elements) {
                    return sum + Object.values(file.elements).reduce((elemSum, arr) => elemSum + arr.length, 0);
                }
                return sum;
            }, 0);

            // Count automotive-specific elements
            const automotiveStats = this.calculateAutomotiveStats(validFiles);

            // Update stats
            document.getElementById('fileCount').textContent = validFiles.length;
            document.getElementById('elementCount').textContent = totalElements.toLocaleString();
            document.getElementById('totalSize').textContent = this.formatFileSize(totalSize);

            // Processing speed (will be updated during processing)
            if (this.isProcessing) {
                const speed = this.calculateProcessingSpeed();
                document.getElementById('processingSpeed').textContent = speed;
            } else {
                document.getElementById('processingSpeed').textContent = '0 MB/s';
            }
        } else {
            statsSection.style.display = 'none';
            quickSettings.style.display = 'none';
        }
    }

    updatePreview() {
        const previewContent = document.getElementById('previewContent');
        const validFiles = this.getValidFiles();

        if (validFiles.length === 0) {
            previewContent.innerHTML = '<p>Dateien hinzufügen für Vorschau...</p>';
            return;
        }

        let preview = '<div class="preview-items">';

        // Show automotive overview first
        const automotiveStats = this.calculateAutomotiveStats(validFiles);
        if (automotiveStats.totalSignals > 0 || automotiveStats.totalClusters > 0) {
            preview += `<div class="automotive-overview">
                <strong>🚗 AUTOMOTIVE ÜBERSICHT</strong><br>
                <small>Signale: ${automotiveStats.totalSignals} | Cluster: ${automotiveStats.totalClusters}</small><br>
                <small>Netzwerke: ${automotiveStats.networks.join(', ')}</small>
            </div>`;
        }

        validFiles.slice(0, 3).forEach(file => {
            preview += `<div class="preview-file">
                <strong>📁 ${file.name}</strong><br>
                <small>Größe: ${this.formatFileSize(file.size)}</small>`;

            if (file.elements) {
                const elementCount = Object.values(file.elements).reduce((sum, arr) => sum + arr.length, 0);
                preview += `<br><small>Elemente: ${elementCount}</small>`;

                // Show automotive-specific elements
                const automotiveElements = this.getAutomotiveElementsFromFile(file);
                if (automotiveElements.length > 0) {
                    preview += '<br><small>🚗 ';
                    preview += automotiveElements.join(', ');
                    preview += '</small>';
                }

                // Show top element types
                const topTypes = Object.entries(file.elements)
                    .filter(([_, arr]) => arr.length > 0)
                    .sort(([_, a], [__, b]) => b.length - a.length)
                    .slice(0, 3);

                if (topTypes.length > 0) {
                    preview += '<br><small>Top: ';
                    preview += topTypes.map(([type, arr]) => `${type}(${arr.length})`).join(', ');
                    preview += '</small>';
                }
            }

            preview += '</div>';
        });

        if (validFiles.length > 3) {
            preview += `<div class="preview-more">... und ${validFiles.length - 3} weitere Dateien</div>`;
        }

        preview += '</div>';
        previewContent.innerHTML = preview;
    }

    calculateAutomotiveStats(files) {
        const stats = {
            totalSignals: 0,
            totalClusters: 0,
            networks: [],
            canClusters: 0,
            canfdClusters: 0,
            ethernetClusters: 0,
            flexrayClusters: 0,
            linClusters: 0
        };

        files.forEach(file => {
            if (file.elements) {
                // Count signals
                stats.totalSignals += (file.elements.iSignals?.length || 0) +
                                    (file.elements.iSignalGroups?.length || 0);

                // Count clusters by type
                const clusterTypes = ['canClusters', 'canfdClusters', 'ethernetClusters', 'flexrayClusters', 'linClusters'];
                clusterTypes.forEach(type => {
                    if (file.elements[type]) {
                        stats[type] += file.elements[type].length;
                        stats.totalClusters += file.elements[type].length;

                        // Add anonymized network names
                        file.elements[type].forEach((cluster, index) => {
                            const anonymizedName = `${type.replace('Clusters', '')}_${index + 1}`;
                            if (!stats.networks.includes(anonymizedName)) {
                                stats.networks.push(anonymizedName);
                            }
                        });
                    }
                });
            }
        });

        return stats;
    }

    getAutomotiveElementsFromFile(file) {
        const automotiveElements = [];

        if (file.elements) {
            if (file.elements.iSignals?.length > 0) {
                automotiveElements.push(`${file.elements.iSignals.length} Signale`);
            }

            if (file.elements.canClusters?.length > 0) {
                automotiveElements.push(`${file.elements.canClusters.length} CAN`);
            }

            if (file.elements.canfdClusters?.length > 0) {
                automotiveElements.push(`${file.elements.canfdClusters.length} CAN-FD`);
            }

            if (file.elements.ethernetClusters?.length > 0) {
                automotiveElements.push(`${file.elements.ethernetClusters.length} Ethernet`);
            }

            if (file.elements.flexrayClusters?.length > 0) {
                automotiveElements.push(`${file.elements.flexrayClusters.length} FlexRay`);
            }

            if (file.elements.linClusters?.length > 0) {
                automotiveElements.push(`${file.elements.linClusters.length} LIN`);
            }
        }

        return automotiveElements;
    }

    calculateProcessingSpeed() {
        if (!this.processingStartTime) return '0 MB/s';

        const elapsed = (Date.now() - this.processingStartTime) / 1000; // seconds
        const processedSize = this.processingStats.filesProcessed * 50; // Estimate 50MB per file
        const speed = processedSize / elapsed;

        return this.formatFileSize(speed) + '/s';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    initializeCoolFeatures() {
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Copy-paste support
        this.setupCopyPasteSupport();

        // Auto-save settings
        this.loadSavedSettings();

        // Dark mode toggle
        this.setupDarkModeToggle();

        // Batch processing
        this.setupBatchProcessing();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+O: Open files
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                document.getElementById('fileInput').click();
            }

            // Ctrl+Enter: Start merging
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (this.getValidFiles().length >= 2 && !this.isProcessing) {
                    this.startMerging();
                }
            }

            // Ctrl+S: Download merged file
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.mergedData) {
                    this.downloadFile('merged');
                }
            }

            // Escape: Clear all files
            if (e.key === 'Escape') {
                this.clearAllFiles();
            }
        });
    }

    setupCopyPasteSupport() {
        document.addEventListener('paste', async (e) => {
            const items = e.clipboardData.items;
            const files = [];

            for (let item of items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file.name.toLowerCase().endsWith('.arxml') ||
                        file.name.toLowerCase().endsWith('.xml')) {
                        files.push(file);
                    }
                }
            }

            if (files.length > 0) {
                this.showMessage(`📋 ${files.length} Datei(en) aus Zwischenablage eingefügt`, 'success');
                await this.processFiles(files);
            }
        });
    }

    setupDarkModeToggle() {
        // Auto-detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.documentElement.setAttribute('data-color-scheme', 'dark');
        }

        // Listen for system changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            document.documentElement.setAttribute('data-color-scheme', e.matches ? 'dark' : 'light');
        });
    }

    setupBatchProcessing() {
        // Add batch processing button
        const header = document.querySelector('.header__content');
        if (header) {
            const batchBtn = document.createElement('button');
            batchBtn.className = 'btn btn--secondary';
            batchBtn.innerHTML = '📁 Ordner verarbeiten';
            batchBtn.onclick = () => this.processFolderBatch();
            header.appendChild(batchBtn);
        }
    }

    async processFolderBatch() {
        // Create folder input
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;

        input.onchange = async (e) => {
            const files = Array.from(e.target.files).filter(file =>
                file.name.toLowerCase().endsWith('.arxml') ||
                file.name.toLowerCase().endsWith('.xml')
            );

            if (files.length > 0) {
                this.showMessage(`📁 ${files.length} ARXML-Dateien im Ordner gefunden`, 'info');
                await this.processFiles(files);
            } else {
                this.showMessage('Keine ARXML-Dateien im Ordner gefunden', 'warning');
            }
        };

        input.click();
    }

    loadSavedSettings() {
        const saved = localStorage.getItem('arxml_merger_settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                Object.assign(this.config, settings);
                this.applySettings();
            } catch (error) {
                console.warn('Could not load saved settings:', error);
            }
        }
    }

    saveSettings() {
        localStorage.setItem('arxml_merger_settings', JSON.stringify(this.config));
    }

    applySettings() {
        // Apply saved settings to UI elements
        Object.keys(this.config).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.config[key];
                } else {
                    element.value = this.config[key];
                }
            }
        });
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.merger = new ARXMLMerger();
});