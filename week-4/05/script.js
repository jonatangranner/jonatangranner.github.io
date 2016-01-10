
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
var count = 3;

var near = 0.3;
var far = 10.0;
var d = 3.0;
var theta = 0.0;

var fovy = 45.0;
var aspect;

var mvMatrix, pMatrix;
var modelView, projection;
var eye = vec3(0.0, 0.0, -d);
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
var ambient_c = 0.5;
var diffuse_c = 0.5;
var specular_c = 0.5;
var shineVal = 100;
var le_c = 1.0
var lightEmission = vec3(1, 1, 1);
var lightDir = vec4(0, -1, 0, 0);

var ambient_out;
var diffuse_out;
var specular_out;
var shine_out;
var lightPos;
var lightEmi_out;
var eye_out;

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
    ambient_out = gl.getUniformLocation(program, "Ka");
    diffuse_out = gl.getUniformLocation(program, "Kd");
    specular_out = gl.getUniformLocation(program, "Ks");
    shine_out = gl.getUniformLocation(program, "alpha");
    lightPos = gl.getUniformLocation(program, "lightPos");
	lightEmi_out = gl.getUniformLocation(program, "L");
	eye_out = gl.getUniformLocation(program, "eye");
	

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
    document.getElementById("ambiance").onchange = function (event) {
        ambient_c = event.target.value;
    }
    document.getElementById("diffuse").onchange = function (event) {
        diffuse_c = event.target.value;
    }
    document.getElementById("specular").onchange = function (event) {
        specular_c = event.target.value;
    }
    document.getElementById("shine").onchange = function (event) {
        shineVal = event.target.value;
    }
    document.getElementById("lightEmi").onchange = function (event) {
        le_c = event.target.value;
    }

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var newLightEmi = scale(le_c, lightEmission);
    gl.uniform1f(ambient_out, ambient_c);
    gl.uniform1f(diffuse_out, diffuse_c);
    gl.uniform1f(specular_out, specular_c);
    gl.uniform1f(shine_out, shineVal);
    gl.uniform4fv(lightPos, lightDir);
	gl.uniform3fv(lightEmi_out, vec3(newLightEmi[0], newLightEmi[1], newLightEmi[2]));
	

    theta += 0.05;
    var e_x = (Math.cos(theta) * eye[0]) + (-Math.sin(theta) * eye[2]);
    var e_y = eye[1];
    var e_z = (Math.sin(theta) * eye[0]) + (Math.cos(theta) * eye[2]);
    mvMatrix = lookAt(vec3(e_x, e_y, e_z), at, up);
    pMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(projection, false, flatten(pMatrix));
	gl.uniform3fv(eye_out, vec3(e_x, e_y, e_z));

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
