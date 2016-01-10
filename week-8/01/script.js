
var canvas;
var gl;
var solidProgram;
var texProgram;
window.onload = main;           


const near = 0.3;
const far = 100.0;
const fovy = 90.0;
var aspect;
var mvMatrix, pMatrix, CMVM;


var g_objDoc = null;            
var g_drawingInfo = null;       
var teapotModel = null;               
var teapotScale = 1 / 4;
var modelTransVec = vec3(0, -1, -3);
var dY = 0.0;
var teapotMotion = true;
var teapotMVM;


var groundModel = null;
var texCoord = [
    vec2(-2, -1),
    vec2(-2, -5),
    vec2(2, -5),
    vec2(2, -1)
];


var light = vec3(0, 2, -2);
var radius = 2;
var lightMotion = true;
var M;
var theta = 0.0;
var noShadow = vec4(1, 1, 1, 1);
var shadow = vec4(0, 0, 0, 1);
var smvMatrix;


var debugToggle = false;
var debugMVM;


function main() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL not found!");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    gl.enable(gl.DEPTH_TEST);

    aspect = canvas.width / canvas.height;
    solidProgram = initShaders(gl, "solid_vShader", "solid_fShader");
    texProgram = initShaders(gl, "tex_vShader", "tex_fShader");
    solidProgram.vPosition = gl.getAttribLocation(solidProgram, 'vPosition');
    solidProgram.vNormal = gl.getAttribLocation(solidProgram, 'vNormal');
    solidProgram.vColor = gl.getAttribLocation(solidProgram, 'vColor');
    solidProgram.modelView = gl.getUniformLocation(solidProgram, 'modelView');
    solidProgram.projection = gl.getUniformLocation(solidProgram, 'projection');
    solidProgram.fVisible = gl.getUniformLocation(solidProgram, 'fVisible');
    if (solidProgram.vPosition < 0 || solidProgram.vNormal < 0 || solidProgram.vColor < 0 || !solidProgram.modelView || !solidProgram.projection) {
        
        return;
    }
    texProgram.vPosition = gl.getAttribLocation(texProgram, 'vPosition');
    texProgram.vTexCoord = gl.getAttribLocation(texProgram, 'vTexCoord');
    texProgram.projection = gl.getUniformLocation(texProgram, 'projection');
    texProgram.modelView = gl.getUniformLocation(texProgram, 'modelView');
    texProgram.texSampler = gl.getUniformLocation(texProgram, "texSampler");
    if (texProgram.vPosition < 0 || texProgram.vTexCoord < 0 || texProgram.projection < 0 || !texProgram.modelView || !texProgram.texSampler) {
        
        return;
    }
    document.getElementById("teapotMotion").onclick = function () {
        teapotMotion = !teapotMotion;
    }
    document.getElementById("topView").onclick = function () {
        debugToggle = !debugToggle;
    }
    document.getElementById("lightMotion").onclick = function () {
        lightMotion = !lightMotion;
    }
    readOBJFile('../../Objects/teapot.obj', teapotScale, true);
    groundModel = initGround(gl);
    if (!groundModel) {
        
        return;
    }
    groundModel.texture = initTexture(gl, texProgram);
    if (!groundModel.texture) {
        
        return;
    }
    var dbEye = vec3(modelTransVec[0], 2, modelTransVec[2]);
    var dbAt = modelTransVec;
    var dbUp = vec3(0, 0, -1);
    dbMVM = lookAt(dbEye, dbAt, dbUp);
    var eye = vec3(0, 0, 0);
    var at = vec3(0, 0, 0);
    var up = vec3(0, 1, 0);
    mvMatrix = lookAt(eye, at, up);
    pMatrix = perspective(fovy, aspect, near, far);
    M = mat4();
    M[1][3] = -1;
    M[3][3] = 0;
    M[3][1] = -1 / light[1];

    render();
}


function render() {
    requestAnimFrame(render);
    if (g_objDoc != null && g_objDoc.isMTLComplete()) {
        g_drawingInfo = onReadComplete(g_objDoc);
        teapotModel = initTeapot(gl, g_drawingInfo);
        g_objDoc = null;
    }
    if (!g_drawingInfo) {
        
        return;
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    CMVM = (debugToggle ? dbMVM : mvMatrix)
    renderTex(gl, texProgram, groundModel);
    renderSolid(gl, solidProgram, teapotModel);
}


function renderSolid(gl, program, obj) {
    gl.useProgram(program);
    if (teapotMotion) {
        if (dY > Math.PI)
            dY -= Math.PI;
        dY += 0.01;
    }
    teapotMVM = mult(CMVM, translate(add(modelTransVec, vec3(0, Math.sin(dY), 0))));
    gl.uniformMatrix4fv(program.modelView, false, flatten(teapotMVM));
    gl.uniformMatrix4fv(program.projection, false, flatten(pMatrix));
    initAttribVar(gl, program.vPosition, obj.vertexBuffer);
    initAttribVar(gl, program.vNormal, obj.normalBuffer);
    initAttribVar(gl, program.vColor, obj.colorBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
    gl.uniform4fv(program.fVisible, noShadow);
    gl.drawElements(gl.TRIANGLES, obj.numIndices, obj.indexBuffer.type, 0);
    if (lightMotion) {
        theta += 0.01;
        if (theta > 2 * Math.PI)
            theta -= 2 * Math.PI;
    }
    var lightx = light[0] + radius * Math.sin(theta);
    var lighty = light[1];
    var lightz = light[2] + radius * Math.cos(theta);
    smvMatrix = mult(teapotMVM, translate(lightx, lighty, lightz));
    smvMatrix = mult(smvMatrix, M);
    smvMatrix = mult(smvMatrix, translate(-lightx, -lighty, -lightz));
    gl.uniform4fv(program.fVisible, shadow);
    gl.uniformMatrix4fv(program.modelView, false, flatten(smvMatrix));
    gl.drawElements(gl.TRIANGLES, obj.numIndices, obj.indexBuffer.type, 0);
}


function renderTex(gl, program, obj) {
    gl.useProgram(program);
    gl.uniformMatrix4fv(program.modelView, false, flatten(CMVM));
    gl.uniformMatrix4fv(program.projection, false, flatten(pMatrix));
    initAttribVar(gl, program.vPosition, obj.vertexBuffer);
    initAttribVar(gl, program.vTexCoord, obj.texCoordBuffer);
    gl.uniform1i(program.texSampler, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, obj.texture);

    gl.drawArrays(gl.TRIANGLES, 0, obj.numVertices);
}


function initAttribVar(gl, attrib, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attrib, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(attrib);
}


function quad(a, b, c, d, quadril, vertArr, texArr) {
    vertArr.push(quadril[a]);
    texArr.push(texCoord[0]);
    vertArr.push(quadril[b]);
    texArr.push(texCoord[1]);
    vertArr.push(quadril[c]);
    texArr.push(texCoord[2]);
    vertArr.push(quadril[a]);
    texArr.push(texCoord[0]);
    vertArr.push(quadril[c]);
    texArr.push(texCoord[2]);
    vertArr.push(quadril[d]);
    texArr.push(texCoord[3]);
}


function initTexture(gl, program) {
    var image = document.getElementById("texImage");
    if (image.width < 1) {
        
        return null;
    }
    var texture = gl.createTexture();
    if (!image || !texture) {
        
        return null;
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.useProgram(program);
    gl.uniform1i(program.texSampler, 0);
    gl.bindTexture(gl.TEXTURE_2D, null); 
    return texture;
}


function initGround(gl) {
    var vertices = [];
    var texCoordsArray = [];
    var ground = [     
        vec3(-2, -1, -1),
        vec3(-2, -1, -5),
        vec3(2, -1, -5),
        vec3(2, -1, -1)
    ];
    quad(0, 3, 2, 1, ground, vertices, texCoordsArray);

    var obj = new Object();
    obj.vertexBuffer = initBufferForLaterUse(gl, flatten(vertices), 3, gl.FLOAT);
    obj.texCoordBuffer = initBufferForLaterUse(gl, flatten(texCoordsArray), 2, gl.FLOAT);
    obj.numVertices = vertices.length;

    if (!obj.vertexBuffer || !obj.texCoordBuffer || obj.numVertices < 1)
        return null;
    else
        return obj;
}


function initTeapot(gl, drawInfo) {
    var obj = new Object();
    obj.vertexBuffer = initBufferForLaterUse(gl, drawInfo.vertices, 3, gl.FLOAT);
    obj.normalBuffer = initBufferForLaterUse(gl, drawInfo.normals, 3, gl.FLOAT);
    obj.colorBuffer = initBufferForLaterUse(gl, drawInfo.colors, 4, gl.FLOAT);
    obj.indexBuffer = initElemBufferForLaterUse(gl, drawInfo.indices, gl.UNSIGNED_SHORT);
    obj.numIndices = drawInfo.indices.length;

    if (!obj.vertexBuffer || !obj.normalBuffer || !obj.colorBuffer || !obj.indexBuffer || obj.numIndices < 1)
        return null;
    else
        return obj;
}


function initBufferForLaterUse(gl, data, num, type) {    
    var buffer = gl.createBuffer();   
    if (!buffer) {
        
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    buffer.num = num;
    buffer.type = type;
    return buffer;
}


function initElemBufferForLaterUse(gl, data, type) {
    var buffer = gl.createBuffer();
    if (!buffer) {
        
        return null;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
    buffer.type = type;
    return buffer;
}


function createEmptyArrayBuffer(gl, attribute, num, type) {
    var buffer = gl.createBuffer();
    if (!buffer) {
        
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(attribute);

    return buffer;
}


function readOBJFile(fileName, scale, reverse) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status != 404) {
            onReadOBJFile(request.responseText, fileName, scale, reverse);
        }
    }
    request.open('GET', fileName, true);
    request.send();
}


function onReadOBJFile(fileString, fileName, scale, reverse) {
    var objDoc = new OBJDoc(fileName);

    var result = objDoc.parse(fileString, scale, reverse);
    if (!result) {
        g_objDoc = null;
        g_drawingInfo = null;
        
        return;
    }
    g_objDoc = objDoc;
}


function onReadComplete(objDoc) {    
    return objDoc.getDrawingInfo();
}