
var canvas;
var gl;
var solidProgram;
var texProgram;
var shadowProgram;
window.onload = main;


var near = 1.0;
var far = 100.0;
var fovy = 65.0;
var aspect;
var viewMatrix, projectionMatrix;
var eye, at, up;
var currentViewMatrix;


var g_objDoc = null;
var g_drawingInfo = null;
var teapotModel = null;
var teapotScale = 1 / 4;
var teapotTransVec = vec3(0, -1, -3);
var dY = 0.0;
var teapotMotion = true;


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
var theta = 0.0;
var sModelMatrixFromLight, svmFromLight, spmFromLight;
var mvpmFromLight_teapot;
var mvpmFromLight_ground;
var g_mvpMatrix = mat4();
var g_modelMatrix = mat4();
var fbo = null;
var worldWidth = 1024;
var worldHeight = 1024;



var debugToggle = false;
var debugPrint = true;
var dbViewMatrix;
var R;



function main() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas, { alpha: false });
    if (!gl)
        alert("WebGL not found!");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    gl.enable(gl.DEPTH_TEST);

    aspect = canvas.width / canvas.height;
    solidProgram = initShaders(gl, "solid_vShader", "solid_fShader");
    texProgram = initShaders(gl, "tex_vShader", "tex_fShader");
    shadowProgram = initShaders(gl, "shadowMap_vShader", "shadowMap_fShader");
    solidProgram.vPosition = gl.getAttribLocation(solidProgram, 'vPosition');
    solidProgram.vColor = gl.getAttribLocation(solidProgram, 'vColor');
    solidProgram.mvpMatrix = gl.getUniformLocation(solidProgram, 'mvpMatrix');
    solidProgram.shadowMap = gl.getUniformLocation(solidProgram, "shadowMap");
    solidProgram.mvpMatrixFromLight = gl.getUniformLocation(solidProgram, 'mvpMatrixFromLight');
    if (solidProgram.vPosition < 0 || solidProgram.vColor < 0 || !solidProgram.mvpMatrix || !solidProgram.mvpMatrixFromLight || !solidProgram.shadowMap) {
        
        return;
    }
    texProgram.vPosition = gl.getAttribLocation(texProgram, 'vPosition');
    texProgram.vTexCoord = gl.getAttribLocation(texProgram, 'vTexCoord');
    texProgram.mvpMatrix = gl.getUniformLocation(texProgram, 'mvpMatrix');
    texProgram.texSampler = gl.getUniformLocation(texProgram, "texSampler");
    texProgram.shadowMap = gl.getUniformLocation(texProgram, "shadowMap");
    texProgram.mvpMatrixFromLight = gl.getUniformLocation(texProgram, 'mvpMatrixFromLight');
    if (texProgram.vPosition < 0 || texProgram.vTexCoord < 0 || !texProgram.mvpMatrix || !texProgram.texSampler || !texProgram.mvpMatrixFromLight || !texProgram.shadowMap) {
        
        return;
    }
    shadowProgram.vPosition = gl.getAttribLocation(shadowProgram, 'vPosition');
    shadowProgram.mvpMatrix = gl.getUniformLocation(shadowProgram, "mvpMatrix");
    if (shadowProgram.vPosition < 0 || !shadowProgram.mvpMatrix) {
        
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
    fbo = initFrameBufferObject(gl);
    if (!fbo) {
        
        return;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
    var dbEye = vec3(teapotTransVec[0], 2, teapotTransVec[2]);
    var dbAt = teapotTransVec;
    var dbUp = vec3(0, 0, -1);
    dbViewMatrix = lookAt(dbEye, dbAt, dbUp);
    eye = vec3(0, 0, 1);
    at = vec3(0, 0, -3);
    up = vec3(0, 1, 0);
    viewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(fovy, aspect, near, far);
    spmFromLight = perspective(100, worldWidth / worldHeight, 1, 100);
    R = mat4();
    R = mult(R, translate(2, -1, -1));
    R = mult(R, scalem(1, -1, 1));
    R = mult(R, translate(-2, 1, 1));

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
    currentViewMatrix = (debugToggle ? dbViewMatrix : viewMatrix);
    var viewProjectionMatrix = mult(projectionMatrix, currentViewMatrix);
    if (lightMotion) {
        theta += 0.01;
        if (theta > 2 * Math.PI)
            theta -= 2 * Math.PI;
    }
    var lightx = light[0] + radius * Math.sin(theta);
    var lighty = light[1];
    var lightz = light[2] + radius * Math.cos(theta);
    var sEye = vec3(lightx, lighty, lightz);
    var sAt = teapotTransVec;
    var sUp = vec3(0, 1, 0);
    svmFromLight = lookAt(sEye, sAt, sUp);
    var svpMatrix = mult(spmFromLight, svmFromLight);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, worldWidth, worldHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shadowProgram);
    renderSolid(gl, shadowProgram, teapotModel, svpMatrix);
    mvpmFromLight_teapot = g_mvpMatrix;
    renderTex(gl, shadowProgram, groundModel, svpMatrix);
    mvpmFromLight_ground = g_mvpMatrix;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(solidProgram);
    gl.uniform1i(solidProgram.shadowMap, 0);
    gl.uniformMatrix4fv(solidProgram.mvpMatrixFromLight, false, flatten(mvpmFromLight_teapot));
    
    var reflectViewMatrix = mult(currentViewMatrix, R);
    var reflectVPM = mult(projectionMatrix, reflectViewMatrix);
    renderSolid(gl, solidProgram, teapotModel, reflectVPM);
    gl.useProgram(texProgram);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    gl.uniform1i(texProgram.shadowMap, 0);
    gl.uniformMatrix4fv(texProgram.mvpMatrixFromLight, false, flatten(mvpmFromLight_ground));
    renderTex(gl, texProgram, groundModel, viewProjectionMatrix);
    gl.disable(gl.BLEND);
    gl.useProgram(solidProgram);
    gl.uniform1i(solidProgram.shadowMap, 0);
    gl.uniformMatrix4fv(solidProgram.mvpMatrixFromLight, false, flatten(mvpmFromLight_teapot));
    renderSolid(gl, solidProgram, teapotModel, viewProjectionMatrix);

    debugPrint = false;
}


function renderSolid(gl, program, obj, vpMatrix) {
    gl.useProgram(program);
    if (teapotMotion) {
        if (dY > Math.PI)
            dY -= Math.PI;
        dY += 0.01;
    }
    g_modelMatrix = translate(add(teapotTransVec, vec3(0, Math.sin(dY), 0)));
    g_mvpMatrix = mult(vpMatrix, g_modelMatrix);
    gl.uniformMatrix4fv(program.mvpMatrix, false, flatten(g_mvpMatrix));
    initAttribVar(gl, program.vPosition, obj.vertexBuffer);
    if (program.vColor != undefined)
        initAttribVar(gl, program.vColor, obj.colorBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);

    gl.drawElements(gl.TRIANGLES, obj.numIndices, obj.indexBuffer.type, 0);
}


function renderTex(gl, program, obj, vpMatrix) {
    gl.useProgram(program);

    g_modelMatrix = mat4();
    g_mvpMatrix = mult(vpMatrix, g_modelMatrix);
    gl.uniformMatrix4fv(program.mvpMatrix, false, flatten(g_mvpMatrix));
    initAttribVar(gl, program.vPosition, obj.vertexBuffer);
    if (program.vTexCoord != undefined) {
        initAttribVar(gl, program.vTexCoord, obj.texCoordBuffer);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, obj.texture);
        gl.uniform1i(program.texSampler, 1);
    }



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
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.useProgram(program);
    gl.uniform1i(program.texSampler, 1);
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


function initFrameBufferObject(gl) {
    var framebuffer, texture, renderBuffer
    var clean = function () {
        if (framebuffer)
            gl.deleteFramebuffer(framebuffer);
        if (texture)
            gl.deleteTexture(texture);
        if (renderBuffer)
            gl.deleteRenderbuffer(renderBuffer);
        return null;
    }
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        
        return clean();
    }
    texture = gl.createTexture();
    if (!texture) {
        
        return clean();
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, worldWidth, worldHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    renderBuffer = gl.createRenderbuffer();
    if (!renderBuffer) {
        
        return clean();
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, worldWidth, worldHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        
        return clean();
    }
    framebuffer.texture = texture;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return framebuffer;
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
