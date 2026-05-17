// Enhanced OBJLoader for Three.js
// This is a simpler but more robust OBJ loader for loading 3D models

THREE.OBJLoader = function (manager) {
    this.manager = manager || THREE.DefaultLoadingManager;
    this.path = '';
};

THREE.OBJLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    var self = this;
    var loader = new THREE.FileLoader(this.manager);
    loader.setPath(this.path);
    loader.load(url, function (text) {
        try {
            var result = self.parse(text);
            if (onLoad) onLoad(result);
        } catch (e) {
            console.error('Error parsing OBJ file:', e);
            if (onError) onError(e);
        }
    }, onProgress, onError);
};

THREE.OBJLoader.prototype.setPath = function (value) {
    this.path = value;
    return this;
};

THREE.OBJLoader.prototype.parse = function (text) {
    var lines = text.split('\n');
    var vertices = [];
    var normals = [];
    var faces = [];
    
    // Parse all lines
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        
        // Skip comments and empty lines
        if (line.length === 0 || line[0] === '#') continue;
        
        var parts = line.split(/\s+/);
        var cmd = parts[0];
        
        if (cmd === 'v' && parts.length >= 4) {
            // Vertex
            vertices.push({
                x: parseFloat(parts[1]),
                y: parseFloat(parts[2]),
                z: parseFloat(parts[3])
            });
        } else if (cmd === 'vn' && parts.length >= 4) {
            // Normal
            normals.push({
                x: parseFloat(parts[1]),
                y: parseFloat(parts[2]),
                z: parseFloat(parts[3])
            });
        } else if (cmd === 'f' && parts.length >= 4) {
            // Face
            var faceVertices = [];
            for (var j = 1; j < parts.length; j++) {
                var indices = parts[j].split('/');
                faceVertices.push({
                    v: parseInt(indices[0]) - 1,
                    vt: indices[1] ? parseInt(indices[1]) - 1 : null,
                    vn: indices[2] ? parseInt(indices[2]) - 1 : null
                });
            }
            
            // Convert to triangles (triangulate if necessary)
            for (var j = 1; j < faceVertices.length - 1; j++) {
                faces.push(faceVertices[0]);
                faces.push(faceVertices[j]);
                faces.push(faceVertices[j + 1]);
            }
        }
    }
    
    // Build Three.js geometry
    var geometry = new THREE.BufferGeometry();
    var positionArray = [];
    var normalArray = [];
    var indexArray = [];
    var vertexMap = {};
    var vertexIndex = 0;
    
    for (var i = 0; i < faces.length; i++) {
        var face = faces[i];
        var key = face.v + '/' + (face.vn || '');
        
        if (!(key in vertexMap)) {
            vertexMap[key] = vertexIndex;
            
            var v = vertices[face.v];
            positionArray.push(v.x, v.y, v.z);
            
            if (face.vn !== null && face.vn < normals.length) {
                var n = normals[face.vn];
                normalArray.push(n.x, n.y, n.z);
            } else {
                normalArray.push(0, 0, 1); // Default normal
            }
            
            vertexIndex++;
        }
        
        indexArray.push(vertexMap[key]);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positionArray), 3));
    
    if (normalArray.length > 0 && normalArray.length === positionArray.length) {
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normalArray), 3));
    } else {
        geometry.computeVertexNormals();
    }
    
    if (indexArray.length > 0) {
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indexArray), 1));
    }
    
    // Create material
    var material = new THREE.MeshPhongMaterial({
        color: 0xaaaaaa,
        side: THREE.DoubleSide,
        flatShading: false,
        shininess: 30
    });
    
    // Create mesh and group
    var mesh = new THREE.Mesh(geometry, material);
    var group = new THREE.Group();
    group.add(mesh);
    
    // Center and scale the geometry
    geometry.computeBoundingBox();
    var box = geometry.boundingBox;
    var size = new THREE.Vector3();
    box.getSize(size);
    
    var maxDim = Math.max(size.x, size.y, size.z);
    var scale = 5 / maxDim;
    
    geometry.translate(-box.min.x - size.x / 2, -box.min.y - size.y / 2, -box.min.z - size.z / 2);
    geometry.scale(scale, scale, scale);
    
    return group;
};
