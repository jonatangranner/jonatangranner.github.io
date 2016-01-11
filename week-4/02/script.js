
var canvas;
var gl;
var program;
window.onload = init;


var vBuffer;
var nBuffer;


var pointsArray = [];
var normalsArray = [];
var va = vec4(0.0, 0.0, 1.0, 1);
var vb = vec4(0.0, 0.8, -0.3, 1);
var vc = vec4(-0.8, -0.5, -0.3, 1);
var vd = vec4(0.8, -0.5, -0.3, 1);
var count = 1;

var near = 0.3;
var far = 10.0;
var d = 3.0;
var theta = 0.0;

var fovy = 45.0;
var aspect;

var mvMatrix, pMatrix;
var modelView, projection;
var eye = vec3(0.0, 0.0, -d);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);


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

    tetrahedron(va, vb, vc, vd, count);

    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelView = gl.getUniformLocation(program, "modelView");
    projection = gl.getUniformLocation(program, "projection");

    document.getElementById("btnInc").onclick = function () {
        pointsArray = [];
        normalsArray = [];
        count += 1;
        tetrahedron(va, vb, vc, vd, count);
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    }
    document.getElementById("btnDec").onclick = function () {
        pointsArray = [];
        normalsArray = [];
        count = count - 1 >= 0 ? count - 1 : 0;
        tetrahedron(va, vb, vc, vd, count);
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    }

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var e_x = 0;
    var e_y = 0;
    var e_z = -5;
    mvMatrix = lookAt(vec3(e_x, e_y, e_z), at, up);
    pMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(projection, false, flatten(pMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);

    requestAnimFrame(render);

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
    normalsArray.push(a);
    normalsArray.push(b);
    normalsArray.push(c);

    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);
}
