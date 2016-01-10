
var canvas;
var gl;
var program;
window.onload = init;


var vBuffer;
var nBuffer;
var tBuffer;


var pointsArray = [];
var normalsArray = [];
var va = vec4(0.0, 0.0, 1.0, 1.0);
var vb = vec4(0.0, 0.942809, -0.333333, 1.0);
var vc = vec4(-0.816497, -0.471405, -0.333333, 1.0);
var vd = vec4(0.816497, -0.471405, -0.333333, 1.0);
var count = 5;


var light = vec3(-1.0, 0.0, 0.0);


var near = 0.3;
var far = 100.0;
var fovy = 90.0;               
var aspect;
var pMatrix;
var d = 2.0;
var eye = vec3(0.0, 0.0, -d);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var mvMatrix;
var theta = 0.0;

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL not found!");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    aspect = canvas.width / canvas.height;
    program = initShaders(gl, "vShader", "fShader");
    gl.useProgram(program);
    program.vPosition = gl.getAttribLocation(program, 'vPosition');
    program.vNormal = gl.getAttribLocation(program, 'vNormal');
    program.projection = gl.getUniformLocation(program, 'projection');
    program.modelView = gl.getUniformLocation(program, 'modelView');
    program.vTexCoord = gl.getAttribLocation(program, 'vTexCoord');
    program.lightPos = gl.getUniformLocation(program, 'lightPos');
    initData()
    initTexture();

    render();
}

function render() {
    requestAnimFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    theta += 0.01;
    if (theta >= 2 * Math.Pi)
        theta -= 2 * Math.Pi;

    var l_x = (Math.cos(theta) * light[0]) + (-Math.sin(theta) * light[2]);
    var l_y = eye[1];
    var l_z = (Math.sin(theta) * light[0]) + (Math.cos(theta) * light[2]);
    gl.uniform3fv(program.lightPos, vec3(l_x, l_y, l_z));

    var e_x = (Math.cos(theta) * eye[0]) + (-Math.sin(theta) * eye[2]);
    var e_y = eye[1];
    var e_z = (Math.sin(theta) * eye[0]) + (Math.cos(theta) * eye[2]);
    mvMatrix = lookAt(vec3(e_x, e_y, e_z), at, up);
    pMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv(program.projection, false, flatten(pMatrix));
    gl.uniformMatrix4fv(program.modelView, false, flatten(mvMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);
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


function initData() {
    tetrahedron(va, vb, vc, vd, count);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.vPosition);
    gl.vertexAttribPointer(program.vPosition, 4, gl.FLOAT, false, 0, 0);

    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.vNormal);
    gl.vertexAttribPointer(program.vNormal, 4, gl.FLOAT, false, 0, 0);
}

function initTexture() {
    var image = document.getElementById("earthTexture");

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture); 
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);

}
