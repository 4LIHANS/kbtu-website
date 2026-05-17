// Simple OBJLoader for Three.js
THREE.OBJLoader = function (manager) {
    this.manager = manager || THREE.DefaultLoadingManager;
};

THREE.OBJLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    var self = this;
    var loader = new THREE.FileLoader(this.manager);
    loader.setPath(this.path);
    loader.load(url, function (text) {
        try {
            onLoad(self.parse(text));
        } catch (e) {
            if (onError) {
                onError(e);
            } else {
                throw e;
            }
        }
    }, onProgress, onError);
};

THREE.OBJLoader.prototype.setPath = function (value) {
    this.path = value;
    return this;
};

THREE.OBJLoader.prototype.parse = function (text) {
    var object = new THREE.Group(),
        objects = [],
        objecti = 0,
        geometry = null,
        material = new THREE.MeshPhongMaterial(),
        mesh = null,
        vertices = [],
        normals = [],
        uvs = [];

    function addVertex(a, b, c) {
        vertices.push(a, b, c);
    }

    function addNormal(a, b, c) {
        normals.push(a, b, c);
    }

    function addUV(u, v) {
        uvs.push(u, v);
    }

    function addFace(vertexIndices, normalIndices, uvIndices) {
        addVertex(
            vertices[vertexIndices[0] * 3],
            vertices[vertexIndices[0] * 3 + 1],
            vertices[vertexIndices[0] * 3 + 2]
        );

        if (normalIndices && normalIndices.length > 0) {
            addNormal(
                normals[normalIndices[0] * 3],
                normals[normalIndices[0] * 3 + 1],
                normals[normalIndices[0] * 3 + 2]
            );
        }

        if (uvIndices && uvIndices.length > 0) {
            addUV(uvs[uvIndices[0] * 2], uvs[uvIndices[0] * 2 + 1]);
        }

        if (vertexIndices.length === 3) {
            addVertex(
                vertices[vertexIndices[1] * 3],
                vertices[vertexIndices[1] * 3 + 1],
                vertices[vertexIndices[1] * 3 + 2]
            );

            if (normalIndices && normalIndices.length > 1) {
                addNormal(
                    normals[normalIndices[1] * 3],
                    normals[normalIndices[1] * 3 + 1],
                    normals[normalIndices[1] * 3 + 2]
                );
            }

            if (uvIndices && uvIndices.length > 1) {
                addUV(uvs[uvIndices[1] * 2], uvs[uvIndices[1] * 2 + 1]);
            }

            addVertex(
                vertices[vertexIndices[2] * 3],
                vertices[vertexIndices[2] * 3 + 1],
                vertices[vertexIndices[2] * 3 + 2]
            );

            if (normalIndices && normalIndices.length > 2) {
                addNormal(
                    normals[normalIndices[2] * 3],
                    normals[normalIndices[2] * 3 + 1],
                    normals[normalIndices[2] * 3 + 2]
                );
            }

            if (uvIndices && uvIndices.length > 2) {
                addUV(uvs[uvIndices[2] * 2], uvs[uvIndices[2] * 2 + 1]);
            }
        } else if (vertexIndices.length === 4) {
            addVertex(
                vertices[vertexIndices[1] * 3],
                vertices[vertexIndices[1] * 3 + 1],
                vertices[vertexIndices[1] * 3 + 2]
            );

            if (normalIndices && normalIndices.length > 1) {
                addNormal(
                    normals[normalIndices[1] * 3],
                    normals[normalIndices[1] * 3 + 1],
                    normals[normalIndices[1] * 3 + 2]
                );
            }

            if (uvIndices && uvIndices.length > 1) {
                addUV(uvs[uvIndices[1] * 2], uvs[uvIndices[1] * 2 + 1]);
            }

            addVertex(
                vertices[vertexIndices[3] * 3],
                vertices[vertexIndices[3] * 3 + 1],
                vertices[vertexIndices[3] * 3 + 2]
            );

            if (normalIndices && normalIndices.length > 3) {
                addNormal(
                    normals[normalIndices[3] * 3],
                    normals[normalIndices[3] * 3 + 1],
                    normals[normalIndices[3] * 3 + 2]
                );
            }

            if (uvIndices && uvIndices.length > 3) {
                addUV(uvs[uvIndices[3] * 2], uvs[uvIndices[3] * 2 + 1]);
            }

            addVertex(
                vertices[vertexIndices[0] * 3],
                vertices[vertexIndices[0] * 3 + 1],
                vertices[vertexIndices[0] * 3 + 2]
            );

            if (normalIndices && normalIndices.length > 0) {
                addNormal(
                    normals[normalIndices[0] * 3],
                    normals[normalIndices[0] * 3 + 1],
                    normals[normalIndices[0] * 3 + 2]
                );
            }

            if (uvIndices && uvIndices.length > 0) {
                addUV(uvs[uvIndices[0] * 2], uvs[uvIndices[0] * 2 + 1]);
            }
        }
    }

    var textLines = text.split('\n'),
        objectLines = [],
        lineIndex = 0;

    var vertices_temp = [];
    var normals_temp = [];
    var uvs_temp = [];

    for (var i = 0; i < textLines.length; i++) {
        var line = textLines[i].trim();

        if (line.length === 0 || line.charAt(0) === '#') {
            continue;
        }

        if (line.substr(0, 2) === 'v ') {
            var parts = line.split(/\s+/);
            vertices_temp.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
        } else if (line.substr(0, 2) === 'vt') {
            var parts = line.split(/\s+/);
            uvs_temp.push(parseFloat(parts[1]), parseFloat(parts[2]));
        } else if (line.substr(0, 2) === 'vn') {
            var parts = line.split(/\s+/);
            normals_temp.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
        } else if (line.substr(0, 2) === 'f ') {
            var parts = line.split(/\s+/).slice(1);
            var face = [];

            for (var j = 0; j < parts.length; j++) {
                var p = parts[j];
                if (p.indexOf('/') > 0) {
                    face.push(p);
                } else {
                    face.push(p);
                }
            }

            if (geometry === null) {
                geometry = new THREE.BufferGeometry();
            }

            var positionArray = [];
            var normalArray = [];
            var uvArray = [];

            for (var j = 0; j < face.length; j++) {
                var parts = face[j].split('/');
                var vertexIndex = parseInt(parts[0]) - 1;
                var uvIndex = parts[1] ? parseInt(parts[1]) - 1 : -1;
                var normalIndex = parts[2] ? parseInt(parts[2]) - 1 : -1;

                if (vertexIndex >= 0) {
                    positionArray.push(vertices_temp[vertexIndex * 3], vertices_temp[vertexIndex * 3 + 1], vertices_temp[vertexIndex * 3 + 2]);
                }
                if (uvIndex >= 0 && uvs_temp.length > 0) {
                    uvArray.push(uvs_temp[uvIndex * 2], uvs_temp[uvIndex * 2 + 1]);
                }
                if (normalIndex >= 0 && normals_temp.length > 0) {
                    normalArray.push(normals_temp[normalIndex * 3], normals_temp[normalIndex * 3 + 1], normals_temp[normalIndex * 3 + 2]);
                }
            }

            if (positionArray.length > 0) {
                if (!geometry.attributes.position) {
                    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positionArray), 3));
                } else {
                    var pos = geometry.attributes.position.array;
                    var newPos = new Float32Array(pos.length + positionArray.length);
                    newPos.set(pos);
                    newPos.set(positionArray, pos.length);
                    geometry.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
                }
            }

            if (normalArray.length > 0) {
                if (!geometry.attributes.normal) {
                    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normalArray), 3));
                } else {
                    var norm = geometry.attributes.normal.array;
                    var newNorm = new Float32Array(norm.length + normalArray.length);
                    newNorm.set(norm);
                    newNorm.set(normalArray, norm.length);
                    geometry.setAttribute('normal', new THREE.BufferAttribute(newNorm, 3));
                }
            } else {
                geometry.computeVertexNormals();
            }
        }
    }

    if (geometry !== null) {
        mesh = new THREE.Mesh(geometry, material);
        object.add(mesh);
    }

    return object;
};
