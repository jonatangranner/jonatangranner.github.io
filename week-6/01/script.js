
var canvas;                
var gl;                        
var program;                   
window.onload = init;          


var vBuffer;
var tBuffer;


var rectangle = [
    vec4(-4.0, -1.0, -1.0, 1.0),
    vec4(4.0, -1.0, -1.0, 1.0),
    vec4(4.0, -1.0, -21.0, 1.0),
    vec4(-4.0, -1.0, -21.0, 1.0)
];
var vertices = [];
var texCoordsArray = [];
var texCoord = [
    vec2(-1.5, 0.0),
    vec2(2.5, 0.0),
    vec2(2.5, 10.0),
    vec2(-1.5, 10.0)
];


var near = 0.3;
var far = 100.0;
var fovy = 90.0;
var aspect;
var pMatrix;

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL not found!");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);

    aspect = canvas.width / canvas.height;
    program = initShaders(gl, "vShader", "fShader");
    gl.useProgram(program);
    program.vPosition = gl.getAttribLocation(program, 'vPosition');
    program.projection = gl.getUniformLocation(program, 'projection');
    program.vTexCoord = gl.getAttribLocation(program, 'vTexCoord');
    initData()
    initTexture();

    render();
}

function render() {
    requestAnimFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT);
    pMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv(program.projection, false, flatten(pMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, vertices.length)
}


function quad(a, b, c, d) {
    vertices.push(rectangle[a]);
    texCoordsArray.push(texCoord[0]);

    vertices.push(rectangle[b]);
    texCoordsArray.push(texCoord[1]);

    vertices.push(rectangle[c]);
    texCoordsArray.push(texCoord[2]);

    vertices.push(rectangle[a]);
    texCoordsArray.push(texCoord[0]);

    vertices.push(rectangle[c]);
    texCoordsArray.push(texCoord[2]);

    vertices.push(rectangle[d]);
    texCoordsArray.push(texCoord[3]);
}

function initData() {
    quad(1, 2, 3, 0);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.vPosition);
    gl.vertexAttribPointer(program.vPosition, 4, gl.FLOAT, false, 0, 0);
}

function initTexture() {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);
    var texSize = 64;
    var numRows = 8;
    var numCols = 8;
    var myTexels = new Uint8Array(4 * texSize * texSize);
    for (var i = 0; i < texSize; ++i) {
        for (var j = 0; j < texSize; ++j) {
            var patchX = Math.floor(i / (texSize / numRows));
            var patchY = Math.floor(j / (texSize / numCols));
            var c = ((patchX % 2) !== (patchY % 2) ? 255 : 0);
            myTexels[4 * i * texSize + 4 * j] = c;
            myTexels[4 * i * texSize + 4 * j + 1] = c;
            myTexels[4 * i * texSize + 4 * j + 2] = c;
            myTexels[4 * i * texSize + 4 * j + 3] = 255;
        }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, myTexels);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.vTexCoord);
    gl.vertexAttribPointer(program.vTexCoord, 2, gl.FLOAT, false, 0, 0);
}
