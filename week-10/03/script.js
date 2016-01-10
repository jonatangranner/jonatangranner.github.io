
var canvas;
var gl;
var program;
window.onload = init;


var sphereVBuffer;                           
var quadVBuffer;


var sphereVertices = [];
var sphereNormals = [];
var va = vec4(0.0, 0.0, 1.0, 1.0);
var vb = vec4(0.0, 0.942809, -0.333333, 1.0);
var vc = vec4(-0.816497, -0.471405, -0.333333, 1.0);
var vd = vec4(0.816497, -0.471405, -0.333333, 1.0);
var count = 5;
var groundVertices = [];


var near = 0.3;
var far = 100.0;
var fovy = 90.0;
var aspect;
var pMatrix;
var eye = vec3(0.0, 0.0, 3.0);
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
var mvMatrix;


var cubeMapTex;

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL not found!");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    aspect = canvas.width / canvas.height;
    program = initShaders(gl, "vShader", "fShader");
    gl.useProgram(program);
    program.vPosition = gl.getAttribLocation(program, 'vPosition');
    program.projection = gl.getUniformLocation(program, 'projection');
    program.modelView = gl.getUniformLocation(program, 'modelView');
    program.Mtex = gl.getUniformLocation(program, 'Mtex');
    program.reflective = gl.getUniformLocation(program, 'reflective');
    program.eyePosition = gl.getUniformLocation(program, 'eyePosition');
    initData()
    initTexture();

    render();
}

function render() {
    requestAnimFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mvMatrix = lookAt(eye, at, up);
    pMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv(program.projection, false, flatten(pMatrix));
    gl.uniform3fv(program.eyePosition, eye);
    gl.uniform1i(program.reflective, false);
    var Mtex = inverse(pMatrix);

    gl.uniformMatrix4fv(program.Mtex, false, flatten(Mtex));
    gl.uniformMatrix4fv(program.modelView, false, flatten(mat4()));
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBuffer);
    gl.enableVertexAttribArray(program.vPosition);
    gl.vertexAttribPointer(program.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, groundVertices.length);
    gl.uniform1i(program.reflective, true);
    gl.uniformMatrix4fv(program.Mtex, false, flatten(mat4()));
    gl.uniformMatrix4fv(program.modelView, false, flatten(mvMatrix));
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVBuffer);
    gl.enableVertexAttribArray(program.vPosition);
    gl.vertexAttribPointer(program.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, sphereVertices.length);
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = normalize(mix(a, b, 0.5), true);
        var ac = normalize(mix(a, c, 0.5), true);
        var bc = normalize(mix(b, c, 0.5), true);
        var ab = normalize(mix(a, b, 0.5), true);

        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    } else {
        triangle(a, b, c);
    }
}

function triangle(a, b, c) {
    sphereVertices.push(a);
    sphereVertices.push(b);
    sphereVertices.push(c);
}


function initData() {
    tetrahedron(va, vb, vc, vd, count);

    sphereVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereVertices), gl.STATIC_DRAW);
    
    var ground_a = vec4(-1, -1, 0.999, 1);
    var ground_b = vec4(1, -1, 0.999, 1);
    var ground_c = vec4(-1, 1, 0.999, 1);
    var ground_d = vec4(1, 1, 0.999, 1);

    groundVertices.push(ground_a);
    groundVertices.push(ground_b);
    groundVertices.push(ground_c);
    groundVertices.push(ground_b);
    groundVertices.push(ground_d);
    groundVertices.push(ground_c);

    quadVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(groundVertices), gl.STATIC_DRAW);
}

function initTexture() {
    var cm_left = document.getElementById("cm_left");
    var cm_right = document.getElementById("cm_right");
    var cm_top = document.getElementById("cm_top");
    var cm_bottom = document.getElementById("cm_bottom");
    var cm_back = document.getElementById("cm_back");
    var cm_front = document.getElementById("cm_front");

    cubeMapTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTex);
    gl.activeTexture(gl.TEXTURE0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cm_left);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cm_right);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cm_top);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cm_bottom);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cm_back);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cm_front);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);
}
