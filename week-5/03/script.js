
var canvas;
var gl;
var program;
window.onload = init;


var vBuffer;
var nBuffer;


var pointsArray = [];
var normalsArray = [];


var near = 0.3;
var far = 100.0;
var fovy = 45.0;
var aspect;
var distance = 30;
var eye = vec3(0.0, 0.0, -distance);
var at = vec3(0.0, 3.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var mvMatrix, pMatrix;
var theta = 0.0;


var g_objDoc = null;
var g_drawingInfo = null;
var model = null;

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL not found!");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    aspect = canvas.width / canvas.height;
    program = initShaders(gl, "vShader", "fShader");
    gl.useProgram(program);
    program.vPosition = gl.getAttribLocation(program, 'vPosition');
    program.vNormal = gl.getAttribLocation(program, 'vNormal');
    program.vColor = gl.getAttribLocation(program, 'vColor');
    program.modelView = gl.getUniformLocation(program, 'modelView');
    program.projection = gl.getUniformLocation(program, 'projection');

    model = initVertexBuffers(gl, program);
    if (!model) {
        return;
    }

    readOBJFile('../../Objects/Tank.obj', gl, model, 1, true);

    render();
}

function render() {
    requestAnimFrame(render);
    if (g_objDoc != null && g_objDoc.isMTLComplete()) {
        g_drawingInfo = onReadComplete(gl, model, g_objDoc);
        g_objDoc = null;
    }
    if (!g_drawingInfo)
        return;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    theta += 0.01;
    if (theta >= 2 * Math.PI)
        theta -= 2 * Math.PI;
    var e_x = (Math.cos(theta) * eye[0]) + (-Math.sin(theta) * eye[2]);
    var e_y = eye[1];
    var e_z = (Math.sin(theta) * eye[0]) + (Math.cos(theta) * eye[2]);
    mvMatrix = lookAt(vec3(e_x, e_y, e_z), at, up);
    pMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv(program.modelView, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(program.projection, false, flatten(pMatrix));
    gl.uniform3fv(program.eye, vec3(e_x, e_y, e_z));

    var num = g_drawingInfo.indices.length;
    gl.drawElements(gl.TRIANGLES, num, gl.UNSIGNED_SHORT, 0);
}


function initVertexBuffers(gl, program) {
    var obj = new Object();

    obj.vertexBuffer = createEmptyArrayBuffer(gl, program.vPosition, 3, gl.FLOAT);
    obj.normalBuffer = createEmptyArrayBuffer(gl, program.vNormal, 3, gl.FLOAT);
    obj.colorBuffer = createEmptyArrayBuffer(gl, program.vColor, 4, gl.FLOAT);
    obj.indexBuffer = gl.createBuffer();

    if (!obj.vertexBuffer || !obj.normalBuffer || !obj.colorBuffer || !obj.indexBuffer)
        return null;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return obj;
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



function readOBJFile(fileName, gl, model, scale, reverse) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status != 404) {
            onReadOBJFile(request.responseText, fileName, gl, model, scale, reverse);
        }
    }
    request.open('GET', fileName, true);
    request.send();
}


function onReadOBJFile(fileString, fileName, gl, obj, scale, reverse) {
    var objDoc = new OBJDoc(fileName);

    var result = objDoc.parse(fileString, scale, reverse);
    if (!result) {
        g_objDoc = null;
        g_drawingInfo = null;
        
        return;
    }
    g_objDoc = objDoc;  
}


function onReadComplete(gl, model, objDoc) {
    var drawingInfo = objDoc.getDrawingInfo();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    return drawingInfo;
}