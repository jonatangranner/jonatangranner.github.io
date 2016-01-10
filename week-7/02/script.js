
var canvas;
var gl;
var program;
window.onload = init;


var vBuffer;
var tBuffer;


var ground = [
    vec3(-1, -1, -1),
    vec3(-1, -1, -5),
    vec3(2, -1, -5),
    vec3(2, -1, -1)
];
var quad1 = [
    vec3(0.25, -0.5, -1.25),
    vec3(0.25, -0.5, -1.75),
    vec3(0.75, -0.5, -1.75),
    vec3(0.75, -0.5, -1.25)
];
var quad2 = [
    vec3(-1, 0, -2.5),
    vec3(-1, -1, -2.5),
    vec3(-1, -1, -3),
    vec3(-1, 0, -3)
];
var vertices = [];
var texCoordsArray = [];
var texCoord = [
    vec2(-2, -1),
    vec2(-2, -5),
    vec2(2, -5),
    vec2(2, -1)
];
var redQuads_i;


var light = vec3(0, 2, -2);
var radius = 2;
var M;
var theta = 0.0;
var noShadow = vec4(1, 1, 1, 1);
var shadow = vec4(0, 0, 0, 1);
var smvMatrix;


var near = 0.3;
var far = 100.0;
var fovy = 90.0;                
var aspect;
var pMatrix;
var mvMatrix;
var eye = vec3(0, 0, 0);
var at = vec3(0, 0, 0);
var up = vec3(0, 1, 0);

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL not found!");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    aspect = canvas.width / canvas.height;
    program = initShaders(gl, "vShader", "fShader");
    gl.useProgram(program);
    program.vPosition = gl.getAttribLocation(program, 'vPosition');
    program.projection = gl.getUniformLocation(program, 'projection');
    program.modelView = gl.getUniformLocation(program, 'modelView');
    program.vTexCoord = gl.getAttribLocation(program, 'vTexCoord');
    program.fVisible = gl.getUniformLocation(program, 'fVisible');
    M = mat4();
    M[1][3] = -1;
    M[3][3] = 0;
    M[3][1] = -1 / light[1];
    pMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv(program.projection, false, flatten(pMatrix));
    mvMatrix = lookAt(eye, at, up);
    gl.uniformMatrix4fv(program.modelView, false, flatten(mvMatrix));
    initData();
    initTexture();
    render();
}

function render() {
    requestAnimFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT);
    useGroundTexture();
    gl.uniform4fv(program.fVisible, flatten(noShadow));
    gl.drawArrays(gl.TRIANGLES, 0, redQuads_i);
    theta += 0.01;
    if (theta > 2 * Math.PI) {
        theta -= 2 * Math.PI;
    }
    var lightx = light[0] + radius * Math.sin(theta);
    var lighty = light[1];
    var lightz = light[2] + radius * Math.cos(theta);
    smvMatrix = mult(mvMatrix, translate(lightx, lighty, lightz));
    smvMatrix = mult(smvMatrix, M);
    smvMatrix = mult(smvMatrix, translate(-lightx, -lighty, -lightz));
    gl.uniform4fv(program.fVisible, flatten(shadow));
    gl.uniformMatrix4fv(program.modelView, false, flatten(smvMatrix));
    gl.drawArrays(gl.TRIANGLES, redQuads_i, vertices.length - redQuads_i);
    useRedTexture();
    gl.uniform4fv(program.fVisible, flatten(noShadow));
    gl.uniformMatrix4fv(program.modelView, false, flatten(mvMatrix));
    gl.drawArrays(gl.TRIANGLES, redQuads_i, vertices.length - redQuads_i);
}

function quad(a, b, c, d, quadril, textureCoords) {
    vertices.push(quadril[a]);
    texCoordsArray.push(texCoord[0]);
    vertices.push(quadril[b]);
    texCoordsArray.push(texCoord[1]);
    vertices.push(quadril[c]);
    texCoordsArray.push(texCoord[2]);
    vertices.push(quadril[a]);
    texCoordsArray.push(texCoord[0]);
    vertices.push(quadril[c]);
    texCoordsArray.push(texCoord[2]);
    vertices.push(quadril[d]);
    texCoordsArray.push(texCoord[3]);
}

function initData() {
    quad(0, 3, 2, 1, ground);
    redQuads_i = vertices.length;
    quad(0, 3, 2, 1, quad1);
    quad(0, 3, 2, 1, quad2);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.vPosition);
    gl.vertexAttribPointer(program.vPosition, 3, gl.FLOAT, false, 0, 0);
}

function initTexture() {
    var image = document.getElementById("texImage");
    var groundTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, groundTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    var redSquare = new Uint8Array([255, 0, 0, 255]);
    var redTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, redTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, redSquare);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(gl.getUniformLocation(program, "tex0"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, groundTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, redTexture)
    tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.vTexCoord);
    gl.vertexAttribPointer(program.vTexCoord, 2, gl.FLOAT, false, 0, 0);
}

function useGroundTexture() {
    gl.uniform1i(gl.getUniformLocation(program, "tex0"), 0);
}

function useRedTexture() {
    gl.uniform1i(gl.getUniformLocation(program, "tex0"), 1);
}
