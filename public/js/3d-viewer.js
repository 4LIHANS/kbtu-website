// 3D Model Viewer with Interactive Components
class ModelViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.interactiveObjects = [];
        this.modelData = this.getModelData();
        
        this.init();
    }

    init() {
        try {
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLighting();
            this.createTestGeometry(); // Show a test shape immediately
            this.loadModel(); // Load the OBJ file
            this.setupControls();
            this.setupEventListeners();
            this.animate();
        } catch (e) {
            console.error('Error initializing 3D viewer:', e);
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
    }

    setupCamera() {
        const container = document.getElementById('canvas-container');
        const width = container ? container.clientWidth : 800;
        const height = container ? container.clientHeight : 600;
        
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, 2, 5);
    }

    setupRenderer() {
        const container = document.getElementById('canvas-container');
        if (!container) return;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight || 600);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.4);
        pointLight.position.set(-5, 5, 5);
        this.scene.add(pointLight);
    }

    createTestGeometry() {
        // Create a test cube to show something immediately
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const cube = new THREE.Mesh(geometry, material);
        
        cube.userData.originalMaterial = material.clone();
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.name = 'Test Model';
        
        this.interactiveObjects.push(cube);
        this.scene.add(cube);
        console.log('Test cube created');
    }

    loadModel() {
        console.log('Attempting to load OBJ model from img/3d.obj');
        
        if (typeof THREE.OBJLoader === 'undefined') {
            console.error('OBJLoader not available');
            return;
        }
        
        const loader = new THREE.OBJLoader();
        loader.load(
            'img/3d.obj',
            (object) => {
                console.log('OBJ model loaded successfully!');
                
                // Clear the test geometry
                this.scene.clear();
                this.interactiveObjects = [];
                
                // Add lights back
                this.setupLighting();
                
                // Add the loaded model
                this.model = object;
                object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.userData.originalMaterial = child.material.clone();
                        this.interactiveObjects.push(child);
                    }
                });
                
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                
                object.position.copy(box.getCenter(new THREE.Vector3()).multiplyScalar(-scale));
                object.scale.multiplyScalar(scale);
                
                this.scene.add(object);
                console.log('Model added to scene');
            },
            (progress) => {
                console.log('Loading progress: ' + Math.round((progress.loaded / progress.total) * 100) + '%');
            },
            (error) => {
                console.error('Failed to load OBJ model:', error);
            }
        );
    }

    setupControls() {
        this.isRotating = false;
        this.isPanning = false;
        this.previousMousePosition = { x: 0, y: 0 };
    }

    setupEventListeners() {
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('wheel', (e) => this.onScroll(e), false);
        
        const closeBtn = document.getElementById('tooltip-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideTooltip());
        }
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onMouseDown(e) {
        if (e.button === 0) { // Left mouse button
            this.isRotating = true;
        } else if (e.button === 2) { // Right mouse button
            this.isPanning = true;
        }
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    onMouseUp(e) {
        this.isRotating = false;
        this.isPanning = false;
    }

    onMouseMove(e) {
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Rotation
        if (this.isRotating && this.model) {
            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;
            
            this.model.rotation.y += deltaX * 0.01;
            this.model.rotation.x += deltaY * 0.01;
        }

        // Panning
        if (this.isPanning) {
            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;
            
            this.camera.position.x -= deltaX * 0.01;
            this.camera.position.y += deltaY * 0.01;
        }

        this.previousMousePosition = { x: e.clientX, y: e.clientY };

        // Raycasting for hover effect
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            if (this.selectedObject !== hoveredObject) {
                this.selectObject(hoveredObject);
            }
        } else {
            this.deselectObject();
        }
    }

    onScroll(e) {
        e.preventDefault();
        
        const zoomSpeed = 0.1;
        if (e.deltaY > 0) {
            this.camera.position.z += zoomSpeed;
        } else {
            this.camera.position.z = Math.max(1, this.camera.position.z - zoomSpeed);
        }
    }

    selectObject(obj) {
        // Deselect previous
        if (this.selectedObject) {
            this.selectedObject.material = this.selectedObject.userData.originalMaterial;
        }

        this.selectedObject = obj;
        
        // Highlight selected object
        const highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff6600,
            emissiveIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.4
        });
        obj.material = highlightMaterial;

        // Show tooltip
        this.showTooltip(obj);
        
        // Slightly scale up
        obj.scale.multiplyScalar(1.1);
    }

    deselectObject() {
        if (this.selectedObject) {
            this.selectedObject.material = this.selectedObject.userData.originalMaterial;
            this.selectedObject.scale.multiplyScalar(1 / 1.1);
            this.selectedObject = null;
        }
        this.hideTooltip();
    }

    showTooltip(obj) {
        const componentName = obj.name || this.getComponentName(obj);
        const componentData = this.getComponentData(componentName);
        
        const tooltip = document.getElementById('info-tooltip');
        document.getElementById('tooltip-title').textContent = componentData.name;
        document.getElementById('tooltip-description').textContent = componentData.description;
        
        // Add details if available
        const detailsDiv = document.getElementById('tooltip-details');
        detailsDiv.innerHTML = '';
        if (componentData.details) {
            Object.entries(componentData.details).forEach(([key, value]) => {
                const p = document.createElement('p');
                p.innerHTML = `<strong>${key}:</strong> ${value}`;
                detailsDiv.appendChild(p);
            });
        }
        
        tooltip.style.display = 'block';
    }

    hideTooltip() {
        document.getElementById('info-tooltip').style.display = 'none';
    }

    getComponentName(obj) {
        // Try to determine component based on position or other properties
        return obj.name || 'Component';
    }

    getComponentData(name) {
        const data = this.modelData[name.toLowerCase()];
        return data || {
            name: name,
            description: 'Component information not available',
            details: {}
        };
    }

    getModelData() {
        // Model component data with descriptions
        return {
            'main body': {
                name: 'Main Body',
                description: 'Primary structural component that houses all internal mechanisms.',
                details: {
                    'Material': 'Cast Iron',
                    'Weight': '250 kg',
                    'Function': 'Structural support and housing'
                }
            },
            'inlet': {
                name: 'Inlet Port',
                description: 'Entry point for fluid or air into the equipment.',
                details: {
                    'Diameter': '50 mm',
                    'Pressure Rating': '10 bar',
                    'Material': 'Stainless Steel'
                }
            },
            'outlet': {
                name: 'Outlet Port',
                description: 'Exit point for processed fluid or air.',
                details: {
                    'Diameter': '50 mm',
                    'Pressure Rating': '10 bar',
                    'Material': 'Stainless Steel'
                }
            },
            'rotor': {
                name: 'Rotor Assembly',
                description: 'Rotating component responsible for the primary equipment function.',
                details: {
                    'RPM': '3000',
                    'Balance Class': 'G 2.5',
                    'Material': 'Aluminum Alloy'
                }
            },
            'bearing': {
                name: 'Bearing Assembly',
                description: 'Supports and guides the rotor with minimal friction.',
                details: {
                    'Type': 'Ball Bearing',
                    'Lubrication': 'Oil Bath',
                    'Life Rating': '10000 hours'
                }
            },
            'seal': {
                name: 'Mechanical Seal',
                description: 'Prevents fluid leakage around the rotating shaft.',
                details: {
                    'Type': 'Dual-Face Seal',
                    'Leakage Rate': '< 0.1 ml/hour',
                    'Temperature Range': '-20°C to 80°C'
                }
            },
            'motor': {
                name: 'Electric Motor',
                description: 'Provides the driving force for the equipment operation.',
                details: {
                    'Power': '15 kW',
                    'Voltage': '380V 3-phase',
                    'Frame Size': 'IE3 Efficiency'
                }
            },
            'cover': {
                name: 'Access Cover',
                description: 'Removable cover for maintenance and inspection access.',
                details: {
                    'Material': 'Aluminum',
                    'Fasteners': 'M10 Stainless Steel Bolts',
                    'Gasket': 'Nitrile Rubber'
                }
            },
            'component': {
                name: 'Equipment Component',
                description: 'Part of the interactive 3D equipment model.',
                details: {}
            }
        };
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight || window.innerHeight - 200;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the viewer when the page loads
window.addEventListener('load', () => {
    new ModelViewer();
});
